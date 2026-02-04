import React, { useEffect, useState } from "react";
import AdminLayout from "@/app/layout/admin-layout";
import {
  BarChart3,
  Truck,
  Users,
  Settings,
  MapPin,
  UserCog,
  Shield,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { se } from "date-fns/locale";

interface SidebarModule {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  route: string;
  options?: ModuleOption[];
}

interface ModuleOption {
  id: string;
  label: string;
  route: string;
  icon?: React.ComponentType<any>;
}

const sidebarModules: SidebarModule[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    icon: BarChart3,
    route: "/admin/dashboard",
    options: [
      {
        id: "ver-dashboard",
        label: "Ver dashboard",
        route: "/admin/dashboard",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "Administracion interna",
    name: "Administracion interna",
    icon: UserCog,
    route: "/admin/residentes ",
    options: [
      {
        id: "residentes",
        label: "Residentes",
        route: "/admin/residentes",
        icon: Users,
      },
      {
        id: "personal",
        label: "Personal",
        route: "/admin/personal",
        icon: Users,
      },
    ],
  },
  {
    id: "mantenimiento",
    name: "Mantenimiento",
    icon: Settings,
    route: "/admin/mantenimiento",
    options: [
      {
        id: "panel",
        label: "Panel",
        route: "/admin/mantenimiento",
        icon: Settings,
      },
      {
        id: "tareas",
        label: "Tareas",
        route: "/admin/mantenimiento/tareas",
        icon: Settings,
      },
      {
        id: "talleres",
        label: "Talleres",
        route: "/admin/mantenimiento/talleres",
        icon: MapPin,
      },
    ],
  },
  {
    id: "usuarios",
    name: "Usuarios y Roles",
    icon: Users,
    route: "/admin/usuarios",
    options: [
      {
        id: "usuarios",
        label: "Usuarios",
        route: "/admin/usuarios",
        icon: Users,
      },
      { id: "roles", label: "Roles", route: "/admin/roles", icon: UserCog },
      {
        id: "permisos",
        label: "Permisos",
        route: "/admin/permisos",
        icon: Settings,
      },
    ],
  },
  {
    id: "bitacora",
    name: "Bitácora",
    icon: BarChart3,
    route: "/admin/bitacora",
    options: [
      {
        id: "ver",
        label: "Ver bitácora",
        route: "/admin/bitacora",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "seguridad",
    name: "Seguridad",
    icon: Shield,
    route: "/admin/seguridad",
    options: [
      {
        id: "dashboard",
        label: "Dashboard",
        route: "/admin/seguridad",
        icon: BarChart3,
      },
      {
        id: "personas",
        label: "Personas Autorizadas",
        route: "/admin/seguridad",
        icon: Users,
      },
      {
        id: "vehiculos",
        label: "Vehículos Autorizados",
        route: "/admin/seguridad",
        icon: Truck,
      },
      {
        id: "reconocimiento-facial",
        label: "Reconocimiento Facial",
        route: "/admin/seguridad",
        icon: Settings,
      },
      {
        id: "reconocimiento-placa",
        label: "Reconocimiento de Placas",
        route: "/admin/seguridad",
        icon: Truck,
      },
    ],
  },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<SidebarModule | null>(null);

  // Cerrar con ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openModule = (module: SidebarModule) => {
    setSelected(module);
    setIsOpen(true);
  };

  const goTo = (route: string) => {
    setIsOpen(false);
    navigate(route);
  };

  return (
    <AdminLayout>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sidebarModules.map((module) => (
          <button
            key={module.id}
            className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:bg-blue-50 transition-colors"
            onClick={() => openModule(module)}
          >
            <module.icon className="w-10 h-10 text-blue-600 mb-3" />
            <span className="text-lg font-semibold text-gray-700">
              {module.name}
            </span>
          </button>
        ))}
      </div>

      {/* Modal de opciones */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative z-10 w-11/12 max-w-xl bg-white rounded-2xl shadow-lg border border-gray-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selected?.icon && (
                  <selected.icon className="w-6 h-6 text-blue-600" />
                )}
                <h2 className="text-xl font-semibold text-gray-800">
                  {selected?.name}
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(selected?.options?.length
                  ? selected.options
                  : [
                      {
                        id: "ir",
                        label: "Ir al módulo",
                        route: selected?.route || "/",
                      },
                    ]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => opt.route && goTo(opt.route)}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-blue-50 transition-colors text-left"
                  >
                    {opt.icon ? (
                      <opt.icon className="w-5 h-5 text-blue-600" />
                    ) : (
                      <span className="inline-block w-5 h-5 rounded bg-blue-100" />
                    )}
                    <span className="font-medium text-gray-700">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
