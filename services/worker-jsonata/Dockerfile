FROM node:20-slim AS base
WORKDIR /usr/src/app

FROM base AS build
WORKDIR /usr/src/app

# Copy manifests and local deps
COPY services/worker-jsonata/package*.json services/worker-jsonata/tsconfig.json ./services/worker-jsonata/
COPY packages/logging-utils ./packages/logging-utils
COPY packages/data-models ./packages/data-models
COPY services/worker-jsonata/src ./services/worker-jsonata/src

# Build shared packages first
WORKDIR /usr/src/app/packages/logging-utils
RUN npm ci --include=dev \
 && npm run build

WORKDIR /usr/src/app/packages/data-models
RUN npm ci --include=dev \
 && npm run build

# Build worker
WORKDIR /usr/src/app/services/worker-jsonata
RUN npm ci --include=dev --ignore-scripts \
 && npm run build \
 && npm prune --omit=dev

FROM base AS runner
WORKDIR /usr/src/app/services/worker-jsonata
ENV NODE_ENV=${APP_ENV:-development}

COPY --from=build /usr/src/app/services/worker-jsonata/package*.json ./
COPY --from=build /usr/src/app/services/worker-jsonata/node_modules ./node_modules
COPY --from=build /usr/src/app/services/worker-jsonata/dist ./dist
# local packages (for potential symlinks)
COPY --from=build /usr/src/app/packages/logging-utils /usr/src/app/packages/logging-utils
COPY --from=build /usr/src/app/packages/data-models /usr/src/app/packages/data-models

CMD ["node", "dist/index.js"]
