/**
 * Página de Captura en Vivo
 * Mantiene la cámara activa y detecta/registra vehículos automáticamente
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import AdminLayout from "@/app/layout/admin-layout";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Video,
  VideoOff,
  CheckCircle2,
  AlertCircle,
  Car,
  Loader2,
  Play,
  Pause,
  RefreshCw,
} from "lucide-react";
import { useCatalogosAcceso } from "@/hooks/useAccesoVehicular";
import { registrosAccesoApi } from "@/services/accesoVehicularService";
import { toast } from "sonner";

interface DeteccionActual {
  placa?: string | undefined;
  tipo_vehiculo?: string | undefined;
  color?: string | undefined;
  confianza?: number | undefined;
  timestamp: number;
  bbox?: number[] | undefined; // [x1, y1, x2, y2]
}

interface CamaraDisponible {
  deviceId: string;
  label: string;
}

export default function CapturaVivoPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);

  const [camaraActiva, setCamaraActiva] = useState(false);
  const [deteccionActiva, setDeteccionActiva] = useState(false);
  const [procesando, setProcesando] = useState(false);
  
  const [camarasDisponibles, setCamarasDisponibles] = useState<CamaraDisponible[]>([]);
  const [camaraSeleccionada, setCamaraSeleccionada] = useState<string>("");
  const [puertaSeleccionada, setPuertaSeleccionada] = useState<string>("");
  const [tipoEvento, setTipoEvento] = useState<"entrada" | "salida">("entrada");
  
  const [deteccionActual, setDeteccionActual] = useState<DeteccionActual | null>(null);
  const [ultimosRegistros, setUltimosRegistros] = useState<any[]>([]);
  
  const { puertas, tiposVehiculo, colores, loading: catalogosLoading } = useCatalogosAcceso();

  // Obtener lista de cámaras disponibles
  const obtenerCamaras = useCallback(async () => {
    try {
      // Primero solicitar permiso para acceder a dispositivos
      await navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === "videoinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Cámara ${index + 1}`,
        }));
      
      setCamarasDisponibles(videoDevices);
      
      // Seleccionar la primera cámara por defecto si no hay ninguna seleccionada
      const primeraCamara = videoDevices[0];
      if (primeraCamara && !camaraSeleccionada) {
        setCamaraSeleccionada(primeraCamara.deviceId);
      }
      
      if (videoDevices.length === 0) {
        toast.error("No se encontraron cámaras en el dispositivo");
      }
    } catch (error: any) {
      console.error("Error al obtener cámaras:", error);
      if (error.name === "NotAllowedError") {
        toast.error("Permiso de cámara denegado");
      } else {
        toast.error("Error al obtener lista de cámaras");
      }
    }
  }, [camaraSeleccionada]);

  // Cargar cámaras al montar
  useEffect(() => {
    obtenerCamaras();
  }, []);

  // Iniciar cámara
  const iniciarCamara = useCallback(async () => {
    const selectedCamera = camaraSeleccionada;
    if (!selectedCamera) {
      toast.error("Debe seleccionar una cámara");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: selectedCamera },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCamaraActiva(true);
        toast.success("Cámara iniciada correctamente");
        
        // Iniciar el loop de dibujo del overlay
        iniciarOverlayLoop();
      }
    } catch (error: any) {
      console.error("Error al iniciar cámara:", error);
      if (error.name === "NotFoundError") {
        toast.error("No se encontró la cámara seleccionada");
      } else if (error.name === "NotAllowedError") {
        toast.error("Permiso de cámara denegado");
      } else {
        toast.error("No se pudo acceder a la cámara");
      }
    }
  }, [camaraSeleccionada]);

  // Loop para dibujar el overlay con bounding box
  const iniciarOverlayLoop = useCallback(() => {
    const dibujarOverlay = () => {
      if (!videoRef.current || !overlayCanvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;
      const ctx = canvas.getContext("2d");
      
      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationRef.current = requestAnimationFrame(dibujarOverlay);
        return;
      }
      
      // Ajustar tamaño del canvas al video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Limpiar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dibujar bounding box si hay detección
      if (deteccionActual?.bbox && deteccionActual.bbox.length === 4) {
        const bbox = deteccionActual.bbox;
        const x1 = bbox[0] ?? 0;
        const y1 = bbox[1] ?? 0;
        const x2 = bbox[2] ?? 0;
        const y2 = bbox[3] ?? 0;
        const width = x2 - x1;
        const height = y2 - y1;
        
        // Dibujar rectángulo
        ctx.strokeStyle = "#22c55e"; // Verde
        ctx.lineWidth = 3;
        ctx.strokeRect(x1, y1, width, height);
        
        // Fondo para texto
        ctx.fillStyle = "rgba(34, 197, 94, 0.9)";
        const texto = `${deteccionActual.tipo_vehiculo || "Vehículo"} ${deteccionActual.placa ? `- ${deteccionActual.placa}` : ""}`;
        const textMetrics = ctx.measureText(texto);
        const textHeight = 20;
        ctx.fillRect(x1, y1 - textHeight - 4, textMetrics.width + 10, textHeight + 4);
        
        // Texto
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px Arial";
        ctx.fillText(texto, x1 + 5, y1 - 8);
        
        // Mostrar confianza
        if (deteccionActual.confianza) {
          const confText = `${(deteccionActual.confianza * 100).toFixed(0)}%`;
          ctx.fillStyle = "rgba(34, 197, 94, 0.9)";
          ctx.fillRect(x2 - 45, y1, 45, 20);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 14px Arial";
          ctx.fillText(confText, x2 - 40, y1 + 15);
        }
      }
      
      animationRef.current = requestAnimationFrame(dibujarOverlay);
    };
    
    dibujarOverlay();
  }, [deteccionActual]);

  // Actualizar overlay cuando cambia la detección
  useEffect(() => {
    if (camaraActiva && !animationRef.current) {
      iniciarOverlayLoop();
    }
  }, [deteccionActual, camaraActiva, iniciarOverlayLoop]);

  // Detener cámara
  const detenerCamara = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setCamaraActiva(false);
    setDeteccionActiva(false);
    setDeteccionActual(null);
    toast.info("Cámara detenida");
  }, []);

  // Capturar frame y procesar
  const procesarFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || procesando) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Dibujar frame actual en canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convertir a base64
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    const imagenBase64 = dataUrl.split(",")[1] ?? "";

    if (!imagenBase64) {
      console.error("Error al capturar imagen");
      return;
    }

    setProcesando(true);
    try {
      // Procesar imagen con IA
      const resultado = await registrosAccesoApi.procesarImagen(imagenBase64);
      
      // Log para debug
      console.log("Resultado detección:", {
        vehiculo_detectado: resultado.vehiculo_detectado,
        clase: resultado.clase_detectada,
        placa: resultado.placa_detectada,
        color: resultado.color_detectado,
        confianza: resultado.confianza_deteccion,
        bbox: resultado.metadatos?.bbox,
        metadatos: resultado.metadatos,
      });

      if (resultado.vehiculo_detectado) {
        const nuevaDeteccion: DeteccionActual = {
          placa: resultado.placa_detectada,
          tipo_vehiculo: resultado.clase_detectada,
          color: resultado.color_detectado,
          confianza: resultado.confianza_deteccion,
          bbox: resultado.metadatos?.bbox as number[] | undefined,
          timestamp: Date.now(),
        };

        setDeteccionActual(nuevaDeteccion);

        // Auto-registrar solo si hay placa detectada y puerta seleccionada
        if (puertaSeleccionada && resultado.placa_detectada && resultado.placa_detectada.length >= 5) {
          await registrarDeteccion(nuevaDeteccion, imagenBase64);
        }
      } else {
        // Si no hay detección, limpiar después de un momento
        setDeteccionActual(null);
      }
    } catch (error) {
      console.error("Error procesando frame:", error);
    } finally {
      setProcesando(false);
    }
  }, [procesando, puertaSeleccionada]);

  // Registrar detección automáticamente
  const registrarDeteccion = async (deteccion: DeteccionActual, imagenBase64: string) => {
    if (!puertaSeleccionada) {
      toast.error("Debe seleccionar una puerta");
      return;
    }

    // Buscar IDs de tipo y color basado en nombres
    const tipoVehiculoId = deteccion.tipo_vehiculo
      ? tiposVehiculo.find(
          (t) => t.nombre.toLowerCase() === deteccion.tipo_vehiculo!.toLowerCase()
        )?.id
      : undefined;

    const colorId = deteccion.color
      ? colores.find(
          (c) => c.nombre.toLowerCase() === deteccion.color!.toLowerCase()
        )?.id
      : undefined;

    try {
      const nuevoRegistro = await registrosAccesoApi.crear({
        tipo_evento: tipoEvento,
        puerta_id: parseInt(puertaSeleccionada),
        placa: deteccion.placa || "",
        tipo_vehiculo_id: tipoVehiculoId ?? null,
        color_id: colorId ?? null,
        observaciones: `Registro automático - Confianza: ${(deteccion.confianza || 0) * 100}%`,
        imagen_base64: imagenBase64,
      });

      setUltimosRegistros((prev) => [nuevoRegistro, ...prev.slice(0, 4)]);
      toast.success(`Vehículo registrado: ${deteccion.placa}`);
      
      // Limpiar detección actual después de registrar
      setTimeout(() => setDeteccionActual(null), 3000);
    } catch (error) {
      console.error("Error al registrar:", error);
      toast.error("Error al registrar el vehículo");
    }
  };

  // Iniciar/detener detección automática
  const toggleDeteccion = () => {
    if (!camaraActiva) {
      toast.error("Debe iniciar la cámara primero");
      return;
    }

    if (!puertaSeleccionada) {
      toast.error("Debe seleccionar una puerta");
      return;
    }

    if (deteccionActiva) {
      // Detener
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setDeteccionActiva(false);
      toast.info("Detección automática detenida");
    } else {
      // Iniciar
      intervalRef.current = setInterval(procesarFrame, 2000); // Cada 2 segundos
      setDeteccionActiva(true);
      toast.success("Detección automática iniciada");
    }
  };

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      detenerCamara();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [detenerCamara]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Captura en Vivo</h1>
          <p className="text-gray-600 mt-2">
            Detección y registro automático de vehículos en tiempo real
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de Video */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Vista de Cámara
              </CardTitle>
              <CardDescription>
                {camaraActiva
                  ? "Cámara activa - Capturando video"
                  : "Presione iniciar para activar la cámara"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                {/* Video */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Canvas de overlay para bounding box */}
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ objectFit: "cover" }}
                />

                {/* Canvas oculto para captura */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay de estado */}
                {!camaraActiva && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
                    <div className="text-center text-white">
                      <VideoOff className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Cámara no iniciada</p>
                    </div>
                  </div>
                )}

                {/* Indicador de procesamiento */}
                {procesando && (
                  <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </div>
                )}

                {/* Indicador de detección activa */}
                {deteccionActiva && (
                  <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 animate-pulse">
                    <Video className="w-4 h-4" />
                    Detección Activa
                  </div>
                )}

                {/* Detección actual */}
                {deteccionActual && (
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">Vehículo Detectado</h3>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          <div>
                            <span className="text-gray-600">Placa:</span>
                            <Badge className="ml-2" variant="default">
                              {deteccionActual.placa}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-gray-600">Tipo:</span>
                            <span className="ml-2 font-medium">
                              {deteccionActual.tipo_vehiculo}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Color:</span>
                            <span className="ml-2 font-medium">
                              {deteccionActual.color}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Confianza:</span>
                            <span className="ml-2 font-medium">
                              {((deteccionActual.confianza || 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Controles */}
              <div className="mt-4 flex gap-2">
                {!camaraActiva ? (
                  <Button onClick={iniciarCamara} className="flex-1">
                    <Camera className="w-4 h-4 mr-2" />
                    Iniciar Cámara
                  </Button>
                ) : (
                  <>
                    <Button onClick={detenerCamara} variant="destructive" className="flex-1">
                      <VideoOff className="w-4 h-4 mr-2" />
                      Detener Cámara
                    </Button>
                    <Button
                      onClick={toggleDeteccion}
                      variant={deteccionActiva ? "secondary" : "default"}
                      className="flex-1"
                      disabled={!puertaSeleccionada}
                    >
                      {deteccionActiva ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          Pausar Detección
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Iniciar Detección
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Panel de Configuración */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración</CardTitle>
                <CardDescription>Parámetros de registro automático</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selector de Cámara */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Cámara
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={obtenerCamaras}
                      title="Actualizar lista de cámaras"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </Label>
                  <Select 
                    value={camaraSeleccionada} 
                    onValueChange={setCamaraSeleccionada}
                    disabled={camaraActiva}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione cámara" />
                    </SelectTrigger>
                    <SelectContent>
                      {camarasDisponibles.map((camara) => (
                        <SelectItem key={camara.deviceId} value={camara.deviceId}>
                          {camara.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {camarasDisponibles.length === 0 && (
                    <p className="text-xs text-gray-500">
                      No se encontraron cámaras. Presione el botón para buscar.
                    </p>
                  )}
                </div>

                {/* Tipo de evento */}
                <div className="space-y-2">
                  <Label>Tipo de Evento</Label>
                  <Select value={tipoEvento} onValueChange={(v: any) => setTipoEvento(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="salida">Salida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Puerta */}
                <div className="space-y-2">
                  <Label>Puerta de Acceso *</Label>
                  <Select value={puertaSeleccionada} onValueChange={setPuertaSeleccionada}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione puerta" />
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

                {!puertaSeleccionada && (
                  <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Debe seleccionar una puerta para iniciar la detección automática</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Últimos registros */}
            <Card>
              <CardHeader>
                <CardTitle>Últimos Registros</CardTitle>
                <CardDescription>Vehículos registrados recientemente</CardDescription>
              </CardHeader>
              <CardContent>
                {ultimosRegistros.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No hay registros aún
                  </p>
                ) : (
                  <div className="space-y-3">
                    {ultimosRegistros.map((registro, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <Car className="w-5 h-5 text-blue-600" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{registro.placa}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(registro.fecha_hora).toLocaleTimeString()}
                          </div>
                        </div>
                        <Badge variant={registro.tipo_evento === "entrada" ? "default" : "secondary"}>
                          {registro.tipo_evento}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
