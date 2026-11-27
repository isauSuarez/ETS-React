import { useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';

function RegistroCliente() {
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = Object.fromEntries(new FormData(formulario));

    setMensaje('');
    setError('');
    setGuardando(true);

    try {
      const respuesta = await axios.post<{ mensaje: string }>(
        'http://localhost:3000/api/clientes/registro',
        datos
      );
      setMensaje(respuesta.data.mensaje);
      formulario.reset();
    } catch (error) {
      if (axios.isAxiosError<{ mensaje: string }>(error)) {
        setError(error.response?.data?.mensaje ?? 'No se pudo conectar con la API.');
      } else {
        setError('No se pudo completar el registro.');
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="mt-4">
      <h2 className="h4 mb-3">Crea tu cuenta</h2>

      <form className="row g-3" onSubmit={registrar}>
        <div className="col-md-6">
          <label htmlFor="nombres" className="form-label">Nombres</label>
          <input id="nombres" name="nombres" className="form-control"
            autoComplete="given-name" maxLength={80} required />
        </div>

        <div className="col-md-6">
          <label htmlFor="apellidos" className="form-label">Apellidos</label>
          <input id="apellidos" name="apellidos" className="form-control"
            autoComplete="family-name" maxLength={100} required />
        </div>

        <div className="col-md-6">
          <label htmlFor="correo" className="form-label">Correo</label>
          <input id="correo" name="correo" type="email" className="form-control"
            autoComplete="email" maxLength={160} required />
        </div>

        <div className="col-md-6">
          <label htmlFor="telefono" className="form-label">Teléfono</label>
          <input id="telefono" name="telefono" type="tel" className="form-control"
            autoComplete="tel" minLength={7} maxLength={20} required />
        </div>

        <div className="col-md-6">
          <label htmlFor="password" className="form-label">Contraseña</label>
          <input id="password" name="password" type="password" className="form-control"
            autoComplete="new-password" minLength={8} required />
        </div>

        <div className="col-12">
          <button type="submit" className="btn btn-success" disabled={guardando}>
            {guardando ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </div>
      </form>

      {mensaje && <p className="alert alert-success mt-3" role="status">{mensaje}</p>}
      {error && <p className="alert alert-danger mt-3" role="alert">{error}</p>}
    </section>
  );
}

export default RegistroCliente;