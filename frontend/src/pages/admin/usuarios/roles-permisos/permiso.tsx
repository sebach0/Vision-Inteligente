"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, MoreHorizontal, Lock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import AdminLayout from "@/app/layout/admin-layout";
import { permissionsService, ApiError } from "@/services/api";

// Interfaces
interface Permiso {
  codigo: string;
  descripcion: string;
  categoria?: string;
}

interface PermisoForm {
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  es_activo: boolean;
}

const categorias = [
  'Gestión de Usuarios',
  'Operaciones',
  'Reportes',
  'Administración',
  'Monitoreo',
  'Configuración'
] as const;

// Helper function para verificar respuesta exitosa
function isSuccessfulResponse<T>(response: { success: boolean; data?: T }): response is { success: true; data: T } {
  return response.success && response.data !== undefined;
}

export default function PermisosPage() {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPermiso, setEditingPermiso] = useState<Permiso | null>(null);

  // Cargar datos del backend
  useEffect(() => {
    loadPermisos();
  }, []);

  const loadPermisos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await permissionsService.getAvailablePermissions();
      if (isSuccessfulResponse(response) && response.data?.permisos) {
        const permisosData = Array.isArray(response.data.permisos) 
          ? response.data.permisos.map(([codigo, descripcion]) => ({
              codigo,
              descripcion,
              categoria: getCategoriaFromCodigo(codigo)
            }))
          : [];
        setPermisos(permisosData);
      } else {
        setPermisos([]);
      }
    } catch (error) {
      console.error('Error al cargar permisos:', error);
      setPermisos([]);
      if (error instanceof ApiError) {
        setError(`Error ${error.status}: ${error.message}`);
      } else {
        setError('Error al cargar los permisos');
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para determinar la categoría basada en el código del permiso
  const getCategoriaFromCodigo = (codigo: string): string => {
    if (codigo.includes('usuario') || codigo.includes('rol')) return 'Gestión de Usuarios';
    if (codigo.includes('vehiculo') || codigo.includes('conductor') || codigo.includes('ruta')) return 'Operaciones';
    if (codigo.includes('reporte') || codigo.includes('estadistica')) return 'Reportes';
    if (codigo.includes('monitorear') || codigo.includes('seguimiento')) return 'Monitoreo';
    if (codigo.includes('configuracion') || codigo.includes('gestionar')) return 'Administración';
    return 'Configuración';
  };

  // Filtrar permisos por búsqueda
  const filteredPermisos = permisos.filter(permiso =>
    permiso.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permiso.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (permiso: Permiso) => {
    setEditingPermiso(permiso);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingPermiso(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPermiso(null);
  };

  const getCategoryBadge = (categoria: string) => {
    const variants = {
      'Gestión de Usuarios': 'default',
      'Operaciones': 'secondary',
      'Reportes': 'outline',
      'Administración': 'destructive',
      'Monitoreo': 'secondary',
      'Configuración': 'outline',
    } as const;
    
    return (
      <Badge variant={variants[categoria as keyof typeof variants] || "secondary"}>
        {categoria}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando permisos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-4">Error al cargar los permisos</p>
          <Button onClick={loadPermisos}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Permisos</h1>
            <p className="text-muted-foreground">
              Gestiona los permisos del sistema
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Permiso
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Permisos</CardTitle>
            <CardDescription>
              {permisos.length} permisos registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descripción o código..."
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
                    <TableHead>Descripción</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[70px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPermisos.map((permiso) => (
                    <TableRow key={permiso.codigo}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{permiso.descripcion}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {permiso.codigo}
                        </code>
                      </TableCell>
                      <TableCell>
                        {getCategoryBadge(permiso.categoria || 'Configuración')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Activo
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(permiso)}>
                              Ver Detalles
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredPermisos.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm ? "No se encontraron permisos" : "No hay permisos registrados"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {showForm && (
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPermiso ? "Detalles del Permiso" : "Información de Permisos"}
                </DialogTitle>
                <DialogDescription>
                  Los permisos son definidos automáticamente por el sistema
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="text-blue-600" size={20} />
                    <span className="text-blue-800 font-medium">Información del Sistema</span>
                  </div>
                  <p className="text-blue-700 text-sm">
                    Los permisos son definidos automáticamente por el sistema y no pueden ser modificados desde esta interfaz.
                  </p>
                </div>

                {editingPermiso && (
                  <>
                    <div>
                      <Label htmlFor="codigo">Código del Permiso</Label>
                      <Input
                        id="codigo"
                        value={editingPermiso.codigo}
                        readOnly
                        className="font-mono text-sm bg-muted"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="descripcion">Descripción</Label>
                      <Input
                        id="descripcion"
                        value={editingPermiso.descripcion}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="categoria">Categoría</Label>
                      <Input
                        id="categoria"
                        value={editingPermiso.categoria || 'Configuración'}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleCloseForm}>
                  Cerrar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}