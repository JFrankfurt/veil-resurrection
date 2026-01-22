# =============================================================================
# Predictions V2 API - Docker Image
# =============================================================================

FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable pnpm

# Install dependencies
FROM base AS deps
COPY package.json ./
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Build the application
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Production image
FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 api
USER api

EXPOSE 3001
CMD ["node", "dist/index.js"]
