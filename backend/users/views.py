"""
VIEWS.PY - MÓDULO DE GESTIÓN Y CRUD

RESPONSABILIDADES:
- CRUD completo de usuarios (UserViewSet)
- CRUD completo de roles (RolViewSet)
- Registro de usuarios administrativos
- Cambio de contraseñas
- Autenticación con Google OAuth
- Gestión de permisos y roles
- Estadísticas y reportes
- Clases de autenticación con bitácora (CustomLoginView, CustomLogoutView, CustomRegisterView)

DIFERENCIA CON AUTH_VIEWS.PY:
- auth_views.py: Login/Logout con JWT y diferenciación Admin/Cliente
- views.py: Login/Logout con dj_rest_auth y registro automático en bitácora

NO INCLUYE:
- Información del usuario autenticado (ver auth_views.py)
- Datos del dashboard (ver auth_views.py)
"""

from rest_framework import generics, status, permissions, viewsets, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.authentication import JWTAuthentication
from dj_rest_auth.views import LoginView, LogoutView
from dj_rest_auth.registration.views import RegisterView
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
# TODO: Descomentar cuando exista el módulo bitacora
# from bitacora.utils import registrar_bitacora
from django.contrib.auth import get_user_model
from django.utils import timezone
import requests
from .models import Rol
from .serializers import (
    UserSerializer,
    AdminLoginSerializer,
    AdminRegistrationSerializer,
    ChangePasswordSerializer,
    RolSerializer,
)
from .constants import PERMISOS_SISTEMA, GRUPOS_PERMISOS
from .decorators import requiere_permisos, requiere_permisos_viewset

User = get_user_model()

# AdminTokenObtainPairView movido a auth_views.py para evitar duplicación

# Funciones de logout movidas a auth_views.py para evitar duplicación


class AdminRegistrationView(generics.CreateAPIView):
    """Registro de nuevos usuarios administrativos (solo para superusuarios)"""

    queryset = User.objects.all()
    serializer_class = AdminRegistrationSerializer
    permission_classes = [permissions.IsAdminUser]

    def perform_create(self, serializer):
        # Solo superusuarios pueden crear usuarios administrativos
        if not self.request.user.is_superuser:
            raise permissions.PermissionDenied(
                "Solo superusuarios pueden crear usuarios administrativos"
            )

        serializer.save()


