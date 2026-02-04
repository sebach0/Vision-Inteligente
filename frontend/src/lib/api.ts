import axios from "axios";
import toast from "react-hot-toast";

/**
 * Detecta automáticamente la URL base de la API según el entorno
 *
 * DETECCIÓN AUTOMÁTICA:
 * 🏠 Desarrollo local: localhost:5173 → localhost:8000
 * 🐳 Docker local: localhost:5173 → localhost:8000
 * ☁️ Producción/Nube: cualquier-ip:5173 → misma-ip:8000
 *
 * PRECEDENCIA:
 * 1. Variable de entorno VITE_API_URL (override manual)
 * 2. Detección automática basada en window.location
 */
export function getApiBaseUrl(): string {
  // 1. Si hay variable de entorno, úsala (para casos especiales)
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    console.log("🔧 [API] Usando URL de variable de entorno:", envUrl);
    return envUrl.replace(/\/+$/, "");
  }

  // 2. Detección automática basada en la ubicación actual
  const { protocol, hostname } = window.location;

  // Determinar la URL de la API automáticamente
  let apiUrl: string;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    // 🏠 Entorno local (desarrollo o Docker local)
    apiUrl = `${protocol}//localhost:8000`;
    console.log("🏠 [API] Entorno local detectado → localhost:8000");
  } else {
    // ☁️ Entorno de producción/nube (cualquier IP)
    apiUrl = `${protocol}//${hostname}:8000`;
    console.log(
      "☁️ [API] Entorno de producción detectado →",
      `${hostname}:8000`
    );
  }

  console.log("🎯 [API] URL final de la API:", apiUrl);
  return apiUrl;
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true, // habilitado para cookies/CSRF
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 10000, // 10 segundos timeout
});

// Interceptor para requests - agregar headers necesarios
api.interceptors.request.use(
  (config) => {
    // Asegurar que Content-Type esté presente
    if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }

    // 🔑 AGREGAR TOKEN DE AUTENTICACIÓN AUTOMÁTICAMENTE
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para responses - manejo de errores mejorado
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Manejo específico de errores
    let msg = "Error de red";

    if (err.response) {
      // Error del servidor
      const status = err.response.status;
      const errorData = err.response.data;

      if (status === 400) {
        // Bad Request - mostrar mensaje específico del backend
        msg =
          errorData?.detail ||
          errorData?.message ||
          errorData?.error ||
          "Datos inválidos";
      } else if (status === 401) {
        msg = "No autorizado. Verifica tus credenciales.";
        // 🔄 Limpiar tokens expirados/inválidos
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        // Redirigir al login si no estamos ya ahí
        if (
          !window.location.pathname.includes("/admin") &&
          !window.location.pathname.includes("/login")
        ) {
          window.location.href = "/admin";
        }
      } else if (status === 403) {
        msg = "No tienes permisos para realizar esta acción.";
      } else if (status === 404) {
        msg = "Recurso no encontrado.";
      } else if (status >= 500) {
        msg = "Error del servidor. Intenta nuevamente.";
      } else {
        msg = errorData?.detail || errorData?.message || `Error ${status}`;
      }
    } else if (err.request) {
      // No hubo respuesta del servidor
      msg = "No se pudo conectar al servidor. Verifica tu conexión.";
    } else {
      // Error en la configuración de la petición
      msg = err.message || "Error inesperado";
    }

    // Solo mostrar toast si no es un error de login (lo maneja el componente)
    if (!err.config?.url?.includes("/login/")) {
      toast.error(msg);
    }

    return Promise.reject(err);
  }
);

export default api;
