"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from users.auth_views import logout_view


# Endpoints principales del sistema
urlpatterns = [
    # Panel de administración de Django
    path("admin/", admin.site.urls),
    # ENDPOINTS DE API (todos bajo /api/)
    # Auth: login/logout/password/reset para clientes
    # Ruta personalizada para logout
    path("api/auth/logout/", logout_view, name="rest_logout"),
    # Resto de rutas de autenticación
    path("api/auth/", include("dj_rest_auth.urls")),
    # Auth: registro de clientes
    path("api/auth/registration/", include("dj_rest_auth.registration.urls")),
    # Admin: gestión de usuarios, roles y permisos
    path("api/admin/", include("users.urls")),
    # Acceso vehicular: control de entradas/salidas
    path("api/acceso-vehicular/", include("acceso_vehicular.urls")),
    # Auth social: endpoints para login social (navegador)
    path("accounts/", include("allauth.urls")),
]

# Servir archivos de media en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
