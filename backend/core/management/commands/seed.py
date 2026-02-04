"""
Comando de gestión de Django para ejecutar los seeders.
Este comando es el método oficial para ejecutar seeders en la aplicación,
aprovechando el sistema de dependencias automáticas en BaseSeeder.

Uso:
    python manage.py seed [nombre_seeder1 nombre_seeder2 ...]
    
    - Sin argumentos: ejecuta todos los seeders disponibles en orden
    - Con argumentos: ejecuta solo los seeders especificados (y sus dependencias)
    - Con --force: ejecuta los seeders incluso si should_run() devuelve False
"""
import importlib
import inspect
import os
import pkgutil
from django.core.management.base import BaseCommand

from seeders.base_seeder import BaseSeeder


class Command(BaseCommand):
    help = 'Ejecuta los seeders para cargar datos iniciales'

    def add_arguments(self, parser):
        parser.add_argument(
            'seeders', 
            nargs='*', 
            help='Nombres de los seeders a ejecutar (sin el sufijo "_seeder"). Si no se especifica, se ejecutan todos.'
        )
        parser.add_argument(
            '--force', 
            action='store_true', 
            help='Ejecuta los seeders incluso si no deberían ejecutarse según su método should_run()'
        )

    def handle(self, *args, **options):
        seeders_to_run = options['seeders']
        force_run = options['force']
        
        # Importa dinámicamente todos los seeders del paquete
        seeders_module = importlib.import_module('seeders')
        seeders_path = os.path.dirname(seeders_module.__file__)
        
        all_seeders = []
        
        # Recorre todos los módulos del paquete seeders
        for _, module_name, is_pkg in pkgutil.iter_modules([seeders_path]):
            if is_pkg or module_name == 'base_seeder':
                continue
            
            # Importa el módulo
            module = importlib.import_module(f'seeders.{module_name}')
            
            # Busca todas las clases que heredan de BaseSeeder
            for name, obj in inspect.getmembers(module, inspect.isclass):
                if issubclass(obj, BaseSeeder) and obj != BaseSeeder:
                    all_seeders.append((name, obj))
        
        if not all_seeders:
            self.stdout.write(self.style.WARNING('No se encontraron seeders'))
            return
        
        # Filtra los seeders según los argumentos proporcionados
        if seeders_to_run:
            filtered_seeders = []
            for name, seeder_class in all_seeders:
                # Compara con el nombre del seeder sin el sufijo _seeder (insensible a mayúsculas/minúsculas)
                base_name = name.lower().replace('seeder', '').strip('_')
                for seeder_arg in seeders_to_run:
                    if seeder_arg.lower() == base_name:
                        filtered_seeders.append((name, seeder_class))
                        break
            
            if not filtered_seeders:
                self.stdout.write(self.style.ERROR(
                    f'No se encontraron seeders con los nombres: {", ".join(seeders_to_run)}'
                ))
                return
            
            seeders_to_execute = filtered_seeders
        else:
            seeders_to_execute = all_seeders
        
        # Ejecuta los seeders aprovechando el sistema de dependencias automáticas
        for name, seeder_class in seeders_to_execute:
            if force_run or seeder_class.should_run():
                self.stdout.write(self.style.HTTP_INFO(f'Ejecutando {name}...'))
                if seeder_class.seed():  # Este método ejecuta automáticamente las dependencias primero
                    self.stdout.write(self.style.SUCCESS(f'✅ {name} completado exitosamente'))
                else:
                    self.stdout.write(self.style.ERROR(f'❌ Error al ejecutar {name}'))
            else:
                self.stdout.write(self.style.WARNING(
                    f'➡️ {name} no necesita ejecutarse (should_run() devolvió False)'
                ))
