import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users, Shield, UserCheck, UserX } from 'lucide-react';
import { useUsuarios } from '@/hooks/useUsuarios';
import { UsuarioTable } from './components/table';
import { UsuarioFiltersComponent } from './components/filters';
import { UsuarioStore } from './components/store';
import { UsuarioDelete } from './components/delete';
import AdminLayout from '@/app/layout/admin-layout';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 10;

export default function UsuariosPage() {
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const [searchDebounced, setSearchDebounced] = useState<string>("");
  const [rolFilter, setRolFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const {
    data,
    loading,
    error,
    selectedItem,
    isStoreModalOpen,
    isDeleteModalOpen,
    roles,
    personalDisponible,
    residentesDisponibles,
    createItem,
    updateItem,
    deleteItem,
    toggleStatus,
    openStoreModal,
    closeStoreModal,
    openDeleteModal,
    closeDeleteModal,
    clearError,
    loadRoles,
    loadPersonalDisponible,
    loadResidentesDisponibles,
    loadData,
  } = useUsuarios();

  // Función para cargar datos con filtros y paginación
  const fetchUsuarios = async (pageNumber = 1, searchQuery = "", rol = "all", active = "all") => {
    const filters = {
      ...(searchQuery && { search: searchQuery }),
      ...(rol !== "all" && { rol }),
      ...(active !== "all" && { is_active: active === "true" }),
    };
    
    await loadData(filters);
  };

  // Debounce para el campo de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
    }, 1000); // 500ms de delay

    return () => clearTimeout(timer);
  }, [search]);

  // Cargar datos al montar el componente y cuando cambien los filtros
  useEffect(() => {
    // Cargar datos principales (usuarios y roles)
    fetchUsuarios(page, searchDebounced, rolFilter, activeFilter);
    loadRoles();
    
    // Cargar datos opcionales que podrían tener problemas de permisos
    // usando try-catch separados para que si uno falla, el otro aún se ejecute
    loadPersonalDisponible();
    loadResidentesDisponibles();
  }, [page, searchDebounced, rolFilter, activeFilter]);

  const totalPages = Math.ceil((data?.count || 0) / ITEMS_PER_PAGE);


  const handleCreate = () => {
    // Verificar si hay roles disponibles antes de abrir el modal
    if (roles.length === 0) {
      toast.error('No se pudieron cargar los roles necesarios para crear un usuario. Verifique sus permisos e intente nuevamente.');
      return;
    }
    openStoreModal();
  };

  const handleEdit = (usuario: any) => {
    openStoreModal(usuario);
  };

  const handleDelete = (usuario: any) => {
    openDeleteModal(usuario);
  };

  const handleToggleStatus = async (usuario: any) => {
    await toggleStatus(usuario.id, !usuario.is_active);
  };

  const handleStoreSubmit = async (data: any) => {
    if (selectedItem) {
      return await updateItem(selectedItem.id, data);
    } else {
      return await createItem(data);
    }
  };

  const handleDeleteConfirm = async () => {
    if (selectedItem) {
      return await deleteItem(selectedItem.id);
    }
    return false;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">
              Administra los usuarios del sistema y sus permisos
            </p>
          </div>
          <Button onClick={handleCreate} className="flex items-center gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Agregar Usuario
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.count || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {data?.results?.filter(u => u.is_active).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios Inactivos</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {data?.results?.filter(u => !u.is_active).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {data?.results?.filter(u => u.rol?.es_administrativo).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <UsuarioFiltersComponent
          search={search}
          rolFilter={rolFilter}
          activeFilter={activeFilter}
          onSearchChange={setSearch}
          onRolFilterChange={setRolFilter}
          onActiveFilterChange={setActiveFilter}
          roles={roles}
          loading={loading}
        />

        {/* Tabla */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearError}
                  className="mt-2"
                >
                  Cerrar
                </Button>
              </div>
            )}
            
            <UsuarioTable
              data={data?.results || []}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              page={page}
              totalPages={totalPages}
              onPageChange={(newPage) => {
                setPage(newPage);
                fetchUsuarios(newPage, searchDebounced, rolFilter, activeFilter);
              }}
            />
          </CardContent>
        </Card>

        {/* Modales */}
        <UsuarioStore
          isOpen={isStoreModalOpen}
          onClose={closeStoreModal}
          onSubmit={handleStoreSubmit}
          initialData={selectedItem}
          loading={loading}
          roles={roles}
          personalDisponible={personalDisponible}
          residentesDisponibles={residentesDisponibles}
        />

        <UsuarioDelete
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteConfirm}
          usuario={selectedItem}
          loading={loading}
        />
      </div>
    </AdminLayout>
  );
}