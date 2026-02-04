import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type ProtectedRouteProps = {
  children: ReactNode;
  requireAdmin?: boolean;
};

/**
 * Componente que protege rutas verificando si el usuario está autenticado.
 * Si requireAdmin es true, verifica además si el usuario tiene rol de administrador.
 */
export default function ProtectedRoute({ 
  children, 
  requireAdmin = false 
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // Mientras verifica la autenticación, puede mostrar un indicador de carga
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Verificando autenticación...</div>;
  }

  // Si no está autenticado, redirige al login de admin (ya no hay login cliente en web)
  if (!isAuthenticated) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }

  // Si requiere admin pero el usuario no lo es, redirige al login admin
  if (requireAdmin && (!user?.rol?.es_administrativo)) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }

  // Si está autenticado y cumple los requisitos, muestra el contenido
  return <>{children}</>;
}
