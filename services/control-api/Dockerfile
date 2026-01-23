# syntax=docker/dockerfile:1
# Build the control-api service (expects build context at repo root)

FROM node:current-alpine AS build
WORKDIR /app
# Copy service manifests and local dependency (data-models, logging-utils)
COPY services/control-api/package*.json services/control-api/tsconfig.json ./services/control-api/
COPY packages/data-models ./packages/data-models
COPY packages/logging-utils ./packages/logging-utils
COPY services/control-api/src ./services/control-api/src

# Build shared data models (needs dev deps for tsup)
WORKDIR /app/packages/data-models
RUN npm ci --include=dev
RUN npm run build

WORKDIR /app/packages/logging-utils
RUN npm ci --include=dev
RUN npm run build

WORKDIR /app/services/control-api
RUN npm ci --include=dev
RUN npm run build
RUN npm prune --omit=dev

FROM node:current-alpine  AS prod
WORKDIR /app
ENV NODE_ENV=${APP_ENV:-development}

# Copy runtime artifacts
COPY --from=build /app/services/control-api/package*.json ./services/control-api/
COPY --from=build /app/services/control-api/node_modules ./services/control-api/node_modules
COPY --from=build /app/services/control-api/dist ./services/control-api/dist
COPY --from=build /app/packages/data-models ./packages/data-models
COPY --from=build /app/packages/logging-utils ./packages/logging-utils

EXPOSE 7304
WORKDIR /app/services/control-api
CMD ["node", "dist/index.js"]
