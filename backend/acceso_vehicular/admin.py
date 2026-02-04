from django.contrib import admin
from .models import Puerta, TipoVehiculo, Color, RegistroAcceso, ResultadoOCR


@admin.register(Puerta)
class PuertaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'descripcion', 'activa', 'created_at']
    list_filter = ['activa']
    search_fields = ['nombre', 'descripcion']


@admin.register(TipoVehiculo)
class TipoVehiculoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'descripcion', 'activo', 'created_at']
    list_filter = ['activo']
    search_fields = ['nombre', 'descripcion']


@admin.register(Color)
class ColorAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'codigo_hex', 'activo', 'created_at']
    list_filter = ['activo']
    search_fields = ['nombre']


@admin.register(RegistroAcceso)
class RegistroAccesoAdmin(admin.ModelAdmin):
    list_display = ['placa', 'tipo_evento', 'puerta', 'tipo_vehiculo', 'color', 'guardia', 'fecha_hora']
    list_filter = ['tipo_evento', 'puerta', 'tipo_vehiculo', 'color', 'fecha_hora']
    search_fields = ['placa', 'observaciones']
    date_hierarchy = 'fecha_hora'
    readonly_fields = ['fecha_hora', 'created_at', 'updated_at']
    raw_id_fields = ['guardia']


@admin.register(ResultadoOCR)
class ResultadoOCRAdmin(admin.ModelAdmin):
    list_display = ['registro', 'vehiculo_detectado', 'placa_detectada', 'confianza_ocr', 'procesado_en']
    list_filter = ['vehiculo_detectado', 'procesado_en']
    search_fields = ['placa_detectada', 'clase_detectada']
    readonly_fields = ['procesado_en']
