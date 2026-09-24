FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml* ./
RUN corepack prepare --activate $(node -p "require('./package.json').packageManager || 'pnpm@11.5.3'")
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# --- Production image ---
FROM nginx:1.29-alpine AS production

COPY --from=deps /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173
