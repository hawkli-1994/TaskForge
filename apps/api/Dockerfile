FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache libc6-compat openssl python3 make g++
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/domain/package.json ./packages/domain/package.json
COPY packages/repository-provider/package.json ./packages/repository-provider/package.json
COPY packages/pi-agent/package.json ./packages/pi-agent/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @taskforge/db generate:postgres
RUN pnpm --filter @taskforge/contracts build
RUN pnpm --filter @taskforge/domain build
RUN pnpm --filter @taskforge/repository-provider build
RUN pnpm --filter @taskforge/db build
RUN pnpm --filter @taskforge/pi-agent build
RUN pnpm --filter @taskforge/api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/.npmrc ./
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/packages/db/src/seed.ts ./packages/db/src/seed.ts
COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/domain/package.json ./packages/domain/package.json
COPY --from=builder /app/packages/domain/dist ./packages/domain/dist
COPY --from=builder /app/packages/repository-provider/package.json ./packages/repository-provider/package.json
COPY --from=builder /app/packages/repository-provider/dist ./packages/repository-provider/dist
COPY --from=builder /app/packages/pi-agent/package.json ./packages/pi-agent/package.json
COPY --from=builder /app/packages/pi-agent/dist ./packages/pi-agent/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=builder /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=builder /app/packages/domain/node_modules ./packages/domain/node_modules
COPY --from=builder /app/packages/repository-provider/node_modules ./packages/repository-provider/node_modules
COPY --from=builder /app/packages/pi-agent/node_modules ./packages/pi-agent/node_modules

CMD ["sh", "-c", "pnpm --filter @taskforge/db migrate:deploy:postgres && DATABASE_URL=$DATABASE_URL pnpm --filter @taskforge/db exec tsx src/seed.ts && node apps/api/dist/main.js"]