class UserProfileView(generics.RetrieveUpdateAPIView):
    """Perfil del usuario actual"""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(generics.UpdateAPIView):
    """Cambio de contraseña"""

    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        self.object = self.get_object()
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            # Verificar contraseña actual
            if not self.object.check_password(serializer.data.get("old_password")):
                return Response(
                    {"old_password": ["Contraseña actual incorrecta"]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Establecer nueva contraseña
            self.object.set_password(serializer.data.get("new_password"))
            self.object.save()
            return Response(
                {"message": "Contraseña actualizada exitosamente"},
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RolViewSet(viewsets.ModelViewSet):
    """ViewSet para el CRUD de roles"""

    queryset = Rol.objects.all()
    serializer_class = RolSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["es_administrativo"]
    search_fields = ["nombre", "descripcion"]
    ordering_fields = ["nombre", "fecha_creacion"]
    ordering = ["nombre"]

    def get_queryset(self):
        """Filtra el queryset según los permisos del usuario"""
        # Permitir a cualquier usuario autenticado ver los roles
        # Los permisos específicos se controlan en los métodos individuales
        if not self.request.user.is_authenticated:
            return Rol.objects.none()
        return super().get_queryset()

    @requiere_permisos_viewset(["gestionar_roles"])
    def create(self, request, *args, **kwargs):
        """Crear un nuevo rol"""
        return super().create(request, *args, **kwargs)

    @requiere_permisos_viewset(["gestionar_roles"])
    def update(self, request, *args, **kwargs):
        """Actualizar un rol"""
        return super().update(request, *args, **kwargs)

    @requiere_permisos_viewset(["gestionar_roles"])
    def destroy(self, request, *args, **kwargs):
        """Eliminar un rol"""
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"])
    def permisos_disponibles(self, request):
        """Lista todos los permisos disponibles en el sistema"""
        # Permitir a cualquier usuario autenticado ver los permisos disponibles
        # Esto es necesario para que el frontend pueda mostrar las opciones
        if not request.user.is_authenticated:
            return Response(
                {"error": "Debes estar autenticado para ver los permisos"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(
            {"permisos": PERMISOS_SISTEMA, "grupos_permisos": GRUPOS_PERMISOS}
        )

    @action(detail=True, methods=["post"])
    def asignar_permisos(self, request, pk=None):
        """Asignar permisos a un rol"""
        rol = self.get_object()

        if not request.user.tiene_permiso("gestionar_roles"):
            return Response(
                {"error": "No tienes permisos para gestionar roles"},
                status=status.HTTP_403_FORBIDDEN,
            )

        permisos = request.data.get("permisos", [])

        # Validar que los permisos existan
        permisos_validos = [permiso[0] for permiso in PERMISOS_SISTEMA]
        permisos_invalidos = [p for p in permisos if p not in permisos_validos]

        if permisos_invalidos:
            return Response(
                {"error": f"Permisos inválidos: {', '.join(permisos_invalidos)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rol.asignar_permisos(permisos)
        return Response({"message": "Permisos asignados correctamente"})

    @action(detail=True, methods=["post"])
    def agregar_permiso(self, request, pk=None):
        """Agregar un permiso a un rol"""
        rol = self.get_object()

        if not request.user.tiene_permiso("gestionar_roles"):
            return Response(
                {"error": "No tienes permisos para gestionar roles"},
                status=status.HTTP_403_FORBIDDEN,
            )

        permiso = request.data.get("permiso")
        if not permiso:
            return Response(
                {"error": "Permiso requerido"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Validar que el permiso exista
        permisos_validos = [permiso[0] for permiso in PERMISOS_SISTEMA]
        if permiso not in permisos_validos:
            return Response(
                {"error": "Permiso inválido"}, status=status.HTTP_400_BAD_REQUEST
            )

        if rol.agregar_permiso(permiso):
            return Response({"message": "Permiso agregado correctamente"})
        else:
            return Response({"message": "El permiso ya estaba asignado"})

    @action(detail=True, methods=["post"])
    def quitar_permiso(self, request, pk=None):
        """Quitar un permiso de un rol"""
        rol = self.get_object()

        if not request.user.tiene_permiso("gestionar_roles"):
            return Response(
                {"error": "No tienes permisos para gestionar roles"},
                status=status.HTTP_403_FORBIDDEN,
            )

        permiso = request.data.get("permiso")
        if not permiso:
            return Response(
                {"error": "Permiso requerido"}, status=status.HTTP_400_BAD_REQUEST
            )

        if rol.quitar_permiso(permiso):
            return Response({"message": "Permiso quitado correctamente"})
        else:
            return Response({"message": "El permiso no estaba asignado"})

    @action(detail=False, methods=["get"])
    def estadisticas(self, request):
        """Estadísticas de roles"""
        if not request.user.tiene_permiso("gestionar_roles"):
            return Response(
                {"error": "No tienes permisos para ver estadísticas"},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = self.get_queryset()

        stats = {
            "total_roles": queryset.count(),
            "roles_administrativos": queryset.filter(es_administrativo=True).count(),
            "roles_clientes": queryset.filter(es_administrativo=False).count(),
            "permisos_por_rol": [
                {
                    "rol": rol.nombre,
                    "permisos_count": len(rol.permisos),
                    "permisos": rol.permisos,
                }
                for rol in queryset
            ],
        }

        return Response(stats)


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet para el CRUD de usuarios"""

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    # Alinear con filtros del frontend: permitir rol__nombre e is_staff
    filterset_fields = ['rol', 'rol__nombre', 'is_staff', 'is_active']
    search_fields = [
        "username",
        "email",
        "first_name",
        "last_name",
    ]
    ordering_fields = ["username", "email", "fecha_creacion"]
    ordering = ["-fecha_creacion"]

    def get_queryset(self):
        """Filtra el queryset según los permisos del usuario"""
        queryset = super().get_queryset()

        # Si el usuario no tiene permisos para gestionar usuarios, solo puede ver su propio perfil
        if not self.request.user.tiene_permiso("gestionar_usuarios"):
            return queryset.filter(id=self.request.user.id)

        return queryset.select_related("rol")

    @requiere_permisos_viewset(["gestionar_usuarios"])
    def create(self, request, *args, **kwargs):
        """Crear un nuevo usuario"""
        return super().create(request, *args, **kwargs)

    @requiere_permisos_viewset(["gestionar_usuarios"])
    def update(self, request, *args, **kwargs):
        """Actualizar un usuario"""
        return super().update(request, *args, **kwargs)

    @requiere_permisos_viewset(["gestionar_usuarios"])
    def destroy(self, request, *args, **kwargs):
        """Eliminar un usuario"""
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"])
    def estadisticas(self, request):
        """Estadísticas de usuarios"""
        if not request.user.tiene_permiso("gestionar_usuarios"):
            return Response(
                {"error": "No tienes permisos para ver estadísticas"},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = self.get_queryset()

        stats = {
            'total': queryset.count(),
            'activos': queryset.filter(is_active=True).count(),
            'administrativos': queryset.filter(rol__es_administrativo=True).count(),
            'clientes': queryset.filter(rol__es_administrativo=False).count(),
            'con_acceso_admin': queryset.filter(is_staff=True).count(),
            'por_rol': dict(queryset.values('rol__nombre').annotate(
                count=models.Count('id')
            ).values_list('rol__nombre', 'count')),
            'nuevos_este_mes': queryset.filter(
                fecha_creacion__gte=timezone.now().replace(day=1)
            ).count(),
        }

        return Response(stats)

    @action(detail=False, methods=["get"])
    def personal_disponible(self, request):
        """Lista personal disponible para vincular con usuarios"""
        if not request.user.tiene_permiso("gestionar_usuarios"):
            return Response(
                {"error": "No tienes permisos para ver personal disponible"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            from personal.models import Personal

            # Personal que no tiene usuario vinculado
            personal_disponible = Personal.objects.filter(
                usuario__isnull=True,
                estado=True
            ).values('id', 'nombre', 'apellido', 'email', 'ci', 'telefono')
            
            return Response(list(personal_disponible))
        except ImportError:
            return Response([])

    @action(detail=False, methods=["get"])
    def conductores_disponibles(self, request):
        """Lista conductores disponibles para vincular con usuarios"""
        if not request.user.tiene_permiso("gestionar_usuarios"):
            return Response(
                {"error": "No tienes permisos para ver conductores disponibles"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            from conductores.models import Conductor

            # Conductores que no tienen usuario vinculado
            conductores_disponibles = Conductor.objects.filter(
                usuario__isnull=True
            ).values(
                'id',
                'nombre',
                'apellido',
                'email',
                'ci',
                'telefono',
                'nro_licencia'
            )

            return Response(list(conductores_disponibles))
        except ImportError:
            return Response([])

    @action(detail=False, methods=["get"])
    def residentes_disponibles(self, request):
        """Lista residentes disponibles para vincular con usuarios"""
        if not request.user.tiene_permiso("gestionar_usuarios"):
            return Response(
                {"error": "No tienes permisos para ver residentes disponibles"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            from residentes.models import Residente

            # Residentes que no tienen usuario vinculado
            residentes_disponibles = Residente.objects.filter(
                usuario__isnull=True,
                estado='activo'  # Solo residentes activos
            ).values(
                'id',
                'nombre',
                'apellido',
                'email',
                'ci',
                'telefono',
                'unidad_habitacional',
                'tipo'
            )

            return Response(list(residentes_disponibles))
        except ImportError:
            return Response([])


# user_dashboard_data movido a auth_views.py para evitar duplicación


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def google_auth(request):
    """
    Vista para autenticación con Google OAuth
    """
    try:
        access_token = request.data.get("access_token")

        if not access_token:
            return Response(
                {"error": "Token de acceso requerido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verificar si es un token de prueba
        if access_token == "mock_google_token_for_testing":
            # Usar datos de prueba
            google_data = {
                "email": "test@example.com",
                "given_name": "Usuario",
                "family_name": "Prueba",
            }
            email = google_data["email"]
            first_name = google_data["given_name"]
            last_name = google_data["family_name"]
            username = email
        else:
            # Verificar el token con Google
            google_response = requests.get(
                f"https://www.googleapis.com/oauth2/v2/userinfo?access_token={access_token}"
            )

            if google_response.status_code != 200:
                return Response(
                    {"error": "Token de Google inválido"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            google_data = google_response.json()
            email = google_data.get("email")
            first_name = google_data.get("given_name", "")
            last_name = google_data.get("family_name", "")
            username = google_data.get("email")  # Usar email como username

        if not email:
            return Response(
                {"error": "Email no proporcionado por Google"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Buscar o crear usuario
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Crear nuevo usuario
            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                password=None,  # No password para OAuth
                is_active=True,
            )

            # Asignar rol de Cliente por defecto
            try:
                cliente_rol = Rol.objects.get(nombre="Cliente")
                user.rol = cliente_rol
                user.save()
            except Rol.DoesNotExist:
                # Crear rol Cliente si no existe
                cliente_rol = Rol.objects.create(
                    nombre="Cliente",
                    descripcion="Cliente regular del sistema",
                    es_administrativo=False,
                )
                user.rol = cliente_rol
                user.save()
        # Actualizar último acceso
        user.fecha_ultimo_acceso = timezone.now()
        user.save(update_fields=["fecha_ultimo_acceso"])

        # Generar tokens JWT
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token

        return Response(
            {
                "access": str(access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            }
        )

    except Exception as e:
        return Response(
            {"error": f"Error en autenticación con Google: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


###PRUEBAS####
User = get_user_model()


class CustomLoginView(LoginView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        # Obtener usuario autenticado real
        username = response.data.get("user", {}).get("username")
        user = User.objects.filter(username=username).first() if username else None

        if user:
            # TODO: Descomentar cuando exista el módulo bitacora
            # registrar_bitacora(
            #     request=request,
            #     accion="Login",
            #     descripcion=f"El usuario {user.username} inició sesión",
            #     modulo="AUTENTICACION",
            # )
            pass

        return response


class CustomLogoutView(LogoutView):
    def post(self, request, *args, **kwargs):
        user = None

        auth_header = request.headers.get("Authorization")
        if auth_header:
            try:
                jwt_auth = JWTAuthentication()
                token_str = auth_header.split()[1]  # Bearer <token>
                validated_token = jwt_auth.get_validated_token(token_str)
                user = jwt_auth.get_user(validated_token)
            except Exception:
                user = None

        response = super().post(request, *args, **kwargs)

        if user:
            # TODO: Descomentar cuando exista el módulo bitacora
            # registrar_bitacora(
            #     request=request,
            #     usuario=user,
            #     accion="Logout",
            #     descripcion=f"El usuario {user.username} cerró sesión.",
            #     modulo="AUTENTICACION",
            # )
            pass

        return response


class CustomRegisterView(RegisterView):
    """Registro con bitácora"""

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)

        # Obtener usuario recién creado desde el email (campo único)
        email = request.data.get("email")
        user = User.objects.filter(email=email).first() if email else None

        if user:
            # TODO: Descomentar cuando exista el módulo bitacora
            # registrar_bitacora(
            #     request=request,
            #     usuario=user,
            #     accion="Registro",
            #     descripcion=f"Se registró el usuario {user.username}",
            #     modulo="AUTENTICACION",
            # )
            pass

        return response
