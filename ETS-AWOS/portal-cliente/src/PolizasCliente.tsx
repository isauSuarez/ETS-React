import { useState } from 'react';
import type { FormEvent } from 'react';
import { apiCliente, estadosPoliza, fechaCorta, mensajeApi } from './clienteApi';
import type { Plan, Poliza } from './clienteApi';

interface Props {
  planes: Plan[];
  polizas: Poliza[];
  solicitud: boolean;
  cargando: boolean;
  onSolicitud: () => void;
  onVolver: () => void;
  onCreada: (poliza: Poliza) => void;
}

function PolizasCliente({ planes, polizas, solicitud, cargando, onSolicitud, onVolver, onCreada }: Props) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  async function solicitarPoliza(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = Object.fromEntries(new FormData(formulario));
    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      const { data } = await apiCliente.post<Poliza>('/polizas', datos);
      onCreada(data);
      setMensaje('Póliza #' + data.idPoliza + ' solicitada. Quedó pendiente de aprobación.');
      formulario.reset();
    } catch (error) {
      setError(mensajeApi(error, 'No se pudo solicitar la póliza.'));
    } finally {
      setGuardando(false);
    }
  }

  if (solicitud) {
    return (
      <section className="ets-card p-4 p-lg-5">
        <div className="ets-section-heading mb-3">
          <h1 className="ets-titulo h2 mb-0">Solicitar póliza</h1>
          <button type="button" className="btn btn-outline-success" onClick={onVolver}>Mis pólizas</button>
        </div>
        <p className="text-secondary mb-4">Tu póliza tendrá vigencia de un año desde que el jefe la active.</p>
        {mensaje && <p className="alert alert-success" role="status">{mensaje}</p>}
        {error && <p className="alert alert-danger" role="alert">{error}</p>}
        {planes.length === 0 && <p className="alert alert-warning">Todavía no hay planes disponibles.</p>}
        <form className="row g-3" onSubmit={solicitarPoliza}>
          <div className="col-md-5">
            <label className="form-label" htmlFor="idPlan">Plan</label>
            <select className="form-select" id="idPlan" name="idPlan" defaultValue="" required>
              <option value="" disabled>Selecciona un plan</option>
              {planes.map((plan) => (
                <option key={plan.idPlan} value={plan.idPlan}>
                  {plan.nombre} · {plan.maxConsultas} consultas, {plan.maxRemotos} remotos, {plan.maxPresenciales} visitas
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-7">
            <label className="form-label" htmlFor="nombreEmpresa">Empresa</label>
            <input className="form-control" id="nombreEmpresa" name="nombreEmpresa"
              autoComplete="organization" maxLength={150} required />
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="direccionServicio">Dirección de servicio</label>
            <input className="form-control" id="direccionServicio" name="direccionServicio"
              autoComplete="street-address" maxLength={255} required />
          </div>
          <div className="col-12">
            <button className="btn btn-success" type="submit" disabled={guardando || planes.length === 0}>
              {guardando ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section>
      <div className="ets-section-heading mb-4">
        <div>
          <h1 className="ets-titulo h2 mb-2">Mis pólizas</h1>
          <p className="text-secondary mb-0">Consulta el estado, la vigencia y los eventos disponibles.</p>
        </div>
        <button type="button" className="btn btn-success" onClick={() => {
          setMensaje('');
          setError('');
          onSolicitud();
        }}><i className="bi bi-plus-lg" aria-hidden="true" /> Solicitar póliza</button>
      </div>
      {!cargando && polizas.length === 0 && (
        <div className="ets-card p-4 text-secondary">Todavía no tienes pólizas.</div>
      )}
      <div className="row g-3">
        {polizas.map((poliza) => (
          <div className="col-md-6 col-xl-4" key={poliza.idPoliza}>
            <article className="ets-card p-4 h-100">
              <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
                <span className="ets-icon"><i className="bi bi-shield-check" aria-hidden="true" /></span>
                <span className={'ets-tag ets-tag-' + poliza.estado}>{estadosPoliza[poliza.estado]}</span>
              </div>
              <h2 className="h5 mb-1">{poliza.nombreEmpresa}</h2>
              <p className="text-secondary mb-3">Póliza #{poliza.idPoliza} · {poliza.plan}</p>
              <p className="mb-2 ets-wrap"><i className="bi bi-geo-alt me-1" aria-hidden="true" /> {poliza.direccionServicio}</p>
              <p className="mb-3">
                <i className="bi bi-calendar3 me-1" aria-hidden="true" />
                {poliza.fechaVencimiento ? ' Vence el ' + fechaCorta(poliza.fechaVencimiento) : ' Vigencia por definir'}
              </p>
              {poliza.estado === 'ACTIVA' && (
                <>
                  <h3 className="h6">Disponibles este mes</h3>
                  <ul className="list-unstyled ets-plan-cupos mb-0">
                    <li><span>Consultas</span><strong>{Math.max(0, poliza.maxConsultas - poliza.usadasConsultas)} / {poliza.maxConsultas}</strong></li>
                    <li><span>Remotos</span><strong>{Math.max(0, poliza.maxRemotos - poliza.usadosRemotos)} / {poliza.maxRemotos}</strong></li>
                    <li><span>Presenciales</span><strong>{Math.max(0, poliza.maxPresenciales - poliza.usadosPresenciales)} / {poliza.maxPresenciales}</strong></li>
                  </ul>
                </>
              )}
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}

export default PolizasCliente;
