import React, { useState, useEffect } from "react";
import type { ReactNode } from "react";
import Sidebar from "@/components/admin-sidebar";
import Header from "@/components/admin-header";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AdminLayoutProps {
  children?: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarWidth = collapsed ? 64 : 320;
  
  // Hook para detectar si estamos en un dispositivo móvil
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1026); // 768px es el breakpoint md de Tailwind
    };
    
    // Comprobar inicialmente
    checkIsMobile();
    
    // Añadir listener para cambios en el tamaño de la ventana
    window.addEventListener('resize', checkIsMobile);
    
    // Limpiar el listener cuando el componente se desmonte
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return (
    <div className="h-screen overflow-hidden">
      <div className={`fixed inset-y-0 left-0 z-20`} style={{ width: sidebarWidth }}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>
      <div
        className="fixed top-0 right-0 h-16 z-30"
        style={{ left: sidebarWidth }}
      >
        <Header />
      </div>
      <main
        className="fixed top-16 bottom-0 right-0 transition-all duration-300 overflow-hidden"
        style={{ left: sidebarWidth }}
      >
        {isMobile ? (
          // Contenedor con scroll nativo para dispositivos móviles
          <div className="h-full overflow-auto">
            <div className="px-4 py-6">
              {children}
            </div>
          </div>
        ) : (
          // ScrollArea para pantallas medianas o más grandes
          <ScrollArea className="h-full">
            <div className="px-[32px] py-[48px]">
              {children}
            </div>
          </ScrollArea>
        )}
      </main>
    </div>
  );
}