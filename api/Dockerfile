FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

# deps: install dependencies + copy full source, so both the `migrate`
# service (runs migration:run/seed straight from source via ts-node) and the
# `builder` stage below can reuse this layer as-is.
FROM base AS deps

COPY package.json pnpm-lock.yaml* ./
RUN corepack prepare --activate $(node -p "require('./package.json').packageManager || 'pnpm@11.5.3'")
RUN pnpm install --frozen-lockfile

COPY . .

FROM deps AS builder

RUN pnpm build
RUN pnpm install --frozen-lockfile --prod

# --- Production image ---
FROM node:24-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

USER node

CMD ["node", "dist/main"]
