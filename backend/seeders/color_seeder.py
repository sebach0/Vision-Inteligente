"""
Seeder para crear los colores de vehículo iniciales.
"""

from .base_seeder import BaseSeeder


class ColorSeeder(BaseSeeder):
    """
    Crea el catálogo de colores de vehículo.
    """

    @classmethod
    def run(cls):
        from acceso_vehicular.models import Color

        colores_data = [
            {"nombre": "Negro", "codigo_hex": "#000000"},
            {"nombre": "Blanco", "codigo_hex": "#FFFFFF"},
            {"nombre": "Gris", "codigo_hex": "#808080"},
            {"nombre": "Plateado", "codigo_hex": "#C0C0C0"},
            {"nombre": "Rojo", "codigo_hex": "#FF0000"},
            {"nombre": "Azul", "codigo_hex": "#0000FF"},
            {"nombre": "Verde", "codigo_hex": "#008000"},
            {"nombre": "Amarillo", "codigo_hex": "#FFFF00"},
            {"nombre": "Café", "codigo_hex": "#8B4513"},
        ]

        for color_data in colores_data:
            color, created = Color.objects.get_or_create(
                nombre=color_data["nombre"],
                defaults=color_data
            )
            if created:
                print(f"  ✓ Color creado: {color.nombre}")
            else:
                print(f"  - Color existente: {color.nombre}")

    @classmethod
    def should_run(cls):
        """Solo ejecutar si hay menos de 9 colores."""
        from acceso_vehicular.models import Color
        return Color.objects.count() < 9
