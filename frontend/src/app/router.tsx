import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import AdminPage from "../pages/admin/admin.page";
import AdminLoginPage from "@/pages/auth/AdminLoginPage";
import ProtectedRoute from "@/app/auth/ProtectedRoute";
import PermisosCRUD from "../pages/admin/usuarios/roles-permisos/permiso";
import RolForm from "../pages/admin/usuarios/roles-permisos/rol";
import UsuariosPage from "../pages/admin/usuarios/users.page";
import AccountSettingsPage from "./auth/account-settings.page";
// Acceso Vehicular
import RegistroAccesoPage from "../pages/admin/acceso-vehicular/registro.page";
import HistorialAccesosPage from "../pages/admin/acceso-vehicular/historial.page";
import DashboardAccesoPage from "../pages/admin/acceso-vehicular/dashboard.page";
import CapturaVivoPage from "../pages/admin/acceso-vehicular/captura-vivo.page";

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        {/* Rutas protegidas de administración */}
        <Route
          path="/admin/permisos"
          element={
            <ProtectedRoute requireAdmin={true}>
              <PermisosCRUD />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <ProtectedRoute requireAdmin={true}>
              <RolForm />
            </ProtectedRoute>
          }
        />
        {/* auth */}
        <Route path="/login" element={<Navigate to="/admin" replace />} />
        <Route path="/register" element={<Navigate to="/admin" replace />} />

        {/* admin */}
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route
          path="/admin/home"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/usuarios"
          element={
            <ProtectedRoute requireAdmin={true}>
              <UsuariosPage />
            </ProtectedRoute>
          }
        />

        {/* rutas de usuario ya no aplican en web; mantener settings solo para admin */}
        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AccountSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Acceso Vehicular */}
        <Route
          path="/admin/acceso-vehicular"
          element={
            <ProtectedRoute requireAdmin={true}>
              <DashboardAccesoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/acceso-vehicular/registro"
          element={
            <ProtectedRoute requireAdmin={true}>
              <RegistroAccesoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/acceso-vehicular/captura-vivo"
          element={
            <ProtectedRoute requireAdmin={true}>
              <CapturaVivoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/acceso-vehicular/historial"
          element={
            <ProtectedRoute requireAdmin={true}>
              <HistorialAccesosPage />
            </ProtectedRoute>
          }
        />

        {/* catch-all: redirigir al login de admin */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Router>
  );
}
