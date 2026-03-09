FROM node:22-trixie-slim

# 1. Habilitar Corepack
# Esto hace que el comando 'pnpm' se convierta en un alias manejado por Corepack.
RUN corepack enable

# 2. Instalar el binario de pnpm
# Corepack prepara e instala la última versión del gestor de paquetes.
RUN corepack prepare pnpm@latest --activate

# Create app directory
WORKDIR /app

# Copy package.json and install prod dependencies
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
# Prevent installation of dev dependencies
RUN pnpm install --frozen-lockfile

# Copy app files, ignoring files contained into .dockerignore file
COPY . .

# App default port
EXPOSE 3000

# Start app
CMD ["pnpm", "start"]