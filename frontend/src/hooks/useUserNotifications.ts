import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { Notificacion } from '@/types';
import api from '@/lib/api';

interface UseUserNotificationsState {
  notifications: Notificacion[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  isOpen: boolean;
  selectedNotification: Notificacion | null;
}

interface UseUserNotificationsActions {
  loadNotifications: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  toggleNotificationsMenu: (open?: boolean) => void;
  selectNotification: (notification: Notificacion) => void;
  closeNotificationDetails: () => void;
}

export function useUserNotifications(): UseUserNotificationsState & UseUserNotificationsActions {
  const [state, setState] = useState<UseUserNotificationsState>({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
    isOpen: false,
    selectedNotification: null,
  });

  const loadNotifications = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Cargar notificaciones del usuario actual (solo las no leídas o recientes)
      const response = await api.get('/api/admin/notificaciones/', {
        params: {
          leida: false,
          ordering: '-fecha_creacion',
          limit: 10
        }
      });
      
      const notifications = response.data.results || response.data || [];
      const unreadCount = notifications.filter((n: Notificacion) => !n.leida).length;
      
      setState(prev => ({ 
        ...prev, 
        notifications,
        unreadCount,
        loading: false 
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar notificaciones';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      console.error('Error loading notifications:', error);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await api.patch(`/api/admin/notificaciones/${notificationId}/`, {
        leida: true,
        fecha_lectura: new Date().toISOString()
      });
      
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => 
          n.id === notificationId ? { ...n, leida: true } : n
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1)
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Error al marcar notificación como leída');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      // Marcar todas las notificaciones como leídas
      await api.post('/api/admin/notificaciones/marcar_todas_leidas/');
      
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, leida: true })),
        unreadCount: 0
      }));
      
      toast.success('Todas las notificaciones marcadas como leídas');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Error al marcar todas las notificaciones');
    }
  }, []);

  const toggleNotificationsMenu = useCallback((open?: boolean) => {
    setState(prev => ({ 
      ...prev, 
      isOpen: open !== undefined ? open : !prev.isOpen 
    }));
  }, []);

  const selectNotification = useCallback(async (notification: Notificacion) => {
    setState(prev => ({ 
      ...prev, 
      selectedNotification: notification,
      isOpen: false 
    }));
    
    // Marcar como leída si no lo está
    if (!notification.leida) {
      await markAsRead(notification.id);
    }
  }, [markAsRead]);

  const closeNotificationDetails = useCallback(() => {
    setState(prev => ({ ...prev, selectedNotification: null }));
  }, []);

  // Cargar notificaciones al montar el componente
  useEffect(() => {
    loadNotifications();
    
    // Actualizar notificaciones cada 2 minutos
    const interval = setInterval(loadNotifications, 120000);
    
    return () => clearInterval(interval);
  }, [loadNotifications]);

  return {
    ...state,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    toggleNotificationsMenu,
    selectNotification,
    closeNotificationDetails,
  };
}
