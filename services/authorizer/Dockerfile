# ---- Build stage (optional if you need to compile assets) ----
FROM node:current-alpine AS build
WORKDIR /app
# Pre-copy package manifests to leverage cache for installs
COPY packages/data-models/package*.json packages/data-models/
COPY packages/data-models/tsup.config.ts packages/data-models/tsup.config.ts
COPY packages/data-models/tsconfig.json packages/data-models/tsconfig.json
COPY packages/logging-utils/package*.json packages/logging-utils/
COPY packages/logging-utils/tsconfig.json packages/logging-utils/tsconfig.json
COPY services/authorizer/package*.json services/authorizer/

# Install dependencies per package without running lifecycle scripts
RUN cd packages/data-models && npm install --ignore-scripts
RUN cd packages/logging-utils && npm install --ignore-scripts
RUN cd services/authorizer && npm install --ignore-scripts

# Copy sources
COPY packages/ packages/
COPY services/authorizer/ services/authorizer/

# Build shared packages
RUN cd packages/data-models && npm run build
RUN cd packages/logging-utils && npm run build
# Build the authorizer workspace
RUN cd services/authorizer && npm run build

# ---- Runner stage ----
FROM node:current-alpine
WORKDIR /app
ENV NODE_ENV=${APP_ENV:-development}
# Copy only runtime artifacts
COPY --from=build /app/services/authorizer/dist ./services/authorizer/dist
COPY --from=build /app/services/authorizer/package*.json ./services/authorizer/
COPY --from=build /app/services/authorizer/node_modules ./services/authorizer/node_modules
COPY --from=build /app/packages/data-models ./packages/data-models
COPY --from=build /app/packages/logging-utils ./packages/logging-utils

EXPOSE 7305
WORKDIR /app/services/authorizer
CMD ["node", "dist/server.js"]
