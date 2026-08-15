# AI-Growth-OS API (NestJS) — default image for Railway/Docker.
# Build from repo root: docker build -t growthos-api .
# For the Next.js app, use apps/web/Dockerfile on a separate service.

FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY apps/web/package.json ./apps/web/package.json

RUN npm ci

RUN npm run build -w @ai-growth-os/shared \
  && npm run prisma:generate -w @ai-growth-os/api \
  && npm run build -w @ai-growth-os/api

FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/scripts ./apps/api/scripts

WORKDIR /app/apps/api
RUN chmod +x scripts/docker-entrypoint.sh
EXPOSE 4000
CMD ["sh", "./scripts/docker-entrypoint.sh"]
