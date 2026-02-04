import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { usuariosApi } from '@/services/usuariosService';
import type { 
  Usuario, 
  UsuarioFormData, 
  UsuarioFilters, 
  PaginatedResponse,
  Role 
} from '@/types';

interface UseUsuariosState {
  data: PaginatedResponse<Usuario> | null;
  loading: boolean;
  error: string | null;
  selectedItem: Usuario | null;
  isStoreModalOpen: boolean;
  isDeleteModalOpen: boolean;
  filters: UsuarioFilters;
  roles: Role[];
  personalDisponible: Array<{
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    ci: string;
    telefono: string;
  }>;
  residentesDisponibles: Array<{
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    ci: string;
    telefono: string;
    unidad_habitacional: string;
  }>;
}

interface UseUsuariosActions {
  // Data operations
  loadData: (filters?: UsuarioFilters) => Promise<void>;
  loadItem: (id: number) => Promise<void>;
  createItem: (data: UsuarioFormData) => Promise<boolean>;
  updateItem: (id: number, data: UsuarioFormData) => Promise<boolean>;
  deleteItem: (id: number) => Promise<boolean>;
  toggleStatus: (id: number, is_active: boolean) => Promise<boolean>;
  
  // UI state management
  openStoreModal: (item?: Usuario) => void;
  closeStoreModal: () => void;
  openDeleteModal: (item: Usuario) => void;
  closeDeleteModal: () => void;
  setFilters: (filters: UsuarioFilters) => void;
  clearError: () => void;
  
  // Utility functions
  loadRoles: () => Promise<void>;
  loadPersonalDisponible: () => Promise<void>;
  loadResidentesDisponibles: () => Promise<void>;
}

