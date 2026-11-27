import { useEffect, useState } from 'react';
import axios from 'axios';

interface Poliza {
  idPoliza: number;
  plan: string;
  correoCliente: string;
  nombreEmpresa: string;
  direccionServicio: string;
  estado: 'PENDIENTE' | 'ACTIVA' | 'CANCELADA' | 'VENCIDA';
  fechaSolicitud: string;
  fechaVencimiento: string | null;
}

const estados = {
  PENDIENTE: 'Pendiente de aprobación',
  ACTIVA: 'Activa',
  CANCELADA: 'Cancelada',
  VENCIDA: 'Vencida'
};

const urlPolizas = 'http://localhost:3000/api/admin/polizas';
const opciones = { withCredentials: true };

function PolizasAdmin() {
  const [polizas, setPolizas] = useState<Poliza[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  async function cargarPolizas() {
    const { data } = await axios.get<Poliza[]>(urlPolizas, opciones);
    setPolizas(data);
  }

  useEffect(() => {
    cargarPolizas()
      .catch(() => setError('No se pudieron cargar las pólizas.'))
      .finally(() => setCargando(false));
  }, []);

  async function cambiarEstado(idPoliza: number, accion: 'activar' | 'cancelar') {
    if (accion === 'cancelar' && !window.confirm('¿Cancelar esta póliza?')) return;

    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      const { data } = await axios.patch<{ mensaje: string }>(
        urlPolizas + '/' + idPoliza + '/' + accion, {}, opciones
      );
      setMensaje(data.mensaje);
      await cargarPolizas().catch(() => setError('Recarga la página para ver el estado actualizado.'));
    } catch (error) {
      if (axios.isAxiosError<{ mensaje: string }>(error)) {
        setError(error.response?.data?.mensaje ?? 'No se pudo actualizar la póliza.');
      } else {
        setError('No se pudo actualizar la póliza.');
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section>
      <h2>Pólizas</h2>
      {cargando && <p>Cargando pólizas…</p>}
      {mensaje && <p className="alert alert-success" role="status">{mensaje}</p>}
      {error && <p className="alert alert-danger" role="alert">{error}</p>}
      {!cargando && !error && polizas.length === 0 && <p>Todavía no hay solicitudes.</p>}

      {polizas.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th scope="col">Folio</th>
                <th scope="col">Cliente y empresa</th>
                <th scope="col">Plan</th>
                <th scope="col">Solicitud</th>
                <th scope="col">Estado</th>
                <th scope="col">Vence</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {polizas.map((poliza) => (
                <tr key={poliza.idPoliza}>
                  <td>{poliza.idPoliza}</td>
                  <td>
                    <strong>{poliza.nombreEmpresa}</strong>
                    <div>{poliza.direccionServicio}</div>
                    <small className="text-body-secondary">{poliza.correoCliente}</small>
                  </td>
                  <td>{poliza.plan}</td>
                  <td>{poliza.fechaSolicitud}</td>
                  <td>{estados[poliza.estado]}</td>
                  <td>{poliza.fechaVencimiento ?? '—'}</td>
                  <td>
                    {poliza.estado === 'PENDIENTE' && (
                      <button type="button" className="btn btn-sm btn-success" disabled={guardando}
                        onClick={() => cambiarEstado(poliza.idPoliza, 'activar')}>
                        Activar
                      </button>
                    )}
                    {poliza.estado === 'ACTIVA' && (
                      <button type="button" className="btn btn-sm btn-outline-danger" disabled={guardando}
                        onClick={() => cambiarEstado(poliza.idPoliza, 'cancelar')}>
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default PolizasAdmin;
