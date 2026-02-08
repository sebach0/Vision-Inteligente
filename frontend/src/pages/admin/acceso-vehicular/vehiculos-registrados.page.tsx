import React, { useEffect, useState } from "react";
import AdminLayout from "@/app/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Car, Search, RefreshCw, ChevronDown, ChevronUp, User, Phone, Calendar, Palette, FileText, Edit2, Trash2, Save } from "lucide-react";
import toast from "react-hot-toast";

interface PropietarioInfo {
  nombre: string;
  cedula: string;
  telefono: string;
  registro?: string | undefined;
}

interface TipoVehiculo {
  id: number;
  nombre: string;
}

interface ColorVehiculo {
  id: number;
  nombre: string;
}

interface VehiculoRegistrado {
  id: number;
  placa: string;
  tipo_vehiculo: {
    id: number;
    nombre: string;
  };
  color: {
    id: number;
    nombre: string;
  };
  propietario?: PropietarioInfo;
  observaciones: string;
  created_at: string;
  imagen_url?: string;
}

interface FormDataEdit {
  placa: string;
  tipo_vehiculo_id: number;
  color_id: number;
  propietario_nombre: string;
  propietario_cedula: string;
  propietario_telefono: string;
  propietario_registro: string;
}

export default function VehiculosRegistradosPage() {
  const [vehiculos, setVehiculos] = useState<VehiculoRegistrado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Estados para edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [vehiculoEditando, setVehiculoEditando] = useState<VehiculoRegistrado | null>(null);
  const [formData, setFormData] = useState<FormDataEdit>({
    placa: "",
    tipo_vehiculo_id: 0,
    color_id: 0,
    propietario_nombre: "",
    propietario_cedula: "",
    propietario_telefono: "",
    propietario_registro: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Estados para eliminación
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [vehiculoEliminar, setVehiculoEliminar] = useState<VehiculoRegistrado | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Catálogos
  const [tiposVehiculo, setTiposVehiculo] = useState<TipoVehiculo[]>([]);
  const [colores, setColores] = useState<ColorVehiculo[]>([]);

  useEffect(() => {
    cargarVehiculos();
    cargarCatalogos();
  }, []);

  const cargarCatalogos = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const authToken = localStorage.getItem("access_token");

      // Cargar tipos de vehículo
      const tiposResponse = await fetch(
        `${apiUrl}/api/acceso-vehicular/tipos-vehiculo/?activo=true`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (tiposResponse.ok) {
        const tiposData = await tiposResponse.json();
        // Manejar respuesta paginada o array directo
        const tiposArray = Array.isArray(tiposData) 
          ? tiposData 
          : (tiposData.results || []);
        setTiposVehiculo(tiposArray);
      }

      // Cargar colores
      const coloresResponse = await fetch(
        `${apiUrl}/api/acceso-vehicular/colores/?activo=true`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (coloresResponse.ok) {
        const coloresData = await coloresResponse.json();
        // Manejar respuesta paginada o array directo
        const coloresArray = Array.isArray(coloresData) 
          ? coloresData 
          : (coloresData.results || []);
        setColores(coloresArray);
      }
    } catch (error) {
      console.error("Error al cargar catálogos:", error);
    }
  };

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Función para extraer información del propietario desde observaciones
  const extraerPropietario = (observaciones: string): PropietarioInfo | undefined => {
    if (!observaciones || !observaciones.includes("Registro público")) {
      return undefined;
    }

    try {
      // Patrón: Registro público - Nombre Apellido - CI: 12345678 - Tel: 77777777
      const nombreMatch = observaciones.match(/Registro público - ([^-]+) -/);
      const ciMatch = observaciones.match(/CI: ([^-\s]+)/);
      const telMatch = observaciones.match(/Tel: ([^-\s]+)/);
      const registroMatch = observaciones.match(/Registro: (.+)$/);

      if (nombreMatch && nombreMatch[1] && ciMatch && ciMatch[1]) {
        return {
          nombre: nombreMatch[1].trim(),
          cedula: ciMatch[1].trim(),
          telefono: telMatch && telMatch[1] ? telMatch[1].trim() : "No disponible",
          registro: registroMatch && registroMatch[1] ? registroMatch[1].trim() : undefined,
        };
      }
    } catch (error) {
      console.error("Error al extraer propietario:", error);
    }

    return undefined;
  };

  const cargarVehiculos = async () => {
    setIsLoading(true);
    try {
      // Obtener todos los registros de acceso y extraer vehículos únicos
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const authToken = localStorage.getItem("access_token");
      
      // Obtener más registros para tener una mejor cobertura
      const response = await fetch(
        `${apiUrl}/api/acceso-vehicular/registros/?page_size=500&ordering=-fecha_hora`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Extraer vehículos únicos por placa
        const vehiculosMap = new Map();
        const registros = data.results || data;
        
        registros.forEach((registro: any) => {
          if (registro.placa && !vehiculosMap.has(registro.placa)) {
            const propietario = extraerPropietario(registro.observaciones);
            
            vehiculosMap.set(registro.placa, {
              id: registro.id,
              placa: registro.placa,
              tipo_vehiculo: registro.tipo_vehiculo || {
                id: 0,
                nombre: "No especificado",
              },
              color: registro.color || { id: 0, nombre: "No especificado" },
              propietario,
              observaciones: registro.observaciones || "",
              created_at: registro.fecha_hora,
              imagen_url: registro.imagen_url,
            });
          }
        });
        
        const vehiculosArray = Array.from(vehiculosMap.values());
        setVehiculos(vehiculosArray);
        
        if (vehiculosArray.length === 0) {
          console.log("No hay vehículos registrados aún");
        }
      } else {
        const errorText = await response.text();
        console.error("Error al cargar autos:", response.status, errorText);
        toast.error("Error al cargar autos");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setIsLoading(false);
    }
  };

  const vehiculosFiltrados = vehiculos.filter((vehiculo) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      vehiculo.placa.toLowerCase().includes(searchLower) ||
      vehiculo.propietario?.nombre.toLowerCase().includes(searchLower) ||
      vehiculo.propietario?.cedula.includes(searchTerm)
    );
  });

  const abrirModalEdicion = (vehiculo: VehiculoRegistrado) => {
    setVehiculoEditando(vehiculo);
    setFormData({
      placa: vehiculo.placa,
      tipo_vehiculo_id: vehiculo.tipo_vehiculo?.id || 0,
      color_id: vehiculo.color?.id || 0,
      propietario_nombre: vehiculo.propietario?.nombre || "",
      propietario_cedula: vehiculo.propietario?.cedula || "",
      propietario_telefono: vehiculo.propietario?.telefono || "",
      propietario_registro: vehiculo.propietario?.registro || "",
    });
    setIsEditModalOpen(true);
  };

  const cerrarModalEdicion = () => {
    setIsEditModalOpen(false);
    setVehiculoEditando(null);
    setFormData({
      placa: "",
      tipo_vehiculo_id: 0,
      color_id: 0,
      propietario_nombre: "",
      propietario_cedula: "",
      propietario_telefono: "",
      propietario_registro: "",
    });
  };

  const guardarCambios = async () => {
    if (!vehiculoEditando) return;

    // Validaciones
    if (!formData.placa.trim()) {
      toast.error("La placa es requerida");
      return;
    }

    setIsSaving(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const authToken = localStorage.getItem("access_token");

      // Construir observaciones con los datos del propietario
      const observaciones = formData.propietario_nombre
        ? `Registro público - ${formData.propietario_nombre} - CI: ${formData.propietario_cedula} - Tel: ${formData.propietario_telefono}${formData.propietario_registro ? ` - Registro: ${formData.propietario_registro}` : ""}`
        : vehiculoEditando.observaciones;

      const updateData = {
        placa: formData.placa.toUpperCase(),
        tipo_vehiculo_id: formData.tipo_vehiculo_id || null,
        color_id: formData.color_id || null,
        observaciones,
      };

      const response = await fetch(
        `${apiUrl}/api/acceso-vehicular/registros/${vehiculoEditando.id}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (response.ok) {
        toast.success("Usuario Actualizado Correctamente");
        cerrarModalEdicion();
        await cargarVehiculos();
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || "Error al actualizar el registro");
      }
    } catch (error) {
      console.error("Error al actualizar:", error);
      toast.error("Error al actualizar el registro");
    } finally {
      setIsSaving(false);
    }
  };

  const abrirDialogoEliminar = (vehiculo: VehiculoRegistrado) => {
    setVehiculoEliminar(vehiculo);
    setIsDeleteDialogOpen(true);
  };

  const cerrarDialogoEliminar = () => {
    setIsDeleteDialogOpen(false);
    setVehiculoEliminar(null);
  };

  const confirmarEliminacion = async () => {
    if (!vehiculoEliminar) return;

    setIsDeleting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const authToken = localStorage.getItem("access_token");

      const response = await fetch(
        `${apiUrl}/api/acceso-vehicular/registros/${vehiculoEliminar.id}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.ok || response.status === 204) {
        toast.success("Usuario Eliminado Correctamente");
        cerrarDialogoEliminar();
        await cargarVehiculos();
        // Cerrar la fila expandida si estaba abierta
        setExpandedRows((prev) => {
          const newSet = new Set(prev);
          newSet.delete(vehiculoEliminar.id);
          return newSet;
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.detail || "Error al eliminar el registro");
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      toast.error("Error al eliminar el registro");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Autos Registrados
          </h1>
          <p className="text-gray-600">
            Lista de todos los autos que han ingresado al sistema
          </p>
        </div>

        {/* Card principal */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-600" />
                Lista de Autos
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={cargarVehiculos}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por placa, nombre o CI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tabla */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Cargando autos...</p>
              </div>
            ) : vehiculosFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchTerm
                    ? "No se encontraron autos con ese criterio"
                    : "No hay autos registrados"}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead className="w-[150px]">Placa</TableHead>
                      <TableHead>Nombre del Propietario</TableHead>
                      <TableHead>Carnet de Identidad</TableHead>
                      <TableHead className="text-right">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehiculosFiltrados.map((vehiculo) => {
                      const isExpanded = expandedRows.has(vehiculo.id);
                      
                      return (
                        <React.Fragment key={vehiculo.id}>
                          {/* Fila principal */}
                          <TableRow className="hover:bg-gray-50">
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRow(vehiculo.id)}
                                className="h-8 w-8 p-0"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {vehiculo.placa}
                            </TableCell>
                            <TableCell>
                              {vehiculo.propietario?.nombre || (
                                <span className="text-gray-400 italic">
                                  No disponible
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {vehiculo.propietario?.cedula || (
                                <span className="text-gray-400 italic">
                                  No disponible
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="bg-green-50">
                                Registrado
                              </Badge>
                            </TableCell>
                          </TableRow>

                          {/* Fila expandible con detalles */}
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={5} className="bg-gray-50 p-0">
                                <div className="p-6 space-y-6">
                                  <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                      <FileText className="w-5 h-5 text-blue-600" />
                                      Detalles Completos
                                    </h3>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => abrirModalEdicion(vehiculo)}
                                        className="flex items-center gap-2"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                        Editar
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => abrirDialogoEliminar(vehiculo)}
                                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        Eliminar
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Información del Propietario */}
                                    <Card>
                                      <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                          <User className="w-4 h-4 text-blue-600" />
                                          Información del Propietario
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-3">
                                        <div>
                                          <p className="text-sm text-gray-500">
                                            Nombre Completo
                                          </p>
                                          <p className="font-medium">
                                            {vehiculo.propietario?.nombre || "No disponible"}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-gray-500">
                                            Carnet de Identidad
                                          </p>
                                          <p className="font-medium">
                                            {vehiculo.propietario?.cedula || "No disponible"}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-gray-500 flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            Teléfono
                                          </p>
                                          <p className="font-medium">
                                            {vehiculo.propietario?.telefono || "No disponible"}
                                          </p>
                                        </div>
                                        {vehiculo.propietario?.registro && (
                                          <div>
                                            <p className="text-sm text-gray-500">
                                              Registro (Estudiante/Docente)
                                            </p>
                                            <p className="font-medium">
                                              {vehiculo.propietario.registro}
                                            </p>
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>

                                    {/* Información del Vehículo */}
                                    <Card>
                                      <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                          <Car className="w-4 h-4 text-blue-600" />
                                          Información del Vehículo
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-3">
                                        <div>
                                          <p className="text-sm text-gray-500">Placa</p>
                                          <p className="font-bold text-lg">
                                            {vehiculo.placa}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-gray-500">
                                            Tipo de Vehículo
                                          </p>
                                          <p className="font-medium">
                                            {vehiculo.tipo_vehiculo?.nombre || "No especificado"}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-gray-500 flex items-center gap-1">
                                            <Palette className="w-3 h-3" />
                                            Color
                                          </p>
                                          <div className="flex items-center gap-2">
                                            <p className="font-medium">
                                              {vehiculo.color?.nombre || "No especificado"}
                                            </p>
                                          </div>
                                        </div>
                                        <div>
                                          <p className="text-sm text-gray-500 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Primer Registro
                                          </p>
                                          <p className="font-medium text-sm">
                                            {new Date(vehiculo.created_at).toLocaleDateString(
                                              "es-BO",
                                              {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              }
                                            )}
                                          </p>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>

                                  {/* Imagen del vehículo si existe */}
                                  {vehiculo.imagen_url && (
                                    <Card>
                                      <CardHeader className="pb-3">
                                        <CardTitle className="text-base">
                                          Imagen del Vehículo
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <img
                                          src={vehiculo.imagen_url}
                                          alt={`Vehículo ${vehiculo.placa}`}
                                          className="max-w-md rounded-lg border"
                                        />
                                      </CardContent>
                                    </Card>
                                  )}

                                  {/* Observaciones */}
                                  {vehiculo.observaciones && (
                                    <Card>
                                      <CardHeader className="pb-3">
                                        <CardTitle className="text-base">
                                          Observaciones
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <p className="text-sm text-gray-700">
                                          {vehiculo.observaciones}
                                        </p>
                                      </CardContent>
                                    </Card>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Contador */}
            {!isLoading && vehiculosFiltrados.length > 0 && (
              <div className="text-sm text-gray-600 text-center pt-4 border-t">
                Mostrando {vehiculosFiltrados.length} de {vehiculos.length}{" "}
                autos
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Edición */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Registro de Vehículo</DialogTitle>
            <DialogDescription>
              Modifique los datos del vehículo y propietario
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Datos del Vehículo */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-600" />
                Datos del Vehículo
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-placa">
                    Placa <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-placa"
                    value={formData.placa}
                    onChange={(e) =>
                      setFormData({ ...formData, placa: e.target.value })
                    }
                    placeholder="Ej: 1234-ABC"
                    className="uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-tipo">Tipo de Vehículo</Label>
                  <Select
                    value={formData.tipo_vehiculo_id?.toString()}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        tipo_vehiculo_id: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger id="edit-tipo">
                      <SelectValue placeholder="Seleccione tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposVehiculo.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id.toString()}>
                          {tipo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-color">Color</Label>
                  <Select
                    value={formData.color_id?.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, color_id: parseInt(value) })
                    }
                  >
                    <SelectTrigger id="edit-color">
                      <SelectValue placeholder="Seleccione color" />
                    </SelectTrigger>
                    <SelectContent>
                      {colores.map((color) => (
                        <SelectItem key={color.id} value={color.id.toString()}>
                          {color.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Datos del Propietario */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Datos del Propietario
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nombre">Nombre Completo</Label>
                  <Input
                    id="edit-nombre"
                    value={formData.propietario_nombre}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        propietario_nombre: e.target.value,
                      })
                    }
                    placeholder="Nombre y apellido"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-cedula">Carnet de Identidad</Label>
                  <Input
                    id="edit-cedula"
                    value={formData.propietario_cedula}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        propietario_cedula: e.target.value,
                      })
                    }
                    placeholder="Ej: 12345678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-telefono">Teléfono</Label>
                  <Input
                    id="edit-telefono"
                    value={formData.propietario_telefono}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        propietario_telefono: e.target.value,
                      })
                    }
                    placeholder="Ej: 77777777"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-registro">
                    Registro (Estudiante/Docente)
                  </Label>
                  <Input
                    id="edit-registro"
                    value={formData.propietario_registro}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        propietario_registro: e.target.value,
                      })
                    }
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={cerrarModalEdicion}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button onClick={guardarCambios} disabled={isSaving}>
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación de Eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el registro del vehículo{" "}
              <span className="font-bold">{vehiculoEliminar?.placa}</span>.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarEliminacion}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
