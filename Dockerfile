# ==============================================================================
# Dockerfile - Plataforma Educativa CursosMi (Producción)
# ==============================================================================

FROM node:22-alpine AS base

# Instalar dependencias del sistema necesarias para compilar módulos nativos (sqlite3)
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --omit=dev

# Copiar código fuente de la aplicación
COPY . .

# Crear directorios para subida de comprobantes y persistencia
RUN mkdir -p uploads

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Exponer el puerto del servidor
EXPOSE 3000

# Healthcheck para monitoreo del contenedor
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/courses || exit 1

# Comando de inicio del servidor
CMD ["node", "server.js"]
