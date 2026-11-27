import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import RegistroCliente from './RegistroCliente';
import PanelCliente from './PanelCliente';
import MarcaETS from './MarcaETS';
import { apiCliente, mensajeApi } from './clienteApi';
import type { Plan } from './clienteApi';

interface Cliente {
  idCliente: number;
  nombres: string;
}

function SesionCliente({ children, planes }: { children: ReactNode; planes: Plan[] }) {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [revisando, setRevisando] = useState(true);
  const [entrando, setEntrando] = useState(false);
  const [registro, setRegistro] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiCliente.get<{ cliente: Cliente }>('/clientes/sesion')
      .then(({ data }) => setCliente(data.cliente))
      .catch((error) => {
        if (error.response?.status !== 401) setError('No se pudo consultar la sesión.');
      })
      .finally(() => setRevisando(false));
  }, []);

  async function iniciarSesion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = Object.fromEntries(new FormData(evento.currentTarget));
    setError('');
    setEntrando(true);

    try {
      const { data } = await apiCliente.post<{ cliente: Cliente }>('/clientes/iniciosesion', datos);
      setCliente(data.cliente);
      window.scrollTo(0, 0);
    } catch (error) {
      setError(mensajeApi(error, 'No se pudo conectar con la API.'));
    } finally {
      setEntrando(false);
    }
  }

  async function cerrarSesion() {
    setError('');
    try {
      await apiCliente.post('/clientes/cerrarsesion', {});
      setCliente(null);
      setRegistro(false);
      window.scrollTo(0, 0);
    } catch (error) {
      setError(mensajeApi(error, 'No se pudo cerrar la sesión.'));
    }
  }

  if (cliente) {
    return <PanelCliente nombre={cliente.nombres} planes={planes} errorSesion={error}
      onSalir={cerrarSesion} onNombre={(nombres) => setCliente({ ...cliente, nombres })} />;
  }

  return (
    <>
      <header className="ets-header">
        <div className="container ets-nav">
          <MarcaETS />
          <a className="ets-nav-link" href="#planes">Ver planes</a>
        </div>
      </header>
      <main>
        <div className="container pt-4 pt-lg-5">
          <div className="row g-3 g-lg-4 align-items-stretch">
            <div className="col-lg-7">
              <section className="ets-acceso-hero h-100 d-flex flex-column justify-content-between">
                <div>
                  <h1>Tu soporte técnico,<br className="d-none d-xl-inline" /> en un solo lugar.</h1>
                  <p>Solicita una póliza para tu negocio y da seguimiento a cada servicio desde tu cuenta.</p>
                </div>
                <div className="ets-servicios d-flex flex-wrap gap-2">
                  <span><i className="bi bi-chat-dots" aria-hidden="true" /> Consultas</span>
                  <span><i className="bi bi-display" aria-hidden="true" /> Soporte remoto</span>
                  <span><i className="bi bi-tools" aria-hidden="true" /> Visitas presenciales</span>
                </div>
              </section>
            </div>
            <div className="col-lg-5">
              <section className="ets-card ets-acceso h-100" aria-label="Acceso al portal">
                <div className="ets-switch" aria-label="Opciones de acceso">
                  <button type="button" aria-pressed={!registro} onClick={() => { setRegistro(false); setError(''); }}>Iniciar sesión</button>
                  <button type="button" aria-pressed={registro} onClick={() => { setRegistro(true); setError(''); }}>Crear cuenta</button>
                </div>
                {registro ? <RegistroCliente /> : (
                  <>
                    <h2 className="h4 mt-4 mb-3">Entra a tu cuenta</h2>
                    {error && <p className="alert alert-danger" role="alert">{error}</p>}
                    <form onSubmit={iniciarSesion} className="vstack gap-3">
                      <div>
                        <label className="form-label" htmlFor="correoLogin">Correo</label>
                        <input id="correoLogin" name="correo" type="email" className="form-control"
                          autoComplete="username" required />
                      </div>
                      <div>
                        <label className="form-label" htmlFor="passwordLogin">Contraseña</label>
                        <input id="passwordLogin" name="password" type="password" className="form-control"
                          autoComplete="current-password" required />
                      </div>
                      <button className="btn btn-success" type="submit" disabled={revisando || entrando}>
                        {entrando ? 'Entrando…' : 'Entrar al portal'}
                      </button>
                    </form>
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
        {children}
      </main>
    </>
  );
}

export default SesionCliente;
