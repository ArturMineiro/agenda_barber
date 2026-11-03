# API do Navalha. Build a partir da RAIZ do monorepo (precisa de packages/shared):
#   docker build -f backend/Dockerfile .
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# manifests dos workspaces (o npm exige todos para respeitar o package-lock)
FROM base AS manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY backend/prisma backend/prisma

# ---------- build ----------
FROM manifests AS build
RUN npm ci
COPY packages/shared packages/shared
COPY backend backend
RUN npm run build -w backend

# ---------- produção ----------
FROM manifests AS prod
ENV NODE_ENV=production
RUN npm ci --omit=dev -w backend && npm cache clean --force
COPY --from=build /app/backend/dist backend/dist
WORKDIR /app/backend
EXPOSE 3333
# aplica as migrações pendentes antes de subir a API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
