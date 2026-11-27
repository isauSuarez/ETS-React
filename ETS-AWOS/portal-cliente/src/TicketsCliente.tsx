import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { accionesTicket, apiCliente, estadosTicket, fechaCorta, mensajeApi, modalidades, urlApi } from './clienteApi';
import type { DetalleTicket, Poliza, Ticket } from './clienteApi';

interface Props {
  tickets: Ticket[];
  activas: Poliza[];
  nuevo: boolean;
  cargando: boolean;
  onNuevo: () => void;
  onVolver: () => void;
  onSolicitud: () => void;
  onCambio: () => Promise<void>;
}

type Accion = 'SOLUCIONADO' | 'NO_SOLUCIONADO' | 'CANCELAR';

function TicketsCliente({ tickets, activas, nuevo, cargando, onNuevo, onVolver, onSolicitud, onCambio }: Props) {
  const [idDetalle, setIdDetalle] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<DetalleTicket | null>(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [comentario, setComentario] = useState('');

  useEffect(() => {
    if (!idDetalle || nuevo) return;

    const solicitud = new AbortController();
    apiCliente.get<DetalleTicket>('/tickets/' + idDetalle, { signal: solicitud.signal })
      .then(({ data }) => setDetalle(data))
      .catch((error) => {
        if (!solicitud.signal.aborted) setError(mensajeApi(error, 'No se pudo cargar el detalle.'));
      });

    return () => solicitud.abort();
  }, [idDetalle, nuevo]);

  function verTicket(idTicket: number) {
    setDetalle(null);
    setIdDetalle(idTicket);
    setComentario('');
    setMensaje('');
    setError('');
  }

  async function crearTicket(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const imagen = datos.get('imagen');
    if (imagen instanceof File && imagen.size > 3 * 1024 * 1024) {
      setError('La imagen debe pesar hasta 3 MB.');
      return;
    }

    setError('');
    setGuardando(true);
    try {
      const { data } = await apiCliente.post<{ idTicket: number; mensaje: string }>('/tickets', datos, {
        headers: { 'X-ETS-Portal': 'cliente' }
      });
      verTicket(data.idTicket);
      setMensaje(data.mensaje);
      onVolver();
    } catch (error) {
      setError(mensajeApi(error, 'No se pudo crear el ticket.'));
    } finally {
      setGuardando(false);
    }
  }

  async function responder(accion: Accion) {
    if (!detalle) return;
    if (accion === 'CANCELAR' && !window.confirm('¿Cancelar este ticket y devolver el evento a tu póliza?')) return;

    setError('');
    setMensaje('');
    setGuardando(true);

    try {
      const ruta = '/tickets/' + detalle.idTicket;
      const { data } = await apiCliente.patch<{ mensaje: string; estado: Ticket['estado'] }>(ruta, { accion, comentario });
      setDetalle({ ...detalle, estado: data.estado });
      setMensaje(data.mensaje);
      setComentario('');
      await onCambio();
      const respuesta = await apiCliente.get<DetalleTicket>(ruta);
      setDetalle(respuesta.data);
    } catch (error) {
      setError(mensajeApi(error, 'No se pudo actualizar el ticket.'));
    } finally {
      setGuardando(false);
    }
  }

  if (nuevo) {
    return (
      <section className="ets-card p-4 p-lg-5">
        <div className="ets-section-heading mb-3">
          <h1 className="ets-titulo h2 mb-0">Nuevo ticket</h1>
          <button type="button" className="btn btn-outline-success" onClick={() => {
            setError('');
            onVolver();
          }}>Mis tickets</button>
        </div>
        <p className="text-secondary mb-4">Selecciona la póliza, el tipo de soporte y describe qué está pasando.</p>
        {error && <p className="alert alert-danger" role="alert">{error}</p>}
        {cargando && <p role="status">Cargando pólizas…</p>}
        {!cargando && activas.length === 0 && (
          <div className="alert alert-warning mb-0">
            <p>Para levantar un ticket necesitas una póliza activa.</p>
            <button type="button" className="btn btn-outline-success" onClick={onSolicitud}>Solicitar póliza</button>
          </div>
        )}
        {activas.length > 0 && (
          <form className="row g-3" onSubmit={crearTicket}>
            <div className="col-md-7">
              <label className="form-label" htmlFor="ticketPoliza">Póliza</label>
              <select className="form-select" id="ticketPoliza" name="idPoliza" defaultValue="" required>
                <option value="" disabled>Selecciona una póliza activa</option>
                {activas.map((poliza) => (
                  <option value={poliza.idPoliza} key={poliza.idPoliza}>
                    #{poliza.idPoliza} · {poliza.nombreEmpresa} · {poliza.direccionServicio}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-5">
              <label className="form-label" htmlFor="modalidad">Modalidad</label>
              <select className="form-select" id="modalidad" name="modalidad" defaultValue="" required>
                <option value="" disabled>Selecciona una modalidad</option>
                {Object.entries(modalidades).map(([clave, titulo]) => (
                  <option value={clave} key={clave}>{titulo}</option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="asunto">Asunto</label>
              <input className="form-control" id="asunto" name="asunto" maxLength={120} required />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="descripcion">Descripción</label>
              <textarea className="form-control" id="descripcion" name="descripcion" rows={4} maxLength={2000} required />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="imagen">Imagen opcional</label>
              <input className="form-control" id="imagen" name="imagen" type="file"
                aria-describedby="imagenAyuda" accept="image/jpeg,image/png,image/webp" />
              <div className="form-text" id="imagenAyuda">JPG, PNG o WEBP de hasta 3 MB.</div>
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-success" disabled={guardando}>
                {guardando ? 'Enviando…' : 'Levantar ticket'}
              </button>
            </div>
          </form>
        )}
      </section>
    );
  }

  if (idDetalle) {
    return (
      <section className="ets-card p-4 p-lg-5">
        <div className="ets-section-heading mb-3">
          <h1 className="ets-titulo h2 mb-0">Ticket #{idDetalle}</h1>
          <button type="button" className="btn btn-outline-success" onClick={() => {
            setIdDetalle(null);
            setDetalle(null);
            setError('');
            setMensaje('');
          }}>Mis tickets</button>
        </div>
        {mensaje && <p className="alert alert-success" role="status">{mensaje}</p>}
        {error && <p className="alert alert-danger" role="alert">{error}</p>}
        {!detalle && !error && <p role="status">Cargando detalle…</p>}
        {detalle && (
          <>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
              <span className={'ets-tag ets-tag-' + detalle.estado}>{estadosTicket[detalle.estado]}</span>
              <span className="text-secondary">{modalidades[detalle.modalidad]} · {fechaCorta(detalle.fechaCreacion)}</span>
            </div>
            <h2 className="h4 ets-wrap">{detalle.asunto}</h2>
            <p className="text-secondary ets-wrap">{detalle.nombreEmpresa} · Póliza #{detalle.idPoliza}</p>
            <p className="ets-wrap ets-descripcion">{detalle.descripcion}</p>
            {detalle.imagenAdjunta && (
              <img className="ets-imagen-ticket img-fluid border rounded mb-3"
                src={urlApi + '/tickets/' + idDetalle + '/imagen'} alt="Imagen adjunta al ticket" />
            )}
            {detalle.estado === 'PENDIENTE_APROBACION' && (
              <div className="alert alert-success mt-3">
                <h3 className="h5">¿Quedó solucionado?</h3>
                <p>Si el problema continúa, el ticket vuelve a la bandeja del dispatcher.</p>
                <label className="form-label" htmlFor="comentarioTicket">Comentario opcional</label>
                <textarea className="form-control mb-3" id="comentarioTicket" rows={2}
                  value={comentario} maxLength={500} onChange={(evento) => setComentario(evento.target.value)} />
                <div className="d-flex flex-wrap gap-2">
                  <button type="button" className="btn btn-success" disabled={guardando}
                    onClick={() => responder('SOLUCIONADO')}>Sí, quedó solucionado</button>
                  <button type="button" className="btn btn-outline-dark" disabled={guardando}
                    onClick={() => responder('NO_SOLUCIONADO')}>Sigue fallando</button>
                </div>
              </div>
            )}
            {detalle.estado === 'SIN_ASIGNAR' && (
              <button type="button" className="btn btn-sm btn-outline-danger mb-3" disabled={guardando}
                onClick={() => responder('CANCELAR')}>Cancelar ticket</button>
            )}
            <h3 className="h5 mt-3">Historial</h3>
            <ul className="list-group list-group-flush">
              {detalle.historial.map((movimiento, indice) => (
                <li className="list-group-item bg-transparent px-0" key={indice}>
                  <strong>{accionesTicket[movimiento.accion]}</strong>
                  <div className="text-secondary small">
                    {fechaCorta(movimiento.fechaMovimiento)}{movimiento.tecnico ? ' · Técnico: ' + movimiento.tecnico : ''}
                  </div>
                  {movimiento.comentario && <p className="ets-wrap ets-descripcion mb-0">{movimiento.comentario}</p>}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    );
  }

  return (
    <section>
      <div className="ets-section-heading mb-4">
        <div>
          <h1 className="ets-titulo h2 mb-2">Mis tickets</h1>
          <p className="text-secondary mb-0">Revisa tus solicitudes y confirma si quedaron resueltas.</p>
        </div>
        <button type="button" className="btn btn-success" onClick={() => {
          setError('');
          setMensaje('');
          onNuevo();
        }}><i className="bi bi-plus-lg" aria-hidden="true" /> Nuevo ticket</button>
      </div>
      {!cargando && tickets.length === 0 && <p className="ets-card p-4 text-secondary">Todavía no tienes tickets.</p>}
      {tickets.length > 0 && (
        <div className="ets-card p-3 p-md-4">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Folio y asunto</th>
                  <th scope="col">Modalidad</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Fecha</th>
                  <th scope="col"><span className="visually-hidden">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.idTicket}>
                    <td className="ets-wrap">
                      <strong>#{ticket.idTicket} · {ticket.asunto}</strong>
                      <div className="text-secondary small">{ticket.nombreEmpresa}</div>
                    </td>
                    <td>{modalidades[ticket.modalidad]}</td>
                    <td><span className={'ets-tag ets-tag-' + ticket.estado}>{estadosTicket[ticket.estado]}</span></td>
                    <td>{fechaCorta(ticket.fechaCreacion)}</td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline-success"
                        aria-label={'Ver ticket ' + ticket.idTicket} onClick={() => verTicket(ticket.idTicket)}>Ver detalle</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export default TicketsCliente;
