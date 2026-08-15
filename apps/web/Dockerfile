# AI-Growth-OS Web (Next.js) — build from repo root:
# docker build -f apps/web/Dockerfile -t growthos-web .

FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
COPY apps/api/package.json ./apps/api/package.json

RUN npm ci

RUN npm run build -w @ai-growth-os/shared \
  && npm run build -w @ai-growth-os/web

FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node", "server.js"]
