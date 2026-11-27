import { useEffect, useState } from 'react';
import SesionCliente from './SesionCliente';
import { apiCliente } from './clienteApi';
import type { Plan } from './clienteApi';
import './App.css';

const iconosPlanes = ['bi-shield', 'bi-shield-check', 'bi-buildings'];

function App() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiCliente.get<Plan[]>('/planes')
      .then(({ data }) => setPlanes(data))
      .catch(() => setError('No se pudieron cargar los planes.'))
      .finally(() => setCargando(false));
  }, []);

  return (
    <SesionCliente planes={planes}>
      <section className="container py-4 py-lg-5" id="planes">
        <div className="mb-4">
          <h2 className="ets-titulo h3 mb-2">Planes de soporte técnico</h2>
          <p className="text-secondary mb-0">Vigencia anual, con eventos que se renuevan cada mes.</p>
        </div>
        {cargando && <p role="status">Cargando planes…</p>}
        {error && <p className="alert alert-warning" role="alert">{error}</p>}
        <div className="row g-3">
          {planes.map((plan, index) => (
            <div className="col-md-4" key={plan.idPlan}>
              <article className="ets-card p-4 h-100">
                <div className="d-flex gap-3 align-items-center mb-3">
                  <span className="ets-icon"><i className={'bi ' + (iconosPlanes[index] ?? 'bi-shield')} aria-hidden="true" /></span>
                  <h3 className="h5 mb-0">{plan.nombre}</h3>
                </div>
                <ul className="list-unstyled ets-plan-cupos mb-0">
                  <li><span>Consultas</span><strong>{plan.maxConsultas}</strong></li>
                  <li><span>Servicios remotos</span><strong>{plan.maxRemotos}</strong></li>
                  <li><span>Visitas presenciales</span><strong>{plan.maxPresenciales}</strong></li>
                </ul>
              </article>
            </div>
          ))}
        </div>
      </section>
    </SesionCliente>
  );
}

export default App;
