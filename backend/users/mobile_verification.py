"""
Módulo para manejo de verificación móvil con códigos
"""

import random
import string
from datetime import datetime, timedelta
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.core.cache import cache
from django.template.loader import render_to_string

User = get_user_model()


def send_verification_code_direct(user_email, username):
    """Envía código de verificación directamente sin usar allauth"""
    from datetime import datetime, timedelta

    # Claves de cache
    cache_key = f"mobile_verification_{user_email}"
    rate_limit_key = f"mobile_verification_rate_{user_email}"

    # Verificar rate limiting (mínimo 60 segundos entre envíos)
    existing_rate = cache.get(rate_limit_key)
    if existing_rate:
        last_sent = datetime.fromisoformat(existing_rate)
        time_diff = timezone.now() - last_sent
        if time_diff.total_seconds() < 60:  # 60 segundos de espera
            remaining_time = 60 - int(time_diff.total_seconds())
            raise Exception(
                f"Debes esperar {remaining_time} segundos antes de solicitar otro código"
            )

    # Verificar si ya existe un código válido (no enviar si hay uno reciente)
    existing_code = cache.get(cache_key)
    if existing_code:
        created_at = datetime.fromisoformat(existing_code["created_at"])
        time_diff = timezone.now() - created_at
        if time_diff.total_seconds() < 300:  # 5 minutos de validez mínima
            remaining_time = 300 - int(time_diff.total_seconds())
            raise Exception(
                f"Ya tienes un código válido. Espera {remaining_time} segundos antes de solicitar uno nuevo"
            )

    # Generar nuevo código
    code = MobileVerificationService.generate_verification_code()

    # Guardar en cache con expiración de 15 minutos
    cache.set(
        cache_key,
        {"code": code, "username": username, "created_at": timezone.now().isoformat()},
        timeout=900,  # 15 minutos
    )

    # Guardar timestamp del envío para rate limiting
    cache.set(rate_limit_key, timezone.now().isoformat(), timeout=300)  # 5 minutos

    # Renderizar template de email
    context = {
        "username": username,
        "verification_code": code,
        "site_name": "MoviFleet",
    }

    html_message = render_to_string("account/email/mobile_verification.html", context)
    text_message = render_to_string("account/email/mobile_verification.txt", context)

    # Enviar email usando el backend de email existente
    from django.core.mail import EmailMultiAlternatives

    email = EmailMultiAlternatives(
        subject="Código de verificación - MoviFleet",
        body=text_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user_email],
    )
    email.attach_alternative(html_message, "text/html")
    email.send(fail_silently=False)

    return code


class MobileVerificationService:
    """Servicio para manejo de verificación móvil"""

    @staticmethod
    def generate_verification_code():
        """Genera un código de verificación de 6 dígitos"""
        return "".join(random.choices(string.digits, k=6))

    @staticmethod
    def send_verification_code(user_email, username):
        """Envía código de verificación por email"""
        # Generar código
        code = MobileVerificationService.generate_verification_code()

        # Guardar en cache con expiración de 15 minutos
        cache_key = f"mobile_verification_{user_email}"
        cache.set(
            cache_key,
            {
                "code": code,
                "username": username,
                "created_at": timezone.now().isoformat(),
            },
            timeout=900,
        )  # 15 minutos

        # Renderizar template de email
        context = {
            "username": username,
            "verification_code": code,
            "site_name": "MoviFleet",
        }

        html_message = render_to_string(
            "account/email/mobile_verification.html", context
        )
        text_message = render_to_string(
            "account/email/mobile_verification.txt", context
        )

        # Enviar email
        send_mail(
            subject="Código de verificación - MoviFleet",
            message=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user_email],
            html_message=html_message,
            fail_silently=False,
        )

        return code

    @staticmethod
    def verify_code(user_email, code):
        """Verifica el código enviado"""
        cache_key = f"mobile_verification_{user_email}"
        cached_data = cache.get(cache_key)

        if not cached_data:
            return False, "Código expirado o no válido"

        if cached_data["code"] != code:
            return False, "Código incorrecto"

        # Código válido, verificar email del usuario
        try:
            user = User.objects.get(email=user_email)
            if user.is_active:
                return True, "Email ya verificado"

            # Marcar email como verificado
            user.is_active = True
            user.save()

            # Limpiar cache
            cache.delete(cache_key)

            return True, "Email verificado exitosamente"

        except User.DoesNotExist:
            return False, "Usuario no encontrado"

    @staticmethod
    def resend_code(user_email):
        """Reenvía código de verificación"""
        try:
            user = User.objects.get(email=user_email)
            if user.is_active:
                return False, "Email ya verificado"

            MobileVerificationService.send_verification_code(user_email, user.username)
            return True, "Código reenviado exitosamente"

        except User.DoesNotExist:
            return False, "Usuario no encontrado"


