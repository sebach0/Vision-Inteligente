// Importar el cliente centralizado
import { api, getApiBaseUrl } from "@/lib/api";

// Tipos de datos para la API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T | null;
  error?: string;
  message?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  telefono?: string;
  direccion?: string;
  ci?: string;
  fecha_nacimiento?: string;
  is_admin_portal: boolean;
  puede_acceder_admin: boolean;
  personal?: number;
  conductor?: number;
  rol?: {
    id: number;
    nombre: string;
    es_administrativo: boolean;
    permisos: string[];
  };
  es_activo: boolean;
  fecha_creacion: string;
  fecha_ultimo_acceso?: string;
  codigo_empleado?: string;
  departamento?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AdminLoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password1: string;
  password2: string;
  telefono?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AdminAuthResponse {
  access: string;
  refresh: string;
  user: User;
}

// Clase para manejar errores de API
export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: any) {
    super(message);
    this.name = "ApiError";
  }
}

// Función para hacer peticiones HTTP usando el cliente Axios centralizado
export async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<ApiResponse<T>> {
  // Agregar token de autenticación si existe
  const token = localStorage.getItem("access_token");
  const headers = {
    ...options.headers,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    method: options.method || "GET",
    headers,
    data: options.body,
  };

  try {
    const response = await api({
      url: endpoint,
      method: config.method,
      headers: config.headers,
      data: config.data,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    // Axios maneja los errores de manera diferente
    if (error.response) {
      // Error de respuesta del servidor
      const errorData = error.response.data;
      console.log('Error response from API:', error.response.status, errorData); // Log para depuración
      
      // Construir mensaje descriptivo para errores de validación
      let errorMessage = "Error en la petición";
      
      if (typeof errorData === 'object' && errorData !== null) {
        // Si tenemos un objeto de errores de validación
        const firstErrorKey = Object.keys(errorData)[0];
        if (firstErrorKey) {
          const firstError = errorData[firstErrorKey];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = firstError[0];
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
      }
      
      throw new ApiError(
        errorData.error ||
          errorData.message ||
          errorData.detail ||
          errorMessage,
        error.response.status,
        errorData
      );
    } else if (error.request) {
      // Error de red
      throw new ApiError("Error de conexión", 0, { originalError: error });
    } else {
      // Error en la configuración de la petición
      throw new ApiError("Error en la petición", 0, { originalError: error });
    }
  }
}

// Servicios de autenticación para clientes
export const clientAuthService = {
  // Login de cliente
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthTokens>> {
    return apiRequest("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  // Registro de cliente
  async register(userData: RegisterData): Promise<ApiResponse<User>> {
    return apiRequest("/api/auth/registration/", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  // Logout de cliente
  async logout(): Promise<ApiResponse> {
    return apiRequest("/api/auth/logout/", {
      method: "POST",
    });
  },

  // Obtener perfil del usuario
  async getProfile(): Promise<ApiResponse<User>> {
    return apiRequest("/api/auth/user/");
  },

  // Actualizar perfil
  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    return apiRequest("/api/auth/user/", {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  },

  // Cambiar contraseña
  async changePassword(passwordData: {
    old_password: string;
    new_password1: string;
    new_password2: string;
  }): Promise<ApiResponse> {
    return apiRequest("/api/auth/password/change/", {
      method: "POST",
      body: JSON.stringify(passwordData),
    });
  },

  // Solicitar reset de contraseña
  async requestPasswordReset(email: string): Promise<ApiResponse> {
    return apiRequest("/api/auth/password/reset/", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  // Confirmar reset de contraseña
  async confirmPasswordReset(data: {
    uid: string;
    token: string;
    new_password1: string;
    new_password2: string;
  }): Promise<ApiResponse> {
    return apiRequest("/api/auth/password/reset/confirm/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Verificar email
  async verifyEmail(data: { key: string }): Promise<ApiResponse> {
    return apiRequest("/api/auth/registration/verify-email/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Reenviar verificación de email
  async resendEmailVerification(): Promise<ApiResponse> {
    return apiRequest("/api/auth/registration/resend-email/", {
      method: "POST",
    });
  },
};

// Servicios de autenticación para administradores
export const adminAuthService = {
  // Login de administrador
  async login(
    credentials: AdminLoginCredentials
  ): Promise<ApiResponse<AdminAuthResponse>> {
    return apiRequest("/api/admin/login/", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  // Logout de administrador
  async logout(refreshToken: string): Promise<ApiResponse> {
    // Backend expone /api/admin/logout/ (users.urls -> logout_view)
    return apiRequest("/api/admin/logout/", {
      method: "POST",
      body: JSON.stringify({ refresh: refreshToken }),
    });
  },

  // Refresh token
  async refreshToken(
    refreshToken: string
  ): Promise<ApiResponse<{ access: string }>> {
    // Backend expone /api/admin/token/refresh/
    return apiRequest("/api/admin/token/refresh/", {
      method: "POST",
      body: JSON.stringify({ refresh: refreshToken }),
    });
  },

  // Obtener perfil del administrador
  async getProfile(): Promise<ApiResponse<User>> {
    return apiRequest("/api/admin/profile/");
  },

  // Actualizar perfil del administrador
  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    return apiRequest("/api/admin/profile/", {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  },

  // Cambiar contraseña del administrador
  async changePassword(passwordData: {
    old_password: string;
    new_password: string;
    new_password_confirm: string;
  }): Promise<ApiResponse> {
    return apiRequest("/api/admin/change-password/", {
      method: "PUT",
      body: JSON.stringify(passwordData),
    });
  },

  // Obtener datos del dashboard
  async getDashboardData(): Promise<
    ApiResponse<{
      tipo_usuario: string;
      rol: string;
      permisos: string[];
      departamento?: string;
      codigo_empleado?: string;
    }>
  > {
    return apiRequest("/api/admin/dashboard-data/");
  },

  // Obtener lista de usuarios (solo admin)
  async getUsers(): Promise<
    ApiResponse<{
      count: number;
      next: string | null;
      previous: string | null;
      results: User[];
    }>
  > {
    return apiRequest("/api/admin/users/");
  },

  // Crear usuario (solo superadmin)
  async createUser(userData: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    password_confirm: string;
    rol_id: number;
    telefono?: string;
    direccion?: string;
    ci?: string;
    fecha_nacimiento?: string;
    is_admin_portal?: boolean;
    personal_id?: number;
    conductor_id?: number;
    codigo_empleado?: string;
    departamento?: string;
  }): Promise<ApiResponse<User>> {
    return apiRequest("/api/admin/users/", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  // Obtener roles
  async getRoles(): Promise<
    ApiResponse<
      Array<{
        id: number;
        nombre: string;
        descripcion: string;
        es_administrativo: boolean;
        permisos: string[];
      }>
    >
  > {
    return apiRequest("/api/admin/roles/");
  },
};

// Servicios de ML/IA
export const mlService = {
  // Calcular ETA
  async calculateETA(data: {
    vehicle_location: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    destination: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    traffic_factor?: number;
  }): Promise<
    ApiResponse<{
      eta_minutes: number;
      eta_datetime: string;
      distance_km: number;
      confidence: number;
      traffic_factor: number;
    }>
  > {
    return apiRequest("/api/ml/eta/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Optimizar rutas (VRP)
  async optimizeRoutes(data: {
    vehicles: Array<{
      id: string;
      current_location: {
        latitude: number;
        longitude: number;
      };
      capacity: number;
      current_load?: number;
      status?: string;
    }>;
    requests: Array<{
      id: string;
      pickup_location: {
        latitude: number;
        longitude: number;
      };
      dropoff_location: {
        latitude: number;
        longitude: number;
      };
      passenger_count: number;
      priority?: number;
    }>;
  }): Promise<
    ApiResponse<{
      optimized_routes: Array<{
        vehicle_id: string;
        route: Array<{
          request_id: string;
          pickup_location: any;
          dropoff_location: any;
          passenger_count: number;
        }>;
        total_distance: number;
        total_time: number;
        efficiency_score: number;
      }>;
      unassigned_requests: string[];
      total_vehicles_used: number;
      optimization_time: number;
      algorithm: string;
    }>
  > {
    return apiRequest("/api/ml/vrp/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Obtener información de tráfico
  async getTrafficInfo(data: {
    origin: {
      latitude: number;
      longitude: number;
    };
    destination: {
      latitude: number;
      longitude: number;
    };
  }): Promise<
    ApiResponse<{
      traffic_factor: number;
      traffic_level: string;
      origin: any;
      destination: any;
    }>
  > {
    return apiRequest("/api/ml/traffic/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Estado de los servicios ML
  async getStatus(): Promise<
    ApiResponse<{
      eta_service: string;
      vrp_service: string;
      traffic_service: string;
      version: string;
      last_updated: string;
    }>
  > {
    return apiRequest("/api/ml/status/");
  },
};

// Servicios para gestión de roles
export const rolesService = {
  // Obtener todos los roles
  async getRoles(): Promise<
    ApiResponse<{
      count: number;
      next: string | null;
      previous: string | null;
      results: Array<{
        id: number;
        nombre: string;
        descripcion: string;
        es_administrativo: boolean;
        permisos: string[];
        fecha_creacion: string;
        fecha_actualizacion: string;
      }>;
    }>
  > {
    return apiRequest("/api/admin/roles/");
  },

  // Obtener un rol específico
  async getRole(id: number): Promise<
    ApiResponse<{
      id: number;
      nombre: string;
      descripcion: string;
      es_administrativo: boolean;
      permisos: string[];
      fecha_creacion: string;
      fecha_actualizacion: string;
    }>
  > {
    return apiRequest(`/api/admin/roles/${id}/`);
  },

  // Crear un nuevo rol
  async createRole(data: {
    nombre: string;
    descripcion: string;
    es_administrativo: boolean;
    permisos: string[];
  }): Promise<
    ApiResponse<{
      id: number;
      nombre: string;
      descripcion: string;
      es_administrativo: boolean;
      permisos: string[];
      fecha_creacion: string;
      fecha_actualizacion: string;
    }>
  > {
    return apiRequest("/api/admin/roles/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Actualizar un rol
  async updateRole(
    id: number,
    data: {
      nombre: string;
      descripcion: string;
      es_administrativo: boolean;
      permisos: string[];
    }
  ): Promise<
    ApiResponse<{
      id: number;
      nombre: string;
      descripcion: string;
      es_administrativo: boolean;
      permisos: string[];
      fecha_creacion: string;
      fecha_actualizacion: string;
    }>
  > {
    return apiRequest(`/api/admin/roles/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Eliminar un rol
  async deleteRole(id: number): Promise<ApiResponse> {
    return apiRequest(`/api/admin/roles/${id}/`, {
      method: "DELETE",
    });
  },

  // Obtener permisos disponibles
  async getAvailablePermissions(): Promise<
    ApiResponse<{
      permisos: Array<[string, string]>;
      grupos_permisos: Record<string, string[]>;
    }>
  > {
    return apiRequest("/api/admin/roles/permisos_disponibles/");
  },

  // Asignar permisos a un rol
  async assignPermissions(
    roleId: number,
    permisos: string[]
  ): Promise<ApiResponse> {
    return apiRequest(`/api/admin/roles/${roleId}/asignar_permisos/`, {
      method: "POST",
      body: JSON.stringify({ permisos }),
    });
  },

  // Agregar un permiso a un rol
  async addPermission(roleId: number, permiso: string): Promise<ApiResponse> {
    return apiRequest(`/api/admin/roles/${roleId}/agregar_permiso/`, {
      method: "POST",
      body: JSON.stringify({ permiso }),
    });
  },

  // Quitar un permiso de un rol
  async removePermission(
    roleId: number,
    permiso: string
  ): Promise<ApiResponse> {
    return apiRequest(`/api/admin/roles/${roleId}/quitar_permiso/`, {
      method: "POST",
      body: JSON.stringify({ permiso }),
    });
  },

  // Obtener estadísticas de roles
  async getStatistics(): Promise<
    ApiResponse<{
      total_roles: number;
      roles_administrativos: number;
      roles_clientes: number;
      permisos_por_rol: Array<{
        rol: string;
        permisos_count: number;
        permisos: string[];
      }>;
    }>
  > {
    return apiRequest("/api/admin/roles/estadisticas/");
  },
};

// Servicios para gestión de permisos (solo lectura desde el backend)
export const permissionsService = {
  // Obtener todos los permisos disponibles
  async getAvailablePermissions(): Promise<
    ApiResponse<{
      permisos: Array<[string, string]>;
      grupos_permisos: Record<string, string[]>;
    }>
  > {
    return apiRequest("/api/admin/roles/permisos_disponibles/");
  },
};

// Servicios para gestión de usuarios
export const usersService = {
  // Obtener todos los usuarios
  async getUsers(): Promise<
    ApiResponse<{
      count: number;
      next: string | null;
      previous: string | null;
      results: Array<{
        id: number;
        username: string;
        email: string;
        first_name: string;
        last_name: string;
        telefono?: string;
        direccion?: string;
        ci?: string;
        fecha_nacimiento?: string;
        is_admin_portal: boolean;
        puede_acceder_admin: boolean;
        personal?: number;
        conductor?: number;
        rol?: {
          id: number;
          nombre: string;
          es_administrativo: boolean;
          permisos: string[];
        };
        es_activo: boolean;
        fecha_creacion: string;
        fecha_ultimo_acceso?: string;
        codigo_empleado?: string;
        departamento?: string;
      }>;
    }>
  > {
    return apiRequest("/api/admin/users/");
  },

  // Obtener un usuario específico
  async getUser(id: number): Promise<
    ApiResponse<{
      id: number;
      username: string;
      email: string;
      first_name: string;
      last_name: string;
      telefono?: string;
      direccion?: string;
      ci?: string;
      fecha_nacimiento?: string;
      is_admin_portal: boolean;
      puede_acceder_admin: boolean;
      personal?: number;
      conductor?: number;
      rol?: {
        id: number;
        nombre: string;
        es_administrativo: boolean;
        permisos: string[];
      };
      es_activo: boolean;
      fecha_creacion: string;
      fecha_ultimo_acceso?: string;
      codigo_empleado?: string;
      departamento?: string;
    }>
  > {
    return apiRequest(`/api/admin/users/${id}/`);
  },

  // Crear un nuevo usuario
  async createUser(data: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    password_confirm: string;
    rol_id: number;
    telefono?: string;
    direccion?: string;
    ci?: string;
    fecha_nacimiento?: string;
    is_admin_portal?: boolean;
    personal_id?: number;
    conductor_id?: number;
    codigo_empleado?: string;
    departamento?: string;
  }): Promise<
    ApiResponse<{
      id: number;
      username: string;
      email: string;
      first_name: string;
      last_name: string;
      telefono?: string;
      direccion?: string;
      ci?: string;
      fecha_nacimiento?: string;
      is_admin_portal: boolean;
      puede_acceder_admin: boolean;
      personal?: number;
      conductor?: number;
      rol?: {
        id: number;
        nombre: string;
        es_administrativo: boolean;
        permisos: string[];
      };
      es_activo: boolean;
      fecha_creacion: string;
      fecha_ultimo_acceso?: string;
      codigo_empleado?: string;
      departamento?: string;
    }>
  > {
    return apiRequest("/api/admin/users/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Actualizar un usuario
  async updateUser(
    id: number,
    data: {
      username: string;
      email: string;
      first_name: string;
      last_name: string;
      rol_id: number;
      telefono?: string;
      direccion?: string;
      ci?: string;
      fecha_nacimiento?: string;
      is_admin_portal?: boolean;
      personal_id?: number;
      conductor_id?: number;
      password?: string;
      password_confirm?: string;
      codigo_empleado?: string;
      departamento?: string;
    }
  ): Promise<
    ApiResponse<{
      id: number;
      username: string;
      email: string;
      first_name: string;
      last_name: string;
      telefono?: string;
      direccion?: string;
      ci?: string;
      fecha_nacimiento?: string;
      is_admin_portal: boolean;
      puede_acceder_admin: boolean;
      personal?: number;
      conductor?: number;
      rol?: {
        id: number;
        nombre: string;
        es_administrativo: boolean;
        permisos: string[];
      };
      es_activo: boolean;
      fecha_creacion: string;
      fecha_ultimo_acceso?: string;
      codigo_empleado?: string;
      departamento?: string;
    }>
  > {
    return apiRequest(`/api/admin/users/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Eliminar un usuario
  async deleteUser(id: number): Promise<ApiResponse> {
    return apiRequest(`/api/admin/users/${id}/`, {
      method: "DELETE",
    });
  },

  // Activar/desactivar usuario
  async toggleUserStatus(id: number, es_activo: boolean): Promise<ApiResponse> {
    return apiRequest(`/api/admin/users/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ es_activo }),
    });
  },

  // Obtener personal disponible para autocompletado
  async getPersonalDisponible(): Promise<
    ApiResponse<
      Array<{
        id: number;
        nombre: string;
        apellido: string;
        email: string;
        ci: string;
        telefono: string;
      }>
    >
  > {
    return apiRequest("/api/admin/users/personal_disponible/");
  },

  async getResidentesDisponibles(): Promise<
    ApiResponse<
      Array<{
      id: number;
      personal__nombre: string;
      personal__apellido: string;
      personal__email: string;
      personal__ci: string;
      personal__telefono: string;
      nro_licencia: string;
    }>
   >
  > {
    return apiRequest("/api/admin/users/residentes_disponibles/");
  },
};

// Utilidades para manejo de tokens
export const tokenUtils = {
  // Guardar tokens en localStorage
  saveTokens(tokens: AuthTokens | AdminAuthResponse): void {
    localStorage.setItem("access_token", tokens.access);
    localStorage.setItem("refresh_token", tokens.refresh);

    // Guardar información del usuario si está disponible
    if ("user" in tokens) {
      localStorage.setItem("user", JSON.stringify(tokens.user));
    }
  },

  // Obtener token de acceso
  getAccessToken(): string | null {
    return localStorage.getItem("access_token");
  },

  // Obtener token de refresh
  getRefreshToken(): string | null {
    return localStorage.getItem("refresh_token");
  },

  // Obtener usuario guardado
  getStoredUser(): User | null {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  // Limpiar tokens
  clearTokens(): void {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  },

  // Verificar si el token está expirado (básico)
  isTokenExpired(token: string | null): boolean {
    if (!token) return true;

    try {
      const parts = token.split(".");
      if (parts.length !== 3 || !parts[1]) return true;

      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  },
};
