import { useState, useEffect, useCallback } from "react";
import { rolesService } from "@/services/api";
import { notificacionesService } from "@/services/notificacionesService";
import type { Role, RolOption } from "@/types/index";
import { toast } from "sonner";

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [ordering, setOrdering] = useState("");

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: pageSize,
        search,
        ordering,
        ...filters,
      };
      
      // Primero intentamos obtener los roles con total_usuarios para notificaciones
      try {
        const rolesDisponibles = await notificacionesService.getRolesDisponibles();
        if (rolesDisponibles && rolesDisponibles.length > 0) {
          // Transformamos los datos para asegurarnos de que tienen la estructura correcta
          const rolesConTotal = rolesDisponibles.map(rol => ({
            id: rol.id,
            nombre: rol.nombre,
            descripcion: rol.descripcion || '',
            es_administrativo: false, // Esto no viene del endpoint de notificaciones
            permisos: [],             // Esto no viene del endpoint de notificaciones
            fecha_creacion: new Date().toISOString(), // Esto no viene del endpoint de notificaciones
            fecha_actualizacion: new Date().toISOString(), // Esto no viene del endpoint de notificaciones
            total_usuarios: rol.total_usuarios || 0
          }));
          setRoles(rolesConTotal);
          setTotalCount(rolesDisponibles.length);
          setLoading(false);
          return;
        }
      } catch (notificationError) {
        console.error("Error al obtener roles desde notificaciones:", notificationError);
        // Si falla, continuamos con el método original
      }
      
      // Método original como fallback
      const response = await rolesService.getRoles();
      if (response.success && response.data) {
        const rolesData = response.data.results || response.data;
        setRoles(Array.isArray(rolesData) ? rolesData : []);
        setTotalCount(Array.isArray(rolesData) ? rolesData.length : 0);
      } else {
        setError(response.error || "Error al cargar roles");
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, ordering, filters]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const createRole = async (roleData: Partial<Role>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await rolesService.createRole(roleData as any);
      if (response.success && response.data) {
        fetchRoles(); // Refrescar la lista
        return response.data;
      } else {
        setError(response.error || "Error al crear rol");
        throw new Error(response.error || "Error al crear rol");
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (id: number, roleData: Partial<Role>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await rolesService.updateRole(id, roleData as any);
      if (response.success && response.data) {
        fetchRoles(); // Refrescar la lista
        return response.data;
      } else {
        setError(response.error || "Error al actualizar rol");
        throw new Error(response.error || "Error al actualizar rol");
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteRole = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await rolesService.deleteRole(id);
      if (response.success) {
        fetchRoles(); // Refrescar la lista
      } else {
        setError(response.error || "Error al eliminar rol");
        throw new Error(response.error || "Error al eliminar rol");
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    roles,
    loading,
    error,
    totalCount,
    page,
    pageSize,
    search,
    filters,
    ordering,
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    setOrdering,
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
  };
}

// Hook para obtener permisos disponibles
export function usePermisosDisponibles() {
  const [permisos, setPermisos] = useState<Array<[string, string]>>([]);
  const [gruposPermisos, setGruposPermisos] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermisos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await rolesService.getAvailablePermissions();
      if (response.success && response.data) {
        setPermisos(response.data.permisos || []);
        setGruposPermisos(response.data.grupos_permisos || {});
      } else {
        setError(response.error || "Error al cargar permisos");
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermisos();
  }, [fetchPermisos]);

  return {
    permisos,
    gruposPermisos,
    loading,
    error,
    refetch: fetchPermisos,
  };
}
