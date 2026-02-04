"""
Decoradores y utilidades para la aplicación de usuarios.
"""

from functools import wraps
from django.http import HttpResponseForbidden
from django.utils.translation import gettext as _


def requiere_permiso(permiso):
    """
    Decorador que verifica si el usuario tiene un permiso específico.

    Args:
        permiso (str): El permiso requerido

    Returns:
        function: Decorador que envuelve la vista

    Ejemplo de uso:
        @requiere_permiso('gestionar_vehiculos')
        def crear_vehiculo(request):
            # Lógica para crear vehículo
            pass
    """

    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            # Verificar si el usuario está autenticado
            if not request.user.is_authenticated:
                return HttpResponseForbidden(
                    _("Debes iniciar sesión para acceder a esta página")
                )

            # Verificar si el usuario tiene el permiso requerido
            if not request.user.tiene_permiso(permiso):
                return HttpResponseForbidden(
                    _("No tienes permiso para acceder a esta funcionalidad")
                )

            # Si tiene el permiso, ejecutar la vista
            return view_func(request, *args, **kwargs)

        return _wrapped_view

    return decorator


def requiere_permisos(permisos):
    """
    Decorador que verifica si el usuario tiene varios permisos.

    Args:
        permisos (list): Lista de permisos requeridos

    Returns:
        function: Decorador que envuelve la vista

    Ejemplo de uso:
        @requiere_permisos(['ver_vehiculos', 'editar_vehiculo'])
        def editar_vehiculo(request, id):
            # Lógica para editar vehículo
            pass
    """

    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            # Verificar si el usuario está autenticado
            if not request.user.is_authenticated:
                return HttpResponseForbidden(
                    _("Debes iniciar sesión para acceder a esta página")
                )

            # Verificar si el usuario tiene todos los permisos requeridos
            if not request.user.tiene_permisos(permisos):
                return HttpResponseForbidden(
                    _(
                        "No tienes los permisos necesarios para acceder a esta funcionalidad"
                    )
                )

            # Si tiene los permisos, ejecutar la vista
            return view_func(request, *args, **kwargs)

        return _wrapped_view

    return decorator


def requiere_rol_administrativo(view_func):
    """
    Decorador que verifica si el usuario tiene un rol administrativo.

    Args:
        view_func (function): La vista a decorar

    Returns:
        function: Vista decorada

    Ejemplo de uso:
        @requiere_rol_administrativo
        def vista_admin(request):
            # Lógica para administradores
            pass
    """

    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        # Verificar si el usuario está autenticado
        if not request.user.is_authenticated:
            return HttpResponseForbidden(
                _("Debes iniciar sesión para acceder a esta página")
            )

        # Verificar si el usuario tiene rol administrativo
        if not request.user.es_administrativo:
            return HttpResponseForbidden(
                _("Necesitas un rol administrativo para acceder a esta página")
            )

        # Si tiene rol administrativo, ejecutar la vista
        return view_func(request, *args, **kwargs)

    return _wrapped_view


def requiere_permisos_viewset(permisos):
    """
    Decorador que verifica si el usuario tiene los permisos necesarios para ViewSets.

    Args:
        permisos (list): Lista de permisos requeridos

    Returns:
        function: Decorador que verifica permisos para ViewSets
    """

    def decorator(view_method):
        @wraps(view_method)
        def _wrapped_view(self, request, *args, **kwargs):
            # Verificar si el usuario está autenticado
            if not request.user.is_authenticated:
                from rest_framework.response import Response
                from rest_framework import status

                return Response(
                    {"error": "Debes iniciar sesión para acceder a esta funcionalidad"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Verificar si el usuario tiene todos los permisos requeridos
            if not request.user.tiene_permisos(permisos):
                from rest_framework.response import Response
                from rest_framework import status

                return Response(
                    {
                        "error": "No tienes los permisos necesarios para acceder a esta funcionalidad"
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            return view_method(self, request, *args, **kwargs)

        return _wrapped_view

    return decorator
