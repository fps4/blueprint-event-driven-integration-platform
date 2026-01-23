# Authorizer Service

Supports UI and Control API auth flows described in [ui.md](./ui.md) and [control-api.md](./control-api.md); issues tokens for `/ingest/*` and `/api/*`.

Issues short-lived JWTs for the platform: machine **clients** calling `/ingest/*`, control API callers hitting `/api/*`, and browser/UI sessions. Stores minimal session metadata for audit/troubleshooting. Single MongoDB database holds workspaces, clients, users, and sessions (no multi-tenant DB split).

## Responsibilities
- Manage **clients** (machine identities) that belong to **workspaces**; clients carry topic-bound scopes (e.g., `ingest:topic:orders.created`, `api:read`).
- Validate client status, secrets, and workspace association before issuing tokens.
- Create and persist sessions with TTL for both clients and human users.
- Issue HS256 JWTs with principal claims (client or user), workspace claim, and scope/topic restrictions.
- Refresh session TTL and re-issue JWTs.
- Enforce CORS via configured allowlist (no tenant-derived origins).

## Runtime
- Language: Node.js + TypeScript (ESM)
- Framework: Express
- Database: MongoDB (single database for workspaces + clients + users + sessions)

## HTTP API

See authentication touchpoints in [ui.md](./ui.md) and [control-api.md](./control-api.md).
Base path: `/auth`

### Client token (machine-to-machine)
`POST /auth/token`

Issues a token for clients that call `/ingest/*` or `/api/*`. Clients are defined inside a workspace.

**Request body**
```json
{
  "client_id": "client id",
  "client_secret": "client secret",
  "workspace_id": "workspace that owns the client",
  "scopes": ["ingest:topic:orders.created", "api:read"]
}
```

**Response (201)**
```json
{
  "sessionId": "...",
  "token": "...",
  "expiresIn": 3600,
  "client_id": "...",
  "workspace_id": "...",
  "scopes": ["ingest:topic:orders.created", "api:read"]
}
```

**Errors**
- 400: invalid input or scopes not allowed for the client/workspace.
- 404: client or workspace not found/inactive.
- 401: secret mismatch.
- 500: missing `AUTH_JWT_SECRET` or internal error.

### UI / user session
`POST /auth/session`

Issues a session for operators using the UI/control API (authn mechanism pluggable: password, SSO token, etc.).

**Request body (example)**
```json
{
  "username": "operator@example.com",
  "password": "...",
  "workspace_id": "workspace the user is operating in"
}
```

**Response (201)**
```json
{
  "sessionId": "...",
  "token": "...",
  "expiresIn": 3600,
  "user": {
    "id": "...",
    "roles": ["platform-admin"],
    "workspace_id": "workspace the user is operating in"
  }
}
```

### Refresh token
`POST /auth/refresh`

Refreshes the session TTL and issues a new JWT. Accepts a bearer token or `x-session-token` header.

**Headers**
- `Authorization: Bearer <token>` or `X-Session-Token: <token>`

**Response (200)**
```json
{
  "sessionId": "...",
  "token": "...",
  "expiresIn": 3600,
  "expiresAt": "2026-01-21T10:00:00.000Z",
  "principal": {
    "id": "...",
    "type": "client|user",
    "workspace_id": "...",
    "scopes": ["..."]
  }
}
```

**Errors**
- 401: missing/invalid/expired token, client/user/workspace mismatch.
- 404: session not found or inactive.
- 500: missing `AUTH_JWT_SECRET` or internal error.

## JWT Claims
HS256-signed; includes:
- `sid`: session ID
- `pid`: principal ID (client or user)
- `ptyp`: principal type (`client` or `user`)
- `wid`: workspace ID
- `scopes`: allowed scopes (e.g., `ingest:topic:<name>`, `api:*`, `ui:session`)
- `iss`, `aud`, `exp`, `iat`, `jti`

Optional claims for clients:
- `topics`: allowlist of topic names usable on `/ingest/:topic`

## Client Metadata Capture
On token issuance the service captures:
- User agent and Client Hints (`sec-ch-ua`, `sec-ch-ua-platform`, `sec-ch-ua-mobile`)
- IP address (from `x-forwarded-for` or `req.ip`)

Stored with normalized keys (e.g., `user_agent`, `ch_ua`, `ip_address`) on the session context.

## Configuration

### Required
- `AUTH_JWT_SECRET`: JWT signing secret.
- `MONGO_URI`: connection URI for MongoDB.
- `AUTH_DB_NAME`: database name (single DB for all records: workspaces, clients, users, sessions).

### Optional
- `AUTHORIZER_PORT` (default: `7305`)
- `AUTH_JWT_ISSUER` (default: `authorizer-service`)
- `AUTH_JWT_AUDIENCE` (default: `api`)
- `SESSION_TTL_MINUTES` (default: `60`)
- `CORS_ORIGINS` (comma-separated static allowlist)
- `LOG_PRETTY` (set to `false`/`0` for JSON logs)

## CORS Behavior
- If `CORS_ORIGINS` is set, those origins are allowed.
- In non-production environments, common localhost origins are allowed.
- If no origins exist, all origins are allowed.

## Logging
- Structured logging with contextual fields such as `principalId`, `principalType`, `workspaceId`, and `sessionId`.
- Token issuance and refresh are logged with minimal identifiers only.

## Local Development
From the service folder:
- Install dependencies: `npm install`
- Build and run: `npm run build && node dist/server.js`

## Related Components
- Data models: `@event-streaming-platform/data-models`
- Logging utilities: `@event-streaming-platform/logging-utils`
