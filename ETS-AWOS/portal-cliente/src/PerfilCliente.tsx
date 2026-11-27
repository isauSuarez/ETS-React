import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { apiCliente, mensajeApi } from './clienteApi';

interface Perfil {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
}

function PerfilCliente({ onNombre }: { onNombre: (nombre: string) => void }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    apiCliente.get<Perfil>('/clientes/perfil')
      .then(({ data }) => setPerfil(data))
      .catch((error) => setError(mensajeApi(error, 'No se pudo cargar tu perfil.')));
  }, []);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError('');
    setMensaje('');
    setGuardando(true);

    try {
      const datos = Object.fromEntries(new FormData(evento.currentTarget));
      const { data } = await apiCliente.patch<Omit<Perfil, 'correo'> & { mensaje: string }>(
        '/clientes/perfil', datos
      );
      onNombre(data.nombres);
      setMensaje(data.mensaje);
    } catch (error) {
      setError(mensajeApi(error, 'No se pudo guardar tu perfil.'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="ets-card p-4 p-lg-5">
      <h1 className="ets-titulo h2 mb-4">Mi perfil</h1>
      {error && <p role="alert" className="alert alert-danger">{error}</p>}
      {mensaje && <p role="status" className="alert alert-success">{mensaje}</p>}
      {!perfil && !error && <p role="status">Cargando perfil…</p>}
      {perfil && (
        <form className="row g-3" onSubmit={guardar}>
          <div className="col-md-6">
            <label className="form-label" htmlFor="perfilNombres">Nombres</label>
            <input className="form-control" id="perfilNombres" name="nombres" defaultValue={perfil.nombres}
              maxLength={80} autoComplete="given-name" required />
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="perfilApellidos">Apellidos</label>
            <input className="form-control" id="perfilApellidos" name="apellidos" defaultValue={perfil.apellidos}
              maxLength={100} autoComplete="family-name" required />
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="perfilCorreo">Correo de la cuenta</label>
            <input className="form-control" id="perfilCorreo" value={perfil.correo} readOnly />
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="perfilTelefono">Teléfono</label>
            <input className="form-control" id="perfilTelefono" name="telefono" type="tel"
              defaultValue={perfil.telefono} minLength={7} maxLength={20} autoComplete="tel" required />
          </div>
          <div className="col-12">
            <button className="btn btn-success" disabled={guardando}>Guardar cambios</button>
          </div>
        </form>
      )}
    </section>
  );
}

export default PerfilCliente;
