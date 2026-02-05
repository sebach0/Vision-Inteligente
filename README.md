# Sistema de Autenticación y Gestión de Usuarios

Plantilla simplificada con **Django REST Framework (backend)** y **React + TypeScript (frontend)**.
Sistema completo de autenticación, gestión de usuarios, roles y permisos.

## 📁 Estructura

```
Vision-Integral/
├─ backend/         # Django + DRF
│  ├─ users/        # App de usuarios, roles y permisos
│  ├─ core/         # Configuración principal
│  └─ seeders/      # Datos iniciales (usuarios y roles)
├─ frontend/        # React + Vite + TS + Tailwind
│  ├─ src/
│  │  ├─ pages/admin/usuarios/  # Gestión de usuarios
│  │  ├─ pages/auth/            # Login
│  │  └─ components/            # Componentes reutilizables
├─ .env.example     # Variables de entorno
├─ docker-compose.yml
└─ README.md
```

---

## 🚀 Inicio Rápido (con Docker)

### 1) Requisitos

- Docker Desktop (o Docker Engine + Compose)
- Git

### 2) Configuración

```bash
# Clonar el repositorio
git clone <URL-DEL-REPO>
cd Vision-Integral

# Configurar variables de entorno
# Linux/Mac
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# Windows PowerShell
copy frontend\.env.example frontend\.env
copy backend\.env.example backend\.env
```

### 3) Levantar servicios

```bash
# Construir e iniciar contenedores
docker-compose up -d --build

# Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 4) Migraciones y datos iniciales

```bash
# Crear migraciones
docker-compose exec backend python manage.py makemigrations

# Aplicar migraciones
docker-compose exec backend python manage.py migrate

# Cargar datos iniciales (usuarios y roles)
docker-compose exec backend python manage.py seed
```

El sistema creará automáticamente:
- Un superusuario admin
- Roles básicos (Administrador, Usuario)
- Permisos iniciales

### 5) Acceso al sistema

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Admin Django**: http://localhost:8000/admin

---

## 🔧 Comandos Útiles

### Backend (Django)

```bash
# Shell interactivo
docker-compose exec backend python manage.py shell

# Crear superusuario manualmente
docker-compose exec backend python manage.py createsuperuser

# Ver rutas disponibles
docker-compose exec backend python manage.py show_urls
```

### Base de datos

```bash
# Acceder a PostgreSQL
docker-compose exec db psql -U postgres -d condominio

# Backup
docker-compose exec db pg_dump -U postgres condominio > backup.sql

# Restore
docker-compose exec -T db psql -U postgres condominio < backup.sql
```

### Contenedores

```bash
# Detener servicios
docker-compose stop

# Reiniciar servicios
docker-compose restart

# Eliminar todo y empezar de cero
docker-compose down -v
docker-compose up -d --build
```

---

## 📝 Características

### Backend (Django)
- ✅ Autenticación JWT
- ✅ Login con Google OAuth
- ✅ Gestión de usuarios
- ✅ Sistema de roles y permisos
- ✅ API REST completa
- ✅ Documentación automática

### Frontend (React + TypeScript)
- ✅ Login administrativo
- ✅ Dashboard
- ✅ CRUD de usuarios
- ✅ Gestión de roles y permisos
- ✅ Interfaz moderna con Tailwind CSS
- ✅ Navegación protegida por permisos

---

## 🔐 Sistema de Permisos

El sistema utiliza un modelo flexible de permisos basado en roles:

```typescript
// Ejemplo de permisos disponibles
const permisos = [
  'usuarios.ver',
  'usuarios.crear',
  'usuarios.editar',
  'usuarios.eliminar',
  'roles.ver',
  'roles.crear',
  'roles.editar',
  'roles.eliminar',
];
```

---

## 🛠️ Desarrollo sin Docker

### Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar base de datos en .env
# Ejecutar migraciones
python manage.py migrate

# Cargar datos iniciales
python manage.py seed

# Iniciar servidor
python manage.py runserver
```

### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

---

## 📚 Documentación API

Una vez levantado el backend, accede a:

- **Swagger UI**: http://localhost:8000/api/docs/
- **ReDoc**: http://localhost:8000/api/redoc/

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto es una plantilla de código abierto. Puedes usarlo libremente para tus proyectos.
