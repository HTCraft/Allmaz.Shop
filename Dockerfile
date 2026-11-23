# Один Dockerfile на оба сервиса монорепо. Какой сервис запускать — решает переменная APP
# (api | web), её задают в настройках проекта на платформе.
FROM node:22-bookworm-slim

# openssl нужен Prisma; ca-certificates — для исходящих HTTPS-запросов (ЮKassa, SMTP)
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* 

WORKDIR /app

# Сначала только манифесты — слой с зависимостями кэшируется, пока они не менялись
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/
# devDependencies нужны для сборки (TypeScript, Nest CLI, Prisma)
RUN npm install --include=dev --no-audit --no-fund
RUN npm run build -w apps/web

COPY . .

# Адрес API для браузера вшивается в сборку Next.js — передавайте как переменную сборки
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run generate -w packages/database \
 && npm run build:packages \
 && npm run build -w apps/api \
 && npm run build -w apps/web

ENV NODE_ENV=production \
    APP=api \
    PORT=8080
EXPOSE 8080

# api: применяет миграции и запускает Nest; web: next start (порт берёт из PORT)
CMD ["sh", "-c", "npm run start:${APP}"]
