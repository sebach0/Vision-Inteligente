import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserInfo } from "@/components/user-info";
import { UserMenuContent } from "@/components/user-menu-content";
import { ChevronUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function NavUserHeader() {
  const { user } = useAuth();
  const isMobile = window.innerWidth < 768;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center px-[16px] py-2 rounded-md bg-gray-100">
          <UserInfo user={user} />
          <ChevronUp className="ml-2 size-6" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        align="end"
        side={isMobile ? "bottom" : "bottom"}
      >
        <UserMenuContent
          user={
            user ?? {
              id: 0,
              username: "Invitado",
              email: "",
              first_name: "Invitado",
              last_name: "",
              telefono: "",
              direccion: "",
              ci: "",
              fecha_nacimiento: "",
              is_admin_portal: false,
              puede_acceder_admin: false,
              rol: {
                id: 0,
                nombre: "Invitado",
                es_administrativo: false,
                permisos: [],
              },
              es_activo: false,
              fecha_creacion: "",
              fecha_ultimo_acceso: "",
              codigo_empleado: "",
              departamento: "",
            }
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
