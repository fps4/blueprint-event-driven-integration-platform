# Data Models package

Shared models used by services in [authorizer.md](./authorizer.md) and [control-api.md](./control-api.md); referenced by UI flows in [ui.md](./ui.md).

Shared Mongoose schemas and model factories that all services use for tenant-scoped data. Package name: `@event-streaming-platform/data-models`.

## What it provides
- Mongoose schemas and models for `Workspace`, `Pipeline`, `Client`, `Connection`, `User`, `Session`, `Notification`, and `Contact`
- `makeModels(conn)` helper that registers all models on a given `mongoose.Connection`
- Dual CJS/ESM build with emitted typings via `tsup` (see package.json scripts)

## Schema highlights
- **Workspace**: `_id`, `name`, `code` (4 lowercase letters a-z, unique), `status` (`active`/`inactive`), `allowedOrigins`; status indexed.
- **Pipeline**: `_id`, `workspaceId` (ref, indexed), `name`, `code` (4 lowercase letters a-z), `status`, `streams` (array of StreamDefinition with topic/type/description where type is `source|sink|dlq|replay`), `sourceClients` (array of ClientConfigRef with clientId/role/connectorType/streamName/description), `sinkConnections` (array of ConnectionConfigRef with connectionId/connectorType/streamName/description), `transform` (optional TransformConfig with type/sourceStream/targetStream/failureQueue/expression/description), `nodePositions` (map of nodeId to {x, y} for persisting UI layout); linked to Workspace, Clients, and Connections.
- **Client**: `_id`, `name`, `status` (`active`/`inactive`, indexed), `secretHash`/`secretSalt`, `allowedScopes`, `allowedTopics`; global entity used as authenticated source producers linked to pipelines through `Pipeline.sourceClients`.
- **Connection**: `_id`, `name`, `type` (`HTTP`/`S3`), `status` (`active`/`inactive`, indexed), `config` (type-specific: url/method/headers for HTTP, bucket/region/accessKeyId/secretAccessKey for S3); global entity representing external sink destinations linked to pipelines through `Pipeline.sinkConnections`.
- **User**: `_id`, `workspaceId` (ref, indexed), `username` (unique), password hash/salt, `roles`, `status` (`active`/`inactive`, indexed); virtual `workspace` for population.
- **Session**: `_id` (session UUID), `workspaceId` (ref, indexed), `principalId`, `principalType` (`client`/`user`, indexed), `scopes`, `topics`, arbitrary `context`, `status` (`active`/`revoked`, indexed), `expiresAt` (indexed); virtual `workspace` for population.
- **Notification**: channel `slack|email` (indexed), `type` (indexed), `correlationId` (indexed), optional `tenantId`/`contactId`, channel-specific `target`, arbitrary `payload`, `status` (`queued`/`sent`/`failed`, indexed), optional `error` snapshot, `deliveredAt`.
- **Contact**: optional `email` (unique when present), `phone` (indexed), `role` (`admin`/`member`/`agent`/`viewer`, indexed), `status` (`active`/`invited`/`inactive`/`deleted`, indexed), verification flags, `tags`, `attributes` (mixed), `source`, `lastSeenAt`; unique partial index on email.

## Usage
```ts
import mongoose from 'mongoose';
import { makeModels } from '@event-streaming-platform/data-models';

const conn = await mongoose.createConnection(mongoUri).asPromise();
const models = makeModels(conn);

const workspace = await models.Workspace.create({ _id: 'ws_1', name: 'Acme' });
```
