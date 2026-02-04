from django.contrib.auth.models import AbstractUser
from django.db import models


class Rol(models.Model):
    """Roles del sistema: cliente, administrador, conductor, etc."""

    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True)
    es_administrativo = models.BooleanField(default=False)
    permisos = models.JSONField(
        default=list, blank=True
    )  # Lista de permisos específicos
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Rol"
        verbose_name_plural = "Roles"

    def __str__(self):
        return self.nombre
        
    def tiene_permiso(self, permiso):
        """Verifica si el rol tiene un permiso específico"""
        return permiso in self.permisos
    
    def agregar_permiso(self, permiso):
        """Agrega un permiso al rol si no existe"""
        if permiso not in self.permisos:
            self.permisos.append(permiso)
            self.save()
            return True
        return False
    
    def quitar_permiso(self, permiso):
        """Quita un permiso del rol si existe"""
        if permiso in self.permisos:
            self.permisos.remove(permiso)
            self.save()
            return True
        return False
        
    def asignar_permisos(self, lista_permisos):
        """Asigna una lista completa de permisos, reemplazando los existentes"""
        self.permisos = lista_permisos
        self.save()
        return self


class CustomUser(AbstractUser):
    # Campos básicos
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.CharField(max_length=255, blank=True, null=True)
    ci = models.CharField(max_length=20, unique=True, null=True, blank=True, verbose_name="Cédula de Identidad")
    fecha_nacimiento = models.DateField(null=True, blank=True, verbose_name="Fecha de Nacimiento")
    
    # Rol y permisos
    rol = models.ForeignKey(Rol, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Estado y control
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_ultimo_acceso = models.DateTimeField(null=True, blank=True)
    
    # Relaciones opcionales con personal y residentes
    # TODO: Descomentar cuando existan las apps 'personal' y 'residentes'
    # personal = models.OneToOneField('personal.Personal', on_delete=models.SET_NULL, null=True, blank=True, related_name='usuario_personal')
    # residente = models.OneToOneField('residentes.Residente', on_delete=models.SET_NULL, null=True, blank=True, related_name='usuario_residente')

    def __str__(self):
        return f"{self.username} ({self.rol.nombre if self.rol else 'Sin rol'})"

    @property
    def es_administrativo(self):
        return self.rol and self.rol.es_administrativo

    @property
    def es_cliente(self):
        return self.rol and not self.rol.es_administrativo
    
    @property
    def puede_acceder_admin(self):
        """Verifica si el usuario puede acceder al panel administrativo"""
        return self.is_staff and self.es_administrativo
        
    def tiene_permiso(self, permiso):
        """Verifica si el usuario tiene un permiso específico"""
        # Superusuarios tienen todos los permisos
        if self.is_superuser:
            return True
        # Verificar permisos del rol
        return self.rol and self.rol.tiene_permiso(permiso)
    
    def tiene_permisos(self, lista_permisos):
        """Verifica si el usuario tiene todos los permisos de la lista"""
        # Superusuarios tienen todos los permisos
        if self.is_superuser:
            return True
        # Sin rol no tiene permisos
        if not self.rol:
            return False
        # Verificar que tenga todos los permisos de la lista
        return all(permiso in self.rol.permisos for permiso in lista_permisos)
    
    def asignar_rol(self, rol):
        """Asigna un rol al usuario"""
        self.rol = rol
        self.save(update_fields=['rol'])
        return self
    
    def get_permisos(self):
        """Obtiene todos los permisos del usuario"""
        if self.is_superuser:
            # Podría retornar todos los permisos posibles
            return ["*"]  # Asterisco indica todos los permisos
        if not self.rol:
            return []
        return self.rol.permisos
