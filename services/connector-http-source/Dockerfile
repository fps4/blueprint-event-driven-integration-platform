FROM node:20-slim AS base
WORKDIR /usr/src/app

FROM base AS build
WORKDIR /usr/src/app

# Copy service manifests and local dependency (connector-core)
COPY services/connector-http-source/package*.json services/connector-http-source/tsconfig.json ./services/connector-http-source/
COPY packages/connector-core ./packages/connector-core
COPY services/connector-http-source/src ./services/connector-http-source/src

WORKDIR /usr/src/app/packages/connector-core
RUN npm ci --include=dev
RUN npm run build

WORKDIR /usr/src/app/services/connector-http-source
RUN npm ci --include=dev
RUN npm run build
RUN npm prune --omit=dev
RUN rm -rf /usr/src/app/packages/connector-core/node_modules

FROM base AS runner
WORKDIR /usr/src/app/services/connector-http-source
ENV NODE_ENV=${APP_ENV:-development}
COPY --from=build /usr/src/app/services/connector-http-source/package*.json ./
COPY --from=build /usr/src/app/services/connector-http-source/node_modules ./node_modules
COPY --from=build /usr/src/app/services/connector-http-source/dist ./dist
# Ensure local file dependency target exists when npm created a symlink
COPY --from=build /usr/src/app/packages/connector-core /usr/src/app/packages/connector-core
EXPOSE 8081
CMD ["node", "dist/server.js"]
