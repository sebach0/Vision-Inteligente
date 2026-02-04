import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { 
  BarChart3, 
  Users, 
  UserCog,
  ShieldCheck,
  BookOpen
} from 'lucide-react';

// Define la estructura del sidebar para mantener consistencia
// Esta estructura debe coincidir con la definida en admin-sidebar.tsx
const sidebarStructure = [
  { id: 'dashboard', name: 'Dashboard', icon: BarChart3, route: '/admin/dashboard' },
  { 
    id: 'usuarios-sistema', 
    name: 'Usuarios y Seguridad', 
    icon: ShieldCheck,
    submodules: [
      { id: 'permisos', name: 'Permisos', icon: ShieldCheck, route: '/admin/permisos' },
      { id: 'roles', name: 'Roles', icon: Users, route: '/admin/roles' },
      { id: 'usuarios', name: 'Usuarios', icon: Users, route: '/admin/usuarios' },
    ] 
  },
  {
    id: 'administracion-interna',
    name: 'Administración Interna',
    icon: UserCog,
    submodules: [
      { id: 'personal', name: 'Personal', icon: Users, route: '/admin/personal' },
      { id: 'residentes', name: 'Residentes', icon: Users, route: '/admin/residentes' },
    ]
  },
  { id: 'bitacora', name: 'Bitácora', icon: BookOpen, route: "/admin/bitacora" },
];

// Generar mapas de rutas a partir de la estructura del sidebar
const routeMap: Record<string, string> = {
  admin: 'Administración',
  dashboard: 'Dashboard',
};

// Generar mapas de módulos a partir de la estructura del sidebar
const moduleMap: Record<string, { name: string, parent?: string, path: string }> = {};

// Procesar la estructura del sidebar para crear los mapas
sidebarStructure.forEach(module => {
  if (module.route) {
    // Extraer el último segmento de la ruta para usarlo como clave
    const segments = module.route.split('/');
    const key = segments[segments.length - 1];
    if (key) {
      routeMap[key] = module.name;
    }
  }
  
  if (module.submodules) {
    module.submodules.forEach(submodule => {
      if (submodule.route) {
        const segments = submodule.route.split('/');
        const key = segments[segments.length - 1];
        if (key) {
          routeMap[key] = submodule.name;
          
          // Agregar al mapa de módulos
          moduleMap[key] = { 
            name: module.name, 
            parent: 'admin',
            path: submodule.route
          };
        }
      }
    });
  }
});

interface BreadcrumbItem {
  name: string;
  path: string;
  icon?: React.ElementType;
}

export default function Breadcrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);
  
  // No mostrar breadcrumbs para la página principal
  if (pathnames.length === 0 || (pathnames.length === 1 && pathnames[0] === 'admin')) {
    return null;
  }
  
  const breadcrumbs: BreadcrumbItem[] = [];
  
  // Inicio siempre presente
  breadcrumbs.push({
    name: 'Inicio',
    path: '/admin',
    icon: Home
  });
  
  // Encontrar la página actual en la estructura del sidebar
  let currentModule = null;
  let currentSubmodule = null;
  
  // Último segmento de la ruta actual
  const lastSegment = pathnames[pathnames.length - 1];
  
  // Buscar en la estructura del sidebar
  for (const module of sidebarStructure) {
    if (module.route && module.route.includes(`/${lastSegment}`)) {
      currentModule = module;
      break;
    }
    
    if (module.submodules) {
      for (const submodule of module.submodules) {
        if (submodule.route && submodule.route.includes(`/${lastSegment}`)) {
          currentModule = module;
          currentSubmodule = submodule;
          break;
        }
      }
    }
    
    if (currentModule) break;
  }
  
  // Construir los breadcrumbs basados en la estructura del sidebar
  if (currentModule) {
    if (currentModule.submodules && currentSubmodule) {
      // Si es un submódulo, agregar primero el módulo principal
      breadcrumbs.push({
        name: currentModule.name,
        path: `/admin/${currentModule.id}`,
        icon: currentModule.icon
      });
      
      // Luego agregar el submódulo
      breadcrumbs.push({
        name: currentSubmodule.name,
        path: currentSubmodule.route || '',
        icon: currentSubmodule.icon
      });
    } else {
      // Si es un módulo principal, agregarlo directamente
      breadcrumbs.push({
        name: currentModule.name,
        path: currentModule.route || '',
        icon: currentModule.icon
      });
    }
  } else {
    // Fallback al método anterior si no se encuentra en la estructura
    let currentPath = '';
    
    pathnames.forEach((path, i) => {
      currentPath += `/${path}`;
      
      // Ignorar el prefijo 'admin' en los breadcrumbs intermedios
      if (path === 'admin' && i === 0) return;
      
      // Verificar si el path actual es parte de un módulo
      if (moduleMap[path] && i === 1) {
        breadcrumbs.push({
          name: moduleMap[path].name,
          path: moduleMap[path].path,
        });
      }
      
      // Agregar el path actual
      breadcrumbs.push({
        name: routeMap[path] || path,
        path: currentPath,
      });
    });
  }
  
  return (
    <div className="flex items-center text-sm" style={{ color: '#1d4ed8' }}> {/* blue-700 */}
      {breadcrumbs.map((breadcrumb, i) => (
        <React.Fragment key={`${breadcrumb.path}-${i}`}>
          {i === 0 ? (
            <Link
              to={breadcrumb.path}
              className="flex items-center transition-colors"
              style={{ color: '#1d4ed8' }} /* blue-700 */
            >
              <Home className="h-4 w-4 mr-1" style={{ color: '#1d4ed8' }} /* blue-700 */ />
              {breadcrumb.name}
            </Link>
          ) : (
            <>
              <ChevronRight className="h-4 w-4 mx-2" style={{ color: '#1d4ed8' }} /* blue-700 */ />
              {i === breadcrumbs.length - 1 ? (
                <span className="font-medium flex items-center" style={{ color: '#000000' }}>
                  {breadcrumb.icon && <breadcrumb.icon className="h-4 w-4 mr-1" style={{ color: '#1d4ed8' }} /* blue-700 */ />}
                  {breadcrumb.name}
                </span>
              ) : (
                <Link
                  to={breadcrumb.path}
                  className="transition-colors flex items-center"
                  style={{ color: '#1d4ed8' }} /* blue-700 */
                >
                  {breadcrumb.icon && <breadcrumb.icon className="h-4 w-4 mr-1" style={{ color: '#1d4ed8' }} /* blue-700 */ />}
                  {breadcrumb.name}
                </Link>
              )}
            </>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}