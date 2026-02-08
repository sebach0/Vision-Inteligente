"""
Seeder para crear los tipos de vehículo iniciales.
"""

from .base_seeder import BaseSeeder


class TipoVehiculoSeeder(BaseSeeder):
    """
    Crea el catálogo de tipos de vehículo.
    """

    @classmethod
    def run(cls):
        from acceso_vehicular.models import TipoVehiculo

        tipos_data = [
            {"nombre": "Automóvil", "descripcion": "Vehículo particular de pasajeros", "icono": "car"},
            {"nombre": "Motocicleta", "descripcion": "Vehículo de dos ruedas motorizado", "icono": "bike"},
            {"nombre": "Camión", "descripcion": "Vehículo de carga", "icono": "truck"},
        ]

        for tipo_data in tipos_data:
            tipo, created = TipoVehiculo.objects.get_or_create(
                nombre=tipo_data["nombre"],
                defaults=tipo_data
            )
            if created:
                print(f"  ✓ Tipo de vehículo creado: {tipo.nombre}")
            else:
                print(f"  - Tipo existente: {tipo.nombre}")

    @classmethod
    def should_run(cls):
        """Solo ejecutar si hay menos de 3 tipos."""
        from acceso_vehicular.models import TipoVehiculo
        return TipoVehiculo.objects.count() < 3
