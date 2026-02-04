// Tipos para notificaciones del sistema

export type PrioridadNotificacion = 'baja' | 'media' | 'alta' | 'urgente';
export type EstadoNotificacion = 'pendiente' | 'leida' | 'archivada';
export type TipoNotificacion = 'informacion' | 'advertencia' | 'urgente' | 'sistema';

export type Notificacion = {
  id: number;
  nombre: string;
  descripcion: string;
  prioridad: PrioridadNotificacion;
  estado: EstadoNotificacion;
  tipo: TipoNotificacion;
  tipo_display?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  fecha_lectura?: string;
  usuario?: number;
  leida: boolean;
};

export type NotificacionFormData = {
  nombre: string;
  descripcion: string;
  prioridad: PrioridadNotificacion;
  tipo: TipoNotificacion;
  usuarios?: number[];
};

export type NotificacionFilters = {
  search?: string;
  prioridad?: PrioridadNotificacion;
  estado?: EstadoNotificacion;
  tipo?: TipoNotificacion;
  fecha_desde?: string;
  fecha_hasta?: string;
  leida?: boolean;
};

export type NotificacionEstadisticas = {
  total: number;
  pendientes: number;
  leidas: number;
  archivadas: number;
  por_prioridad: {
    baja: number;
    media: number;
    alta: number;
    urgente: number;
  };
  por_tipo: {
    informacion: number;
    advertencia: number;
    urgente: number;
    sistema: number;
  };
};

export type PaginatedResponse<T = any> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
