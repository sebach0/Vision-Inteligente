"""
URLs para el módulo de acceso vehicular.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PuertaViewSet, TipoVehiculoViewSet, ColorViewSet, RegistroAccesoViewSet
)

router = DefaultRouter()
router.register(r'puertas', PuertaViewSet, basename='puerta')
router.register(r'tipos-vehiculo', TipoVehiculoViewSet, basename='tipo-vehiculo')
router.register(r'colores', ColorViewSet, basename='color')
router.register(r'registros', RegistroAccesoViewSet, basename='registro-acceso')

urlpatterns = [
    path('', include(router.urls)),
]
