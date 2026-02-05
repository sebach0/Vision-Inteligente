/**
 * Hooks para el módulo de Acceso Vehicular
 */

import { useState, useEffect, useCallback } from "react";
import {
  puertasApi,
  tiposVehiculoApi,
  coloresApi,
  registrosAccesoApi,
} from "@/services/accesoVehicularService";
import type {
  Puerta,
  TipoVehiculo,
  ColorVehiculo,
  RegistroAcceso,
  RegistroAccesoCreate,
  ResultadoProcesamiento,
  EstadisticasAcceso,
  ResumenDia,
  FiltrosRegistroAcceso,
  RecuentoPorDiaResponse,
  RecuentoDia,
} from "@/types/acceso-vehicular";
import { useToast } from "@/hooks/use-toast";

// ============ HOOK PARA CATÁLOGOS ============

export function useCatalogosAcceso() {
  const [puertas, setPuertas] = useState<Puerta[]>([]);
  const [tiposVehiculo, setTiposVehiculo] = useState<TipoVehiculo[]>([]);
  const [colores, setColores] = useState<ColorVehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarCatalogos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [puertasData, tiposData, coloresData] = await Promise.all([
        puertasApi.listar(true),
        tiposVehiculoApi.listar(true),
        coloresApi.listar(true),
      ]);
      setPuertas(puertasData);
      setTiposVehiculo(tiposData);
      setColores(coloresData);
    } catch (err) {
      setError("Error al cargar los catálogos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarCatalogos();
  }, [cargarCatalogos]);

  return {
    puertas,
    tiposVehiculo,
    colores,
    loading,
    error,
    recargar: cargarCatalogos,
  };
}

// ============ HOOK PARA REGISTRO DE ACCESO ============

export function useRegistroAcceso() {
  const [loading, setLoading] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [resultadoProcesamiento, setResultadoProcesamiento] =
    useState<ResultadoProcesamiento | null>(null);
  const { toast } = useToast();

  const procesarImagen = useCallback(
    async (imagenBase64: string): Promise<ResultadoProcesamiento | null> => {
      setProcesando(true);
      setResultadoProcesamiento(null);
      try {
        const resultado = await registrosAccesoApi.procesarImagen(imagenBase64);
        setResultadoProcesamiento(resultado);
        
        if (resultado.placa_detectada) {
          toast({
            title: "Placa detectada",
            description: `Se detectó la placa: ${resultado.placa_detectada}`,
          });
        } else {
          toast({
            title: "Procesamiento completado",
            description: "No se pudo detectar la placa automáticamente",
            variant: "destructive",
          });
        }
        
        return resultado;
      } catch (err) {
        toast({
          title: "Error",
          description: "Error al procesar la imagen",
          variant: "destructive",
        });
        console.error(err);
        return null;
      } finally {
        setProcesando(false);
      }
    },
    [toast]
  );

  const registrarAcceso = useCallback(
    async (data: RegistroAccesoCreate): Promise<RegistroAcceso | null> => {
      setLoading(true);
      try {
        const registro = await registrosAccesoApi.crear(data);
        toast({
          title: "Registro exitoso",
          description: `${data.tipo_evento === "entrada" ? "Entrada" : "Salida"} registrada: ${data.placa}`,
        });
        return registro;
      } catch (err) {
        toast({
          title: "Error",
          description: "Error al registrar el acceso",
          variant: "destructive",
        });
        console.error(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const limpiarResultado = useCallback(() => {
    setResultadoProcesamiento(null);
  }, []);

  return {
    loading,
    procesando,
    resultadoProcesamiento,
    procesarImagen,
    registrarAcceso,
    limpiarResultado,
  };
}

// ============ HOOK PARA HISTORIAL DE ACCESOS ============

export function useHistorialAccesos(filtrosIniciales?: FiltrosRegistroAcceso) {
  const [registros, setRegistros] = useState<RegistroAcceso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosRegistroAcceso>(
    filtrosIniciales || {}
  );
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    hasNext: false,
    hasPrev: false,
  });

  const cargarRegistros = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await registrosAccesoApi.listar(
        filtros,
        pagination.page,
        pagination.pageSize
      );
      setRegistros(response.results);
      setPagination((prev) => ({
        ...prev,
        total: response.count,
        hasNext: !!response.next,
        hasPrev: !!response.previous,
      }));
    } catch (err) {
      setError("Error al cargar los registros");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filtros, pagination.page, pagination.pageSize]);

  useEffect(() => {
    cargarRegistros();
  }, [cargarRegistros]);

  const cambiarPagina = useCallback((newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  }, []);

  const aplicarFiltros = useCallback((nuevosFiltros: FiltrosRegistroAcceso) => {
    setFiltros(nuevosFiltros);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  return {
    registros,
    loading,
    error,
    filtros,
    pagination,
    cargarRegistros,
    cambiarPagina,
    aplicarFiltros,
  };
}

// ============ HOOK PARA DASHBOARD ============

export function useDashboardAcceso() {
  const [estadisticas, setEstadisticas] = useState<EstadisticasAcceso | null>(null);
  const [resumenDia, setResumenDia] = useState<ResumenDia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<"hoy" | "semana" | "mes">("hoy");

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stats, resumen] = await Promise.all([
        registrosAccesoApi.estadisticas(periodo),
        registrosAccesoApi.resumenDia(),
      ]);
      setEstadisticas(stats);
      setResumenDia(resumen);
    } catch (err) {
      setError("Error al cargar las estadísticas");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const cambiarPeriodo = useCallback((nuevoPeriodo: "hoy" | "semana" | "mes") => {
    setPeriodo(nuevoPeriodo);
  }, []);

  return {
    estadisticas,
    resumenDia,
    loading,
    error,
    periodo,
    cambiarPeriodo,
    recargar: cargarDatos,
  };
}

// ============ HOOK PARA BÚSQUEDA POR PLACA ============

export function useBusquedaPlaca() {
  const [resultados, setResultados] = useState<RegistroAcceso[]>([]);
  const [loading, setLoading] = useState(false);
  const [placaBuscada, setPlacaBuscada] = useState("");
  const [totalEncontrados, setTotalEncontrados] = useState(0);

  const buscar = useCallback(async (placa: string) => {
    if (placa.length < 3) {
      setResultados([]);
      setTotalEncontrados(0);
      return;
    }

    setLoading(true);
    setPlacaBuscada(placa);
    try {
      const response = await registrosAccesoApi.buscarPlaca(placa);
      setResultados(response.registros);
      setTotalEncontrados(response.total_encontrados);
    } catch (err) {
      console.error(err);
      setResultados([]);
      setTotalEncontrados(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const limpiar = useCallback(() => {
    setResultados([]);
    setPlacaBuscada("");
    setTotalEncontrados(0);
  }, []);

  return {
    resultados,
    loading,
    placaBuscada,
    totalEncontrados,
    buscar,
    limpiar,
  };
}

// ============ HOOK PARA RECUENTO POR DÍA ============

export function useRecuentoPorDia() {
  const [datos, setDatos] = useState<RecuentoPorDiaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (
    fechaInicio?: string,
    fechaFin?: string,
    puerta?: number,
    tipoEvento?: 'entrada' | 'salida'
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await registrosAccesoApi.recuentoPorDia(
        fechaInicio,
        fechaFin,
        puerta,
        tipoEvento
      );
      setDatos(response);
    } catch (err) {
      setError("Error al cargar el recuento por día");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    datos,
    dias: datos?.dias || [],
    totalRegistros: datos?.total_registros || 0,
    totalDias: datos?.total_dias || 0,
    loading,
    error,
    cargar,
  };
}
