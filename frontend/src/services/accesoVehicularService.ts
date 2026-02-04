/**
 * Servicio API para el módulo de Acceso Vehicular
 */

import { api } from "@/lib/api";
import type {
  Puerta,
  TipoVehiculo,
  ColorVehiculo,
  RegistroAcceso,
  RegistroAccesoCreate,
  ResultadoProcesamiento,
  EstadisticasAcceso,
  ResumenDia,
  BusquedaPlacaResult,
  HealthCheckResponse,
  FiltrosRegistroAcceso,
} from "@/types/acceso-vehicular";

const BASE_URL = "/acceso-vehicular";

// ============ PUERTAS ============

export const puertasApi = {
  listar: async (soloActivas = true): Promise<Puerta[]> => {
    const params = soloActivas ? { activa: "true" } : {};
    const response = await api.get<Puerta[]>(`${BASE_URL}/puertas/`, { params });
    return response.data;
  },

  obtener: async (id: number): Promise<Puerta> => {
    const response = await api.get<Puerta>(`${BASE_URL}/puertas/${id}/`);
    return response.data;
  },

  crear: async (data: Partial<Puerta>): Promise<Puerta> => {
    const response = await api.post<Puerta>(`${BASE_URL}/puertas/`, data);
    return response.data;
  },

  actualizar: async (id: number, data: Partial<Puerta>): Promise<Puerta> => {
    const response = await api.patch<Puerta>(`${BASE_URL}/puertas/${id}/`, data);
    return response.data;
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`${BASE_URL}/puertas/${id}/`);
  },
};

// ============ TIPOS DE VEHÍCULO ============

export const tiposVehiculoApi = {
  listar: async (soloActivos = true): Promise<TipoVehiculo[]> => {
    const params = soloActivos ? { activo: "true" } : {};
    const response = await api.get<TipoVehiculo[]>(`${BASE_URL}/tipos-vehiculo/`, { params });
    return response.data;
  },

  obtener: async (id: number): Promise<TipoVehiculo> => {
    const response = await api.get<TipoVehiculo>(`${BASE_URL}/tipos-vehiculo/${id}/`);
    return response.data;
  },

  crear: async (data: Partial<TipoVehiculo>): Promise<TipoVehiculo> => {
    const response = await api.post<TipoVehiculo>(`${BASE_URL}/tipos-vehiculo/`, data);
    return response.data;
  },

  actualizar: async (id: number, data: Partial<TipoVehiculo>): Promise<TipoVehiculo> => {
    const response = await api.patch<TipoVehiculo>(`${BASE_URL}/tipos-vehiculo/${id}/`, data);
    return response.data;
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`${BASE_URL}/tipos-vehiculo/${id}/`);
  },
};

// ============ COLORES ============

export const coloresApi = {
  listar: async (soloActivos = true): Promise<ColorVehiculo[]> => {
    const params = soloActivos ? { activo: "true" } : {};
    const response = await api.get<ColorVehiculo[]>(`${BASE_URL}/colores/`, { params });
    return response.data;
  },

  obtener: async (id: number): Promise<ColorVehiculo> => {
    const response = await api.get<ColorVehiculo>(`${BASE_URL}/colores/${id}/`);
    return response.data;
  },

  crear: async (data: Partial<ColorVehiculo>): Promise<ColorVehiculo> => {
    const response = await api.post<ColorVehiculo>(`${BASE_URL}/colores/`, data);
    return response.data;
  },

  actualizar: async (id: number, data: Partial<ColorVehiculo>): Promise<ColorVehiculo> => {
    const response = await api.patch<ColorVehiculo>(`${BASE_URL}/colores/${id}/`, data);
    return response.data;
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`${BASE_URL}/colores/${id}/`);
  },
};

// ============ REGISTROS DE ACCESO ============

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const registrosAccesoApi = {
  listar: async (
    filtros?: FiltrosRegistroAcceso,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResponse<RegistroAcceso>> => {
    const params = {
      ...filtros,
      page,
      page_size: pageSize,
    };
    const response = await api.get<PaginatedResponse<RegistroAcceso>>(
      `${BASE_URL}/registros/`,
      { params }
    );
    return response.data;
  },

  obtener: async (id: number): Promise<RegistroAcceso> => {
    const response = await api.get<RegistroAcceso>(`${BASE_URL}/registros/${id}/`);
    return response.data;
  },

  crear: async (data: RegistroAccesoCreate): Promise<RegistroAcceso> => {
    const response = await api.post<RegistroAcceso>(`${BASE_URL}/registros/`, data);
    return response.data;
  },

  actualizar: async (id: number, data: Partial<RegistroAccesoCreate>): Promise<RegistroAcceso> => {
    const response = await api.patch<RegistroAcceso>(`${BASE_URL}/registros/${id}/`, data);
    return response.data;
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`${BASE_URL}/registros/${id}/`);
  },

  // Procesar imagen con IA
  procesarImagen: async (imagenBase64: string): Promise<ResultadoProcesamiento> => {
    const response = await api.post<ResultadoProcesamiento>(
      `${BASE_URL}/registros/procesar-imagen/`,
      { imagen: imagenBase64 }
    );
    return response.data;
  },

  // Estadísticas
  estadisticas: async (
    periodo?: "hoy" | "semana" | "mes",
    fechaInicio?: string,
    fechaFin?: string
  ): Promise<EstadisticasAcceso> => {
    const params: Record<string, string> = {};
    if (periodo) params.periodo = periodo;
    if (fechaInicio) params.fecha_inicio = fechaInicio;
    if (fechaFin) params.fecha_fin = fechaFin;

    const response = await api.get<EstadisticasAcceso>(
      `${BASE_URL}/registros/estadisticas/`,
      { params }
    );
    return response.data;
  },

  // Buscar por placa
  buscarPlaca: async (placa: string, limite = 20): Promise<BusquedaPlacaResult> => {
    const response = await api.get<BusquedaPlacaResult>(
      `${BASE_URL}/registros/buscar-placa/`,
      { params: { placa, limite } }
    );
    return response.data;
  },

  // Resumen del día
  resumenDia: async (): Promise<ResumenDia> => {
    const response = await api.get<ResumenDia>(`${BASE_URL}/registros/resumen-dia/`);
    return response.data;
  },

  // Health check del servicio de visión
  healthCheck: async (): Promise<HealthCheckResponse> => {
    const response = await api.get<HealthCheckResponse>(`${BASE_URL}/registros/health-check/`);
    return response.data;
  },
};

// Export all APIs
export const accesoVehicularService = {
  puertas: puertasApi,
  tiposVehiculo: tiposVehiculoApi,
  colores: coloresApi,
  registros: registrosAccesoApi,
};

export default accesoVehicularService;
