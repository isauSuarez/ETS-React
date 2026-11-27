import axios from 'axios';

export const urlApi = 'http://localhost:3000/api';
export const apiCliente = axios.create({ baseURL: urlApi, withCredentials: true });

export interface Plan {
  idPlan: number;
  nombre: string;
  maxConsultas: number;
  maxRemotos: number;
  maxPresenciales: number;
}

export const estadosPoliza = {
  PENDIENTE: 'Pendiente de aprobación',
  ACTIVA: 'Activa',
  CANCELADA: 'Cancelada',
  VENCIDA: 'Vencida'
};

export interface Poliza extends Omit<Plan, 'idPlan' | 'nombre'> {
  idPoliza: number;
  plan: string;
  nombreEmpresa: string;
  direccionServicio: string;
  estado: keyof typeof estadosPoliza;
  fechaInicio: string | null;
  fechaVencimiento: string | null;
  usadasConsultas: number;
  usadosRemotos: number;
  usadosPresenciales: number;
}

export const modalidades = {
  CONSULTA: 'Consulta',
  REMOTO: 'Remoto',
  PRESENCIAL: 'Presencial'
};

export const estadosTicket = {
  SIN_ASIGNAR: 'Por asignar',
  ASIGNADO: 'Asignado',
  EN_ATENCION: 'En atención',
  PENDIENTE_APROBACION: 'Confirma la solución',
  CERRADO: 'Cerrado',
  CANCELADO: 'Cancelado'
};

export interface Ticket {
  idTicket: number;
  idPoliza: number;
  nombreEmpresa: string;
  asunto: string;
  modalidad: keyof typeof modalidades;
  estado: keyof typeof estadosTicket;
  fechaCreacion: string;
}

export const accionesTicket = {
  CREADO: 'Ticket recibido',
  ENVIADO_A_APROBACION: 'Solución del técnico',
  APROBADO: 'Solución confirmada',
  NO_SOLUCIONADO: 'El problema continúa',
  CANCELADO: 'Ticket cancelado'
};

export interface DetalleTicket extends Ticket {
  descripcion: string;
  fechaCierre: string | null;
  imagenAdjunta: string | null;
  historial: {
    accion: keyof typeof accionesTicket;
    comentario: string | null;
    tecnico: string;
    fechaMovimiento: string;
  }[];
}

export function mensajeApi(error: unknown, fallback: string) {
  return axios.isAxiosError<{ mensaje: string }>(error) ? error.response?.data?.mensaje ?? fallback : fallback;
}

export function fechaCorta(valor: string) {
  return valor.slice(0, 10).split('-').reverse().join('/') + valor.slice(10);
}
