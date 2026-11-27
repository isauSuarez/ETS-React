import { useEffect, useState } from 'react';
import MarcaETS from './MarcaETS';
import PerfilCliente from './PerfilCliente';
import PolizasCliente from './PolizasCliente';
import TicketsCliente from './TicketsCliente';
import { apiCliente, estadosTicket } from './clienteApi';
import type { Plan, Poliza, Ticket } from './clienteApi';

type Vista = 'resumen' | 'polizas' | 'solicitud' | 'tickets' | 'nuevoTicket' | 'perfil';

interface PanelProps {
  nombre: string;
  planes: Plan[];
  errorSesion: string;
  onSalir: () => void;
  onNombre: (nombre: string) => void;
}

const navegacion = [
  { vista: 'resumen', titulo: 'Resumen', icono: 'bi-grid' },
  { vista: 'polizas', titulo: 'Mis pólizas', icono: 'bi-file-earmark-check' },
  { vista: 'tickets', titulo: 'Mis tickets', icono: 'bi-ticket-perforated' },
  { vista: 'perfil', titulo: 'Mi perfil', icono: 'bi-person' }
] as const;

function PanelCliente({ nombre, planes, errorSesion, onSalir, onNombre }: PanelProps) {
  const [vista, setVista] = useState<Vista>('resumen');
  const [polizas, setPolizas] = useState<Poliza[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  async function cargarPanel() {
    setError('');
    const [respuestaPolizas, respuestaTickets] = await Promise.allSettled([
      apiCliente.get<Poliza[]>('/polizas'),
      apiCliente.get<Ticket[]>('/tickets')
    ]);

    if (respuestaPolizas.status === 'fulfilled') setPolizas(respuestaPolizas.value.data);
    if (respuestaTickets.status === 'fulfilled') setTickets(respuestaTickets.value.data);
    if (respuestaPolizas.status === 'rejected' || respuestaTickets.status === 'rejected') {
      setError('No se pudieron actualizar todos tus datos. Intenta de nuevo.');
    }
    setCargando(false);
  }

  useEffect(() => { void cargarPanel(); }, []);

  function abrir(siguiente: Vista) {
    setVista(siguiente);
    window.scrollTo(0, 0);
    if (siguiente !== 'perfil') void cargarPanel();
  }

  const activas = polizas.filter((poliza) => poliza.estado === 'ACTIVA');
  const pendientes = tickets.filter((ticket) => ticket.estado === 'PENDIENTE_APROBACION');
  const enCurso = tickets.filter((ticket) => ticket.estado !== 'CERRADO' && ticket.estado !== 'CANCELADO');

  const indicadores = [
    { titulo: 'Pólizas activas', icono: 'bi-shield-check', cantidad: activas.length, destino: 'polizas' },
    { titulo: 'Tickets abiertos', icono: 'bi-ticket-perforated', cantidad: enCurso.length, destino: 'tickets' },
    { titulo: 'Por confirmar', icono: 'bi-check2-circle', cantidad: pendientes.length, destino: 'tickets' }
  ] as const;

  return (
    <>
      <header className="ets-header sticky-top">
        <div className="container ets-nav">
          <button type="button" className="ets-marca-btn" onClick={() => abrir('resumen')}><MarcaETS /></button>
          <nav className="ets-nav-menu" aria-label="Portal cliente">
            {navegacion.map(({ vista: destino, titulo, icono }) => {
              const activo = vista === destino || (vista === 'solicitud' && destino === 'polizas') ||
                (vista === 'nuevoTicket' && destino === 'tickets');
              return (
                <button type="button" key={destino} className="ets-nav-link" aria-current={activo ? 'page' : undefined}
                  onClick={() => abrir(destino)}>
                  <i className={'bi ' + icono} aria-hidden="true" /> {titulo}
                </button>
              );
            })}
          </nav>
          <button type="button" className="btn btn-sm btn-outline-success ets-salir" onClick={onSalir}>
            <i className="bi bi-box-arrow-right" aria-hidden="true" /> Salir
          </button>
        </div>
      </header>
      <main className="container py-4 py-lg-5">
        {errorSesion && <p className="alert alert-danger" role="alert">{errorSesion}</p>}
        {cargando && <p role="status" className="text-secondary">Cargando tu portal…</p>}
        {error && (
          <div className="alert alert-warning d-flex flex-wrap align-items-center justify-content-between gap-2" role="alert">
            <span>{error}</span>
            <button type="button" className="btn btn-sm btn-outline-dark" onClick={cargarPanel}>Actualizar</button>
          </div>
        )}
        {vista === 'resumen' && (
          <>
            <section className="ets-panel-hero mb-4">
              <div>
                <h1>Hola, {nombre}</h1>
                <p>Consulta tus pólizas y da seguimiento al soporte de tu negocio.</p>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <button type="button" className="btn btn-light" onClick={() => abrir('solicitud')}>
                  Solicitar póliza
                </button>
                <button type="button" className="btn btn-outline-light" onClick={() => abrir('nuevoTicket')}>
                  <i className="bi bi-plus-lg" aria-hidden="true" /> Nuevo ticket
                </button>
              </div>
            </section>
            <div className="row g-3 mb-4">
              {indicadores.map(({ titulo, icono, cantidad, destino }) => (
                <div className="col-md-4" key={titulo}>
                  <button type="button" className="ets-card ets-resumen-card" onClick={() => abrir(destino)}>
                    <span className="ets-icon"><i className={'bi ' + icono} aria-hidden="true" /></span>
                    <span><strong>{cargando ? '—' : cantidad}</strong><span>{titulo}</span></span>
                    <i className="bi bi-arrow-right ms-auto" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <section className="ets-card p-4">
              <div className="ets-section-heading mb-3">
                <h2 className="h4 mb-0">Tickets recientes</h2>
                <button type="button" className="btn btn-sm btn-outline-success" onClick={() => abrir('tickets')}>Ver tickets</button>
              </div>
              {tickets.length === 0 && !cargando && <p className="text-secondary mb-0">Todavía no has levantado tickets.</p>}
              <ul className="list-group list-group-flush">
                {tickets.slice(0, 3).map((ticket) => (
                  <li className="list-group-item bg-transparent px-0" key={ticket.idTicket}>
                    <span className="fw-semibold">#{ticket.idTicket} · {ticket.asunto}</span>
                    <span className="text-secondary ms-2">{estadosTicket[ticket.estado]}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
        {(vista === 'polizas' || vista === 'solicitud') && (
          <PolizasCliente
            planes={planes} polizas={polizas} solicitud={vista === 'solicitud'} cargando={cargando}
            onSolicitud={() => abrir('solicitud')} onVolver={() => abrir('polizas')}
            onCreada={(poliza) => setPolizas((anteriores) => [poliza, ...anteriores.filter((item) => item.idPoliza !== poliza.idPoliza)])}
          />
        )}
        {(vista === 'tickets' || vista === 'nuevoTicket') && (
          <TicketsCliente
            tickets={tickets} activas={activas} nuevo={vista === 'nuevoTicket'} cargando={cargando}
            onNuevo={() => abrir('nuevoTicket')} onVolver={() => abrir('tickets')}
            onSolicitud={() => abrir('solicitud')} onCambio={cargarPanel}
          />
        )}
        {vista === 'perfil' && <PerfilCliente onNombre={onNombre} />}
      </main>
    </>
  );
}

export default PanelCliente;
