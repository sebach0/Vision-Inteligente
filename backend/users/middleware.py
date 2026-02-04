"""
Middleware para aplicación automática de permisos basado en URLs y métodos HTTP.
"""

from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


class PermissionMiddleware(MiddlewareMixin):
    """
    Middleware que aplica permisos automáticamente basado en la URL y método HTTP.
    """

    # Mapeo de URLs a permisos requeridos
    PERMISSION_MAP = {
        # Gestión de usuarios
        "api/admin/users/": {
            "GET": "gestionar_usuarios",
            "POST": "gestionar_usuarios",
            "PUT": "gestionar_usuarios",
            "PATCH": "gestionar_usuarios",
            "DELETE": "gestionar_usuarios",
        },
        # Gestión de roles
        "api/admin/roles/": {
            "GET": "gestionar_roles",
            "POST": "gestionar_roles",
            "PUT": "gestionar_roles",
            "PATCH": "gestionar_roles",
            "DELETE": "gestionar_roles",
        },
        # Gestión de conductores
        "api/conductores/": {
            "GET": "ver_conductores",
            "POST": "gestionar_conductores",
            "PUT": "gestionar_conductores",
            "PATCH": "gestionar_conductores",
            "DELETE": "gestionar_conductores",
        },
        # Gestión de personal
        "api/personal/": {
            "GET": "ver_personal",
            "POST": "gestionar_personal",
            "PUT": "gestionar_personal",
            "PATCH": "gestionar_personal",
            "DELETE": "gestionar_personal",
        },
        # Gestión de vehículos (si existe)
        "api/vehiculos/": {
            "GET": "ver_vehiculos",
            "POST": "crear_vehiculo",
            "PUT": "editar_vehiculo",
            "PATCH": "editar_vehiculo",
            "DELETE": "eliminar_vehiculo",
        },
        # Gestión de rutas (si existe)
        "api/rutas/": {
            "GET": "ver_rutas",
            "POST": "crear_ruta",
            "PUT": "editar_ruta",
            "PATCH": "editar_ruta",
            "DELETE": "eliminar_ruta",
        },
        # Gestión de viajes (si existe)
        "api/viajes/": {
            "GET": "ver_historial_viajes",
            "POST": "solicitar_viaje",
            "PUT": "gestionar_viajes",
            "PATCH": "gestionar_viajes",
            "DELETE": "cancelar_viaje",
        },
    }

    def process_request(self, request):
        """Procesa la request y verifica permisos"""
        # Solo aplicar a rutas de API
        if not request.path.startswith("/api/"):
            return None

        # Obtener método HTTP
        method = request.method

        # Buscar la ruta en el mapeo de permisos
        required_permission = None
        for path_prefix, methods in self.PERMISSION_MAP.items():
            if request.path.startswith(path_prefix):
                required_permission = methods.get(method)
                break

        # Si no se requiere permiso específico, continuar
        if not required_permission:
            return None

        # Verificar si el usuario está autenticado
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return JsonResponse({
                'error': 'Usuario no autenticado',
                'detail': 'Se requiere autenticación para acceder a esta área'
            }, status=401)
        
        # Verificar si el usuario tiene acceso administrativo
        if not request.user.es_administrativo:
            return JsonResponse({
                'error': 'Acceso denegado',
                'detail': 'Se requiere rol administrativo para acceder a esta área'
            }, status=403)
        
        # Verificar si el usuario tiene acceso al panel administrativo
        if not request.user.is_staff:
            return JsonResponse({
                'error': 'Acceso denegado',
                'detail': 'El usuario no tiene acceso al panel administrativo'
            }, status=403)
        
        return None
