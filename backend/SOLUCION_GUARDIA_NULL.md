# SOLUCIÓN DEFINITIVA: Error "guardia_id violates not-null constraint"

## El Problema

La migración `0002_alter_registroaccess_guardia.py` tenía un **typo** en el nombre del modelo:
- ❌ Estaba: `model_name='registroacesso'` (una 's')
- ✅ Debe ser: `model_name='registroacceso'` (dos 's')

Por este typo, Django nunca aplicó la migración, dejando la columna `guardia_id` como `NOT NULL` en la base de datos, pero el código intenta insertar `NULL` para registros públicos.

## ✅ YA CORREGIMOS: 
- El archivo de migración fue corregido
- El backend ahora maneja errores correctamente

## 🔧 NECESITAS HACER:

Aplicar el cambio a tu base de datos. Hay **3 opciones**:

### OPCIÓN 1: SQL Directo (MÁS RÁPIDO) ⚡

Ejecuta este comando SQL en tu PostgreSQL:

```sql
ALTER TABLE acceso_vehicular_registro 
ALTER COLUMN guardia_id DROP NOT NULL;
```

**Cómo hacerlo:**

#### Usando pgAdmin:
1. Abre pgAdmin
2. Conecta a tu base de datos
3. Click en "Query Tool"
4. Pega el SQL de arriba
5. Click en "Execute" (F5)

#### Usando psql (terminal):
```bash
psql -U tu_usuario -d tu_base_de_datos
ALTER TABLE acceso_vehicular_registro ALTER COLUMN guardia_id DROP NOT NULL;
\q
```

---

### OPCIÓN 2: Migraciones Django (si no hay problemas de encoding)

```bash
cd backend
python manage.py migrate acceso_vehicular 0001 --no-input
python manage.py migrate acceso_vehicular --no-input
```

⚠️ **NOTA:** Esto solo funcionará si no tienes el error de encoding UTF-8.

---

### OPCIÓN 3: Si tienes error de UTF-8 en .env

El error `UnicodeDecodeError: 'utf-8' codec can't decode byte 0xf3` significa que hay caracteres especiales problemáticos en tu archivo `.env`.

**Solución:**
1. Abre `backend/.env` con Visual Studio Code o Notepad++
2. Busca la línea de `DATABASE_URL` o credenciales de Postgres
3. Si la contraseña tiene caracteres especiales como `ñ, á, é, í, ó, ú`, cámbialos temporalmente
4. Guarda el archivo con encoding **UTF-8 (sin BOM)**
5. Vuelve a intentar la OPCIÓN 2

**O directamente usa la OPCIÓN 1 (SQL)** que evita este problema.

---

## Verificar que Funcionó

Después de aplicar cualquiera de las opciones, verifica:

```bash
cd backend
python debug_registro.py --test
```

Deberías ver:
```
✅ EXITOSO: Registro creado con ID: X
```

## Probar desde el Frontend

1. Inicia el servidor Django:
   ```bash
   cd backend
   python manage.py runserver
   ```

2. Inicia el frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navega a la página de registro de vehículos
4. Completa el formulario
5. ¡Debería funcionar! ✅

---

## Resumen de Archivos Modificados

### Backend:
- ✅ `acceso_vehicular/migrations/0002_alter_registroaccess_guardia.py` - Typo corregido
- ✅ `acceso_vehicular/views.py` - Mejor manejo de errores
- ✅ `acceso_vehicular/serializers.py` - Validaciones adicionales

### Frontend:
- ✅ `src/pages/registro-vehiculo.page.tsx` - Mejor manejo de errores

### Scripts de utilidad:
- 🆕 `backend/debug_registro.py` - Diagnóstico de BD
- 🆕 `backend/fix_guardia_sql.py` - Fix SQL directo
- 🆕 `backend/quick_fix.py` - Fix automatizado
- 🆕 `backend/FIX_500_ERROR.md` - Documentación del error 500
- 🆕 `backend/SOLUCION_GUARDIA_NULL.md` - Este archivo

---

## ¿Por qué pasó esto?

1. La migración inicial (0001) creó `guardia_id` como `NOT NULL`
2. Luego se hizo una migración (0002) para hacerlo nullable
3. Pero el typo en el nombre del modelo hizo que Django ignorara la migración
4. El código asume que `guardia` puede ser `NULL` (para registros públicos)
5. Al insertar: ¡BOOM! 💥 Constraint violation

---

## Prevención Futura

1. ✅ Siempre verifica que las migraciones se apliquen:
   ```bash
   python manage.py showmigrations acceso_vehicular
   ```
   Deberías ver `[X]` en todas las migraciones aplicadas.

2. ✅ Prueba los endpoints después de cambios en modelos:
   ```bash
   python debug_registro.py --test
   ```

3. ✅ Revisa los logs del servidor Django cuando veas errores 500
