from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date, timedelta
from rest_framework.test import APITestCase
from rest_framework import status
from .models import CustomUser, Rol
from personal.models import Personal
from conductores.models import Conductor

User = get_user_model()


class RolModelTest(TestCase):
    """Tests para el modelo Rol"""

    def setUp(self):
        """Configuración inicial para los tests"""
        self.rol = Rol.objects.create(
            nombre="Operador",
            descripcion="Operador del sistema",
            es_administrativo=True,
            permisos=["gestionar_usuarios", "ver_reportes"],
        )

    def test_rol_creation(self):
        """Test de creación de rol"""
        self.assertEqual(self.rol.nombre, "Operador")
        self.assertEqual(self.rol.descripcion, "Operador del sistema")
        self.assertTrue(self.rol.es_administrativo)
        self.assertEqual(self.rol.permisos, ["gestionar_usuarios", "ver_reportes"])

    def test_rol_str_representation(self):
        """Test de representación string del rol"""
        self.assertEqual(str(self.rol), "Operador")

    def test_tiene_permiso(self):
        """Test del método tiene_permiso"""
        self.assertTrue(self.rol.tiene_permiso("gestionar_usuarios"))
        self.assertFalse(self.rol.tiene_permiso("eliminar_usuarios"))

    def test_agregar_permiso(self):
        """Test del método agregar_permiso"""
        self.rol.agregar_permiso("eliminar_usuarios")
        self.assertTrue(self.rol.tiene_permiso("eliminar_usuarios"))

        # No debe duplicar permisos
        initial_count = len(self.rol.permisos)
        self.rol.agregar_permiso("eliminar_usuarios")
        self.assertEqual(len(self.rol.permisos), initial_count)

    def test_quitar_permiso(self):
        """Test del método quitar_permiso"""
        self.rol.quitar_permiso("gestionar_usuarios")
        self.assertFalse(self.rol.tiene_permiso("gestionar_usuarios"))

        # No debe fallar si el permiso no existe
        initial_count = len(self.rol.permisos)
        self.rol.quitar_permiso("permiso_inexistente")
        self.assertEqual(len(self.rol.permisos), initial_count)

    def test_asignar_permisos(self):
        """Test del método asignar_permisos"""
        nuevos_permisos = ["crear_usuarios", "editar_usuarios", "ver_usuarios"]
        self.rol.asignar_permisos(nuevos_permisos)
        self.assertEqual(self.rol.permisos, nuevos_permisos)


class CustomUserModelTest(TestCase):
    """Tests para el modelo CustomUser"""

    def setUp(self):
        """Configuración inicial para los tests"""
        self.rol = Rol.objects.create(
            nombre="Administrador",
            descripcion="Administrador del sistema",
            es_administrativo=True,
            permisos=["gestionar_usuarios", "gestionar_roles"],
        )

        self.user = CustomUser.objects.create_user(
            username="admin",
            email="admin@test.com",
            password="testpass123",
            first_name="Admin",
            last_name="User",
            ci="12345678",
            fecha_nacimiento="1990-01-01",
            rol=self.rol,
            is_staff=True
        )

    def test_user_creation(self):
        """Test de creación de usuario"""
        self.assertEqual(self.user.username, "admin")
        self.assertEqual(self.user.email, "admin@test.com")
        self.assertEqual(self.user.first_name, "Admin")
        self.assertEqual(self.user.last_name, "User")
        self.assertEqual(self.user.ci, "12345678")
        self.assertEqual(self.user.rol, self.rol)
        self.assertTrue(self.user.is_staff)
    def test_user_str_representation(self):
        """Test de representación string del usuario"""
        expected = "admin (Administrador)"
        self.assertEqual(str(self.user), expected)

    def test_es_administrativo(self):
        """Test del property es_administrativo"""
        self.assertTrue(self.user.es_administrativo)

        # Usuario sin rol
        user_sin_rol = CustomUser.objects.create_user(
            username="usuario_sin_rol", email="sinrol@test.com", password="testpass123"
        )
        self.assertFalse(user_sin_rol.es_administrativo)

    def test_es_cliente(self):
        """Test del property es_cliente"""
        rol_cliente = Rol.objects.create(
            nombre="Cliente", descripcion="Cliente del sistema", es_administrativo=False
        )

        user_cliente = CustomUser.objects.create_user(
            username="cliente",
            email="cliente@test.com",
            password="testpass123",
            rol=rol_cliente,
        )

        self.assertTrue(user_cliente.es_cliente)
        self.assertFalse(self.user.es_cliente)

    def test_puede_acceder_admin(self):
        """Test del property puede_acceder_admin"""
        self.assertTrue(self.user.puede_acceder_admin)

        # Usuario sin acceso admin
        user_no_admin = CustomUser.objects.create_user(
            username="no_admin",
            email="noadmin@test.com",
            password="testpass123",
            rol=self.rol,
            is_staff=False
        )
        self.assertFalse(user_no_admin.puede_acceder_admin)

    def test_tiene_permiso(self):
        """Test del método tiene_permiso"""
        # Superusuario tiene todos los permisos
        superuser = CustomUser.objects.create_superuser(
            username="superuser", email="super@test.com", password="testpass123"
        )
        self.assertTrue(superuser.tiene_permiso("cualquier_permiso"))

        # Usuario con rol tiene permisos del rol
        self.assertTrue(self.user.tiene_permiso("gestionar_usuarios"))
        self.assertFalse(self.user.tiene_permiso("eliminar_sistema"))

        # Usuario sin rol no tiene permisos
        user_sin_rol = CustomUser.objects.create_user(
            username="sin_permisos",
            email="sinpermisos@test.com",
            password="testpass123",
        )
        self.assertFalse(user_sin_rol.tiene_permiso("cualquier_permiso"))
    def test_tiene_permisos(self):
        """Test del método tiene_permisos"""
        permisos_requeridos = ["gestionar_usuarios", "gestionar_roles"]
        self.assertTrue(self.user.tiene_permisos(permisos_requeridos))

        permisos_faltantes = ["gestionar_usuarios", "eliminar_sistema"]
        self.assertFalse(self.user.tiene_permisos(permisos_faltantes))

    def test_asignar_rol(self):
        """Test del método asignar_rol"""
        nuevo_rol = Rol.objects.create(
            nombre="Supervisor",
            descripcion="Supervisor del sistema",
            es_administrativo=True,
        )

        self.user.asignar_rol(nuevo_rol)
        self.assertEqual(self.user.rol, nuevo_rol)

    def test_get_permisos(self):
        """Test del método get_permisos"""
        # Superusuario
        superuser = CustomUser.objects.create_superuser(
            username="superuser2", email="super2@test.com", password="testpass123"
        )
        self.assertEqual(superuser.get_permisos(), ["*"])

        # Usuario con rol
        permisos_usuario = self.user.get_permisos()
        self.assertEqual(permisos_usuario, ["gestionar_usuarios", "gestionar_roles"])

        # Usuario sin rol
        user_sin_rol = CustomUser.objects.create_user(
            username="sin_permisos2",
            email="sinpermisos2@test.com",
            password="testpass123",
        )
        self.assertEqual(user_sin_rol.get_permisos(), [])


