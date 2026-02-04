"""
Servicio de Visión por Computadora para reconocimiento de vehículos y placas.
Utiliza: YOLOv8n + OpenCV + Tesseract OCR

Este servicio implementa el pipeline de procesamiento de imágenes:
1. Detección de vehículo (YOLOv8n)
2. Preprocesamiento de imagen (OpenCV)
3. Extracción de placa (Tesseract OCR)
4. Detección de color dominante (OpenCV)
"""

import re
import time
import logging
from dataclasses import dataclass
from typing import Optional, Tuple
from io import BytesIO

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class ResultadoDeteccion:
    """Resultado del procesamiento de visión por computadora."""
    vehiculo_detectado: bool = False
    clase_detectada: str = ""
    confianza_deteccion: float = 0.0
    placa_detectada: str = ""
    confianza_ocr: float = 0.0
    color_detectado: str = ""
    tiempo_procesamiento_ms: int = 0
    metadatos: dict = None
    
    def __post_init__(self):
        if self.metadatos is None:
            self.metadatos = {}


class VisionService:
    """
    Servicio para procesamiento de imágenes de vehículos.
    Implementa detección de vehículos, OCR de placas y detección de color.
    """
    
    # Clases de YOLO que corresponden a vehículos
    VEHICLE_CLASSES = ['car', 'truck', 'bus', 'motorcycle', 'bicycle']
    
    # Mapeo de clases YOLO a tipos de vehículo en español
    CLASS_MAPPING = {
        'car': 'Automóvil',
        'truck': 'Camioneta',
        'bus': 'Bus',
        'motorcycle': 'Motocicleta',
        'bicycle': 'Bicicleta',
    }
    
    # Colores predefinidos para detección (HSV ranges)
    COLOR_RANGES = {
        'Rojo': [(0, 100, 100), (10, 255, 255)],
        'Rojo Oscuro': [(160, 100, 100), (180, 255, 255)],
        'Naranja': [(10, 100, 100), (25, 255, 255)],
        'Amarillo': [(25, 100, 100), (35, 255, 255)],
        'Verde': [(35, 100, 100), (85, 255, 255)],
        'Azul': [(85, 100, 100), (130, 255, 255)],
        'Morado': [(130, 100, 100), (160, 255, 255)],
        'Blanco': [(0, 0, 200), (180, 30, 255)],
        'Negro': [(0, 0, 0), (180, 255, 50)],
        'Gris': [(0, 0, 50), (180, 30, 200)],
    }
    
    def __init__(self):
        self._yolo_model = None
        self._ocr_reader = None
        self._model_loaded = False
        
    def _load_models(self):
        """Carga los modelos de forma lazy."""
        if self._model_loaded:
            return
            
        try:
            # Intentar cargar YOLO
            from ultralytics import YOLO
            self._yolo_model = YOLO('yolov8n.pt')
            logger.info("Modelo YOLOv8n cargado correctamente")
        except ImportError:
            logger.warning("ultralytics no instalado. Detección de vehículos deshabilitada.")
            self._yolo_model = None
        except Exception as e:
            logger.error(f"Error cargando modelo YOLO: {e}")
            self._yolo_model = None
            
        # Tesseract OCR se usa mediante pytesseract
        try:
            import pytesseract
            # Verificar que Tesseract está instalado
            pytesseract.get_tesseract_version()
            self._ocr_reader = pytesseract
            logger.info("Tesseract OCR disponible")
        except ImportError:
            logger.warning("pytesseract no instalado. OCR deshabilitado.")
            self._ocr_reader = None
        except Exception as e:
            logger.warning(f"Tesseract no configurado: {e}. OCR deshabilitado.")
            self._ocr_reader = None
            
        self._model_loaded = True
    
    def procesar_imagen(self, imagen_bytes: bytes) -> ResultadoDeteccion:
        """
        Procesa una imagen y extrae información del vehículo.
        
        Args:
            imagen_bytes: Imagen en formato bytes (JPEG/PNG)
            
        Returns:
            ResultadoDeteccion con la información extraída
        """
        inicio = time.time()
        resultado = ResultadoDeteccion()
        
        try:
            import cv2
            
            # Cargar modelos si no están cargados
            self._load_models()
            
            # Convertir bytes a imagen OpenCV
            nparr = np.frombuffer(imagen_bytes, np.uint8)
            imagen = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if imagen is None:
                logger.error("No se pudo decodificar la imagen")
                return resultado
            
            # 1. Detectar vehículo con YOLO
            vehiculo_info = self._detectar_vehiculo(imagen)
            if vehiculo_info:
                resultado.vehiculo_detectado = True
                resultado.clase_detectada = vehiculo_info['clase']
                resultado.confianza_deteccion = vehiculo_info['confianza']
                resultado.metadatos['bbox'] = vehiculo_info.get('bbox', [])
            
            # 2. Extraer placa con OCR
            placa_info = self._extraer_placa(imagen)
            if placa_info:
                resultado.placa_detectada = placa_info['placa']
                resultado.confianza_ocr = placa_info['confianza']
            
            # 3. Detectar color dominante
            color = self._detectar_color_dominante(imagen)
            resultado.color_detectado = color
            
        except ImportError as e:
            logger.error(f"Dependencia no instalada: {e}")
            resultado.metadatos['error'] = f"Dependencia no instalada: {str(e)}"
        except Exception as e:
            logger.error(f"Error procesando imagen: {e}")
            resultado.metadatos['error'] = str(e)
        finally:
            resultado.tiempo_procesamiento_ms = int((time.time() - inicio) * 1000)
            
        return resultado
    
    def _detectar_vehiculo(self, imagen: np.ndarray) -> Optional[dict]:
        """
        Detecta vehículos en la imagen usando YOLOv8n.
        
        Returns:
            dict con clase, confianza y bbox si se detecta un vehículo
        """
        if self._yolo_model is None:
            return None
            
        try:
            results = self._yolo_model(imagen, verbose=False)
            
            for result in results:
                boxes = result.boxes
                if boxes is None:
                    continue
                    
                for i, box in enumerate(boxes):
                    cls_id = int(box.cls[0])
                    cls_name = self._yolo_model.names[cls_id]
                    
                    if cls_name in self.VEHICLE_CLASSES:
                        conf = float(box.conf[0])
                        bbox = box.xyxy[0].tolist()
                        
                        return {
                            'clase': self.CLASS_MAPPING.get(cls_name, cls_name),
                            'confianza': conf,
                            'bbox': bbox,
                            'clase_original': cls_name
                        }
        except Exception as e:
            logger.error(f"Error en detección YOLO: {e}")
            
        return None
    
    def _preprocesar_para_ocr(self, imagen: np.ndarray) -> np.ndarray:
        """
        Preprocesa la imagen para mejorar el OCR.
        Aplica técnicas de mejora de contraste y binarización.
        """
        import cv2
        
        # Convertir a escala de grises
        gris = cv2.cvtColor(imagen, cv2.COLOR_BGR2GRAY)
        
        # Aplicar CLAHE para mejorar contraste
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        mejorada = clahe.apply(gris)
        
        # Aplicar umbral adaptativo
        binaria = cv2.adaptiveThreshold(
            mejorada, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11, 2
        )
        
        # Reducir ruido
        kernel = np.ones((1, 1), np.uint8)
        binaria = cv2.morphologyEx(binaria, cv2.MORPH_CLOSE, kernel)
        
        return binaria
    
    def _extraer_placa(self, imagen: np.ndarray) -> Optional[dict]:
        """
        Extrae el texto de la placa usando Tesseract OCR.
        
        Returns:
            dict con placa y confianza si se detecta texto válido
        """
        if self._ocr_reader is None:
            return None
            
        try:
            import cv2
            
            # Preprocesar imagen para OCR
            procesada = self._preprocesar_para_ocr(imagen)
            
            # Configuración de Tesseract para placas
            # PSM 7: Treat the image as a single text line
            # OEM 3: Default OCR Engine Mode
            config = '--psm 7 --oem 3 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
            
            # Ejecutar OCR
            resultado = self._ocr_reader.image_to_data(
                procesada, 
                config=config,
                output_type=self._ocr_reader.Output.DICT
            )
            
            # Procesar resultados
            textos = []
            confianzas = []
            
            for i, texto in enumerate(resultado['text']):
                conf = int(resultado['conf'][i])
                if conf > 30 and texto.strip():
                    textos.append(texto.strip())
                    confianzas.append(conf)
            
            if not textos:
                return None
            
            # Unir textos y limpiar
            placa_raw = ''.join(textos)
            placa_limpia = self._limpiar_placa(placa_raw)
            
            if placa_limpia and len(placa_limpia) >= 4:
                confianza_promedio = sum(confianzas) / len(confianzas) / 100
                return {
                    'placa': placa_limpia,
                    'confianza': confianza_promedio,
                    'raw': placa_raw
                }
                
        except Exception as e:
            logger.error(f"Error en OCR: {e}")
            
        return None
    
    def _limpiar_placa(self, texto: str) -> str:
        """
        Limpia y valida el texto de la placa.
        Formatos comunes en Bolivia: ABC-1234, 1234-ABC, etc.
        """
        # Remover caracteres no válidos
        texto = texto.upper().strip()
        texto = re.sub(r'[^A-Z0-9]', '', texto)
        
        # Validar longitud mínima
        if len(texto) < 4:
            return ""
            
        # Formatear con guión si es posible
        # Patrón común: 3-4 letras + 3-4 números o viceversa
        patron_letras_numeros = re.match(r'^([A-Z]{2,4})(\d{2,4})$', texto)
        patron_numeros_letras = re.match(r'^(\d{2,4})([A-Z]{2,4})$', texto)
        
        if patron_letras_numeros:
            return f"{patron_letras_numeros.group(1)}-{patron_letras_numeros.group(2)}"
        elif patron_numeros_letras:
            return f"{patron_numeros_letras.group(1)}-{patron_numeros_letras.group(2)}"
        
        return texto
    
    def _detectar_color_dominante(self, imagen: np.ndarray) -> str:
        """
        Detecta el color dominante del vehículo usando k-means clustering.
        """
        try:
            import cv2
            from collections import Counter
            
            # Convertir a HSV
            hsv = cv2.cvtColor(imagen, cv2.COLOR_BGR2HSV)
            
            # Tomar región central (donde probablemente está el vehículo)
            h, w = imagen.shape[:2]
            region = hsv[h//4:3*h//4, w//4:3*w//4]
            
            # Calcular histograma de H (tono)
            hist_h = cv2.calcHist([region], [0], None, [180], [0, 180])
            tono_dominante = np.argmax(hist_h)
            
            # Calcular valores promedio de S y V
            s_promedio = np.mean(region[:, :, 1])
            v_promedio = np.mean(region[:, :, 2])
            
            # Clasificar color
            return self._clasificar_color(tono_dominante, s_promedio, v_promedio)
            
        except Exception as e:
            logger.error(f"Error detectando color: {e}")
            return "No identificado"
    
    def _clasificar_color(self, h: int, s: float, v: float) -> str:
        """
        Clasifica el color basándose en valores HSV.
        """
        # Colores acromáticos (bajo en saturación)
        if s < 30:
            if v < 50:
                return "Negro"
            elif v > 200:
                return "Blanco"
            else:
                return "Gris"
        
        # Colores cromáticos
        if h < 10 or h > 160:
            return "Rojo"
        elif h < 25:
            return "Naranja"
        elif h < 35:
            return "Amarillo"
        elif h < 85:
            return "Verde"
        elif h < 130:
            return "Azul"
        elif h < 160:
            return "Morado"
        
        return "No identificado"
    
    def health_check(self) -> dict:
        """
        Verifica el estado de los componentes del servicio.
        """
        self._load_models()
        
        return {
            'yolo_disponible': self._yolo_model is not None,
            'ocr_disponible': self._ocr_reader is not None,
            'opencv_disponible': self._check_opencv(),
        }
    
    def _check_opencv(self) -> bool:
        """Verifica si OpenCV está disponible."""
        try:
            import cv2
            return True
        except ImportError:
            return False


# Instancia singleton del servicio
_vision_service_instance = None

def get_vision_service() -> VisionService:
    """Obtiene la instancia singleton del servicio de visión."""
    global _vision_service_instance
    if _vision_service_instance is None:
        _vision_service_instance = VisionService()
    return _vision_service_instance
