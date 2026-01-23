# Data Models package

Shared models used by services in [authorizer.md](./authorizer.md) and [control-api.md](./control-api.md); referenced by UI flows in [ui.md](./ui.md).

Shared Mongoose schemas and model factories that all services use for tenant-scoped data. Package name: `@event-streaming-platform/data-models`.

## What it provides
- Mongoose schemas and models for `Workspace`, `Client`, `User`, `Session`, `Notification`, and `Contact`
- `makeModels(conn)` helper that registers all models on a given `mongoose.Connection`
- Dual CJS/ESM build with emitted typings via `tsup` (see package.json scripts)

## Schema highlights
- **Workspace**: `_id`, `name`, `status` (`active`/`inactive`), `allowedOrigins`; status indexed.
- **Client**: `_id`, `workspaceId` (ref, indexed), `status` (`active`/`inactive`, indexed), `secretHash`/`secretSalt`, `allowedScopes`, `allowedTopics`; virtual `workspace` for population.
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