class CustomUserWithPersonalTest(TestCase):
    """Tests para usuarios vinculados a personal"""

    def setUp(self):
        """Configuración inicial"""
        self.personal = Personal.objects.create(
            nombre="Juan",
            apellido="Pérez",
            ci="12345678",
            email="juan@test.com",
            telefono="123456789",
            fecha_nacimiento="1990-01-01",
            codigo_empleado="EMP001",
            fecha_ingreso=date.today()
        )

        self.rol = Rol.objects.create(
            nombre="Operador",
            descripcion="Operador del sistema",
            es_administrativo=True,
        )

        self.user = CustomUser.objects.create_user(
            username="jperez",
            email="jperez@empresa.com",
            password="testpass123",
            first_name="Juan",
            last_name="Pérez",
            rol=self.rol,
            personal=self.personal,
            is_staff=True
        )

    def test_user_vinculado_personal(self):
        """Test de usuario vinculado a personal"""
        self.assertEqual(self.user.personal, self.personal)
        self.assertEqual(self.user.first_name, "Juan")
        self.assertEqual(self.user.last_name, "Pérez")


class CustomUserWithConductorTest(TestCase):
    """Tests para usuarios vinculados a conductores"""

    def setUp(self):
        """Configuración inicial"""
        self.personal = Personal.objects.create(
            nombre="Pedro",
            apellido="García",
            ci="87654321",
            email="pedro@test.com",
            telefono="987654321",
            fecha_nacimiento="1985-05-15",
            codigo_empleado="EMP002",
            fecha_ingreso=date.today()
        )

        self.conductor = Conductor.objects.create(
            nombre="Pedro",
            apellido="García",
            ci="87654321",
            email="pedro@test.com",
            telefono="987654321",
            fecha_nacimiento="1985-05-15",
            nro_licencia="LIC002",
            tipo_licencia="D",
            fecha_venc_licencia=date.today() + timedelta(days=365),
            experiencia_anios=8,
        )

        self.rol = Rol.objects.create(
            nombre="Conductor",
            descripcion="Conductor de vehículos",
            es_administrativo=False,
        )

        self.user = CustomUser.objects.create_user(
            username="pgarcia",
            email="pgarcia@empresa.com",
            password="testpass123",
            first_name="Pedro",
            last_name="García",
            rol=self.rol,
            conductor=self.conductor,
            is_staff=False
        )

    def test_user_vinculado_conductor(self):
        """Test de usuario vinculado a conductor"""
        self.assertEqual(self.user.conductor, self.conductor)
        self.assertEqual(self.user.first_name, "Pedro")
        self.assertEqual(self.user.last_name, "García")


class PermissionTestCase(APITestCase):
    """Tests para el sistema de permisos"""

    def setUp(self):
        # Crear roles
        self.admin_rol = Rol.objects.create(
            nombre="Admin",
            es_administrativo=True,
            permisos=["gestionar_usuarios", "gestionar_roles"],
        )

        self.user_rol = Rol.objects.create(
            nombre="Usuario", es_administrativo=False, permisos=["ver_perfil"]
        )

        # Crear usuarios
        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@test.com",
            password="testpass123",
            rol=self.admin_rol,
            is_admin_portal=True,
        )

        self.regular_user = User.objects.create_user(
            username="user",
            email="user@test.com",
            password="testpass123",
            rol=self.user_rol,
        )

    def test_user_without_permission_gets_403(self):
        """Usuario sin permiso recibe 403"""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get("/api/admin/users/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_with_permission_gets_200(self):
        """Usuario con permiso accede correctamente"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/admin/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_permission_guard_works(self):
        """El guard de permisos funciona correctamente"""
        # Usuario sin permiso
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get("/api/admin/roles/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Usuario con permiso
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/admin/roles/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_middleware_permission_check(self):
        """El middleware verifica permisos automáticamente"""
        # Usuario sin permiso para conductores
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get("/api/conductores/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Usuario con permiso para conductores
        self.admin_user.rol.permisos.append("ver_conductores")
        self.admin_user.rol.save()
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/conductores/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthorized_access_returns_401(self):
        """Acceso no autenticado retorna 401"""
        response = self.client.get("/api/admin/users/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
