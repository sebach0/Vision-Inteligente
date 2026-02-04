"""
Seeder para datos de usuarios de prueba y administradores.
"""
from .base_seeder import BaseSeeder
from django.contrib.auth import get_user_model
import os

User = get_user_model()

class UserSeeder(BaseSeeder):
    """
    Crea usuarios predefinidos para el sistema, incluyendo superusuarios y administradores.
    """
    
    @classmethod
    def run(cls):
        """
        Crea usuarios si no existen, considerando:
        1. Superusuario desde variables de entorno (como en create_superuser.py)
        2. Usuario administrador con rol asignado (como en populate_initial_data.py)
        3. Usuarios de prueba para desarrollo
        """
        # Crear superusuario desde variables de entorno y asignarle rol de administrador
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")
        
        if not username or not email or not password:
            print("⚠️ No se encontraron todas las variables de entorno para crear el superusuario")
            username = "admin"
            email = "admin@transporte.com"
            password = "admin"
            print(f"⚠️ Usando valores predeterminados: {username}/{password}")
        
        # Verificar si el usuario ya existe
        user_exists = User.objects.filter(username=username).exists()
        
        # Crear el usuario si no existe
        if not user_exists:
            try:
                # Importar Rol y asegurarse de que existe el rol Administrador
                from users.models import Rol
                from .rol_seeder import RolSeeder
                
                if RolSeeder.should_run():
                    RolSeeder.seed()
                
                admin_rol = Rol.objects.get(nombre="Administrador")
                
                # Crear superusuario con rol asignado
                admin_user = User.objects.create_superuser(
                    username=username,
                    email=email,
                    password=password,
                    first_name="Administrador",
                    last_name="Sistema",
                    rol=admin_rol,
                    is_active=True,  # Usar is_active en lugar de es_activo
                )
                print(f"✓ Superusuario '{username}' creado con rol de Administrador")
                
            except (ImportError, AttributeError) as e:
                # Si no se puede asignar rol, crear superusuario básico
                User.objects.create_superuser(
                    username=username,
                    email=email,
                    password=password
                )
                print(f"✓ Superusuario '{username}' creado (sin rol asignado)")
                print(f"⚠️ Nota: No se pudo asignar rol al superusuario: {str(e)}")
        else:
            print(f"- Superusuario '{username}' ya existe")
            
            try:
                # Intentar asignar rol si el usuario existe pero no tiene rol
                from users.models import Rol
                user = User.objects.get(username=username)
                
                if not hasattr(user, 'rol') or not user.rol:
                    admin_rol = Rol.objects.get(nombre="Administrador")
                    user.rol = admin_rol
                    user.save()
                    print(f"✓ Se asignó el rol de Administrador al usuario existente '{username}'")
            except Exception as e:
                print(f"⚠️ No se pudo verificar/asignar rol al usuario existente: {str(e)}")
        
        # 3. Crear usuarios normales para pruebas
        test_users = [
            {
                'username': 'usuario1', 
                'email': 'usuario1@example.com', 
                'password': 'password123',
                'rol_nombre': 'Cliente',
                'first_name': 'Usuario',
                'last_name': 'Prueba'
            },
            {
                'username': 'usuario2', 
                'email': 'usuario2@example.com', 
                'password': 'password123',
                'rol_nombre': 'Cliente',
                'first_name': 'Cliente',
                'last_name': 'Ejemplo'
            },
            {
                'username': 'conductor1', 
                'email': 'conductor1@example.com', 
                'password': 'password123',
                'rol_nombre': 'Conductor',
                'first_name': 'Conductor',
                'last_name': 'Prueba',
            },
            {
                'username': 'supervisor1', 
                'email': 'supervisor1@example.com', 
                'password': 'password123',
                'rol_nombre': 'Supervisor',
                'first_name': 'Supervisor',
                'last_name': 'Prueba',
            },
        ]
        
        try:
            from users.models import Rol
            for user_data in test_users:
                if not User.objects.filter(username=user_data['username']).exists():
                    # Extraer el nombre del rol y eliminarlo del diccionario
                    rol_nombre = user_data.pop('rol_nombre', None)
                    rol = None
                    
                    # Buscar el rol si se especificó
                    if rol_nombre:
                        try:
                            rol = Rol.objects.get(nombre=rol_nombre)
                        except Rol.DoesNotExist:
                            print(f"⚠️ Rol '{rol_nombre}' no encontrado para usuario '{user_data['username']}'")
                    
                    # Crear el usuario
                    user = User.objects.create_user(**user_data)
                    
                    # Asignar el rol si existe
                    if rol:
                        user.rol = rol
                        user.save()
                    
                    print(f"✓ Usuario '{user_data['username']}' creado")
        except (ImportError, AttributeError) as e:
            # Versión simplificada si no existe el modelo Rol
            for user_data in test_users:
                if not User.objects.filter(username=user_data['username']).exists():
                    # Eliminar campos que podrían no existir en el modelo User
                    user_data.pop('rol_nombre', None)                    
                    User.objects.create_user(
                        username=user_data['username'],
                        email=user_data['email'],
                        password=user_data['password'],
                        first_name=user_data.get('first_name', ''),
                        last_name=user_data.get('last_name', '')
                    )
                    print(f"✓ Usuario básico '{user_data['username']}' creado")
    
    @classmethod
    def should_run(cls):
        """
        El seeder de usuarios debe ejecutarse:
        - Si no hay usuarios en la base de datos
        - Si solo existe el superusuario pero faltan los usuarios de prueba
        - Si se proporcionan variables de entorno para crear un superusuario que no existe
        """
        # Si hay variables de entorno para un superusuario que no existe
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME")
        if username and not User.objects.filter(username=username).exists():
            return True
            
        # Si no hay usuarios o solo hay pocos (probablemente solo superusuarios)
        return User.objects.count() < 3
