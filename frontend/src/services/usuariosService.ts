import { apiRequest } from './api';
import type {
  Usuario,
  UsuarioFormData,
  UsuarioFilters,
  PaginatedResponse,
  ApiResponse,
  Role,
} from '@/types';

// Mappers para convertir entre formatos del frontend y backend
// Mappers para convertir entre formatos del frontend y backend
const toDTO = (data: UsuarioFormData, roles: Role[] = []) => {
  // Buscar si el rol seleccionado es administrativo para determinar is_staff
  const selectedRole = roles.find(r => r.id === data.rol_id);
  const isAdministrativeRole = selectedRole?.es_administrativo || false;

  return {
    username: data.username,
    email: data.email,
    first_name: data.first_name,
    last_name: data.last_name,
    telefono: data.telefono || undefined,
    direccion: data.direccion || undefined,
    ci: data.ci || undefined,
    fecha_nacimiento: data.fecha_nacimiento ? data.fecha_nacimiento.toISOString().split('T')[0] : undefined,
    rol_id: data.rol_id || undefined,
    is_superuser: data.is_superuser,
    is_active: data.is_active, // Unificado con es_activo
    is_staff: isAdministrativeRole, // Basado en si el rol es administrativo
    personal_id: data.personal || undefined, // Usar personal como personal_id
    residente_id: data.residente || undefined, // Usar residente como residente_id
    password: data.password, // Siempre incluir password para creación
    password_confirm: data.password_confirm, // Siempre incluir password_confirm para creación
  };
};const fromDTO = (data: any): Usuario => ({
  id: data.id,
  username: data.username,
  email: data.email,
  first_name: data.first_name,
  last_name: data.last_name,
  telefono: data.telefono,
  direccion: data.direccion,
  ci: data.ci,
  fecha_nacimiento: data.fecha_nacimiento,
  rol: data.rol,
  is_superuser: data.is_superuser,
  is_active: data.is_active, // Unificado con es_activo
  fecha_creacion: data.fecha_creacion,
  fecha_ultimo_acceso: data.fecha_ultimo_acceso,
  // Relaciones opcionales
  personal: data.personal,
  residente: data.residente,
  // Campos derivados
  puede_acceder_admin: data.puede_acceder_admin,
  es_administrativo: data.es_administrativo,
  es_cliente: data.es_cliente,
  rol_nombre: data.rol_nombre,
  rol_obj: data.rol_obj,
});

// Nota: las opciones de roles se obtienen desde la API. No hardcodear IDs.

