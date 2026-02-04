from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .views import (
    CustomLoginView,
    CustomRegisterView,
    CustomLogoutView,
    RolViewSet,
    UserViewSet,
)
from .auth_views import (
    AdminLoginView,
    ClienteLoginView,
    logout_view,
    user_info,
    dashboard_data,
)
from .mobile_verification import (
    mobile_register,
    send_mobile_verification_code,
    verify_mobile_code,
    resend_mobile_verification_code,
)

# Router para ViewSets
router = DefaultRouter()
router.register(r"roles", RolViewSet)
router.register(r"users", UserViewSet)

# Endpoints para la gestión de usuarios y autenticación administrativa
# Todos estos endpoints están bajo /api/admin/ en la URL completa
urlpatterns = [
    # ===== AUTENTICACIÓN UNIVERSAL =====
    # Login administrativo (POST: username, password)
    path("login/", AdminLoginView.as_view(), name="admin_login"),
    # Login de clientes (POST: username, password)
    path("cliente/login/", ClienteLoginView.as_view(), name="cliente_login"),
    # Logout universal (POST: refresh)
    path("logout/", logout_view, name="logout"),
    # Registro de nuevos administradores (POST: username, email, password, etc.)
    path(
        "register/", views.AdminRegistrationView.as_view(), name="admin_register"
    ),
    # Renovación de token JWT (POST: refresh)
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # ===== GESTIÓN DE PERFIL =====
    # Ver/editar perfil propio (GET, PUT, PATCH)
    path("profile/", views.UserProfileView.as_view(), name="user_profile"),
    # Cambiar contraseña (POST: old_password, new_password, new_password_confirm)
    path(
        "change-password/", views.ChangePasswordView.as_view(), name="change_password"
    ),
    # Información del usuario autenticado (GET)
    path("user-info/", user_info, name="user_info"),
    # Datos del dashboard del usuario (GET)
    path("dashboard-data/", dashboard_data, name="dashboard_data"),
    # ===== GESTIÓN DE ROLES Y USUARIOS =====
    # Incluir rutas del router (ViewSets)
    path("", include(router.urls)),
    # ===== AUTENTICACIÓN SOCIAL =====
    # Autenticación con Google (POST: token_id)
    path("google/", views.google_auth, name="google_auth"),
    # # Depuración de autenticación con Google
    # path("google-debug/", views.google_auth_debug, name="google_debug"),
    # ===== BITACORA =====
    # Login / Logout con bitácora
    path("auth/login/", CustomLoginView.as_view(), name="custom_login"),
    path("auth/logout/", CustomLogoutView.as_view(), name="custom_logout"),
    # Registro con bitácora
    path("auth/registration/", CustomRegisterView.as_view(), name="custom_register"),
    # ===== VERIFICACIÓN MÓVIL =====
    # Registro móvil con verificación por código
    path("mobile/register/", mobile_register, name="mobile_register"),
    # Enviar código de verificación móvil
    path(
        "mobile/send-code/",
        send_mobile_verification_code,
        name="send_mobile_verification",
    ),
    # Verificar código móvil
    path("mobile/verify-code/", verify_mobile_code, name="verify_mobile_code"),
    # Reenviar código de verificación
    path(
        "mobile/resend-code/",
        resend_mobile_verification_code,
        name="resend_mobile_code",
    ),
]