@api_view(["POST"])
@permission_classes([AllowAny])
def send_mobile_verification_code(request):
    """
    Endpoint para enviar código de verificación móvil
    """
    email = request.data.get("email")

    if not email:
        return Response(
            {"error": "Email es requerido"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(email=email)
        if user.is_active:
            return Response(
                {"error": "Email ya verificado"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Enviar código con rate limiting
        try:
            send_verification_code_direct(email, user.username)
            return Response(
                {
                    "message": "Código de verificación enviado exitosamente",
                    "email": email,
                }
            )
        except Exception as rate_error:
            return Response(
                {"error": str(rate_error)}, status=status.HTTP_429_TOO_MANY_REQUESTS
            )

    except User.DoesNotExist:
        return Response(
            {"error": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": f"Error al enviar código: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_mobile_code(request):
    """
    Endpoint para verificar código móvil
    """
    email = request.data.get("email")
    code = request.data.get("code")

    if not email or not code:
        return Response(
            {"error": "Email y código son requeridos"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    success, message = MobileVerificationService.verify_code(email, code)

    if success:
        return Response({"message": message, "verified": True})
    else:
        return Response(
            {"error": message, "verified": False}, status=status.HTTP_400_BAD_REQUEST
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def resend_mobile_verification_code(request):
    """
    Endpoint para reenviar código de verificación
    """
    email = request.data.get("email")

    if not email:
        return Response(
            {"error": "Email es requerido"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(email=email)
        if user.is_active:
            return Response(
                {"error": "Email ya verificado"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Usar la función con rate limiting
        send_verification_code_direct(email, user.username)
        return Response({"message": "Código de verificación reenviado exitosamente"})

    except User.DoesNotExist:
        return Response(
            {"error": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as rate_error:
        return Response(
            {"error": str(rate_error)}, status=status.HTTP_429_TOO_MANY_REQUESTS
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def mobile_register(request):
    """
    Endpoint para registro móvil con verificación por código
    """
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError

    # Extraer datos del request
    username = request.data.get("username")
    first_name = request.data.get("first_name", "")
    last_name = request.data.get("last_name", "")
    email = request.data.get("email")
    telefono = request.data.get("telefono", "")
    ci = request.data.get("ci", "")
    password1 = request.data.get("password1")
    password2 = request.data.get("password2")

    # Validaciones básicas
    if not all([username, email, password1, password2]):
        return Response(
            {"error": "Username, email, password1 y password2 son requeridos"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if password1 != password2:
        return Response(
            {"error": "Las contraseñas no coinciden"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validar contraseña
    try:
        validate_password(password1)
    except ValidationError as e:
        return Response(
            {"error": "; ".join(e.messages)}, status=status.HTTP_400_BAD_REQUEST
        )

    # Verificar si el usuario ya existe
    if User.objects.filter(username=username).exists():
        return Response(
            {"error": "Ya existe un usuario con este nombre de usuario"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(email=email).exists():
        return Response(
            {"error": "Ya existe un usuario con este email"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if ci and User.objects.filter(ci=ci).exists():
        return Response(
            {"error": "Ya existe un usuario con esta cédula de identidad"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Crear usuario inactivo (sin verificar email aún)
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password1,
            first_name=first_name,
            last_name=last_name,
            telefono=telefono,
            ci=ci,
            is_active=False,  # Usuario inactivo hasta verificar email
        )

        # Enviar código de verificación directamente (sin allauth)
        send_verification_code_direct(email, username)

        return Response(
            {
                "message": "Usuario creado exitosamente. Se ha enviado un código de verificación a tu email.",
                "user_id": user.id,
                "email": email,
                "username": username,
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        return Response(
            {"error": f"Error al crear usuario: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
