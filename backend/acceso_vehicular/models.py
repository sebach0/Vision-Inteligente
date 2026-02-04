"""
Modelos para el control de acceso vehicular.
Implementa las entidades necesarias para el MVP:
- Puertas de acceso
- Tipos de vehículo (catálogo)
- Colores (catálogo)
- Registros de acceso (entradas/salidas)
- Resultados de procesamiento OCR
"""

from django.db import models
from django.conf import settings
from django.core.validators import RegexValidator


class Puerta(models.Model):
    """
    Representa las puertas de acceso vehicular de la universidad.
    MVP: 3 puertas (Puerta 1, Puerta 2, Puerta 3)
    """
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True)
    activa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acceso_vehicular_puerta'
        verbose_name = 'Puerta de Acceso'
        verbose_name_plural = 'Puertas de Acceso'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class TipoVehiculo(models.Model):
    """
    Catálogo de tipos de vehículo.
    Ej: Automóvil, Camioneta, Motocicleta, Bus, etc.
    """
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    icono = models.CharField(max_length=50, blank=True, help_text="Nombre del icono (opcional)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acceso_vehicular_tipo_vehiculo'
        verbose_name = 'Tipo de Vehículo'
        verbose_name_plural = 'Tipos de Vehículo'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Color(models.Model):
    """
    Catálogo de colores de vehículo.
    """
    nombre = models.CharField(max_length=30, unique=True)
    codigo_hex = models.CharField(
        max_length=7, 
        blank=True,
        validators=[RegexValidator(r'^#[0-9A-Fa-f]{6}$', 'Formato hexadecimal inválido')],
        help_text="Código de color en formato hexadecimal (#RRGGBB)"
    )
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acceso_vehicular_color'
        verbose_name = 'Color'
        verbose_name_plural = 'Colores'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class RegistroAcceso(models.Model):
    """
    Registro principal de entradas y salidas de vehículos.
    Captura toda la información del evento de acceso.
    """
    TIPO_EVENTO_CHOICES = [
        ('entrada', 'Entrada'),
        ('salida', 'Salida'),
    ]

    # Datos del evento
    tipo_evento = models.CharField(max_length=10, choices=TIPO_EVENTO_CHOICES)
    fecha_hora = models.DateTimeField(auto_now_add=True, db_index=True)
    
    # Relaciones
    puerta = models.ForeignKey(
        Puerta, 
        on_delete=models.PROTECT,
        related_name='registros'
    )
    guardia = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='registros_acceso',
        help_text="Guardia que registró el acceso"
    )
    
    # Datos del vehículo
    placa = models.CharField(
        max_length=15,
        db_index=True,
        help_text="Número de placa del vehículo"
    )
    tipo_vehiculo = models.ForeignKey(
        TipoVehiculo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registros'
    )
    color = models.ForeignKey(
        Color,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registros'
    )
    
    # Imagen capturada (opcional)
    imagen = models.ImageField(
        upload_to='acceso_vehicular/imagenes/%Y/%m/%d/',
        blank=True,
        null=True,
        help_text="Imagen capturada del vehículo"
    )
    
    # Observaciones adicionales
    observaciones = models.TextField(blank=True)
    
    # Metadatos
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acceso_vehicular_registro'
        verbose_name = 'Registro de Acceso'
        verbose_name_plural = 'Registros de Acceso'
        ordering = ['-fecha_hora']
        indexes = [
            models.Index(fields=['fecha_hora', 'puerta']),
            models.Index(fields=['placa', 'fecha_hora']),
        ]

    def __str__(self):
        return f"{self.tipo_evento.upper()} - {self.placa} - {self.puerta} - {self.fecha_hora.strftime('%Y-%m-%d %H:%M')}"


class ResultadoOCR(models.Model):
    """
    Almacena los resultados del procesamiento de visión por computadora.
    Útil para auditoría y mejora continua del sistema.
    """
    registro = models.OneToOneField(
        RegistroAcceso,
        on_delete=models.CASCADE,
        related_name='resultado_ocr'
    )
    
    # Resultados de detección
    vehiculo_detectado = models.BooleanField(default=False)
    confianza_deteccion = models.FloatField(
        null=True, 
        blank=True,
        help_text="Confianza de detección del vehículo (0-1)"
    )
    clase_detectada = models.CharField(
        max_length=50, 
        blank=True,
        help_text="Clase detectada por YOLO (car, truck, motorcycle, etc.)"
    )
    
    # Resultados de OCR
    placa_detectada = models.CharField(max_length=15, blank=True)
    confianza_ocr = models.FloatField(
        null=True, 
        blank=True,
        help_text="Confianza del OCR (0-1)"
    )
    
    # Color detectado automáticamente
    color_detectado = models.CharField(max_length=30, blank=True)
    
    # Datos técnicos (JSON para flexibilidad)
    metadatos = models.JSONField(
        default=dict,
        blank=True,
        help_text="Datos adicionales del procesamiento (bounding boxes, tiempos, etc.)"
    )
    
    # Auditoría
    procesado_en = models.DateTimeField(auto_now_add=True)
    tiempo_procesamiento_ms = models.IntegerField(
        null=True,
        blank=True,
        help_text="Tiempo de procesamiento en milisegundos"
    )

    class Meta:
        db_table = 'acceso_vehicular_resultado_ocr'
        verbose_name = 'Resultado OCR'
        verbose_name_plural = 'Resultados OCR'

    def __str__(self):
        return f"OCR - {self.registro.placa} - Confianza: {self.confianza_ocr or 'N/A'}"