export function useUsuarios(): UseUsuariosState & UseUsuariosActions {
  const [state, setState] = useState<UseUsuariosState>({
    data: null,
    loading: false,
    error: null,
    selectedItem: null,
    isStoreModalOpen: false,
    isDeleteModalOpen: false,
    filters: {},
    roles: [],
    personalDisponible: [],
    residentesDisponibles: [],
  });

  const loadData = useCallback(async (filters?: UsuarioFilters) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await usuariosApi.list(filters);
      
      if (response.success && response.data) {
        setState(prev => ({ 
          ...prev, 
          data: response.data!, 
          loading: false,
          filters: filters || prev.filters 
        }));
      } else {
        throw new Error(response.error || 'Error al cargar los usuarios');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      toast.error(errorMessage);
    }
  }, []);

  const loadItem = useCallback(async (id: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await usuariosApi.get(id);
      
      if (response.success && response.data) {
        setState(prev => ({ 
          ...prev, 
          selectedItem: response.data!, 
          loading: false 
        }));
      } else {
        throw new Error(response.error || 'Error al cargar el usuario');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      toast.error(errorMessage);
    }
  }, []);

  const createItem = useCallback(async (data: UsuarioFormData): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await usuariosApi.create(data);
      
      if (response.success) {
        setState(prev => ({ 
          ...prev, 
          loading: false,
          isStoreModalOpen: false,
          selectedItem: null 
        }));
        toast.success('Usuario creado exitosamente');
        await loadData(state.filters); // Recargar datos
        return true;
      } else {
        throw new Error(response.error || 'Error al crear el usuario');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      toast.error(errorMessage);
      return false;
    }
  }, [loadData, state.filters]);

  const updateItem = useCallback(async (id: number, data: UsuarioFormData): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await usuariosApi.update(id, data);
      
      if (response.success) {
        setState(prev => ({ 
          ...prev, 
          loading: false,
          isStoreModalOpen: false,
          selectedItem: null 
        }));
        toast.success('Usuario actualizado exitosamente');
        await loadData(state.filters); // Recargar datos
        return true;
      } else {
        throw new Error(response.error || 'Error al actualizar el usuario');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      toast.error(errorMessage);
      return false;
    }
  }, [loadData, state.filters]);

  const deleteItem = useCallback(async (id: number): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await usuariosApi.remove(id);
      
      if (response.success) {
        setState(prev => ({ 
          ...prev, 
          loading: false,
          isDeleteModalOpen: false,
          selectedItem: null 
        }));
        toast.success('Usuario eliminado exitosamente');
        await loadData(state.filters); // Recargar datos
        return true;
      } else {
        throw new Error(response.error || 'Error al eliminar el usuario');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      toast.error(errorMessage);
      return false;
    }
  }, [loadData, state.filters]);

  const toggleStatus = useCallback(async (id: number, is_active: boolean): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await usuariosApi.toggleStatus(id, is_active);
      
      if (response.success) {
        setState(prev => ({ 
          ...prev, 
          loading: false 
        }));
        toast.success(`Usuario ${is_active ? 'activado' : 'desactivado'} exitosamente`);
        await loadData(state.filters); // Recargar datos
        return true;
      } else {
        throw new Error(response.error || 'Error al cambiar el estado del usuario');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      toast.error(errorMessage);
      return false;
    }
  }, [loadData, state.filters]);

  const openStoreModal = useCallback((item?: Usuario) => {
    setState(prev => ({ 
      ...prev, 
      isStoreModalOpen: true, 
      selectedItem: item || null 
    }));
  }, []);

  const closeStoreModal = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isStoreModalOpen: false, 
      selectedItem: null 
    }));
  }, []);

  const openDeleteModal = useCallback((item: Usuario) => {
    setState(prev => ({ 
      ...prev, 
      isDeleteModalOpen: true, 
      selectedItem: item 
    }));
  }, []);

  const closeDeleteModal = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isDeleteModalOpen: false, 
      selectedItem: null 
    }));
  }, []);

  const setFilters = useCallback((filters: UsuarioFilters) => {
    setState(prev => ({ ...prev, filters }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const loadRoles = useCallback(async () => {
    try {
      const response = await usuariosApi.getRoles();
      
      if (response.success && response.data) {
        setState(prev => ({ 
          ...prev, 
          roles: response.data! 
        }));
      }
    } catch (error) {
      console.error('Error al cargar roles:', error);
      // Los roles son necesarios, pero no queremos bloquear toda la interfaz
      // así que establecemos un array vacío y mostramos un aviso en la consola
      toast.error('No se pudieron cargar los roles. Algunas funciones pueden estar limitadas.');
      setState(prev => ({ ...prev, roles: [] }));
    }
  }, []);

  const loadPersonalDisponible = useCallback(async () => {
    try {
      const response = await usuariosApi.getPersonalDisponible();
      
      if (response.success && response.data) {
        setState(prev => ({ 
          ...prev, 
          personalDisponible: response.data! 
        }));
      } else if (response.error) {
        // Si el backend devuelve un error explícito (como un 403)
        console.warn('No se pudo cargar el personal disponible:', response.error);
      }
    } catch (error) {
      // Manejo silencioso del error, este es un recurso opcional
      console.warn('No se pudo cargar el personal disponible. Puede ser un problema de permisos:', error);
      // No mostramos el error en la interfaz ya que este recurso es opcional
      setState(prev => ({ ...prev, personalDisponible: [] }));
    }
  }, []);

  const loadResidentesDisponibles = useCallback(async () => {
    try {
      const response = await usuariosApi.getResidentesDisponibles();
      
      if (response.success && response.data) {
        setState(prev => ({ 
          ...prev, 
          residentesDisponibles: response.data! 
        }));
      } else if (response.error) {
        // Si el backend devuelve un error explícito (como un 403)
        console.warn('No se pudo cargar los residentes disponibles:', response.error);
      }
    } catch (error) {
      // Manejo silencioso del error, este es un recurso opcional
      console.warn('No se pudo cargar los residentes disponibles. Puede ser un problema de permisos:', error);
      // No mostramos el error en la interfaz ya que este recurso es opcional
      setState(prev => ({ ...prev, residentesDisponibles: [] }));
    }
  }, []);

  return {
    ...state,
    loadData,
    loadItem,
    createItem,
    updateItem,
    deleteItem,
    toggleStatus,
    openStoreModal,
    closeStoreModal,
    openDeleteModal,
    closeDeleteModal,
    setFilters,
    clearError,
    loadRoles,
    loadPersonalDisponible,
    loadResidentesDisponibles,
  };
}
