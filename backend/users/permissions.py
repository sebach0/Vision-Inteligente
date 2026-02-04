from rest_framework import permissions


class IsAdminPortalUser(permissions.BasePermission):
    """
    Permiso personalizado que verifica que el usuario tenga acceso al panel administrativo.
    """

    def has_permission(self, request, view):
        # Verificar que el usuario esté autenticado
        if not request.user or not request.user.is_authenticated:
            return False

        # Verificar que tenga rol administrativo
        if not request.user.es_administrativo:
            return False

        # Verificar que tenga acceso al panel administrativo
        if not request.user.is_staff:
            return False

        return True


class CanManageUsers(permissions.BasePermission):
    """
    Permiso para gestionar usuarios.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return request.user.tiene_permiso("gestionar_usuarios")


class CanManagePersonal(permissions.BasePermission):
    """
    Permiso para gestionar personal.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return request.user.tiene_permiso("gestionar_personal")


class CanManageResidentes(permissions.BasePermission):
    """
    Permiso para gestionar residentes.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return request.user.tiene_permiso("gestionar_residentes")


class CanManageRoles(permissions.BasePermission):
    """
    Permiso para gestionar roles.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return request.user.tiene_permiso("gestionar_roles")


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permiso que permite acceso solo al propietario del objeto o a administradores.
    """

    def has_object_permission(self, request, view, obj):
        # Administradores pueden acceder a todo
        if request.user.is_staff and request.user.es_administrativo:
            return True

        # El propietario puede acceder a su propio objeto
        if hasattr(obj, "user") and obj.user == request.user:
            return True

        # Si el objeto es un usuario, verificar si es el mismo usuario
        if hasattr(obj, "id") and obj.id == request.user.id:
            return True

        return False


class HasPermission(permissions.BasePermission):
    """
    Permiso que verifica un permiso específico.
    """

    def __init__(self, permission_name):
        self.permission_name = permission_name

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return request.user.tiene_permiso(self.permission_name)


class HasAnyPermission(permissions.BasePermission):
    """
    Permiso que verifica si el usuario tiene al menos uno de los permisos especificados.
    """

    def __init__(self, permission_names):
        self.permission_names = (
            permission_names
            if isinstance(permission_names, list)
            else [permission_names]
        )

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return any(request.user.tiene_permiso(perm) for perm in self.permission_names)


class HasAllPermissions(permissions.BasePermission):
    """
    Permiso que verifica si el usuario tiene todos los permisos especificados.
    """

    def __init__(self, permission_names):
        self.permission_names = (
            permission_names
            if isinstance(permission_names, list)
            else [permission_names]
        )

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return all(request.user.tiene_permiso(perm) for perm in self.permission_names)
