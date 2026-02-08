"""
Serializadores para el módulo de acceso vehicular.
"""

import base64
from rest_framework import serializers
from django.core.files.base import ContentFile
from .models import Puerta, TipoVehiculo, Color, RegistroAcceso, ResultadoOCR


class PuertaSerializer(serializers.ModelSerializer):
    """Serializador para las puertas de acceso."""
    
    class Meta:
        model = Puerta
        fields = ['id', 'nombre', 'descripcion', 'activa', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class TipoVehiculoSerializer(serializers.ModelSerializer):
    """Serializador para tipos de vehículo."""
    
    class Meta:
        model = TipoVehiculo
        fields = ['id', 'nombre', 'descripcion', 'activo', 'icono', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ColorSerializer(serializers.ModelSerializer):
    """Serializador para colores de vehículo."""
    
    class Meta:
        model = Color
        fields = ['id', 'nombre', 'codigo_hex', 'activo', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ResultadoOCRSerializer(serializers.ModelSerializer):
    """Serializador para resultados de OCR (solo lectura)."""
    
    class Meta:
        model = ResultadoOCR
        fields = [
            'id', 'vehiculo_detectado', 'confianza_deteccion', 'clase_detectada',
            'placa_detectada', 'confianza_ocr', 'color_detectado', 'metadatos',
            'procesado_en', 'tiempo_procesamiento_ms'
        ]
        read_only_fields = fields


class RegistroAccesoSerializer(serializers.ModelSerializer):
    """Serializador para lectura de registros de acceso."""
    
    puerta = PuertaSerializer(read_only=True)
    tipo_vehiculo = TipoVehiculoSerializer(read_only=True)
    color = ColorSerializer(read_only=True)
    guardia_nombre = serializers.SerializerMethodField()
    guardia_username = serializers.SerializerMethodField()
    resultado_ocr = ResultadoOCRSerializer(read_only=True)
    imagen_url = serializers.SerializerMethodField()
    
    class Meta:
        model = RegistroAcceso
        fields = [
            'id', 'tipo_evento', 'fecha_hora', 'puerta', 'guardia_nombre', 
            'guardia_username', 'placa', 'tipo_vehiculo', 'color', 
            'imagen_url', 'observaciones', 'resultado_ocr',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields
    
    def get_guardia_nombre(self, obj):
        """Retorna el nombre del guardia o 'Registro Público' si no hay guardia."""
        if obj.guardia:
            return obj.guardia.get_full_name()
        return "Registro Público"
    
    def get_guardia_username(self, obj):
        """Retorna el username del guardia o None si no hay guardia."""
        if obj.guardia:
            return obj.guardia.username
        return None
    
    def get_imagen_url(self, obj):
        if obj.imagen:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.imagen.url)
            return obj.imagen.url
        return None


class RegistroAccesoCreateSerializer(serializers.ModelSerializer):
    """Serializador para crear registros de acceso."""
    
    puerta_id = serializers.PrimaryKeyRelatedField(
        queryset=Puerta.objects.filter(activa=True),
        source='puerta',
        write_only=True
    )
    tipo_vehiculo_id = serializers.PrimaryKeyRelatedField(
        queryset=TipoVehiculo.objects.filter(activo=True),
        source='tipo_vehiculo',
        required=False,
        allow_null=True,
        write_only=True
    )
    color_id = serializers.PrimaryKeyRelatedField(
        queryset=Color.objects.filter(activo=True),
        source='color',
        required=False,
        allow_null=True,
        write_only=True
    )
    imagen_base64 = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = RegistroAcceso
        fields = [
            'tipo_evento', 'puerta_id', 'placa', 'tipo_vehiculo_id', 
            'color_id', 'imagen_base64', 'observaciones'
        ]
    
    def validate_placa(self, value):
        """Normaliza la placa a mayúsculas."""
        return value.upper().strip() if value else value
    
    def validate(self, attrs):
        """Validación adicional para asegurar que las relaciones existen."""
        # Validar que la puerta existe y está activa
        puerta = attrs.get('puerta')
        if puerta and not puerta.activa:
            raise serializers.ValidationError({
                'puerta_id': 'La puerta seleccionada no está activa.'
            })
        
        # Validar tipo de vehículo si se proporciona
        tipo_vehiculo = attrs.get('tipo_vehiculo')
        if tipo_vehiculo and not tipo_vehiculo.activo:
            raise serializers.ValidationError({
                'tipo_vehiculo_id': 'El tipo de vehículo seleccionado no está activo.'
            })
        
        # Validar color si se proporciona
        color = attrs.get('color')
        if color and not color.activo:
            raise serializers.ValidationError({
                'color_id': 'El color seleccionado no está activo.'
            })
        
        return attrs
    
    def create(self, validated_data):
        # Extraer imagen base64 si existe
        imagen_base64 = validated_data.pop('imagen_base64', None)
        
        # Asignar el guardia desde el request si está autenticado
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['guardia'] = request.user
        else:
            # Para registros públicos, guardia es None
            validated_data['guardia'] = None
        
        # Crear el registro
        registro = RegistroAcceso.objects.create(**validated_data)
        
        # Procesar imagen si se proporciona
        if imagen_base64:
            self._guardar_imagen(registro, imagen_base64)
        
        return registro
    
    def _guardar_imagen(self, registro, imagen_base64):
        """Guarda la imagen desde base64."""
        try:
            # Remover prefijo data:image/...;base64, si existe
            if ',' in imagen_base64:
                imagen_base64 = imagen_base64.split(',')[1]
            
            # Decodificar
            imagen_data = base64.b64decode(imagen_base64)
            
            # Guardar archivo
            nombre_archivo = f"registro_{registro.id}_{registro.placa}.jpg"
            registro.imagen.save(nombre_archivo, ContentFile(imagen_data), save=True)
            
        except Exception as e:
            # Log del error pero no fallar la creación
            import logging
            logging.getLogger(__name__).error(f"Error guardando imagen: {e}")


class ProcesarImagenSerializer(serializers.Serializer):
    """Serializador para el endpoint de procesamiento de imagen."""
    
    imagen = serializers.CharField(help_text="Imagen en formato base64")
    
    def validate_imagen(self, value):
        """Valida y decodifica la imagen base64."""
        try:
            # Remover prefijo si existe
            if ',' in value:
                value = value.split(',')[1]
            
            # Intentar decodificar
            imagen_bytes = base64.b64decode(value)
            
            # Validar tamaño mínimo
            if len(imagen_bytes) < 100:
                raise serializers.ValidationError("La imagen es demasiado pequeña")
            
            # Validar tamaño máximo (10MB)
            if len(imagen_bytes) > 10 * 1024 * 1024:
                raise serializers.ValidationError("La imagen es demasiado grande (máximo 10MB)")
            
            return imagen_bytes
            
        except base64.binascii.Error:
            raise serializers.ValidationError("Formato base64 inválido")


class EstadisticasSerializer(serializers.Serializer):
    """Serializador para estadísticas del dashboard."""
    
    total_registros = serializers.IntegerField()
    total_entradas = serializers.IntegerField()
    total_salidas = serializers.IntegerField()
    por_puerta = serializers.ListField(child=serializers.DictField())
    por_hora = serializers.ListField(child=serializers.DictField())
    por_tipo_vehiculo = serializers.ListField(child=serializers.DictField())
    por_color = serializers.ListField(child=serializers.DictField())


class BusquedaPlacaSerializer(serializers.Serializer):
    """Serializador para búsqueda por placa."""
    
    placa = serializers.CharField(min_length=3, max_length=15)
    fecha_inicio = serializers.DateTimeField(required=False)
    fecha_fin = serializers.DateTimeField(required=False)
