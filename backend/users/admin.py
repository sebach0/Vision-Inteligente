from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django import forms
from .models import CustomUser, Rol
from .constants import PERMISOS_SISTEMA, GRUPOS_PERMISOS


class RolAdminForm(forms.ModelForm):
    """Formulario personalizado para la administración de roles"""
    
    permisos_seleccionados = forms.MultipleChoiceField(
        choices=PERMISOS_SISTEMA,
        widget=forms.CheckboxSelectMultiple,
        required=False,
        label="Permisos"
    )
    
    grupo_permisos = forms.ChoiceField(
        choices=[('', '-- Seleccionar grupo de permisos --')] + 
                [(k, k.capitalize()) for k in GRUPOS_PERMISOS.keys()],
        required=False,
        label="Cargar grupo de permisos predefinido",
        help_text="Seleccionar un grupo cargará sus permisos predefinidos"
    )
    
    class Meta:
        model = Rol
        fields = ['nombre', 'descripcion', 'es_administrativo']
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            # Si estamos editando un rol existente, seleccionamos sus permisos
            self.fields['permisos_seleccionados'].initial = self.instance.permisos
    
    def save(self, commit=True):
        instance = super().save(commit=False)
        
        # Guardar los permisos seleccionados
        permisos = self.cleaned_data.get('permisos_seleccionados', [])
        instance.permisos = permisos
        
        if commit:
            instance.save()
        return instance


@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    form = RolAdminForm
    list_display = ["nombre", "es_administrativo", "descripcion", "permisos_count", "fecha_creacion"]
    list_filter = ["es_administrativo"]
    search_fields = ["nombre", "descripcion"]
    readonly_fields = ["fecha_creacion", "fecha_actualizacion"]
    fieldsets = [
        (None, {"fields": ["nombre", "descripcion", "es_administrativo"]}),
        ("Permisos", {"fields": ["grupo_permisos", "permisos_seleccionados"]}),
        ("Información adicional", {"fields": ["fecha_creacion", "fecha_actualizacion"], "classes": ["collapse"]}),
    ]
    
    def permisos_count(self, obj):
        """Muestra el número de permisos asignados"""
        return len(obj.permisos)
    permisos_count.short_description = "Nº Permisos"
    
    def save_model(self, request, obj, form, change):
        # Si se seleccionó un grupo de permisos, cargar esos permisos
        grupo = form.cleaned_data.get('grupo_permisos')
        if grupo and grupo in GRUPOS_PERMISOS:
            # Combinamos los permisos seleccionados manualmente con los del grupo
            permisos_grupo = GRUPOS_PERMISOS[grupo]
            permisos_seleccionados = form.cleaned_data.get('permisos_seleccionados', [])
            # Unión de ambos conjuntos de permisos (sin duplicados)
            obj.permisos = list(set(permisos_grupo + permisos_seleccionados))
        
        super().save_model(request, obj, form, change)


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    list_display = [
        "username",
        "email",
        "first_name",
        "last_name",
        "rol",
        "fecha_creacion",
    ]
    list_filter = ["rol", "is_active", "is_staff", "is_superuser", "fecha_creacion"]
    search_fields = ["username", "email", "first_name", "last_name", "codigo_empleado"]
    ordering = ["-fecha_creacion"]

    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "Información Personal",
            {"fields": ("telefono", "direccion", "fecha_nacimiento")},
        ),
        (
            "Información Laboral",
            {"fields": ("rol", "codigo_empleado", "departamento")},
        ),
        (
            "Fechas",
            {
                "fields": ("fecha_creacion", "fecha_ultimo_acceso"),
                "classes": ("collapse",),
            },
        ),
    )

    readonly_fields = ["fecha_creacion", "fecha_ultimo_acceso"]
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Si no es superusuario, no mostrar superusuarios en la lista
        if not request.user.is_superuser:
            qs = qs.filter(is_superuser=False)
        return qs
