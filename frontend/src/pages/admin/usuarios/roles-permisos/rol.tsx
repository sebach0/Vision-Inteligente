"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, MoreHorizontal, Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import AdminLayout from "@/app/layout/admin-layout";
import { rolesService, ApiError } from "@/services/api";

// Interfaces
interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  es_administrativo: boolean;
  permisos: string[];
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface RolForm {
  nombre: string;
  descripcion: string;
  es_administrativo: boolean;
  permisos: string[];
}

interface PermisoDisponible {
  codigo: string;
  descripcion: string;
}

// Helper function para verificar respuesta exitosa
function isSuccessfulResponse<T>(response: { success: boolean; data?: T }): response is { success: true; data: T } {
  return response.success && response.data !== undefined;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisosDisponibles, setPermisosDisponibles] = useState<PermisoDisponible[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingRol, setEditingRol] = useState<Rol | null>(null);
  const [form, setForm] = useState<RolForm>({ nombre: "", descripcion: "", es_administrativo: false, permisos: [] });

  // Cargar datos del backend
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([loadRoles(), loadPermisosDisponibles()]);
      } catch (error) {
        console.error('Error al cargar datos:', error);
      }
    };
    loadData();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await rolesService.getRoles();
      if (isSuccessfulResponse(response)) {
        // La API devuelve {count, next, previous, results}
        const rolesData = response.data?.results || [];
        setRoles(Array.isArray(rolesData) ? rolesData : []);
      } else {
        setRoles([]);
      }
    } catch (error) {
      console.error('Error al cargar roles:', error);
      setRoles([]);
      if (error instanceof ApiError) {
        setError(`Error ${error.status}: ${error.message}`);
      } else {
        setError('Error al cargar los roles');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPermisosDisponibles = async () => {
    try {
      const response = await rolesService.getAvailablePermissions();
      if (isSuccessfulResponse(response) && response.data?.permisos) {
        const permisos = Array.isArray(response.data.permisos) 
          ? response.data.permisos.map(([codigo, descripcion]) => ({
              codigo,
              descripcion
            }))
          : [];
        setPermisosDisponibles(permisos);
      } else {
        setPermisosDisponibles([]);
      }
    } catch (error) {
      console.error('Error al cargar permisos disponibles:', error);
      setPermisosDisponibles([]);
    }
  };

  // Filtrar roles por búsqueda
  const filteredRoles = roles.filter(rol =>
    rol.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rol.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (rol: Rol) => {
    setEditingRol(rol);
    setForm({ 
      nombre: rol.nombre, 
      descripcion: rol.descripcion, 
      es_administrativo: rol.es_administrativo, 
      permisos: [...rol.permisos] 
    });
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingRol(null);
    setForm({ nombre: "", descripcion: "", es_administrativo: false, permisos: [] });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRol(null);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.descripcion) {
      alert("Todos los campos son obligatorios");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (editingRol) {
        // Actualizar rol existente
        const response = await rolesService.updateRole(editingRol.id, form);
        if (isSuccessfulResponse(response) && response.data) {
          const updatedRole = response.data;
          setRoles(roles.map(r => r.id === editingRol.id ? updatedRole : r));
          setShowForm(false);
        }
      } else {
        // Crear nuevo rol
        const response = await rolesService.createRole(form);
        if (isSuccessfulResponse(response) && response.data) {
          const newRole = response.data;
          setRoles([...roles, newRole]);
          setShowForm(false);
        }
      }
    } catch (error) {
      console.error('Error al guardar rol:', error);
      if (error instanceof ApiError) {
        setError(`Error ${error.status}: ${error.message}`);
      } else {
        setError('Error al guardar el rol');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("¿Seguro que deseas eliminar este rol?")) {
      try {
        setLoading(true);
        setError(null);
        const response = await rolesService.deleteRole(id);
        if (isSuccessfulResponse(response)) {
          setRoles(roles.filter((r) => r.id !== id));
        }
      } catch (error) {
        console.error('Error al eliminar rol:', error);
        if (error instanceof ApiError) {
          setError(`Error ${error.status}: ${error.message}`);
        } else {
          setError('Error al eliminar el rol');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePermissionChange = (permiso: string) => {
    setForm(prev => ({
      ...prev,
      permisos: prev.permisos.includes(permiso)
        ? prev.permisos.filter(p => p !== permiso)
        : [...prev.permisos, permiso]
    }));
  };

  const getTipoBadge = (es_administrativo: boolean) => {
    return (
      <Badge variant={es_administrativo ? "default" : "secondary"}>
        {es_administrativo ? 'Administrativo' : 'Cliente'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando roles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-4">Error al cargar los roles</p>
          <Button onClick={loadRoles}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
            <p className="text-muted-foreground">
              Gestiona los roles del sistema
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Rol
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Roles</CardTitle>
            <CardDescription>
              {roles.length} roles registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Permisos</TableHead>
                    <TableHead className="w-[70px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((rol) => (
                    <TableRow key={rol.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{rol.nombre}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{rol.descripcion}</TableCell>
                      <TableCell>
                        {getTipoBadge(rol.es_administrativo)}
                      </TableCell>
                      <TableCell>{rol.permisos.length}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(rol)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDelete(rol.id)}
                            >
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredRoles.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm ? "No se encontraron roles" : "No hay roles registrados"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {showForm && (
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRol ? "Editar Rol" : "Nuevo Rol"}
                </DialogTitle>
                <DialogDescription>
                  {editingRol 
                    ? "Modifica la información del rol" 
                    : "Completa la información del nuevo rol"
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    placeholder="Nombre del rol"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="descripcion">Descripción *</Label>
                  <textarea
                    id="descripcion"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                    placeholder="Descripción del rol"
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="es_administrativo"
                    checked={form.es_administrativo}
                    onCheckedChange={(checked) => setForm({ ...form, es_administrativo: !!checked })}
                  />
                  <Label htmlFor="es_administrativo">
                    Rol Administrativo
                  </Label>
                </div>
                
                <div>
                  <Label>Permisos del Sistema</Label>
                  <div className="mt-2 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-3">
                      {permisosDisponibles.map((permiso) => (
                        <div key={permiso.codigo} className="flex items-center space-x-2">
                          <Checkbox
                            id={permiso.codigo}
                            checked={form.permisos.includes(permiso.codigo)}
                            onCheckedChange={() => handlePermissionChange(permiso.codigo)}
                          />
                          <Label htmlFor={permiso.codigo} className="text-sm">
                            {permiso.descripcion}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {form.permisos.length} permisos seleccionados
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleCloseForm}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}