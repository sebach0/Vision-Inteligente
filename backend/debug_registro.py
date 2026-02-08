"""
Script de depuración para verificar el estado de la base de datos
y diagnosticar problemas con el registro de vehículos.
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from acceso_vehicular.models import Puerta, TipoVehiculo, Color, RegistroAcceso


def check_database():
    """Verifica el estado de los catálogos en la base de datos."""
    print("\n" + "="*60)
    print("DIAGNÓSTICO DE BASE DE DATOS")
    print("="*60 + "\n")
    
    # Verificar Puertas
    print("📍 PUERTAS:")
    puertas = Puerta.objects.all()
    if puertas.exists():
        for puerta in puertas:
            status = "✓ Activa" if puerta.activa else "✗ Inactiva"
            print(f"  ID: {puerta.id} | {puerta.nombre} | {status}")
    else:
        print("  ⚠️  NO HAY PUERTAS REGISTRADAS")
        print("  Solución: python manage.py seed")
    print()
    
    # Verificar Tipos de Vehículo
    print("🚗 TIPOS DE VEHÍCULO:")
    tipos = TipoVehiculo.objects.all()
    if tipos.exists():
        for tipo in tipos:
            status = "✓ Activo" if tipo.activo else "✗ Inactivo"
            print(f"  ID: {tipo.id} | {tipo.nombre} | {status}")
    else:
        print("  ⚠️  NO HAY TIPOS DE VEHÍCULO REGISTRADOS")
        print("  Solución: python manage.py seed")
    print()
    
    # Verificar Colores
    print("🎨 COLORES:")
    colores = Color.objects.all()
    if colores.exists():
        for color in colores:
            status = "✓ Activo" if color.activo else "✗ Inactivo"
            hex_info = f" ({color.codigo_hex})" if color.codigo_hex else ""
            print(f"  ID: {color.id} | {color.nombre}{hex_info} | {status}")
    else:
        print("  ⚠️  NO HAY COLORES REGISTRADOS")
        print("  Solución: python manage.py seed")
    print()
    
    # Verificar registros recientes
    print("📝 ÚLTIMOS REGISTROS:")
    registros = RegistroAcceso.objects.order_by('-fecha_hora')[:5]
    if registros.exists():
        for registro in registros:
            print(f"  {registro.fecha_hora.strftime('%Y-%m-%d %H:%M')} | {registro.tipo_evento} | "
                  f"{registro.placa} | Puerta: {registro.puerta.nombre}")
    else:
        print("  ℹ️  No hay registros aún")
    print()
    
    # Resumen
    print("="*60)
    print("RESUMEN:")
    issues = []
    if not puertas.exists():
        issues.append("❌ Faltan puertas")
    if not tipos.exists():
        issues.append("❌ Faltan tipos de vehículo")
    if not colores.exists():
        issues.append("❌ Faltan colores")
    
    if issues:
        print("  PROBLEMAS ENCONTRADOS:")
        for issue in issues:
            print(f"    {issue}")
        print("\n  🔧 SOLUCIÓN: Ejecuta 'python manage.py seed' para cargar los catálogos")
    else:
        print("  ✅ La base de datos está correctamente configurada")
    print("="*60 + "\n")


def test_create_registro():
    """Intenta crear un registro de prueba."""
    print("\n" + "="*60)
    print("PRUEBA DE CREACIÓN DE REGISTRO")
    print("="*60 + "\n")
    
    try:
        # Verificar que existen los catálogos necesarios
        puerta = Puerta.objects.filter(activa=True).first()
        tipo_vehiculo = TipoVehiculo.objects.filter(activo=True).first()
        color = Color.objects.filter(activo=True).first()
        
        if not puerta:
            print("❌ ERROR: No hay puertas activas")
            print("   Solución: python manage.py seed")
            return
        
        if not tipo_vehiculo:
            print("❌ ERROR: No hay tipos de vehículo activos")
            print("   Solución: python manage.py seed")
            return
        
        if not color:
            print("❌ ERROR: No hay colores activos")
            print("   Solución: python manage.py seed")
            return
        
        # Intentar crear registro
        print("Intentando crear registro de prueba...")
        registro = RegistroAcceso.objects.create(
            tipo_evento='entrada',
            puerta=puerta,
            placa='TEST123',
            tipo_vehiculo=tipo_vehiculo,
            color=color,
            observaciones='Registro de prueba desde script de depuración'
        )
        
        print(f"✅ EXITOSO: Registro creado con ID: {registro.id}")
        print(f"   Placa: {registro.placa}")
        print(f"   Tipo: {registro.tipo_evento}")
        print(f"   Puerta: {registro.puerta.nombre}")
        
        # Eliminar el registro de prueba
        registro.delete()
        print("   (Registro de prueba eliminado)")
        
    except Exception as e:
        print(f"❌ ERROR al crear registro: {str(e)}")
        import traceback
        print("\nTraceback completo:")
        traceback.print_exc()
    
    print("="*60 + "\n")


if __name__ == '__main__':
    check_database()
    
    if '--test' in sys.argv:
        test_create_registro()
    
    print("\n💡 Uso:")
    print("  python debug_registro.py          # Verificar estado de la BD")
    print("  python debug_registro.py --test   # Verificar y probar creación de registro\n")
