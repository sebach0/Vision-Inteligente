"""
Vistas (ViewSets) para el módulo de acceso vehicular.
Implementa los endpoints REST para:
- CRUD de catálogos (puertas, tipos, colores)
- Registro de accesos (entradas/salidas)
- Procesamiento de imágenes con visión por computadora
- Estadísticas y reportes básicos
"""

from datetime import datetime, timedelta
from django.db.models import Count, Q
from django.db.models.functions import TruncHour, TruncDate
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters import rest_framework as filters

from .models import Puerta, TipoVehiculo, Color, RegistroAcceso, ResultadoOCR
from .serializers import (
    PuertaSerializer, TipoVehiculoSerializer, ColorSerializer,
    RegistroAccesoSerializer, RegistroAccesoCreateSerializer,
    ProcesarImagenSerializer, ResultadoOCRSerializer
)
from .services import get_vision_service


class PuertaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de puertas de acceso.
    """
    queryset = Puerta.objects.all()
    serializer_class = PuertaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtrar solo activas si se especifica
        activa = self.request.query_params.get('activa')
        if activa is not None:
            queryset = queryset.filter(activa=activa.lower() == 'true')
        return queryset


class TipoVehiculoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de tipos de vehículo.
    """
    queryset = TipoVehiculo.objects.all()
    serializer_class = TipoVehiculoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        activo = self.request.query_params.get('activo')
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == 'true')
        return queryset


class ColorViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de colores de vehículo.
    """
    queryset = Color.objects.all()
    serializer_class = ColorSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        activo = self.request.query_params.get('activo')
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == 'true')
        return queryset


class RegistroAccesoFilter(filters.FilterSet):
    """Filtros para registros de acceso."""
    fecha_inicio = filters.DateTimeFilter(field_name='fecha_hora', lookup_expr='gte')
    fecha_fin = filters.DateTimeFilter(field_name='fecha_hora', lookup_expr='lte')
    fecha = filters.DateFilter(field_name='fecha_hora', lookup_expr='date')
    placa = filters.CharFilter(lookup_expr='icontains')
    
    class Meta:
        model = RegistroAcceso
        fields = ['tipo_evento', 'puerta', 'tipo_vehiculo', 'color', 'guardia']


class RegistroAccesoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de registros de acceso vehicular.
    
    Endpoints:
    - GET /registros/ - Listar registros con filtros
    - POST /registros/ - Crear nuevo registro
    - GET /registros/{id}/ - Detalle de un registro
    - POST /registros/procesar-imagen/ - Procesar imagen con IA
    - GET /registros/estadisticas/ - Obtener estadísticas
    - GET /registros/buscar-placa/ - Buscar por placa
    - GET /registros/resumen-dia/ - Resumen del día actual
    """
    queryset = RegistroAcceso.objects.select_related(
        'puerta', 'tipo_vehiculo', 'color', 'guardia'
    ).prefetch_related('resultado_ocr')
    permission_classes = [IsAuthenticated]
    filterset_class = RegistroAccesoFilter
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return RegistroAccesoCreateSerializer
        return RegistroAccesoSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Ordenar por fecha descendente por defecto
        ordering = self.request.query_params.get('ordering', '-fecha_hora')
        if ordering:
            queryset = queryset.order_by(ordering)
        
        return queryset
    
    @action(detail=False, methods=['post'], url_path='procesar-imagen')
    def procesar_imagen(self, request):
        """
        Procesa una imagen con visión por computadora.
        Detecta vehículo, extrae placa y color.
        
        Request Body:
            imagen: string (base64)
            
        Response:
            vehiculo_detectado: bool
            clase_detectada: string
            confianza_deteccion: float
            placa_detectada: string
            confianza_ocr: float
            color_detectado: string
            tiempo_procesamiento_ms: int
        """
        serializer = ProcesarImagenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        imagen_bytes = serializer.validated_data['imagen']
        
        # Procesar con el servicio de visión
        vision_service = get_vision_service()
        resultado = vision_service.procesar_imagen(imagen_bytes)
        
        return Response({
            'vehiculo_detectado': resultado.vehiculo_detectado,
            'clase_detectada': resultado.clase_detectada,
            'confianza_deteccion': resultado.confianza_deteccion,
            'placa_detectada': resultado.placa_detectada,
            'confianza_ocr': resultado.confianza_ocr,
            'color_detectado': resultado.color_detectado,
            'tiempo_procesamiento_ms': resultado.tiempo_procesamiento_ms,
            'metadatos': resultado.metadatos
        })
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """
        Obtiene estadísticas de accesos.
        
        Query params:
            fecha_inicio: datetime (opcional)
            fecha_fin: datetime (opcional)
            periodo: string (hoy, semana, mes) - opcional
        """
        # Determinar rango de fechas
        periodo = request.query_params.get('periodo', 'hoy')
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        
        ahora = timezone.now()
        
        if fecha_inicio and fecha_fin:
            try:
                fecha_inicio = datetime.fromisoformat(fecha_inicio.replace('Z', '+00:00'))
                fecha_fin = datetime.fromisoformat(fecha_fin.replace('Z', '+00:00'))
            except ValueError:
                return Response(
                    {'error': 'Formato de fecha inválido'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            if periodo == 'hoy':
                fecha_inicio = ahora.replace(hour=0, minute=0, second=0, microsecond=0)
                fecha_fin = ahora
            elif periodo == 'semana':
                fecha_inicio = ahora - timedelta(days=7)
                fecha_fin = ahora
            elif periodo == 'mes':
                fecha_inicio = ahora - timedelta(days=30)
                fecha_fin = ahora
            else:
                fecha_inicio = ahora.replace(hour=0, minute=0, second=0, microsecond=0)
                fecha_fin = ahora
        
        # Filtrar registros
        registros = RegistroAcceso.objects.filter(
            fecha_hora__gte=fecha_inicio,
            fecha_hora__lte=fecha_fin
        )
        
        # Estadísticas básicas
        total = registros.count()
        entradas = registros.filter(tipo_evento='entrada').count()
        salidas = registros.filter(tipo_evento='salida').count()
        
        # Por puerta
        por_puerta = list(registros.values('puerta__nombre').annotate(
            total=Count('id'),
            entradas=Count('id', filter=Q(tipo_evento='entrada')),
            salidas=Count('id', filter=Q(tipo_evento='salida'))
        ).order_by('puerta__nombre'))
        
        # Por hora (solo para hoy o rangos cortos)
        por_hora = list(registros.annotate(
            hora=TruncHour('fecha_hora')
        ).values('hora').annotate(
            total=Count('id')
        ).order_by('hora'))
        
        # Por tipo de vehículo
        por_tipo = list(registros.exclude(tipo_vehiculo__isnull=True).values(
            'tipo_vehiculo__nombre'
        ).annotate(total=Count('id')).order_by('-total'))
        
        # Por color
        por_color = list(registros.exclude(color__isnull=True).values(
            'color__nombre'
        ).annotate(total=Count('id')).order_by('-total'))
        
        return Response({
            'periodo': {
                'inicio': fecha_inicio.isoformat(),
                'fin': fecha_fin.isoformat(),
                'nombre': periodo
            },
            'total_registros': total,
            'total_entradas': entradas,
            'total_salidas': salidas,
            'por_puerta': por_puerta,
            'por_hora': por_hora,
            'por_tipo_vehiculo': por_tipo,
            'por_color': por_color
        })
    
    @action(detail=False, methods=['get'], url_path='buscar-placa')
    def buscar_placa(self, request):
        """
        Busca registros por placa.
        
        Query params:
            placa: string (requerido, mínimo 3 caracteres)
            limite: int (opcional, default 20)
        """
        placa = request.query_params.get('placa', '').strip()
        
        if len(placa) < 3:
            return Response(
                {'error': 'La placa debe tener al menos 3 caracteres'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        limite = int(request.query_params.get('limite', 20))
        
        registros = RegistroAcceso.objects.filter(
            placa__icontains=placa
        ).select_related(
            'puerta', 'tipo_vehiculo', 'color', 'guardia'
        ).order_by('-fecha_hora')[:limite]
        
        serializer = RegistroAccesoSerializer(
            registros, many=True, context={'request': request}
        )
        
        return Response({
            'placa_buscada': placa,
            'total_encontrados': registros.count(),
            'registros': serializer.data
        })
    
    @action(detail=False, methods=['get'], url_path='resumen-dia')
    def resumen_dia(self, request):
        """
        Obtiene un resumen rápido del día actual.
        """
        hoy = timezone.now().date()
        
        registros_hoy = RegistroAcceso.objects.filter(
            fecha_hora__date=hoy
        )
        
        total = registros_hoy.count()
        entradas = registros_hoy.filter(tipo_evento='entrada').count()
        salidas = registros_hoy.filter(tipo_evento='salida').count()
        
        # Últimos 5 registros
        ultimos = RegistroAccesoSerializer(
            registros_hoy.select_related('puerta', 'tipo_vehiculo', 'color', 'guardia')[:5],
            many=True,
            context={'request': request}
        ).data
        
        # Por puerta
        por_puerta = list(registros_hoy.values('puerta__nombre').annotate(
            total=Count('id')
        ))
        
        return Response({
            'fecha': hoy.isoformat(),
            'total': total,
            'entradas': entradas,
            'salidas': salidas,
            'por_puerta': por_puerta,
            'ultimos_registros': ultimos
        })
    
    @action(detail=False, methods=['get'], url_path='recuento-por-dia')
    def recuento_por_dia(self, request):
        """
        Obtiene un recuento de registros agrupados por día.
        
        Query params:
            fecha_inicio: date (opcional, default: hace 30 días)
            fecha_fin: date (opcional, default: hoy)
            puerta: int (opcional)
            tipo_evento: string (opcional: entrada/salida)
        """
        ahora = timezone.now()
        
        # Parsear fechas
        fecha_inicio_str = request.query_params.get('fecha_inicio')
        fecha_fin_str = request.query_params.get('fecha_fin')
        
        if fecha_inicio_str:
            try:
                fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
            except ValueError:
                fecha_inicio = (ahora - timedelta(days=30)).date()
        else:
            fecha_inicio = (ahora - timedelta(days=30)).date()
            
        if fecha_fin_str:
            try:
                fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()
            except ValueError:
                fecha_fin = ahora.date()
        else:
            fecha_fin = ahora.date()
        
        # Filtrar registros base
        registros = RegistroAcceso.objects.filter(
            fecha_hora__date__gte=fecha_inicio,
            fecha_hora__date__lte=fecha_fin
        )
        
        # Aplicar filtros opcionales
        puerta_id = request.query_params.get('puerta')
        if puerta_id:
            registros = registros.filter(puerta_id=puerta_id)
            
        tipo_evento = request.query_params.get('tipo_evento')
        if tipo_evento in ['entrada', 'salida']:
            registros = registros.filter(tipo_evento=tipo_evento)
        
        # Agrupar por día
        por_dia = registros.annotate(
            fecha=TruncDate('fecha_hora')
        ).values('fecha').annotate(
            total=Count('id'),
            entradas=Count('id', filter=Q(tipo_evento='entrada')),
            salidas=Count('id', filter=Q(tipo_evento='salida'))
        ).order_by('-fecha')
        
        # Convertir a lista
        resultado = []
        for item in por_dia:
            resultado.append({
                'fecha': item['fecha'].isoformat() if item['fecha'] else None,
                'total': item['total'],
                'entradas': item['entradas'],
                'salidas': item['salidas']
            })
        
        return Response({
            'fecha_inicio': fecha_inicio.isoformat(),
            'fecha_fin': fecha_fin.isoformat(),
            'total_dias': len(resultado),
            'total_registros': sum(r['total'] for r in resultado),
            'dias': resultado
        })
    
    @action(detail=False, methods=['get'], url_path='health-check')
    def health_check(self, request):
        """
        Verifica el estado del servicio de visión por computadora.
        """
        vision_service = get_vision_service()
        estado = vision_service.health_check()
        
        return Response({
            'servicio_vision': estado,
            'base_datos': 'ok',
            'timestamp': timezone.now().isoformat()
        })
    
    def perform_create(self, serializer):
        """Guarda el registro y procesa la imagen si existe."""
        registro = serializer.save()
        
        # Si hay imagen, intentar procesarla y guardar resultados
        if registro.imagen:
            try:
                vision_service = get_vision_service()
                with registro.imagen.open('rb') as f:
                    imagen_bytes = f.read()
                
                resultado = vision_service.procesar_imagen(imagen_bytes)
                
                # Guardar resultado OCR
                ResultadoOCR.objects.create(
                    registro=registro,
                    vehiculo_detectado=resultado.vehiculo_detectado,
                    confianza_deteccion=resultado.confianza_deteccion,
                    clase_detectada=resultado.clase_detectada,
                    placa_detectada=resultado.placa_detectada,
                    confianza_ocr=resultado.confianza_ocr,
                    color_detectado=resultado.color_detectado,
                    metadatos=resultado.metadatos,
                    tiempo_procesamiento_ms=resultado.tiempo_procesamiento_ms
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Error procesando imagen: {e}")
