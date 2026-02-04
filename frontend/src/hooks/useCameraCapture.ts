/**
 * Hook para captura de imagen desde cámara web
 */

import { useState, useRef, useCallback, useEffect } from "react";

interface UseCameraCaptureOptions {
  facingMode?: "user" | "environment";
  width?: number;
  height?: number;
}

export function useCameraCapture(options: UseCameraCaptureOptions = {}) {
  const {
    facingMode = "environment",
    width = 1280,
    height = 720,
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  // Obtener lista de cámaras disponibles
  const getDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(
        (device) => device.kind === "videoinput"
      );
      setDevices(videoDevices);
      return videoDevices;
    } catch (err) {
      console.error("Error al enumerar dispositivos:", err);
      return [];
    }
  }, []);

  // Iniciar cámara
  const startCamera = useCallback(
    async (deviceId?: string) => {
      setError(null);
      try {
        // Detener stream anterior si existe
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: {
            width: { ideal: width },
            height: { ideal: height },
            facingMode: deviceId ? undefined : facingMode,
            deviceId: deviceId ? { exact: deviceId } : undefined,
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Guardar ID del dispositivo actual
        const track = stream.getVideoTracks()[0];
        if (track) {
          const settings = track.getSettings();
          setCurrentDeviceId(settings.deviceId || null);
        }

        setIsActive(true);
        setCapturedImage(null);

        // Actualizar lista de dispositivos
        await getDevices();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error al acceder a la cámara";
        setError(errorMessage);
        console.error("Error al iniciar cámara:", err);
      }
    },
    [facingMode, width, height, getDevices]
  );

  // Detener cámara
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setCurrentDeviceId(null);
  }, []);

  // Capturar imagen
  const captureImage = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) {
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    // Ajustar canvas al tamaño del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar frame actual
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Obtener imagen como base64
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageData);

    return imageData;
  }, []);

  // Limpiar imagen capturada
  const clearCapture = useCallback(() => {
    setCapturedImage(null);
  }, []);

  // Cambiar cámara
  const switchCamera = useCallback(
    async (deviceId: string) => {
      await startCamera(deviceId);
    },
    [startCamera]
  );

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    // Refs para elementos HTML
    videoRef,
    canvasRef,
    
    // Estado
    isActive,
    error,
    capturedImage,
    devices,
    currentDeviceId,
    
    // Acciones
    startCamera,
    stopCamera,
    captureImage,
    clearCapture,
    switchCamera,
    getDevices,
  };
}
