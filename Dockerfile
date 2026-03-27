FROM node:24-trixie-slim

# Create app directory
WORKDIR /app

# Copy package.json and install prod dependencies
COPY package.json package-lock.json ./

# Copy Prisma files
COPY prisma ./prisma
COPY prisma.config.ts ./

# Install all dependencies (LOCAL)
RUN npm install

# Copy app files, ignoring files contained into .dockerignore file
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# App default port
EXPOSE 3000

# Start app
CMD ["npm", "start"]