export const usuariosApi = {
  // Listar usuarios con filtros y paginación
  async list(filters?: UsuarioFilters): Promise<ApiResponse<PaginatedResponse<Usuario>>> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    // Filtrar por nombre de rol (requiere soporte BE: filterset_fields=['rol__nombre'])
    if (filters?.rol) params.append('rol__nombre', filters.rol);
    if (filters?.is_staff !== undefined) params.append('is_staff', filters.is_staff.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    
    const query = params.toString();
    const response = await apiRequest(`/api/admin/users/${query ? `?${query}` : ''}`);
    
    if (response.success && response.data) {
      const data = response.data as any;
      return {
        success: true,
        data: {
          count: data.count,
          next: data.next,
          previous: data.previous,
          results: data.results.map(fromDTO),
        },
      };
    }
    
    return response as ApiResponse<PaginatedResponse<Usuario>>;
  },

  // Obtener usuario por ID
  async get(id: number): Promise<ApiResponse<Usuario>> {
    const response = await apiRequest(`/api/admin/users/${id}/`);
    
    if (response.success && response.data) {
      return {
        success: true,
        data: fromDTO(response.data),
      };
    }
    
    return response as ApiResponse<Usuario>;
  },

  // Crear nuevo usuario
  async create(data: UsuarioFormData): Promise<ApiResponse<Usuario>> {
    try {
      // Validamos que las contraseñas estén presentes y coincidan para creación
      if (!data.password || !data.password_confirm) {
        throw new Error("La contraseña y su confirmación son obligatorias para crear un usuario");
      }
      
      if (data.password !== data.password_confirm) {
        throw new Error("Las contraseñas no coinciden");
      }
      
      // Primero obtenemos los roles para determinar is_staff correctamente
      const rolesResponse = await this.getRoles();
      const roles = rolesResponse.success ? rolesResponse.data || [] : [];
      
      // Creamos un objeto para enviar al backend con los nombres de campo esperados
      const backendData = toDTO(data, roles);
      
      console.log('Datos enviados para crear usuario:', backendData);
      
      const response = await apiRequest('/api/admin/users/', {
        method: 'POST',
        body: JSON.stringify(backendData),
      });
      
      if (response.success && response.data) {
        return {
          success: true,
          data: fromDTO(response.data),
        };
      }
      
      return response as ApiResponse<Usuario>;
    } catch (error) {
      console.error('Error al crear usuario:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  // Actualizar usuario
  async update(id: number, data: UsuarioFormData): Promise<ApiResponse<Usuario>> {
    try {
      // Primero obtenemos los roles para determinar is_staff correctamente
      const rolesResponse = await this.getRoles();
      const roles = rolesResponse.success ? rolesResponse.data || [] : [];
      
      // Buscar si el rol seleccionado es administrativo para determinar is_staff
      const selectedRole = roles.find(r => r.id === data.rol_id);
      const isAdministrativeRole = selectedRole?.es_administrativo || false;
      
      // Creamos un objeto para enviar al backend con los nombres de campo esperados
      const backendData: Record<string, any> = {
        username: data.username,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        telefono: data.telefono || undefined,
        direccion: data.direccion || undefined,
        ci: data.ci || undefined,
        fecha_nacimiento: data.fecha_nacimiento ? data.fecha_nacimiento.toISOString().split('T')[0] : undefined,
        rol_id: data.rol_id || undefined,
        is_superuser: data.is_superuser,
        is_active: data.is_active,
        personal_id: data.personal || undefined,
        residente_id: data.residente || undefined,
        // Determinamos is_staff basado en si el rol es administrativo
        is_staff: isAdministrativeRole
      };
      
      // Agregar los campos de contraseña SOLO si tienen un valor no vacío
      // para evitar el error de validación en el backend
      if (data.password && data.password.trim() !== '') {
        backendData.password = data.password;
        
        // Si hay password, también debe haber password_confirm
        if (data.password_confirm && data.password_confirm.trim() !== '') {
          backendData.password_confirm = data.password_confirm;
        } else {
          // Si falta password_confirm, mostrar advertencia en la consola y abortar la operación
          console.error('Error: Se proporcionó password pero falta password_confirm');
          throw new Error('Si proporciona una nueva contraseña, debe confirmarla');
        }
      }
      
      
      const response = await apiRequest(`/api/admin/users/${id}/`, {
        method: 'PUT',
        body: JSON.stringify(backendData),
      });
      
      // Si hay un error, mostrarlo en la consola
      if (!response.success) {
        console.error('Error en la actualización del usuario:', response.error);
      }
      
      if (response.success && response.data) {
        return {
          success: true,
          data: fromDTO(response.data),
        };
      }
      
      return response as ApiResponse<Usuario>;
    } catch (error) {
      console.error('Error inesperado en update:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  // Eliminar usuario
  async remove(id: number): Promise<ApiResponse> {
    return apiRequest(`/api/admin/users/${id}/`, {
      method: 'DELETE',
    });
  },

  // Obtener roles disponibles
  async getRoles(): Promise<ApiResponse<Role[]>> {
    const response = await apiRequest('/api/admin/roles/');
    
    if (response.success && response.data) {
      const data = response.data as any;
      return {
        success: true,
        data: data.results || data,
      };
    }
    
    return response as ApiResponse<Role[]>;
  },

  // Obtener personal disponible para autocompletado
  async getPersonalDisponible(): Promise<ApiResponse<Array<{
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    ci: string;
    telefono: string;
  }>>> {
    const response = await apiRequest('/api/admin/users/personal_disponible/');
    return response as ApiResponse<Array<{
      id: number;
      nombre: string;
      apellido: string;
      email: string;
      ci: string;
      telefono: string;
    }>>;
  },

  // Obtener residentes disponibles para autocompletado
  async getResidentesDisponibles(): Promise<ApiResponse<Array<{
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    ci: string;
    telefono: string;
    unidad_habitacional: string;
  }>>> {
    const response = await apiRequest('/api/residentes/disponibles_para_usuario/');
    return response as ApiResponse<Array<{
      id: number;
      nombre: string;
      apellido: string;
      email: string;
      ci: string;
      telefono: string;
      unidad_habitacional: string;
    }>>;
  },

  // Activar/desactivar usuario
  async toggleStatus(id: number, is_active: boolean): Promise<ApiResponse> {
    return apiRequest(`/api/admin/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }), // Cambiado de es_activo a is_active
    });
  },
};
