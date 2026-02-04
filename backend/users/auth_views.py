"""
AUTH_VIEWS.PY - MÓDULO DE AUTENTICACIÓN Y AUTORIZACIÓN

RESPONSABILIDADES:
- Login/Logout diferenciado por tipo de usuario (Admin vs Cliente)
- Información del usuario autenticado
- Datos del dashboard y menús dinámicos
- Gestión de sesiones y tokens JWT
- Validaciones de acceso y permisos

NO INCLUYE:
- CRUD de usuarios (ver views.py)
- Gestión de roles (ver views.py)
- Registro de usuarios (ver views.py)
"""

from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate
from django.utils import timezone
# TODO: Descomentar cuando exista el módulo bitacora
# from bitacora.utils import registrar_bitacora
from .models import Rol
from .serializers import UserSerializer
from .decorators import requiere_permisos


class AdminLoginView(TokenObtainPairView):
    """Vista personalizada para login de administradores"""
    
    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {'error': 'Username y password son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Autenticar usuario
        user = authenticate(username=username, password=password)
        
        if not user:
            return Response(
                {'error': 'Credenciales inválidas'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Verificar que el usuario sea administrativo
        if not user.es_administrativo:
            return Response(
                {'error': 'Acceso denegado. Solo personal administrativo puede acceder aquí.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verificar que el usuario esté activo
        if not user.is_active:
            return Response(
                {'error': 'Usuario inactivo'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generar tokens JWT
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        # Actualizar último acceso
        user.fecha_ultimo_acceso = timezone.now()
        user.save(update_fields=['fecha_ultimo_acceso'])
        
        # Registrar en bitácora
        # TODO: Descomentar cuando exista el módulo bitacora
        # registrar_bitacora(
        #     request=request,
        #     usuario=user,
        #     accion="Login Administrativo",
        #     descripcion=f"Administrador {user.username} inició sesión",
        #     modulo="ADMINISTRACION"
        # )
        
        return Response({
            'access': str(access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'tipo_login': 'administrativo'
        })


class ClienteLoginView(TokenObtainPairView):
    """Vista personalizada para login de clientes"""
    
    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {'error': 'Username y password son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Autenticar usuario
        user = authenticate(username=username, password=password)
        
        if not user:
            return Response(
                {'error': 'Credenciales inválidas'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Verificar que el usuario sea cliente
        if user.es_administrativo:
            return Response(
                {'error': 'Acceso denegado. Los administradores deben usar el login administrativo.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verificar que el usuario esté activo
        if not user.is_active:
            return Response(
                {'error': 'Usuario inactivo'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generar tokens JWT
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        # Actualizar último acceso
        user.fecha_ultimo_acceso = timezone.now()
        user.save(update_fields=['fecha_ultimo_acceso'])
        
        # Registrar en bitácora
        # TODO: Descomentar cuando exista el módulo bitacora
        # registrar_bitacora(
        #     request=request,
        #     usuario=user,
        #     accion="Login Cliente",
        #     descripcion=f"Cliente {user.username} inició sesión",
        #     modulo="CLIENTE"
        # )
        
        return Response({
            'access': str(access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'tipo_login': 'cliente'
        })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """Logout universal para cualquier tipo de usuario"""
    try:
        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            return Response(
                {'error': 'Token de refresh requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Invalidar token
        token = RefreshToken(refresh_token)
        token.blacklist()
        
        # Actualizar último acceso
        user = request.user
        user.fecha_ultimo_acceso = timezone.now()
        user.save(update_fields=['fecha_ultimo_acceso'])
        
        # Registrar en bitácora
        # TODO: Descomentar cuando exista el módulo bitacora
        # tipo_usuario = "Administrativo" if user.es_administrativo else "Cliente"
        # registrar_bitacora(
        #     request=request,
        #     usuario=user,
        #     accion="Logout",
        #     descripcion=f"{tipo_usuario} {user.username} cerró sesión",
        #     modulo="AUTENTICACION"
        # )
        
        return Response(
            {'message': 'Logout exitoso'},
            status=status.HTTP_205_RESET_CONTENT
        )
        
    except Exception as e:
        return Response(
            {'error': 'Token inválido'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_info(request):
    """Información del usuario autenticado"""
    user = request.user
    
    # Información básica
    data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'telefono': user.telefono,
        'direccion': user.direccion,
        'is_active': user.is_active,
        'fecha_ultimo_acceso': user.fecha_ultimo_acceso,
        'es_administrativo': user.es_administrativo,
        'es_cliente': user.es_cliente,
    }
    
    # Información del rol
    if user.rol:
        data['rol'] = {
            'id': user.rol.id,
            'nombre': user.rol.nombre,
            'descripcion': user.rol.descripcion,
            'es_administrativo': user.rol.es_administrativo,
            'permisos': user.rol.permisos
        }
    else:
        data['rol'] = None
    
    # Información específica según el tipo de usuario
    if user.es_administrativo:
        data['codigo_empleado'] = user.codigo_empleado
        data['departamento'] = user.departamento
        
        # Información adicional del perfil específico
        try:
            if hasattr(user, 'conductor_profile'):
                data['perfil_conductor'] = {
                    'nro_licencia': user.conductor_profile.nro_licencia,
                    'tipo_licencia': user.conductor_profile.tipo_licencia,
                    'estado': user.conductor_profile.estado,
                    'estado_usuario': user.conductor_profile.estado_usuario
                }
        except:
            pass
        
        try:
            if hasattr(user, 'personal_profile'):
                data['perfil_personal'] = {
                    'codigo_empleado': user.personal_profile.codigo_empleado,
                    'estado': user.personal_profile.estado,
                    'fecha_ingreso': user.personal_profile.fecha_ingreso,
                    'telefono_emergencia': user.personal_profile.telefono_emergencia,
                    'contacto_emergencia': user.personal_profile.contacto_emergencia
                }
        except:
            pass
    else:
        data['fecha_nacimiento'] = user.fecha_nacimiento
    
    return Response(data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_data(request):
    """Datos del dashboard según el tipo de usuario"""
    user = request.user
    
    if user.es_administrativo:
        # Dashboard administrativo
        data = {
            'tipo_usuario': 'administrativo',
            'rol': user.rol.nombre if user.rol else 'Sin rol',
            'permisos': user.get_permisos(),
            'departamento': user.departamento,
            'codigo_empleado': user.codigo_empleado,
            'menu_items': _get_admin_menu_items(user),
            'estadisticas': _get_admin_stats(user)
        }
    else:
        # Dashboard cliente
        data = {
            'tipo_usuario': 'cliente',
            'rol': user.rol.nombre if user.rol else 'Sin rol',
            'menu_items': _get_cliente_menu_items(),
            'estadisticas': _get_cliente_stats(user)
        }
    
    return Response(data)


def _get_admin_menu_items(user):
    """Obtiene los elementos del menú para administradores"""
    menu_items = []
    
    # Menú base para todos los administrativos
    if user.tiene_permiso('ver_dashboard_admin'):
        menu_items.append({
            'nombre': 'Dashboard',
            'icono': 'dashboard',
            'url': '/admin/dashboard',
            'permisos': ['ver_dashboard_admin']
        })
    
    # Gestión de usuarios
    if user.tiene_permiso('gestionar_usuarios'):
        menu_items.append({
            'nombre': 'Usuarios',
            'icono': 'users',
            'url': '/admin/usuarios',
            'permisos': ['gestionar_usuarios']
        })
    
    # Gestión de roles
    if user.tiene_permiso('gestionar_roles'):
        menu_items.append({
            'nombre': 'Roles y Permisos',
            'icono': 'shield',
            'url': '/admin/roles',
            'permisos': ['gestionar_roles']
        })
    
    # Gestión de conductores
    if user.tiene_permiso('gestionar_conductores'):
        menu_items.append({
            'nombre': 'Conductores',
            'icono': 'car',
            'url': '/admin/conductores',
            'permisos': ['gestionar_conductores']
        })
    
    # Gestión de personal
    if user.tiene_permiso('gestionar_personal'):
        menu_items.append({
            'nombre': 'Personal',
            'icono': 'briefcase',
            'url': '/admin/personal',
            'permisos': ['gestionar_personal']
        })
    
    # Reportes
    if user.tiene_permiso('ver_reportes_basicos'):
        menu_items.append({
            'nombre': 'Reportes',
            'icono': 'chart-bar',
            'url': '/admin/reportes',
            'permisos': ['ver_reportes_basicos', 'ver_reportes_avanzados']
        })
    
    return menu_items


def _get_cliente_menu_items():
    """Obtiene los elementos del menú para clientes"""
    return [
        {
            'nombre': 'Inicio',
            'icono': 'home',
            'url': '/cliente/inicio',
            'permisos': []
        },
        {
            'nombre': 'Solicitar Viaje',
            'icono': 'plus',
            'url': '/cliente/solicitar-viaje',
            'permisos': ['solicitar_viaje']
        },
        {
            'nombre': 'Mis Viajes',
            'icono': 'list',
            'url': '/cliente/mis-viajes',
            'permisos': ['ver_historial_viajes']
        },
        {
            'nombre': 'Perfil',
            'icono': 'user',
            'url': '/cliente/perfil',
            'permisos': ['ver_perfil']
        }
    ]


def _get_admin_stats(user):
    """Obtiene estadísticas para el dashboard administrativo"""
    stats = {}
    
    # Estadísticas de usuarios
    if user.tiene_permiso('gestionar_usuarios'):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        stats['usuarios'] = {
            'total': User.objects.count(),
            'activos': User.objects.filter(is_active=True).count(),
            'administrativos': User.objects.filter(rol__es_administrativo=True).count(),
            'clientes': User.objects.filter(rol__es_administrativo=False).count()
        }
    
    # Estadísticas de conductores
    if user.tiene_permiso('ver_conductores'):
        try:
            from conductores.models import Conductor
            stats['conductores'] = {
                'total': Conductor.objects.count(),
                'activos': Conductor.objects.filter(usuario__is_active=True).count(),
                'disponibles': Conductor.objects.filter(estado='disponible', usuario__is_active=True).count(),
                'ocupados': Conductor.objects.filter(estado='ocupado', usuario__is_active=True).count()
            }
        except ImportError:
            pass
    
    # Estadísticas de personal
    if user.tiene_permiso('ver_personal'):
        try:
            from personal.models import Personal
            stats['personal'] = {
                'total': Personal.objects.count(),
                'activos': Personal.objects.filter(estado=True).count(),
                'inactivos': Personal.objects.filter(estado=False).count()
            }
        except ImportError:
            pass
    
    return stats


def _get_cliente_stats(user):
    """Obtiene estadísticas para el dashboard del cliente"""
    # Aquí puedes agregar estadísticas específicas del cliente
    # como número de viajes, viajes pendientes, etc.
    return {
        'viajes_totales': 0,  # Implementar según tu lógica de negocio
        'viajes_pendientes': 0,
        'viajes_completados': 0
    }
