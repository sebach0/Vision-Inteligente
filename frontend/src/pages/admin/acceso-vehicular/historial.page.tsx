/**
 * Página de Historial de Accesos Vehiculares
 * Muestra listado filtrable de entradas/salidas
 */

import React, { useState } from "react";
import AdminLayout from "@/app/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  History,
  Search,
  Filter,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useCatalogosAcceso, useHistorialAccesos, useBusquedaPlaca } from "@/hooks/useAccesoVehicular";
import type { RegistroAcceso, FiltrosRegistroAcceso } from "@/types/acceso-vehicular";

export default function HistorialAccesosPage() {
  const { puertas, tiposVehiculo, colores } = useCatalogosAcceso();
  const {
    registros,
    loading,
    pagination,
    filtros,
    cargarRegistros,
    cambiarPagina,
    aplicarFiltros,
  } = useHistorialAccesos();
  
  const {
    resultados: resultadosBusqueda,
    loading: buscando,
    buscar,
    limpiar: limpiarBusqueda,
  } = useBusquedaPlaca();

  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtrosTemp, setFiltrosTemp] = useState<FiltrosRegistroAcceso>(filtros);
  const [busquedaPlaca, setBusquedaPlaca] = useState("");
  const [registroSeleccionado, setRegistroSeleccionado] = useState<RegistroAcceso | null>(null);

  const handleAplicarFiltros = () => {
    aplicarFiltros(filtrosTemp);
    setMostrarFiltros(false);
  };

  const handleLimpiarFiltros = () => {
    setFiltrosTemp({});
    aplicarFiltros({});
    setMostrarFiltros(false);
  };

  const handleBuscarPlaca = (e: React.FormEvent) => {
    e.preventDefault();
    if (busquedaPlaca.length >= 3) {
      buscar(busquedaPlaca);
    }
  };

  const registrosAMostrar = resultadosBusqueda.length > 0 ? resultadosBusqueda : registros;

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8" />
            Historial de Accesos
          </h1>
          <p className="text-muted-foreground">
            Consulte el registro de entradas y salidas de vehículos
          </p>
        </div>

        {/* Barra de búsqueda y filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Búsqueda por placa */}
              <form onSubmit={handleBuscarPlaca} className="flex-1 flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por placa..."
                    value={busquedaPlaca}
                    onChange={(e) => setBusquedaPlaca(e.target.value.toUpperCase())}
                  />
                </div>
                <Button type="submit" disabled={busquedaPlaca.length < 3 || buscando}>
                  {buscando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
                {resultadosBusqueda.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      limpiarBusqueda();
                      setBusquedaPlaca("");
                    }}
                  >
                    Limpiar
                  </Button>
                )}
              </form>

              {/* Botón de filtros */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
                <Button variant="outline" onClick={cargarRegistros}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Panel de filtros expandible */}
            {mostrarFiltros && (
              <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Evento</Label>
                  <Select
                    value={filtrosTemp.tipo_evento || ""}
                    onValueChange={(value) =>
                      setFiltrosTemp((prev) => ({
                        ...prev,
                        tipo_evento: value as "entrada" | "salida" | undefined,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="salida">Salida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Puerta</Label>
                  <Select
                    value={filtrosTemp.puerta?.toString() || ""}
                    onValueChange={(value) =>
                      setFiltrosTemp((prev) => ({
                        ...prev,
                        puerta: value ? parseInt(value) : undefined,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      {puertas.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fecha Inicio</Label>
                  <Input
                    type="date"
                    value={filtrosTemp.fecha_inicio?.split("T")[0] || ""}
                    onChange={(e) =>
                      setFiltrosTemp((prev) => ({
                        ...prev,
                        fecha_inicio: e.target.value ? `${e.target.value}T00:00:00` : undefined,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fecha Fin</Label>
                  <Input
                    type="date"
                    value={filtrosTemp.fecha_fin?.split("T")[0] || ""}
                    onChange={(e) =>
                      setFiltrosTemp((prev) => ({
                        ...prev,
                        fecha_fin: e.target.value ? `${e.target.value}T23:59:59` : undefined,
                      }))
                    }
                  />
                </div>

                <div className="md:col-span-4 flex gap-2 justify-end">
                  <Button variant="outline" onClick={handleLimpiarFiltros}>
                    Limpiar Filtros
                  </Button>
                  <Button onClick={handleAplicarFiltros}>Aplicar Filtros</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabla de registros */}
        <Card>
          <CardHeader>
            <CardTitle>
              Registros
              {resultadosBusqueda.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  Búsqueda: {busquedaPlaca}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {loading ? "Cargando..." : `${pagination.total} registros encontrados`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha/Hora</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead>Puerta</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Guardia</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrosAMostrar.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          No se encontraron registros
                        </TableCell>
                      </TableRow>
                    ) : (
                      registrosAMostrar.map((registro) => (
                        <TableRow key={registro.id}>
                          <TableCell>
                            {format(new Date(registro.fecha_hora), "dd/MM/yyyy HH:mm", {
                              locale: es,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={registro.tipo_evento === "entrada" ? "default" : "secondary"}
                            >
                              {registro.tipo_evento === "entrada" ? (
                                <LogIn className="h-3 w-3 mr-1" />
                              ) : (
                                <LogOut className="h-3 w-3 mr-1" />
                              )}
                              {registro.tipo_evento}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-bold">
                            {registro.placa}
                          </TableCell>
                          <TableCell>{registro.puerta.nombre}</TableCell>
                          <TableCell>{registro.tipo_vehiculo?.nombre || "-"}</TableCell>
                          <TableCell>
                            {registro.color ? (
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-full border"
                                  style={{ backgroundColor: registro.color.codigo_hex }}
                                />
                                {registro.color.nombre}
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{registro.guardia_nombre || registro.guardia_username}</TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setRegistroSeleccionado(registro)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Detalle del Registro</DialogTitle>
                                  <DialogDescription>
                                    Registro #{registro.id}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-muted-foreground">Fecha/Hora</Label>
                                    <p className="font-medium">
                                      {format(new Date(registro.fecha_hora), "PPpp", { locale: es })}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Evento</Label>
                                    <p className="font-medium capitalize">{registro.tipo_evento}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Placa</Label>
                                    <p className="font-mono font-bold text-lg">{registro.placa}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Puerta</Label>
                                    <p className="font-medium">{registro.puerta.nombre}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Tipo de Vehículo</Label>
                                    <p className="font-medium">
                                      {registro.tipo_vehiculo?.nombre || "No especificado"}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Color</Label>
                                    <p className="font-medium">
                                      {registro.color?.nombre || "No especificado"}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Guardia</Label>
                                    <p className="font-medium">
                                      {registro.guardia_nombre || registro.guardia_username}
                                    </p>
                                  </div>
                                  {registro.observaciones && (
                                    <div className="col-span-2">
                                      <Label className="text-muted-foreground">Observaciones</Label>
                                      <p>{registro.observaciones}</p>
                                    </div>
                                  )}
                                  {registro.imagen_url && (
                                    <div className="col-span-2">
                                      <Label className="text-muted-foreground">Imagen</Label>
                                      <img
                                        src={registro.imagen_url}
                                        alt="Vehículo"
                                        className="mt-2 rounded-lg max-h-48 object-cover"
                                      />
                                    </div>
                                  )}
                                  {registro.resultado_ocr && (
                                    <div className="col-span-2 p-4 bg-muted rounded-lg">
                                      <Label className="text-muted-foreground">Resultado IA</Label>
                                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                        <div>
                                          Placa detectada: {registro.resultado_ocr.placa_detectada || "N/A"}
                                        </div>
                                        <div>
                                          Confianza OCR: {registro.resultado_ocr.confianza_ocr 
                                            ? `${(registro.resultado_ocr.confianza_ocr * 100).toFixed(1)}%` 
                                            : "N/A"}
                                        </div>
                                        <div>
                                          Clase detectada: {registro.resultado_ocr.clase_detectada || "N/A"}
                                        </div>
                                        <div>
                                          Tiempo: {registro.resultado_ocr.tiempo_procesamiento_ms}ms
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Paginación */}
                {resultadosBusqueda.length === 0 && pagination.total > pagination.pageSize && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Página {pagination.page} de {Math.ceil(pagination.total / pagination.pageSize)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasPrev}
                        onClick={() => cambiarPagina(pagination.page - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasNext}
                        onClick={() => cambiarPagina(pagination.page + 1)}
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
