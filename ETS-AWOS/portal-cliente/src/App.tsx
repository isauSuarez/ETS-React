import { useEffect, useState } from 'react';
import axios from 'axios';
import RegistroCliente from './RegistroCliente';
import SesionCliente from './SesionCliente';

interface Plan {
  idPlan: number;
  nombre: string;
  maxConsultas: number;
  maxRemotos: number;
  maxPresenciales: number;
}

function App() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get<Plan[]>('http://localhost:3000/api/planes')
      .then((respuesta) => {
        setPlanes(respuesta.data);
      })
      .catch(() => {
        setError('No se pudieron cargar los planes.');
      })
      .finally(() => {
        setCargando(false);
      });
  }, []);

  return (
    <main className="container py-5">
      <h1>Planes de soporte técnico</h1>
      <p>Las pólizas tienen vigencia anual y los cupos se renuevan cada mes.</p>

      {cargando && <p>Cargando planes…</p>}
      {error && <p className="alert alert-danger" role="alert">{error}</p>}

      <div className="row g-3">
        {planes.map((plan) => (
          <div className="col-12 col-md-4" key={plan.idPlan}>
            <section className="card h-100">
              <div className="card-body">
                <h2 className="h4">{plan.nombre}</h2>
                <ul className="mb-0">
                  <li>{plan.maxConsultas} consultas al mes</li>
                  <li>{plan.maxRemotos} servicios remotos al mes</li>
                  <li>{plan.maxPresenciales} visitas presenciales al mes</li>
                </ul>
              </div>
            </section>
          </div>
        ))}
      </div>
      <SesionCliente />
      <RegistroCliente />
    </main>
  );
}

export default App;