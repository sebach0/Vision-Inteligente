import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserInfo } from "@/components/user-info";
import { useMobileNavigation } from "@/hooks/use-mobile-navigation";
import { type User } from "@/services/api";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface UserMenuContentProps {
  user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
  const cleanup = useMobileNavigation();
  const navigate = useNavigate();
  const { logout, adminLogout, isAdmin } = useAuth();

  const handleLogout = async () => {
    try {
      cleanup();
      // Usar el logout apropiado según el tipo de usuario
      if (isAdmin) {
        await adminLogout();
      } else {
        await logout();
      }
  // Redirigir al login de admin después del logout exitoso
  navigate("/admin");
    } catch (error) {
      console.error("Error durante el logout:", error);

      // Aunque falle el logout en el backend, limpiar el estado local
      // para evitar que el usuario quede en un estado inconsistente
      try {
        // Forzar limpieza local de tokens
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
      } catch (localError) {
        console.error("Error limpiando tokens locales:", localError);
      }

  // Redirigir al login admin de todas formas
  navigate("/admin");
    }
  };

  return (
    <>
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          <UserInfo user={user} showEmail={true} />
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem asChild>
          <Link className="block w-full" to="/profile/edit" onClick={cleanup}>
            <Settings className="mr-2" />
            Configuración
          </Link>
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <button className="block w-full" onClick={handleLogout}>
          <LogOut className="mr-2" />
          Cerrar sesión
        </button>
      </DropdownMenuItem>
    </>
  );
}
