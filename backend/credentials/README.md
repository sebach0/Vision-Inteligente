# Configuración de Credenciales

## Google Cloud Vision API

Para configurar el reconocimiento de placas, necesitas:

1. **Crear un proyecto en Google Cloud Console**
2. **Habilitar la API de Vision**
3. **Crear una cuenta de servicio**
4. **Descargar el archivo JSON de credenciales**
5. **Colocar el archivo en esta carpeta como `google-credentials.json`**

## AWS Rekognition

Para configurar el reconocimiento facial, necesitas:

1. **Crear una cuenta de AWS**
2. **Crear un usuario IAM con permisos de Rekognition**
3. **Configurar las variables de entorno en docker-compose.yml**

## Variables de Entorno

Agrega estas variables a tu archivo `.env` o `docker-compose.yml`:

```bash
# Google Cloud Vision
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/google-credentials.json

# AWS Rekognition
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```
