import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import toast from "react-hot-toast";

interface GoogleLoginButtonProps {
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  disabled?: boolean;
  className?: string;
}

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
  disabled = false,
  className = "",
}): React.ReactNode => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Depuración de las variables de entorno
  useEffect(() => {
    // Verificar si las variables de entorno están cargadas
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    console.log("VITE_GOOGLE_CLIENT_ID:", clientId);

    // Mostrar el origen actual para depuración
    console.log("Origen actual:", window.location.origin);

    // Valor de respaldo en caso de que no se cargue la variable de entorno
    if (!clientId) {
      console.warn(
        "No se encontró VITE_GOOGLE_CLIENT_ID en las variables de entorno."
      );
      console.warn(
        "Asegúrate de que esté configurado en el archivo .env y que el contenedor tenga acceso a él."
      );
    }
  }, []);

  useEffect(() => {
    // Cargar el script de Google Identity Services
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      // Limpiar el script al desmontar
      const existingScript = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]'
      );
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  const handleGoogleLogin = () => {
    if (!isLoaded || !window.google) {
      toast.error("Google Identity Services no está cargado");
      return;
    }

    // Intentar obtener el ID del cliente de las variables de entorno
    // Si no está disponible, usar el valor hardcodeado
    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      "980248899609-m5ougf9tmq2helkd30t9ofsa0shflett.apps.googleusercontent.com";
    console.log("Intentando iniciar sesión con Google. Client ID:", clientId);

    if (!clientId) {
      toast.error(
        "Google Client ID no está configurado. Contacta al administrador."
      );
      return;
    }

    setIsLoading(true);

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          setIsLoading(false);
          if (response.error) {
            console.error("Error en respuesta de Google:", response.error);
            onError?.(response);
            return;
          }
          console.log("Respuesta exitosa de Google:", response);
          onSuccess?.(response);
        },
        error_callback: (error: any) => {
          setIsLoading(false);
          console.error("Error de autenticación de Google:", error);
          toast.error("Error al autenticar con Google");
          onError?.(error);
        },
        ux_mode: "popup", // Usar pop-up en lugar de redirección
        auto_select: false, // No seleccionar automáticamente
        context: "signin", // Contexto para iniciar sesión
      });

      // Intenta mostrar el popup primero
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Si el popup no se muestra o es omitido, creamos un botón de Google explícito
          console.log(
            "Popup no mostrado o omitido, usando botón explícito como alternativa"
          );
          setIsLoading(false);

          if (notification.isNotDisplayed()) {
            console.warn(
              "Google One-Tap no se pudo mostrar",
              notification.getNotDisplayedReason()
            );
            if (notification.getNotDisplayedReason() === "suppressed_by_user") {
              toast(
                "Has desactivado los inicios de sesión automáticos de Google"
              );
            } else {
              toast(
                "No se pudo mostrar el inicio de sesión automático de Google"
              );
            }
          } else if (notification.isSkippedMoment()) {
            console.warn(
              "Google One-Tap fue omitido",
              notification.getSkippedReason()
            );
            toast("Inicio de sesión de Google omitido");
          }

          // Intentamos usar el botón renderizado como alternativa
          try {
            // Creamos un contenedor para el botón
            const googleButtonContainer = document.createElement("div");
            googleButtonContainer.id = "google-signin-button-container";
            googleButtonContainer.style.position = "absolute";
            googleButtonContainer.style.left = "-9999px"; // Fuera de la vista
            document.body.appendChild(googleButtonContainer);

            // Renderizamos el botón de Google en el contenedor
            window.google.accounts.id.renderButton(googleButtonContainer, {
              type: "standard",
              theme: "outline",
              size: "large",
              text: "signin_with",
              shape: "rectangular",
              width: 250,
            });

            // Simulamos el clic en el botón
            setTimeout(() => {
              const googleButton =
                googleButtonContainer.querySelector('div[role="button"]');
              if (googleButton) {
                (googleButton as HTMLElement).click();
              } else {
                console.error(
                  "No se pudo encontrar el botón de Google renderizado"
                );
                toast.error("Error al iniciar sesión con Google");
              }
            }, 100);
          } catch (renderError) {
            console.error("Error al renderizar botón alternativo", renderError);
            toast.error("No se pudo mostrar el inicio de sesión de Google");
          }
        }
      });
    } catch (error) {
      setIsLoading(false);
      console.error("Error al inicializar Google Identity Services", error);
      toast.error("Error al inicializar la autenticación de Google");
    }
  };

  if (!isLoaded) {
    return (
      <Button type="button" disabled className={`w-full ${className}`}>
        Cargando Google...
      </Button>
    );
  }

  // Botón de prueba si no hay Client ID configurado
  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    "980248899609-m5ougf9tmq2helkd30t9ofsa0shflett.apps.googleusercontent.com";
  console.log("Renderizando botón de Google. Client ID:", clientId);

  if (!clientId) {
    return (
      <Button
        type="button"
        onClick={() => {
          toast.error(
            "Client ID de Google no configurado. Contacta al administrador."
          );
        }}
        disabled={disabled || isLoading}
        className={`w-full bg-blue-500 hover:bg-blue-600 text-white border border-blue-600 ${className}`}
      >
        <div className="flex items-center justify-center">
          <svg
            className="w-5 h-5 mr-2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuar con Google (No configurado)
        </div>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      onClick={handleGoogleLogin}
      disabled={disabled || isLoading}
      className={`w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 ${className}`}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
          Iniciando sesión...
        </div>
      ) : (
        <div className="flex items-center justify-center">
          <svg
            className="w-5 h-5 mr-2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuar con Google
        </div>
      )}
    </Button>
  );
};
