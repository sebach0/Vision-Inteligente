import { useAuth } from "../context/AuthContext";
import { useMemo } from "react";

export interface Permission {
  name: string;
  description: string;
}

export const usePermissions = () => {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    if (!user?.rol?.permisos) return [];
    return user.rol.permisos;
  }, [user]);

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.is_superuser) return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    return permissionList.some((permission) => hasPermission(permission));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    return permissionList.every((permission) => hasPermission(permission));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: user?.es_administrativo || false,
    canAccessAdmin: user?.puede_acceder_admin || false,
  };
};
