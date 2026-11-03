# Site do Navalha. Build a partir da RAIZ do monorepo (precisa de packages/shared):
#   docker build -f frontend/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
# --ignore-scripts: o postinstall do backend (prisma) não é necessário para o site
RUN npm ci --ignore-scripts
COPY packages/shared packages/shared
COPY frontend frontend
RUN npm run build -w frontend

# ---------- produção: só os arquivos estáticos num nginx ----------
FROM nginx:1.27-alpine AS prod
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
