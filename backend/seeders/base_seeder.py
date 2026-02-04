"""
Módulo base para seeders que proporciona funcionalidad común.
"""
from django.db import transaction
from django.apps import apps
import importlib
import sys
import inspect


class BaseSeeder:
    """
    Clase base para todos los seeders que proporciona funcionalidades comunes.
    Incluye soporte para orden de ejecución y dependencias entre seeders.
    """
    # Orden predefinido de ejecución de seeders (puede ser sobrescrito por las dependencias)
    SEEDER_ORDER = [
        'RolSeeder',
        'UserSeeder',
        'PersonalSeeder',
        'UnidadSeeder',
        'ResidenteSeeder',
        'AreaComunSeeder',
        'InventarioSeeder',
    ]
    
    # Mapa de dependencias entre seeders
    DEPENDENCIES = {
        'UserSeeder': ['RolSeeder'],
        'PersonalSeeder': ['UserSeeder'],
        'ResidenteSeeder': ['UnidadSeeder'],
        'InventarioSeeder': ['AreaComunSeeder'],
    }
    
    @classmethod
    def run(cls):
        """
        Método principal para ejecutar el seeder.
        Implementa la lógica específica en las clases hijas.
        """
        raise NotImplementedError("Cada seeder debe implementar su método run()")
    
    @classmethod
    @transaction.atomic
    def seed(cls):
        """
        Ejecuta el seeder dentro de una transacción atómica para garantizar
        la integridad de los datos.
        
        Primero ejecuta todas las dependencias y luego ejecuta este seeder.
        """
        # Ejecutar dependencias primero
        if not cls.run_dependencies():
            print(f"❌ No se pudo ejecutar {cls.__name__} debido a errores en las dependencias")
            return False
            
        try:
            cls.run()
            print(f"✅ {cls.__name__} ejecutado correctamente")
            return True
        except Exception as e:
            print(f"❌ Error al ejecutar {cls.__name__}: {str(e)}")
            return False
    
    @classmethod
    def should_run(cls):
        """
        Determina si el seeder debe ejecutarse.
        Por defecto, siempre se ejecuta, pero las clases hijas pueden 
        sobrescribir este método para implementar condiciones específicas.
        """
        return True
        
    @classmethod
    def get_seeder_dependencies(cls):
        """
        Retorna las clases de seeders de las que depende este seeder.
        """
        dependencies = []
        class_name = cls.__name__
        
        if class_name in cls.DEPENDENCIES:
            for dep_name in cls.DEPENDENCIES[class_name]:
                try:
                    # Primero intentamos importar desde el módulo seeders
                    module = importlib.import_module('seeders.' + dep_name.lower())
                    seeder_class = getattr(module, dep_name)
                    dependencies.append(seeder_class)
                except (ImportError, AttributeError):
                    # Si falla, buscamos en todos los módulos del paquete seeders
                    for name, obj in inspect.getmembers(sys.modules['seeders']):
                        if inspect.isclass(obj) and name == dep_name:
                            dependencies.append(obj)
                            break
        
        return dependencies
    
    @classmethod
    def run_dependencies(cls):
        """
        Ejecuta todos los seeders de los que depende este seeder.
        """
        success = True
        for dependency in cls.get_seeder_dependencies():
            if dependency.should_run():
                print(f">> Ejecutando dependencia {dependency.__name__}...")
                if not dependency.seed():
                    print(f">> ❌ Falló la dependencia {dependency.__name__}")
                    success = False
            else:
                print(f">> ➡️ Dependencia {dependency.__name__} no necesita ejecutarse")
        
        return success
    
    @classmethod
    def run_all_seeders(cls):
        """
        Ejecuta todos los seeders en el orden definido.
        """
        print("=" * 60)
        print("EJECUTANDO TODOS LOS SEEDERS")
        print("=" * 60)
        
        # Buscar todas las clases de seeder en el módulo seeders
        seeders = {}
        for name, obj in inspect.getmembers(sys.modules['seeders']):
            if inspect.isclass(obj) and issubclass(obj, BaseSeeder) and obj != BaseSeeder:
                seeders[name] = obj
        
        # Ejecutar los seeders en el orden definido
        for seeder_name in cls.SEEDER_ORDER:
            if seeder_name in seeders:
                seeder_class = seeders[seeder_name]
                print(f"\n>> Verificando {seeder_class.__name__}...")
                
                if seeder_class.should_run():
                    print(f">> Ejecutando {seeder_class.__name__}...")
                    success = seeder_class.seed()
                    
                    if success:
                        print(f">> ✅ {seeder_class.__name__} completado exitosamente")
                    else:
                        print(f">> ❌ {seeder_class.__name__} falló")
                else:
                    print(f">> ➡️ {seeder_class.__name__} no necesita ejecutarse")
        
        print("\n" + "=" * 60)
        print("PROCESO DE SEEDERS COMPLETADO")
        print("=" * 60)
