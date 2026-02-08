# Fix para Error 500 en Registro de Vehículos

## Problema
El frontend muestra: `Failed to load resource: the server responded with a status of 500 (Internal Server Error)` y `Error al registrar: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

Esto ocurre porque Django devuelve una página HTML de error en lugar de una respuesta JSON.

## Causas Comunes

### 1. Base de datos sin catálogos iniciales
El sistema requiere que existan registros en las tablas:
- **Puertas** (acceso_vehicular_puerta)
- **Tipos de Vehículo** (acceso_vehicular_tipo_vehiculo)
- **Colores** (acceso_vehicular_color)

### 2. Referencias a IDs que no existen
El formulario público envía `puerta_id: 1`, pero podría no existir una puerta con ID=1.

### 3. Errores no controlados en el backend
Excepciones sin capturar que Django convierte en páginas HTML 500.

## Soluciones Implementadas

### 1. Mejor manejo de errores en el backend
✅ Agregado `create()` override en `RegistroAccesoViewSet` que captura excepciones y devuelve JSON
✅ Agregada validación adicional en `RegistroAccesoCreateSerializer` para verificar que las relaciones existen y están activas
✅ Mensajes de error más descriptivos

### 2. Mejor manejo de errores en el frontend
✅ Captura de errores JSON y HTML
✅ Mensajes de error específicos según el campo que falla
✅ Mensaje amigable cuando el servidor devuelve HTML en lugar de JSON

### 3. Script de diagnóstico
✅ Creado `debug_registro.py` para verificar el estado de la base de datos

## Cómo Resolver

### Paso 1: Verificar el estado de la base de datos

```bash
cd backend
python debug_registro.py
```

Esto mostrará si faltan catálogos.

### Paso 2: Cargar los catálogos iniciales

Si el script indica que faltan datos, ejecuta:

```bash
python manage.py seed
```

Esto creará:
- 3 Puertas (Puerta 1, Puerta 2, Puerta 3)
- Tipos de vehículo (Automóvil, Camioneta, Motocicleta, etc.)
- Colores básicos (Blanco, Negro, Rojo, Azul, etc.)

### Paso 3: Probar la creación de registros

```bash
python debug_registro.py --test
```

Esto intentará crear un registro de prueba y reportará cualquier error.

### Paso 4: Verificar migraciones

Si aún hay problemas, asegúrate de que todas las migraciones estén aplicadas:

```bash
python manage.py migrate
```

## Verificación

Después de aplicar las soluciones, el frontend debería:
1. Mostrar mensajes de error JSON claros en lugar de errores de parsing
2. Poder crear registros exitosamente si los catálogos existen
3. Mostrar mensajes específicos sobre qué está faltando

## Logs del Servidor

Para ver más detalles sobre los errores, revisa la consola donde está corriendo el servidor Django. Los errores ahora se registran con:

```python
logger.error(f"Error creating registro: {str(e)}", exc_info=True)
```

## Ejemplo de Error Mejorado

**Antes:**
```
Error al registrar: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**Después:**
```
Error al registrar el vehículo: Error del servidor (500). Por favor verifica que los catálogos estén configurados.
```

O más específico:
```
Error en puerta: La puerta seleccionada no está activa.
```

## Prevención

Para evitar este problema en producción:

1. **Siempre ejecuta los seeders** después de configurar la base de datos:
   ```bash
   python manage.py migrate
   python manage.py seed
   ```

2. **Verifica antes de desplegar**:
   ```bash
   python debug_registro.py
   ```

3. **Monitorea logs** del servidor en producción para detectar errores temprano

## Archivos Modificados

- `backend/acceso_vehicular/views.py` - Mejor manejo de errores en create()
- `backend/acceso_vehicular/serializers.py` - Validaciones adicionales
- `frontend/src/pages/registro-vehiculo.page.tsx` - Manejo robusto de errores
- `backend/debug_registro.py` - Script de diagnóstico (nuevo)

## Contacto

Si el problema persiste después de seguir estos pasos, verifica:
1. Los logs del servidor Django (consola donde corre `python manage.py runserver`)
2. La consola del navegador para ver la respuesta completa del servidor
3. Ejecuta `python debug_registro.py --test` y comparte el output
