import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import PolizasAdmin from './PolizasAdmin';

interface Empleado {
  idEmpleado: number;
  nombres: string;
  rol: 'JEFE' | 'DISPATCHER' | 'TECNICO';
}

const roles = { JEFE: 'Jefe', DISPATCHER: 'Dispatcher', TECNICO: 'Técnico' };
const urlEmpleados = 'http://localhost:3000/api/empleados';
const opciones = { withCredentials: true };

function App() {
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get<{ empleado: Empleado }>(urlEmpleados + '/sesion', opciones)
      .then(({ data }) => setEmpleado(data.empleado))
      .catch((error) => {
        if (error.response?.status !== 401) setError('No se pudo consultar la sesión.');
      })
      .finally(() => setCargando(false));
  }, []);

  async function iniciarSesion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = Object.fromEntries(new FormData(evento.currentTarget));
    setError('');
    setEnviando(true);

    try {
      const { data } = await axios.post<{ empleado: Empleado }>(
        urlEmpleados + '/iniciosesion', datos, opciones
      );
      setEmpleado(data.empleado);
    } catch (error) {
      if (axios.isAxiosError<{ mensaje: string }>(error)) {
        setError(error.response?.data?.mensaje ?? 'No se pudo conectar con la API.');
      } else {
        setError('No se pudo iniciar sesión.');
      }
    } finally {
      setEnviando(false);
    }
  }

  async function cerrarSesion() {
    setError('');

    try {
      await axios.post(urlEmpleados + '/cerrarsesion', {}, opciones);
      setEmpleado(null);
    } catch {
      setError('No se pudo cerrar la sesión.');
    }
  }

  return (
    <main className="container py-4">
      <h1>Portal administrativo</h1>
      {error && <p className="alert alert-danger mt-3" role="alert">{error}</p>}

      {cargando ? <p>Consultando sesión…</p> : empleado ? (
        <>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
            <p className="mb-0">{empleado.nombres} · {roles[empleado.rol]}</p>
            <button type="button" className="btn btn-outline-secondary" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          </div>
          {empleado.rol === 'JEFE' && <PolizasAdmin />}
        </>
      ) : (
        <section className="card mt-4 col-md-6 col-lg-4">
          <div className="card-body">
            <h2 className="h5">Iniciar sesión</h2>
            <form onSubmit={iniciarSesion}>
              <div className="mb-3">
                <label className="form-label" htmlFor="correo">Correo</label>
                <input className="form-control" id="correo" name="correo" type="email"
                  autoComplete="username" required />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="password">Contraseña</label>
                <input className="form-control" id="password" name="password" type="password"
                  autoComplete="current-password" required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={enviando}>
                {enviando ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
