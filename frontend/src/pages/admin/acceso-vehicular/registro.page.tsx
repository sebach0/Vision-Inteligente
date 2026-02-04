/**
 * Página de Registro de Acceso Vehicular
 * Permite registrar entradas/salidas con captura de imagen y procesamiento IA
 */

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import AdminLayout from "@/app/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  Car,
  LogIn,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useCatalogosAcceso, useRegistroAcceso } from "@/hooks/useAccesoVehicular";
import { useCameraCapture } from "@/hooks/useCameraCapture";
import type { RegistroAccesoCreate } from "@/types/acceso-vehicular";

interface FormData {
  tipo_evento: "entrada" | "salida";
  puerta_id: string;
  placa: string;
  tipo_vehiculo_id: string;
  color_id: string;
  observaciones: string;
}

export default function RegistroAccesoPage() {
  const { puertas, tiposVehiculo, colores, loading: loadingCatalogos } = useCatalogosAcceso();
  const {
    loading,
    procesando,
    resultadoProcesamiento,
    procesarImagen,
    registrarAcceso,
    limpiarResultado,
  } = useRegistroAcceso();
  
  const {
    videoRef,
    canvasRef,
    isActive: cameraActive,
    capturedImage,
    error: cameraError,
    startCamera,
    stopCamera,
    captureImage,
    clearCapture,
  } = useCameraCapture();

  const [modoCaptura, setModoCaptura] = useState<"camera" | "upload">("camera");
  const [imagenBase64, setImagenBase64] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      tipo_evento: "entrada",
      puerta_id: "",
      placa: "",
      tipo_vehiculo_id: "",
      color_id: "",
      observaciones: "",
    },
  });

  const tipoEvento = watch("tipo_evento");

  // Actualizar campos cuando se procesa la imagen
  useEffect(() => {
    if (resultadoProcesamiento) {
      if (resultadoProcesamiento.placa_detectada) {
        setValue("placa", resultadoProcesamiento.placa_detectada);
      }
      
      // Buscar tipo de vehículo coincidente
      if (resultadoProcesamiento.clase_detectada) {
        const tipoEncontrado = tiposVehiculo.find(
          (t) => t.nombre.toLowerCase() === resultadoProcesamiento.clase_detectada.toLowerCase()
        );
        if (tipoEncontrado) {
          setValue("tipo_vehiculo_id", tipoEncontrado.id.toString());
        }
      }
      
      // Buscar color coincidente
      if (resultadoProcesamiento.color_detectado) {
        const colorEncontrado = colores.find(
          (c) => c.nombre.toLowerCase() === resultadoProcesamiento.color_detectado.toLowerCase()
        );
        if (colorEncontrado) {
          setValue("color_id", colorEncontrado.id.toString());
        }
      }
    }
  }, [resultadoProcesamiento, tiposVehiculo, colores, setValue]);

  // Manejar captura de cámara
  const handleCapture = async () => {
    const imagen = captureImage();
    if (imagen) {
      setImagenBase64(imagen);
      await procesarImagen(imagen);
    }
  };

  // Manejar subida de archivo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImagenBase64(base64);
      clearCapture();
      await procesarImagen(base64);
    };
    reader.readAsDataURL(file);
  };

  // Enviar formulario
  const onSubmit = async (data: FormData) => {
    const registro: RegistroAccesoCreate = {
      tipo_evento: data.tipo_evento,
      puerta_id: parseInt(data.puerta_id),
      placa: data.placa.toUpperCase(),
      tipo_vehiculo_id: data.tipo_vehiculo_id ? parseInt(data.tipo_vehiculo_id) : undefined,
      color_id: data.color_id ? parseInt(data.color_id) : undefined,
      imagen_base64: imagenBase64 || undefined,
      observaciones: data.observaciones,
    };

    const result = await registrarAcceso(registro);
    if (result) {
      // Limpiar formulario
      reset();
      setImagenBase64(null);
      clearCapture();
      limpiarResultado();
    }
  };

  // Limpiar todo
  const handleLimpiar = () => {
    reset();
    setImagenBase64(null);
    clearCapture();
    limpiarResultado();
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Registrar Acceso Vehicular</h1>
          <p className="text-muted-foreground">
            Capture la imagen del vehículo o ingrese los datos manualmente
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel de Captura */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Captura de Imagen
              </CardTitle>
              <CardDescription>
                Use la cámara o suba una imagen del vehículo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={modoCaptura} onValueChange={(v) => setModoCaptura(v as "camera" | "upload")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="camera">
                    <Camera className="h-4 w-4 mr-2" />
                    Cámara
                  </TabsTrigger>
                  <TabsTrigger value="upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Subir Imagen
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="camera" className="space-y-4">
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    {!cameraActive && !capturedImage && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Button onClick={() => startCamera()}>
                          <Camera className="h-4 w-4 mr-2" />
                          Iniciar Cámara
                        </Button>
                      </div>
                    )}
                    
                    <video
                      ref={videoRef}
                      className={`w-full h-full object-cover ${capturedImage ? "hidden" : ""}`}
                      playsInline
                      muted
                    />
                    
                    {capturedImage && (
                      <img
                        src={capturedImage}
                        alt="Captura"
                        className="w-full h-full object-cover"
                      />
                    )}
                    
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  {cameraError && (
                    <div className="text-destructive text-sm">{cameraError}</div>
                  )}

                  <div className="flex gap-2">
                    {cameraActive && !capturedImage && (
                      <>
                        <Button onClick={handleCapture} disabled={procesando}>
                          {procesando ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Camera className="h-4 w-4 mr-2" />
                          )}
                          Capturar
                        </Button>
                        <Button variant="outline" onClick={stopCamera}>
                          Detener
                        </Button>
                      </>
                    )}
                    
                    {capturedImage && (
                      <>
                        <Button variant="outline" onClick={() => { clearCapture(); setImagenBase64(null); }}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Nueva Captura
                        </Button>
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    {imagenBase64 && modoCaptura === "upload" ? (
                      <img
                        src={imagenBase64}
                        alt="Imagen subida"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Label
                          htmlFor="file-upload"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Click para subir imagen
                          </span>
                        </Label>
                        <Input
                          id="file-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </div>
                    )}
                  </div>

                  {imagenBase64 && modoCaptura === "upload" && (
                    <Button
                      variant="outline"
                      onClick={() => setImagenBase64(null)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Cambiar Imagen
                    </Button>
                  )}
                </TabsContent>
              </Tabs>

              {/* Resultado del procesamiento */}
              {procesando && (
                <div className="mt-4 p-4 bg-muted rounded-lg flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Procesando imagen con IA...</span>
                </div>
              )}

              {resultadoProcesamiento && !procesando && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    {resultadoProcesamiento.vehiculo_detectado ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    Resultado del Análisis
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Vehículo:</span>{" "}
                      {resultadoProcesamiento.clase_detectada || "No detectado"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Confianza:</span>{" "}
                      {(resultadoProcesamiento.confianza_deteccion * 100).toFixed(1)}%
                    </div>
                    <div>
                      <span className="text-muted-foreground">Placa:</span>{" "}
                      <Badge variant={resultadoProcesamiento.placa_detectada ? "default" : "secondary"}>
                        {resultadoProcesamiento.placa_detectada || "No detectada"}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Color:</span>{" "}
                      {resultadoProcesamiento.color_detectado || "No detectado"}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Tiempo: {resultadoProcesamiento.tiempo_procesamiento_ms}ms
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulario de Registro */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Datos del Registro
              </CardTitle>
              <CardDescription>
                Complete o corrija los datos del vehículo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Tipo de Evento */}
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={tipoEvento === "entrada" ? "default" : "outline"}
                    className="h-16"
                    onClick={() => setValue("tipo_evento", "entrada")}
                  >
                    <LogIn className="h-5 w-5 mr-2" />
                    ENTRADA
                  </Button>
                  <Button
                    type="button"
                    variant={tipoEvento === "salida" ? "default" : "outline"}
                    className="h-16"
                    onClick={() => setValue("tipo_evento", "salida")}
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    SALIDA
                  </Button>
                </div>

                {/* Puerta */}
                <div className="space-y-2">
                  <Label htmlFor="puerta">Puerta de Acceso *</Label>
                  <Select
                    value={watch("puerta_id")}
                    onValueChange={(value) => setValue("puerta_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione la puerta" />
                    </SelectTrigger>
                    <SelectContent>
                      {puertas.map((puerta) => (
                        <SelectItem key={puerta.id} value={puerta.id.toString()}>
                          {puerta.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Placa */}
                <div className="space-y-2">
                  <Label htmlFor="placa">Número de Placa *</Label>
                  <Input
                    id="placa"
                    {...register("placa", { required: "La placa es requerida" })}
                    placeholder="Ej: ABC-1234"
                    className="uppercase"
                  />
                  {errors.placa && (
                    <span className="text-destructive text-sm">
                      {errors.placa.message}
                    </span>
                  )}
                </div>

                {/* Tipo de Vehículo */}
                <div className="space-y-2">
                  <Label htmlFor="tipo_vehiculo">Tipo de Vehículo</Label>
                  <Select
                    value={watch("tipo_vehiculo_id")}
                    onValueChange={(value) => setValue("tipo_vehiculo_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el tipo" />
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

                {/* Color */}
                <div className="space-y-2">
                  <Label htmlFor="color">Color del Vehículo</Label>
                  <Select
                    value={watch("color_id")}
                    onValueChange={(value) => setValue("color_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el color" />
                    </SelectTrigger>
                    <SelectContent>
                      {colores.map((color) => (
                        <SelectItem key={color.id} value={color.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: color.codigo_hex }}
                            />
                            {color.nombre}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Observaciones */}
                <div className="space-y-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    {...register("observaciones")}
                    placeholder="Observaciones adicionales..."
                    rows={2}
                  />
                </div>

                {/* Botones */}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={loading || !watch("puerta_id") || !watch("placa")}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : tipoEvento === "entrada" ? (
                      <LogIn className="h-4 w-4 mr-2" />
                    ) : (
                      <LogOut className="h-4 w-4 mr-2" />
                    )}
                    Registrar {tipoEvento === "entrada" ? "Entrada" : "Salida"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleLimpiar}>
                    Limpiar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
