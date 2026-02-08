"""
Script rápido para solucionar el error 500 en registro de vehículos.
Ejecuta: python quick_fix.py
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.management import call_command


def main():
    print("\n" + "="*60)
    print("🔧 FIX RÁPIDO - Error 500 en Registro de Vehículos")
    print("="*60 + "\n")
    
    print("Este script ejecutará:")
    print("  1. Verificar migraciones")
    print("  2. Aplicar migraciones pendientes")
    print("  3. Cargar catálogos iniciales (seeders)")
    print("  4. Verificar la base de datos")
    print()
    
    input("Presiona ENTER para continuar...")
    print()
    
    try:
        # Paso 1: Verificar y aplicar migraciones
        print("\n📋 Paso 1: Aplicando migraciones...")
        print("-" * 60)
        call_command('migrate', '--no-input')
        print("✅ Migraciones aplicadas")
        
        # Paso 2: Ejecutar seeders
        print("\n🌱 Paso 2: Cargando catálogos iniciales...")
        print("-" * 60)
        call_command('seed')
        print("✅ Seeders ejecutados")
        
        # Paso 3: Verificar
        print("\n🔍 Paso 3: Verificando base de datos...")
        print("-" * 60)
        
        from acceso_vehicular.models import Puerta, TipoVehiculo, Color
        
        puertas_count = Puerta.objects.filter(activa=True).count()
        tipos_count = TipoVehiculo.objects.filter(activo=True).count()
        colores_count = Color.objects.filter(activo=True).count()
        
        print(f"📍 Puertas activas: {puertas_count}")
        print(f"🚗 Tipos de vehículo activos: {tipos_count}")
        print(f"🎨 Colores activos: {colores_count}")
        
        if puertas_count > 0 and tipos_count > 0 and colores_count > 0:
            print("\n" + "="*60)
            print("✅ ¡TODO LISTO!")
            print("="*60)
            print("\nLa base de datos está correctamente configurada.")
            print("Ahora puedes intentar registrar un vehículo desde el frontend.")
            print("\nPróximos pasos:")
            print("  1. Asegúrate de que el servidor Django esté corriendo")
            print("     (python manage.py runserver)")
            print("  2. Intenta registrar un vehículo desde el frontend")
            print("  3. Si aún hay errores, revisa los logs del servidor")
        else:
            print("\n" + "="*60)
            print("⚠️  ADVERTENCIA")
            print("="*60)
            print("\nAlgunos catálogos están vacíos.")
            print("Posibles problemas:")
            print("  - Los seeders no se ejecutaron correctamente")
            print("  - Hay un error en los archivos de seeders")
            print("\nPara más detalles, ejecuta:")
            print("  python debug_registro.py")
            
    except Exception as e:
        print("\n" + "="*60)
        print("❌ ERROR")
        print("="*60)
        print(f"\nOcurrió un error: {str(e)}")
        print("\nPara más información, ejecuta:")
        print("  python debug_registro.py")
        import traceback
        print("\nTraceback completo:")
        traceback.print_exc()
        return 1
    
    print("="*60 + "\n")
    return 0


if __name__ == '__main__':
    sys.exit(main())
