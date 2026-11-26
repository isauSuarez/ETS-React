import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';

interface Cliente {
  idCliente: number;
  nombres: string;
}

const urlClientes = 'http://localhost:3000/api/clientes';
const opciones = { withCredentials: true };

function SesionCliente() {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get<{ cliente: Cliente }>(`${urlClientes}/sesion`, opciones)
      .then(({ data }) => setCliente(data.cliente))
      .catch((error) => {
        if (error.response?.status !== 401) {
          setError('No se pudo consultar la sesión.');
        }
      });
  }, []);

  async function iniciarSesion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = Object.fromEntries(new FormData(evento.currentTarget));
    setError('');

    try {
      const { data } = await axios.post<{ cliente: Cliente }>(
        `${urlClientes}/iniciosesion`, datos, opciones
      );
      setCliente(data.cliente);
    } catch (error) {
      if (axios.isAxiosError<{ mensaje: string }>(error)) {
        setError(error.response?.data.mensaje ?? 'No se pudo conectar con la API.');
      } else {
        setError('No se pudo iniciar sesión.');
      }
    }
  }

  async function cerrarSesion() {
    setError('');

    try {
      await axios.post(`${urlClientes}/cerrarsesion`, {}, opciones);
      setCliente(null);
    } catch {
      setError('No se pudo cerrar la sesión.');
    }
  }

  return (
    <section className="mt-5">
      {cliente ? (
        <>
          <h2>Hola, {cliente.nombres}</h2>
          <button className="btn btn-outline-secondary" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </>
      ) : (
        <>
          <h2>Iniciar sesión</h2>
          <form className="row g-3" onSubmit={iniciarSesion}>
            <div className="col-md-6">
              <label className="form-label" htmlFor="correoLogin">Correo</label>
              <input id="correoLogin" name="correo" type="email"
                className="form-control" autoComplete="username" required />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="passwordLogin">Contraseña</label>
              <input id="passwordLogin" name="password" type="password"
                className="form-control" autoComplete="current-password" required />
            </div>
            <div className="col-12">
              <button className="btn btn-primary" type="submit">Entrar</button>
            </div>
          </form>
        </>
      )}

      {error && <p className="alert alert-danger mt-3" role="alert">{error}</p>}
    </section>
  );
}

export default SesionCliente;