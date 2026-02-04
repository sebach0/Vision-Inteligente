FROM node:20-alpine
WORKDIR /app

# Configurar zona horaria para Bolivia (UTC-4)
ENV TZ=America/La_Paz
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

# Copia package*.json primero para cache de npm ci si quieres
# COPY package*.json /app/
# RUN npm ci

# Para dev montamos la carpeta, así que solo exponemos puerto
EXPOSE 5173
