import React from 'react';
import { formatDistance } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { useUserNotifications } from '@/hooks/useUserNotifications';
import type { Notificacion } from '@/types';

export function NotificationsButton() {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    isOpen,
    toggleNotificationsMenu,
    selectNotification,
    selectedNotification,
    closeNotificationDetails
  } = useUserNotifications();

  const renderNotificationContent = (notification: Notificacion) => {
    const timeAgo = notification.fecha_creacion ? 
      formatDistance(new Date(notification.fecha_creacion), new Date(), { 
        addSuffix: true,
        locale: es 
      }) : '';
    
    let priorityColor = 'bg-gray-500';
    if (notification.prioridad === 'alta') priorityColor = 'bg-orange-500';
    if (notification.prioridad === 'urgente') priorityColor = 'bg-red-500';
    
    return (
      <DropdownMenuItem 
        key={notification.id} 
        className="p-3 cursor-pointer flex flex-col space-y-1" 
        onClick={() => selectNotification(notification)}
      >
        <div className="flex w-full justify-between items-start">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${priorityColor}`} />
            {notification.nombre}
          </h4>
          <span className="text-xs text-gray-400">{timeAgo}</span>
        </div>
        <p className="text-xs text-gray-600 line-clamp-2 mt-1">{notification.descripcion}</p>
        
        {notification.tipo && (
          <Badge variant="secondary" className="mt-1 self-start">
            {notification.tipo_display || notification.tipo}
          </Badge>
        )}
      </DropdownMenuItem>
    );
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={toggleNotificationsMenu}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="p-2 rounded-full bg-gray-100 relative">
            <Bell className="size-5 text-gray-500" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 min-w-[20px] p-0 flex items-center justify-center"
                variant="destructive"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="font-normal">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold">Notificaciones</h2>
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount} sin leer</Badge>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Cargando notificaciones...
              </div>
            ) : notifications.length > 0 ? (
              notifications.map(renderNotificationContent)
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                No tienes notificaciones nuevas
              </div>
            )}
          </ScrollArea>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/admin/notificaciones" className="w-full text-center text-primary cursor-pointer">
              Ver todas las notificaciones
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de detalles de la notificación */}
      {selectedNotification && (
        <Dialog open={true} onOpenChange={() => closeNotificationDetails()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedNotification.prioridad === 'alta' && (
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                )}
                {selectedNotification.prioridad === 'urgente' && (
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                )}
                {selectedNotification.nombre}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {selectedNotification.fecha_creacion && (
                <div className="text-sm text-gray-500">
                  {formatDistance(
                    new Date(selectedNotification.fecha_creacion), 
                    new Date(), 
                    { addSuffix: true, locale: es }
                  )}
                </div>
              )}
              
              <div className="text-sm">
                {selectedNotification.descripcion}
              </div>
              
              {selectedNotification.tipo && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Tipo:</span>
                  <Badge variant="secondary">
                    {selectedNotification.tipo_display || selectedNotification.tipo}
                  </Badge>
                </div>
              )}

              {selectedNotification.prioridad && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Prioridad:</span>
                  <Badge 
                    variant={selectedNotification.prioridad === 'urgente' ? 'destructive' : 
                            selectedNotification.prioridad === 'alta' ? 'default' : 'secondary'}
                  >
                    {selectedNotification.prioridad}
                  </Badge>
                </div>
              )}

              {selectedNotification.estado && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Estado:</span>
                  <Badge variant="outline">
                    {selectedNotification.estado}
                  </Badge>
                </div>
              )}
            </div>
            
            <DialogFooter className="sm:justify-center">
              <Button type="button" onClick={closeNotificationDetails}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}