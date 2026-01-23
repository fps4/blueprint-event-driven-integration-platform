# Authorizer Service

Issues short‑lived JWTs for machine **clients** calling `/ingest/*` or `/api/*`, and for browser/UI sessions. Single MongoDB database holds workspaces, clients, users, and sessions.

## Run
- Install: `npm install`
- Build/Run: `npm run build && node dist/server.js`

## Env
- `AUTHORIZER_PORT` (default 7305)
- `AUTH_JWT_SECRET` (required)
- `AUTH_JWT_ISSUER` (default `authorizer-service`)
- `AUTH_JWT_AUDIENCE` (default `api`)
- `MONGO_URI`, `AUTH_DB_NAME` (single auth DB)
- `LOG_PRETTY` — set to `false`/`0` when shipping logs to Loki/Grafana so they remain JSON
- Logs include `workspaceId`, `sessionId`, and principal identifiers when available.

## Endpoints
- `POST /auth/token`
  - Purpose: Issue a token for a client in a workspace.
  - Body: `{ client_id, client_secret, workspace_id, scopes?: string[] }`
  - Response: `201 { sessionId, token, expiresIn, expiresAt, client_id, workspace_id, scopes }`
- `POST /auth/session`
  - Purpose: Issue a UI/control API session for a user in a workspace.
  - Body: `{ username, password, workspace_id }`
  - Response: `201 { sessionId, token, expiresIn, expiresAt, user: { id, roles, workspace_id } }`
- `POST /auth/refresh`
  - Purpose: Refresh an existing session (client or user).
  - Headers: `Authorization: Bearer <token>` or `X-Session-Token`
  - Response: `200 { sessionId, token, expiresIn, expiresAt, principal }`

## Notes
- JWT claims: `sid` (session id), `pid` (principal id), `ptyp` (`client`|`user`), `wid` (workspace id), `scopes`, optional `topics`.
- Keep secrets out of VCS; provide `AUTH_JWT_SECRET` via env/secret manager.
