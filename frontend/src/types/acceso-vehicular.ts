/**
 * Tipos para el módulo de Acceso Vehicular
 */

export interface Puerta {
  id: number;
  nombre: string;
  descripcion: string;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface TipoVehiculo {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  icono: string;
  created_at: string;
  updated_at: string;
}

export interface ColorVehiculo {
  id: number;
  nombre: string;
  codigo_hex: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResultadoOCR {
  id: number;
  vehiculo_detectado: boolean;
  confianza_deteccion: number | null;
  clase_detectada: string;
  placa_detectada: string;
  confianza_ocr: number | null;
  color_detectado: string;
  metadatos: Record<string, unknown>;
  procesado_en: string;
  tiempo_procesamiento_ms: number | null;
}

export interface RegistroAcceso {
  id: number;
  tipo_evento: 'entrada' | 'salida';
  fecha_hora: string;
  puerta: Puerta;
  guardia_nombre: string;
  guardia_username: string;
  placa: string;
  tipo_vehiculo: TipoVehiculo | null;
  color: ColorVehiculo | null;
  imagen_url: string | null;
  observaciones: string;
  resultado_ocr: ResultadoOCR | null;
  created_at: string;
  updated_at: string;
}

export interface RegistroAccesoCreate {
  tipo_evento: 'entrada' | 'salida';
  puerta_id: number;
  placa: string;
  tipo_vehiculo_id?: number | null;
  color_id?: number | null;
  imagen_base64?: string;
  observaciones?: string;
}

export interface ResultadoProcesamiento {
  vehiculo_detectado: boolean;
  clase_detectada: string;
  confianza_deteccion: number;
  placa_detectada: string;
  confianza_ocr: number;
  color_detectado: string;
  tiempo_procesamiento_ms: number;
  metadatos: Record<string, unknown>;
}

export interface EstadisticasPorPuerta {
  puerta__nombre: string;
  total: number;
  entradas: number;
  salidas: number;
}

export interface EstadisticasPorHora {
  hora: string;
  total: number;
}

export interface EstadisticasPorTipo {
  tipo_vehiculo__nombre: string;
  total: number;
}

export interface EstadisticasPorColor {
  color__nombre: string;
  total: number;
}

export interface EstadisticasAcceso {
  periodo: {
    inicio: string;
    fin: string;
    nombre: string;
  };
  total_registros: number;
  total_entradas: number;
  total_salidas: number;
  por_puerta: EstadisticasPorPuerta[];
  por_hora: EstadisticasPorHora[];
  por_tipo_vehiculo: EstadisticasPorTipo[];
  por_color: EstadisticasPorColor[];
}

export interface ResumenDia {
  fecha: string;
  total: number;
  entradas: number;
  salidas: number;
  por_puerta: { puerta__nombre: string; total: number }[];
  ultimos_registros: RegistroAcceso[];
}

export interface BusquedaPlacaResult {
  placa_buscada: string;
  total_encontrados: number;
  registros: RegistroAcceso[];
}

export interface HealthCheckResponse {
  servicio_vision: {
    yolo_disponible: boolean;
    ocr_disponible: boolean;
    opencv_disponible: boolean;
  };
  base_datos: string;
  timestamp: string;
}

// Filtros para listado de registros
export interface FiltrosRegistroAcceso {
  tipo_evento?: 'entrada' | 'salida';
  puerta?: number;
  tipo_vehiculo?: number;
  color?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  fecha?: string;
  placa?: string;
  ordering?: string;
}

// Recuento por día
export interface RecuentoDia {
  fecha: string;
  total: number;
  entradas: number;
  salidas: number;
}

export interface RecuentoPorDiaResponse {
  fecha_inicio: string;
  fecha_fin: string;
  total_dias: number;
  total_registros: number;
  dias: RecuentoDia[];
}
