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
# Forzar nivel INFO para ver logs de depuración
logger.setLevel(logging.INFO)


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
    
    def _preprocesar_para_ocr(self, imagen: np.ndarray, metodo: str = 'clahe') -> np.ndarray:
        """
        Preprocesa la imagen para mejorar el OCR.
        Optimizado para placas bolivianas: fondo blanco con letras azules.
        
        Args:
            imagen: Imagen en BGR
            metodo: 'clahe', 'otsu', 'simple', 'invert', 'blue_extract'
        """
        import cv2
        
        # Convertir a escala de grises
        if len(imagen.shape) == 3:
            gris = cv2.cvtColor(imagen, cv2.COLOR_BGR2GRAY)
        else:
            gris = imagen.copy()
        
        if metodo == 'clahe':
            # Aplicar CLAHE para mejorar contraste
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            mejorada = clahe.apply(gris)
            
            # Aplicar umbral adaptativo
            binaria = cv2.adaptiveThreshold(
                mejorada, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                11, 2
            )
        elif metodo == 'otsu':
            # Blur para reducir ruido
            blur = cv2.GaussianBlur(gris, (3, 3), 0)
            # Umbral Otsu
            _, binaria = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        elif metodo == 'invert':
            # CLAHE + inversión (para placas oscuras sobre fondo claro)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            mejorada = clahe.apply(gris)
            _, binaria = cv2.threshold(mejorada, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        elif metodo == 'blue_extract' and len(imagen.shape) == 3:
            # Extraer letras azules sobre fondo blanco (placas bolivianas)
            hsv = cv2.cvtColor(imagen, cv2.COLOR_BGR2HSV)
            
            # Rango amplio para azul (cubre variaciones de iluminación)
            # Azul típico: H=100-130, S>50, V>50
            lower_blue = np.array([85, 40, 40])
            upper_blue = np.array([135, 255, 255])
            mask_blue = cv2.inRange(hsv, lower_blue, upper_blue)
            
            # También detectar azul oscuro que puede parecer más saturado
            lower_dark_blue = np.array([100, 80, 30])
            upper_dark_blue = np.array([130, 255, 200])
            mask_dark = cv2.inRange(hsv, lower_dark_blue, upper_dark_blue)
            
            # Combinar máscaras
            mask_combined = cv2.bitwise_or(mask_blue, mask_dark)
            
            # Operaciones morfológicas para limpiar
            kernel = np.ones((2, 2), np.uint8)
            mask_combined = cv2.morphologyEx(mask_combined, cv2.MORPH_CLOSE, kernel)
            mask_combined = cv2.morphologyEx(mask_combined, cv2.MORPH_OPEN, kernel)
            
            # Invertir: letras blancas sobre fondo negro (mejor para OCR)
            binaria = cv2.bitwise_not(mask_combined)
        else:
            # Simple threshold
            _, binaria = cv2.threshold(gris, 127, 255, cv2.THRESH_BINARY)
        
        return binaria
    
    def _detectar_region_placa(self, imagen: np.ndarray) -> list:
        """
        Detecta regiones candidatas de placa.
        Enfoque híbrido: regiones fijas + detección de contornos blancos.
        
        Returns:
            Lista de imágenes recortadas de regiones candidatas de placa
        """
        import cv2
        
        candidatos = []
        
        try:
            h_img, w_img = imagen.shape[:2]
            
            # MÉTODO 1: Regiones fijas donde típicamente están las placas
            # Esto es más confiable que detectar regiones blancas que pueden fallar
            
            # Placa posterior típica: centro-inferior de la imagen
            regiones_fijas = [
                # Centro inferior (placa trasera)
                (int(w_img*0.25), int(h_img*0.65), int(w_img*0.75), int(h_img*0.95)),
                # Centro medio-inferior 
                (int(w_img*0.20), int(h_img*0.55), int(w_img*0.80), int(h_img*0.85)),
                # Esquina inferior izquierda
                (0, int(h_img*0.60), int(w_img*0.50), h_img),
                # Esquina inferior derecha
                (int(w_img*0.50), int(h_img*0.60), w_img, h_img),
            ]
            
            for x1, y1, x2, y2 in regiones_fijas:
                if x2 > x1 and y2 > y1:
                    region = imagen[y1:y2, x1:x2]
                    if region.size > 0:
                        candidatos.append({
                            'region': region,
                            'area': (x2-x1) * (y2-y1),
                            'coords': (x1, y1, x2, y2),
                            'metodo': 'fixed_region',
                            'priority': 1
                        })
            
            # MÉTODO 2: Detectar rectángulos blancos pequeños (placas bolivianas)
            hsv = cv2.cvtColor(imagen, cv2.COLOR_BGR2HSV)
            
            # Máscara para color blanco
            lower_white = np.array([0, 0, 180])
            upper_white = np.array([180, 50, 255])
            mask_white = cv2.inRange(hsv, lower_white, upper_white)
            
            # Operaciones morfológicas
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 6))
            mask_white = cv2.morphologyEx(mask_white, cv2.MORPH_CLOSE, kernel)
            
            contornos, _ = cv2.findContours(mask_white, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contorno in contornos:
                x, y, w, h = cv2.boundingRect(contorno)
                
                if h < 20 or w < 50:
                    continue
                    
                aspect_ratio = w / h
                area = w * h
                area_ratio = area / (w_img * h_img)
                
                # Filtros más estrictos para placas:
                # - Aspect ratio entre 2 y 4.5 (placas son rectangulares alargadas)
                # - Área entre 0.1% y 5% de la imagen
                # - Alto entre 20-150 px, ancho entre 60-400 px
                if (2.0 <= aspect_ratio <= 4.5 and 
                    0.001 <= area_ratio <= 0.05 and
                    20 <= h <= 150 and 60 <= w <= 400):
                    
                    margen = 10
                    x1 = max(0, x - margen)
                    y1 = max(0, y - margen)
                    x2 = min(w_img, x + w + margen)
                    y2 = min(h_img, y + h + margen)
                    
                    region = imagen[y1:y2, x1:x2]
                    if region.size > 0:
                        candidatos.append({
                            'region': region,
                            'area': area,
                            'coords': (x1, y1, x2, y2),
                            'metodo': 'white_contour',
                            'priority': 0  # Mayor prioridad
                        })
            
            # Ordenar por prioridad y luego por área
            candidatos.sort(key=lambda c: (c.get('priority', 1), -c['area']))
            
            # Devolver máximo 6 regiones
            return [c['region'] for c in candidatos[:6]]
            
        except Exception as e:
            logger.error(f"Error detectando región de placa: {e}")
        
        return []
    
    def _detectar_region_placa_legacy(self, imagen: np.ndarray) -> list:
        """
        Versión anterior de detección de regiones (backup).
        """
        import cv2
        
        candidatos = []
        
        try:
            h_img, w_img = imagen.shape[:2]
            
            # Método 1: Buscar regiones blancas (placas bolivianas tienen fondo blanco)
            hsv = cv2.cvtColor(imagen, cv2.COLOR_BGR2HSV)
            
            # Máscara para color blanco (alto V, bajo S)
            lower_white = np.array([0, 0, 180])
            upper_white = np.array([180, 60, 255])
            mask_white = cv2.inRange(hsv, lower_white, upper_white)
            
            # Operaciones morfológicas para limpiar la máscara
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 5))
            mask_white = cv2.morphologyEx(mask_white, cv2.MORPH_CLOSE, kernel)
            mask_white = cv2.morphologyEx(mask_white, cv2.MORPH_OPEN, kernel)
            
            # Encontrar contornos de regiones blancas
            contornos, _ = cv2.findContours(mask_white, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contorno in contornos:
                x, y, w, h = cv2.boundingRect(contorno)
                
                if h == 0 or w == 0:
                    continue
                    
                aspect_ratio = w / h
                area = w * h
                area_ratio = area / (w_img * h_img)
                
                # Placas típicas: aspect ratio 1.5-5, área 0.3%-15% de la imagen
                if 1.5 <= aspect_ratio <= 5.5 and 0.002 <= area_ratio <= 0.15:
                    margen = int(min(w, h) * 0.15)
                    x1 = max(0, x - margen)
                    y1 = max(0, y - margen)
                    x2 = min(w_img, x + w + margen)
                    y2 = min(h_img, y + h + margen)
                    
                    region = imagen[y1:y2, x1:x2]
                    if region.size > 0 and region.shape[0] > 15 and region.shape[1] > 30:
                        candidatos.append({
                            'region': region,
                            'area': area,
                            'aspect': aspect_ratio,
                            'coords': (x1, y1, x2, y2),
                            'metodo': 'white_region'
                        })
            
            # Ordenar por área (descendente) - placas más grandes primero
            candidatos.sort(key=lambda c: c['area'], reverse=True)
            
            # Devolver las regiones (máximo 8 candidatos)
            return [c['region'] for c in candidatos[:8]]
            
        except Exception as e:
            logger.error(f"Error detectando región de placa: {e}")
        
        return candidatos
    
    def _aplicar_ocr_directo(self, imagen: np.ndarray) -> Optional[dict]:
        """
        Aplica OCR directamente a secciones de la imagen sin detección de regiones.
        Método más simple y directo para casos donde la detección de regiones falla.
        """
        import cv2
        
        if self._ocr_reader is None:
            return None
            
        h_img, w_img = imagen.shape[:2]
        mejor_resultado = None
        
        # Secciones donde típicamente está la placa
        secciones = [
            # Centro-inferior (placa trasera)
            imagen[int(h_img*0.6):, int(w_img*0.2):int(w_img*0.8)],
            # Más abajo
            imagen[int(h_img*0.7):, int(w_img*0.15):int(w_img*0.85)],
            # Todo el tercio inferior
            imagen[int(h_img*0.65):, :],
        ]
        
        config = '--psm 7 --oem 3 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        
        for seccion in secciones:
            if seccion is None or seccion.size == 0:
                continue
                
            # Preprocesar y aplicar OCR
            for metodo in ['otsu', 'blue_extract']:
                try:
                    procesada = self._preprocesar_para_ocr(seccion, metodo)
                    resultado = self._ejecutar_ocr(procesada, config)
                    
                    if resultado and len(resultado['placa']) >= 5:
                        return resultado
                    elif resultado and (mejor_resultado is None or 
                                       len(resultado['placa']) > len(mejor_resultado.get('placa', ''))):
                        mejor_resultado = resultado
                except:
                    continue
        
        return mejor_resultado
    
    def _dummy_detectar_region_placa(self, imagen: np.ndarray) -> list:
        """Placeholder para mantener compatibilidad."""
        import cv2
        
        candidatos = []
        
        try:
            h_img, w_img = imagen.shape[:2]
            lower_white = np.array([0, 0, 180])
            upper_white = np.array([180, 60, 255])
            
            # Método 3: Buscar en la parte inferior de la imagen
            parte_inferior = imagen[int(h_img * 0.55):, :]
            if parte_inferior.size > 0:
                h_inf, w_inf = parte_inferior.shape[:2]
                
                # Buscar regiones blancas en la parte inferior
                hsv_inf = cv2.cvtColor(parte_inferior, cv2.COLOR_BGR2HSV)
                mask_inf = cv2.inRange(hsv_inf, lower_white, upper_white)
                
                kernel_inf = cv2.getStructuringElement(cv2.MORPH_RECT, (10, 3))
                mask_inf = cv2.morphologyEx(mask_inf, cv2.MORPH_CLOSE, kernel_inf)
                
                contornos_inf, _ = cv2.findContours(mask_inf, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                for contorno in contornos_inf:
                    x, y, w, h = cv2.boundingRect(contorno)
                    if h == 0 or w < 30:
                        continue
                    
                    aspect_ratio = w / h
                    
                    if 1.5 <= aspect_ratio <= 5.5:
                        margen = int(min(w, h) * 0.2)
                        x1 = max(0, x - margen)
                        y1 = max(0, y - margen)
                        x2 = min(w_inf, x + w + margen)
                        y2 = min(h_inf, y + h + margen)
                        
                        region = parte_inferior[y1:y2, x1:x2]
                        if region.size > 0 and region.shape[0] > 15 and region.shape[1] > 30:
                            candidatos.append({
                                'region': region,
                                'area': w * h,
                                'aspect': aspect_ratio,
                                'coords': (x1, y1 + int(h_img * 0.55), x2, y2 + int(h_img * 0.55)),
                                'metodo': 'bottom_white'
                            })
            
            # Ordenar por área (descendente) - placas más grandes primero
            candidatos.sort(key=lambda c: c['area'], reverse=True)
            
            logger.debug(f"Candidatos de placa encontrados: {len(candidatos)}")
            
            # Devolver las regiones (máximo 8 candidatos)
            return [c['region'] for c in candidatos[:8]]
            
        except Exception as e:
            logger.error(f"Error detectando región de placa: {e}")
        
        return candidatos
    
    def _extraer_placa(self, imagen: np.ndarray) -> Optional[dict]:
        """
        Extrae el texto de la placa usando Tesseract OCR.
        Optimizado para placas bolivianas: fondo blanco, letras azules en relieve.
        
        Returns:
            dict con placa y confianza si se detecta texto válido
        """
        if self._ocr_reader is None:
            return None
            
        try:
            import cv2
            import time
            
            mejor_resultado = None
            mejor_confianza = 0
            h_img, w_img = imagen.shape[:2]
            
            # DEBUG: Guardar imagen para análisis (desactivar en producción)
            try:
                debug_path = f'/tmp/debug_img_{int(time.time())}.jpg'
                cv2.imwrite(debug_path, imagen)
                logger.info(f"DEBUG: Imagen guardada en {debug_path}")
            except:
                pass
            
            # Configuración de Tesseract
            config = '--psm 7 --oem 3 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
            
            # Métodos de preprocesamiento
            metodos = ['otsu', 'blue_extract', 'clahe']
            
            # ESTRATEGIA 1: Detectar rectángulos blancos pequeños directamente
            # Esta es la forma más precisa de encontrar la placa
            candidatos_placa = self._detectar_rectangulo_placa(imagen)
            
            if candidatos_placa:
                logger.info(f"Encontrados {len(candidatos_placa)} candidatos de placa por rectángulo")
                for idx, candidato in enumerate(candidatos_placa[:3]):
                    h, w = candidato.shape[:2]
                    logger.info(f"Candidato {idx}: {w}x{h}")
                    
                    resultado = self._procesar_region_ocr(candidato, metodos, config)
                    if resultado and len(resultado['placa']) >= 5:
                        logger.info(f"¡Placa encontrada!: {resultado['placa']}")
                        return resultado
                    elif resultado and (mejor_resultado is None or 
                                       len(resultado['placa']) > len(mejor_resultado.get('placa', ''))):
                        mejor_resultado = resultado
            
            # ESTRATEGIA 2: Zonas fijas en la parte más inferior
            zonas_fijas = [
                # Franja muy inferior, centro
                imagen[int(h_img*0.85):, int(w_img*0.25):int(w_img*0.75)],
                # Un poco más arriba
                imagen[int(h_img*0.80):int(h_img*0.98), int(w_img*0.20):int(w_img*0.80)],
            ]
            
            logger.info(f"Buscando placa en zonas fijas (imagen: {w_img}x{h_img})")
            
            for idx, zona in enumerate(zonas_fijas):
                if zona is None or zona.size == 0:
                    continue
                    
                h, w = zona.shape[:2]
                
                # Solo procesar si la zona tiene tamaño razonable
                if h > 20 and w > 50:
                    resultado = self._procesar_region_ocr(zona, metodos, config)
                    if resultado and len(resultado['placa']) >= 5:
                        logger.info(f"¡Placa encontrada en zona {idx}!: {resultado['placa']}")
                        return resultado
                    elif resultado and (mejor_resultado is None or 
                                       len(resultado['placa']) > len(mejor_resultado.get('placa', ''))):
                        mejor_resultado = resultado
            
            if mejor_resultado:
                logger.info(f"Placa final: {mejor_resultado['placa']} (conf: {mejor_resultado['confianza']:.2f})")
            else:
                logger.info("No se detectó ninguna placa")
                
            return mejor_resultado
                
        except Exception as e:
            logger.error(f"Error en extracción de placa: {e}")
            
        return None
    
    def _detectar_rectangulo_placa(self, imagen: np.ndarray) -> list:
        """
        Detecta rectángulos blancos con aspect ratio de placa.
        Más preciso que buscar cualquier región blanca.
        """
        import cv2
        
        candidatos = []
        h_img, w_img = imagen.shape[:2]
        
        try:
            # Convertir a HSV para detectar blanco
            hsv = cv2.cvtColor(imagen, cv2.COLOR_BGR2HSV)
            
            # Máscara para blanco puro (placa boliviana)
            lower_white = np.array([0, 0, 200])
            upper_white = np.array([180, 40, 255])
            mask = cv2.inRange(hsv, lower_white, upper_white)
            
            # Operaciones morfológicas
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 8))
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (5, 2)))
            
            # Encontrar contornos
            contornos, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contorno in contornos:
                x, y, w, h = cv2.boundingRect(contorno)
                
                # Validar dimensiones de placa
                if h < 20 or w < 60:
                    continue
                    
                aspect_ratio = w / h
                area = w * h
                
                # Placa boliviana típica: aspect ratio 2.5-4, área razonable
                if 2.0 <= aspect_ratio <= 5.0 and area >= 1500:
                    # Agregar margen
                    margen = 8
                    x1 = max(0, x - margen)
                    y1 = max(0, y - margen)
                    x2 = min(w_img, x + w + margen)
                    y2 = min(h_img, y + h + margen)
                    
                    region = imagen[y1:y2, x1:x2]
                    if region.size > 0:
                        candidatos.append(region)
                        logger.info(f"Rectángulo placa detectado: {w}x{h} en ({x},{y}), AR={aspect_ratio:.2f}")
            
            # Ordenar por área (más grande primero)
            candidatos.sort(key=lambda c: c.shape[0] * c.shape[1], reverse=True)
            
        except Exception as e:
            logger.error(f"Error detectando rectángulo placa: {e}")
        
        return candidatos[:5]
    
    def _subdividir_region(self, region: np.ndarray) -> list:
        """Subdivide una región grande en partes más pequeñas."""
        h, w = region.shape[:2]
        subregiones = []
        
        # Dividir en filas horizontales
        paso_h = h // 3
        for i in range(3):
            y1 = i * paso_h
            y2 = min((i + 1) * paso_h + 20, h)
            if y2 > y1:
                subregiones.append(region[y1:y2, :])
        
        return subregiones
    
    def _procesar_region_ocr(self, region: np.ndarray, metodos: list, config: str) -> Optional[dict]:
        """Procesa una región con OCR usando múltiples métodos de preprocesamiento."""
        import cv2
        
        if region is None or region.size == 0:
            return None
            
        h, w = region.shape[:2]
        logger.debug(f"Procesando región OCR: {w}x{h}")
        
        # Redimensionar para OCR óptimo (Tesseract funciona mejor con texto de ~30-50px de alto)
        if h < 40 or w < 100:
            scale = max(50/h, 120/w, 2.0)
            region = cv2.resize(region, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
            logger.debug(f"Escalado x{scale:.1f} -> {region.shape[1]}x{region.shape[0]}")
        elif h > 100:
            scale = 70 / h
            region = cv2.resize(region, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        
        mejor_resultado = None
        
        for metodo in metodos:
            try:
                procesada = self._preprocesar_para_ocr(region, metodo)
                
                # Primero probar OCR simple
                texto_raw = self._ocr_reader.image_to_string(procesada, config=config).strip()
                
                if texto_raw:
                    logger.info(f"OCR ({metodo}): raw='{texto_raw}'")
                    placa_limpia = self._limpiar_placa(texto_raw)
                    if placa_limpia and len(placa_limpia) >= 4:
                        logger.info(f"Placa limpia: '{placa_limpia}'")
                        return {
                            'placa': placa_limpia,
                            'confianza': 0.7,
                            'raw': texto_raw
                        }
                
                # Si no funcionó, probar con image_to_data
                resultado = self._ejecutar_ocr(procesada, config)
                
                if resultado and len(resultado['placa']) >= 5:
                    return resultado
                elif resultado and (mejor_resultado is None or 
                                   len(resultado['placa']) > len(mejor_resultado.get('placa', ''))):
                    mejor_resultado = resultado
            except Exception as e:
                logger.debug(f"Error en OCR método {metodo}: {e}")
                continue
        
        return mejor_resultado
    
    def _extraer_placa_legacy(self, imagen: np.ndarray) -> Optional[dict]:
        """
        Ejecuta OCR en una imagen preprocesada.
        
        Returns:
            dict con placa, confianza y raw, o None
        """
        try:
            # Primero intentar con image_to_string (más simple y rápido)
            texto_simple = self._ocr_reader.image_to_string(imagen, config=config).strip()
            
            if texto_simple:
                placa_limpia = self._limpiar_placa(texto_simple)
                if placa_limpia and len(placa_limpia) >= 4:
                    logger.info(f"OCR detectó: '{texto_simple}' -> '{placa_limpia}'")
                    return {
                        'placa': placa_limpia,
                        'confianza': 0.7,  # Confianza estimada
                        'raw': texto_simple
                    }
            
            # Si no funcionó, intentar con image_to_data para más detalle
            resultado = self._ocr_reader.image_to_data(
                imagen, 
                config=config,
                output_type=self._ocr_reader.Output.DICT
            )
            
            # Procesar resultados
            textos = []
            confianzas = []
            
            for i, texto in enumerate(resultado['text']):
                conf = int(resultado['conf'][i])
                if conf > 15 and texto.strip():  # Umbral muy bajo
                    textos.append(texto.strip())
                    confianzas.append(conf)
            
            if not textos:
                return None
            
            # Unir textos y limpiar
            placa_raw = ''.join(textos)
            placa_limpia = self._limpiar_placa(placa_raw)
            
            if placa_limpia and len(placa_limpia) >= 4:
                confianza_promedio = sum(confianzas) / len(confianzas) / 100
                logger.info(f"OCR data detectó: '{placa_raw}' -> '{placa_limpia}'")
                return {
                    'placa': placa_limpia,
                    'confianza': confianza_promedio,
                    'raw': placa_raw
                }
                
        except Exception as e:
            logger.debug(f"Error ejecutando OCR: {e}")
            
        return None
    
    def _limpiar_placa(self, texto: str) -> str:
        """
        Limpia y valida el texto de la placa.
        Optimizado para placas bolivianas (NNNNLLL o LLLNNNN).
        """
        if not texto:
            return ""
            
        # Remover caracteres no válidos y espacios
        texto = texto.upper().strip()
        
        # Solo mantener alfanuméricos
        texto = re.sub(r'[^A-Z0-9]', '', texto)
        
        # Validar longitud mínima
        if len(texto) < 4:
            return ""
        
        logger.debug(f"Limpiando placa: '{texto}' (len={len(texto)})")
        
        # Para Bolivia: formato típico NNNNLLL (4 números + 3 letras, ej: 5011KAN)
        # Buscar patrón de 7 caracteres con 4 números + 3 letras
        
        # Si tiene 8 caracteres y empieza con 1, podría ser un error OCR (1 extra al inicio)
        if len(texto) == 8 and texto[0] == '1':
            texto_corregido = texto[1:]
            match = re.match(r'^(\d{4})([A-Z]{3})$', texto_corregido)
            if match:
                logger.info(f"Corregido 1 extra al inicio: '{texto}' -> '{texto_corregido}'")
                return texto_corregido
        
        # Si tiene 6 caracteres (falta una letra al final), intentar agregar patrones comunes
        if len(texto) == 6:
            match = re.match(r'^(\d{4})([A-Z]{2})$', texto)
            if match:
                # Es posible que falte la última letra - devolver lo que tenemos
                logger.info(f"Placa parcial detectada: '{texto}'")
                return texto
        
        # Intentar diferentes patrones de placas bolivianas
        patrones_bolivia = [
            # Bolivia: 4 números + 3 letras (como 5011KAN) - patrón principal
            r'^(\d{4})([A-Z]{3})$',
            # Bolivia: 4 números + 2 letras (parcial)
            r'^(\d{4})([A-Z]{2})$',
            # Bolivia: 3 letras + 4 números  
            r'^([A-Z]{3})(\d{4})$',
            # Bolivia: 3 números + 3 letras
            r'^(\d{3})([A-Z]{3})$',
        ]
        
        for patron in patrones_bolivia:
            match = re.match(patron, texto)
            if match:
                resultado = ''.join(match.groups())
                logger.info(f"Patrón Bolivia: '{texto}' -> '{resultado}'")
                return resultado
        
        # Si tiene 7+ caracteres con mezcla de letras y números, probablemente es placa
        tiene_letras = bool(re.search(r'[A-Z]', texto))
        tiene_numeros = bool(re.search(r'\d', texto))
        
        if len(texto) >= 5 and tiene_letras and tiene_numeros:
            # Extraer los primeros 7 caracteres si hay más
            if len(texto) > 7:
                # Buscar el patrón NNNNLLL dentro del texto
                match = re.search(r'(\d{4})([A-Z]{3})', texto)
                if match:
                    resultado = match.group(1) + match.group(2)
                    logger.info(f"Extraído patrón de texto largo: '{texto}' -> '{resultado}'")
                    return resultado
            return texto[:7] if len(texto) > 7 else texto
        
        return ""
    
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
