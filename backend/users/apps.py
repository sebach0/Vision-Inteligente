from django.apps import AppConfig
from django.utils import timezone


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'
    
    def ready(self):
        """Configurar señales para seguimiento de login/logout"""
        from django.contrib.auth.signals import user_logged_in, user_logged_out
        from django.dispatch import receiver
        
        @receiver(user_logged_in)
        def update_last_login(sender, request, user, **kwargs):
            """Actualizar fecha_ultimo_acceso cuando un usuario inicia sesión"""
            user.fecha_ultimo_acceso = timezone.now()
            user.save(update_fields=["fecha_ultimo_acceso"])
        
        @receiver(user_logged_out)
        def update_last_logout(sender, request, user, **kwargs):
            """Actualizar fecha_ultimo_acceso cuando un usuario cierra sesión"""
            if user:  # A veces user puede ser None en logout
                user.fecha_ultimo_acceso = timezone.now()
                user.save(update_fields=["fecha_ultimo_acceso"])