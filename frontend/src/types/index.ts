// Tipos base para el sistema de transporte
export type Personal = {
  id: number;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  telefono: string;
  email: string;
  ci: string;
  // Campos actualizados según refactorización del backend
  codigo_empleado: string;
  fecha_ingreso: string;
  estado: boolean; // Cambiado a boolean
  telefono_emergencia?: string;
  contacto_emergencia?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  usuario?: number; // FK a CustomUser (nullable)
  // Campos calculados/derivados
  nombre_completo: string;
  anos_antiguedad: number;
  puede_acceder_sistema: boolean;
};

export type Residente = {
  id: number;
  nombre: string;
  apellido: string;
  ci: string;
  email: string;
  telefono: string;
  // Campos específicos de Residente
  unidad_habitacional: string; // Código de la unidad habitacional
  tipo: 'propietario' | 'inquilino';
  fecha_ingreso: string;
  estado: "activo" | "inactivo" | "suspendido" | "en_proceso";
  fecha_creacion: string;
  fecha_actualizacion: string;
  usuario?: number; // FK a CustomUser (nullable)
  // Campos del usuario relacionado
  username?: string;
  // Campos calculados/derivados
  nombre_completo: string;
  puede_acceder: boolean;
  estado_usuario: "activo" | "inactivo" | "sin_usuario";
};

export type Usuario = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  telefono?: string;
  direccion?: string;
  ci?: string;
  fecha_nacimiento?: string;
  rol?: {
    id: number;
    nombre: string;
    descripcion: string;
    es_administrativo: boolean;
    permisos: string[];
    fecha_creacion: string;
    fecha_actualizacion: string;
  }; // Objeto completo del rol
  is_superuser: boolean;
  is_active: boolean; // Unificado con es_activo
  fecha_creacion: string;
  fecha_ultimo_acceso?: string;
  // Relaciones opcionales
  personal?: number; // FK a Personal
  residente?: number; // FK a Residente
  // Campos derivados
  puede_acceder_admin: boolean;
  es_administrativo: boolean;
  es_cliente: boolean;
  rol_nombre?: string;
  rol_obj?: {
    id: number;
    nombre: string;
    es_administrativo: boolean;
    permisos: string[];
  };
};

export type Role = {
  id: number;
  nombre: string;
  descripcion: string;
  es_administrativo: boolean;
  permisos: string[];
  fecha_creacion: string;
  fecha_actualizacion: string;
  total_usuarios?: number; // Añadimos esta propiedad como opcional
};

// Tipos para formularios
export type PersonalFormData = {
  nombre: string;
  apellido: string;
  fecha_nacimiento: Date | null;
  telefono: string;
  email: string;
  ci: string;
  // Requeridos por el backend (PersonalCreateSerializer)
  codigo_empleado: string;
  fecha_ingreso: Date | null;
  // Opcionales
  telefono_emergencia?: string | undefined;
  contacto_emergencia?: string | undefined;
  estado?: boolean | undefined; // Cambiado de es_activo a estado
};

// Residente no incluye campos laborales de Personal
export type ResidenteFormData = {
  nombre: string;
  apellido: string;
  ci: string;
  email: string;
  telefono: string;
  unidad_habitacional: string; // Volvemos al campo original: código de unidad
  tipo: 'propietario' | 'inquilino';
  fecha_ingreso: Date | null;
  estado: "activo" | "inactivo" | "suspendido" | "en_proceso";
  usuario?: number | undefined;
};

export type UsuarioFormData = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  telefono?: string | undefined;
  direccion?: string | undefined;
  ci?: string | undefined;
  fecha_nacimiento?: Date | null | undefined;
  // Identificador del rol (FK), obtenido desde /api/admin/roles
  rol_id?: number | undefined;
  is_superuser: boolean;
  is_active: boolean; // Unificado con es_activo
  // Relaciones opcionales
  personal?: number | undefined;
  residente?: number | undefined;
  password?: string | undefined;
  password_confirm?: string | undefined;
};

// Tipos para filtros
export type PersonalFilters = {
  search?: string;
  estado?: boolean; // Cambiado de string a boolean
};

export type ResidenteFilters = {
  search?: string;
  estado?: 'activo' | 'inactivo' | 'suspendido' | 'en_proceso';
  tipo?: 'propietario' | 'inquilino';
  unidad_habitacional?: string; // Código de la unidad habitacional
};

export type UsuarioFilters = {
  search?: string;
  rol?: string;
  is_staff?: boolean; // Cambiado de is_admin_portal
  is_active?: boolean; // Cambiado de es_activo
};

// Tipos para respuestas de API
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T | null;
  error?: string;
  message?: string;
};

// Ya se exporta PaginatedResponse desde notificaciones.ts

// Tipos para autocompletado
export type PersonalOption = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  ci: string;
  telefono: string;
};

export type ResidenteOption = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  ci: string;
  telefono: string;
  unidad_habitacional: string;
};

// Exportar tipos de unidades
export type { Unidad, UnidadForm, UnidadFilterParams } from './unidades';
export type { AreaComun, AreaComunForm, EstadoArea } from './areas-comunes';
export type { 
  Inventario, 
  InventarioDetallado, 
  InventarioForm, 
  InventarioFilter,
  EstadoInventario,
  CategoriaInventario,
  EstadisticasInventario
} from './inventario';

// Exportar tipos actualizados de notificaciones
export type {
  Notificacion,
  NotificacionFormData,
  NotificacionFilters,
  NotificacionEstadisticas,
  PaginatedResponse
} from './notificaciones';

export type RolOption = {
  id: number;
  nombre: string;
  descripcion: string;
  total_usuarios?: number; // Hacemos este campo opcional
};
