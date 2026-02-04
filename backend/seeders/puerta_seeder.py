"""
Seeder para crear las puertas de acceso iniciales.
"""

from .base_seeder import BaseSeeder


class PuertaSeeder(BaseSeeder):
    """
    Crea las 3 puertas de acceso de la universidad.
    """

    @classmethod
    def run(cls):
        from acceso_vehicular.models import Puerta

        puertas_data = [
            {
                "nombre": "Puerta 1",
                "descripcion": "Acceso principal - Av. Busch",
                "activa": True,
            },
            {
                "nombre": "Puerta 2",
                "descripcion": "Acceso secundario - Av. Centenario",
                "activa": True,
            },
            {
                "nombre": "Puerta 3",
                "descripcion": "Acceso lateral - Calle Mercado",
                "activa": True,
            },
        ]

        for puerta_data in puertas_data:
            puerta, created = Puerta.objects.get_or_create(
                nombre=puerta_data["nombre"],
                defaults=puerta_data
            )
            if created:
                print(f"  ✓ Puerta creada: {puerta.nombre}")
            else:
                print(f"  - Puerta existente: {puerta.nombre}")

    @classmethod
    def should_run(cls):
        """Solo ejecutar si hay menos de 3 puertas."""
        from acceso_vehicular.models import Puerta
        return Puerta.objects.count() < 3
