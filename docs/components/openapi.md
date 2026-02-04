# OpenAPI Design & Architecture

## Overview

Event Streaming Platform uses a **spec-first, component-based OpenAPI architecture** where shared schemas and components are centralized in `packages/openapi-components`, and each service maintains its own OpenAPI specification that references these shared components.

## Architecture: Hybrid Approach

```
packages/openapi-components/
├── connectors.yaml          # Shared connector schemas (TopicName, IngestPayload, etc.)
├── control-api.yaml         # Shared control-plane schemas (Workspace, Pipeline, User, etc.)
└── README.md

services/
├── control-api/
│   └── openapi.yaml         # Control API paths + $ref to shared components
├── authorizer/
│   └── openapi.yaml         # Auth endpoints + $ref to shared components
└── connector-http-source/
    └── openapi.yaml         # Ingest endpoints + $ref to connectors.yaml
```

### Benefits
- **DRY**: Common schemas (errors, auth headers, domain models) defined once.
- **Consistency**: All services use same data structures and validation rules.
- **Type Safety**: Generate TypeScript types from OpenAPI specs.
- **Validation**: Runtime request/response validation against specs.
- **Documentation**: Auto-generated API docs from canonical source.
- **Contract Testing**: Verify implementations match specs.

## Shared Component Strategy

### `packages/openapi-components/connectors.yaml`
**Scope**: Data-plane connector services (HTTP source/sink, Kafka workers).

**Contains**:
- `TopicName` schema (Kafka topic validation pattern)
- `IngestPayload` schema (JSON object/array validation)
- `AcceptedResponse`, `HealthResponse`, `ErrorResponse`
- `TopicParam` parameter
- `RequestId` header

**Used by**: `connector-http-source`, `connector-http-sink`, `worker-jsonata`.

### `packages/openapi-components/control-api.yaml` (to be created)
**Scope**: Control-plane services (control-api, authorizer).

**Should contain**:
- **Domain models**: `Workspace`, `Pipeline`, `Client`, `User`, `JsonataTransform`, `Session`
- **Auth components**: `BearerAuth` security scheme, `Authorization` header
- **Common responses**: `ErrorResponse`, `ValidationErrorResponse`, `UnauthorizedResponse`, `NotFoundResponse`
- **Common parameters**: `WorkspaceIdParam`, `PipelineIdParam`, `ClientIdParam`
- **Pagination**: `PaginationQuery`, `PaginatedResponse`
- **Request headers**: `x-request-id`, `x-workspace-id`

**Used by**: `control-api`, `authorizer`, `webapp` (client generation).

## Per-Service OpenAPI Specs

Each service maintains its own `openapi.yaml` file in its root directory.

### Structure
```yaml
openapi: 3.1.0
info:
  title: <Service Name>
  version: 0.1.0
  description: <Service purpose>
servers:
  - url: http://localhost:<port>
    description: Local development
paths:
  /path:
    method:
      summary: Endpoint description
      operationId: uniqueOperationName
      parameters:
        - $ref: ../../packages/openapi-components/control-api.yaml#/components/parameters/WorkspaceIdParam
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: ../../packages/openapi-components/control-api.yaml#/components/schemas/Pipeline
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: ../../packages/openapi-components/control-api.yaml#/components/schemas/Pipeline
        "400":
          $ref: ../../packages/openapi-components/control-api.yaml#/components/responses/ValidationError
        "401":
          $ref: ../../packages/openapi-components/control-api.yaml#/components/responses/Unauthorized
        "404":
          $ref: ../../packages/openapi-components/control-api.yaml#/components/responses/NotFound
```

### Example: Control API Endpoints

`services/control-api/openapi.yaml` should document:
- `GET /health`, `GET /api/health`
- `GET /api/workspaces`, `POST /api/workspaces`, `PUT /api/workspaces/:id`
- `GET /api/pipelines`, `GET /api/pipelines/:pipelineId`, `POST /api/pipelines`, `PUT /api/pipelines/:pipelineId`
- `GET /api/workspaces/:id/clients`, `POST /api/workspaces/:id/clients`
- `GET /api/workspaces/:id/users`, `POST /api/workspaces/:id/users`
- `POST /api/topics`, `GET /api/topics`, `GET /api/topics/:name/metrics`
- `GET /api/workspaces/:id/jsonata-transforms`, `POST /api/workspaces/:id/jsonata-transforms`

Each path references shared components from `control-api.yaml`.

## Integration with Services

### 1. Runtime Validation
Use `express-openapi-validator` to validate incoming requests and outgoing responses against the OpenAPI spec.

```typescript
import OpenAPIValidator from 'express-openapi-validator';

app.use(
  OpenAPIValidator.middleware({
    apiSpec: './openapi.yaml',
    validateRequests: true,
    validateResponses: true,
    ignoreUndocumented: false,
  })
);
```

**Benefits**: Catch schema violations at runtime; ensures implementation matches spec.

### 2. Type Generation
Use `openapi-typescript` to generate TypeScript types from specs for compile-time safety.

```bash
npx openapi-typescript openapi.yaml -o src/types/api.d.ts
```

Import and use in code:
```typescript
import type { components, paths } from './types/api';

type Pipeline = components['schemas']['Pipeline'];
type GetPipelinesResponse = paths['/api/pipelines']['get']['responses']['200']['content']['application/json'];
```

### 3. Client Generation (for webapp)
Generate typed API client for webapp using `openapi-typescript-codegen` or `@hey-api/openapi-ts`.

```bash
npx openapi-typescript-codegen --input services/control-api/openapi.yaml --output webapp/src/api/generated
```

Replace manual `src/api/pipeline.js` with generated client.

### 4. API Documentation
Serve interactive documentation using `swagger-ui-express` or Redocly.

```typescript
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import fs from 'fs';

const spec = YAML.parse(fs.readFileSync('./openapi.yaml', 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
```

Access at `http://localhost:8080/api-docs`.

## Best Practices

### 1. Keep Shared Components Generic
Shared components should represent domain concepts, not implementation details. Avoid service-specific logic in shared schemas.

### 2. Use $ref for Everything
Reference shared components for:
- Request/response schemas
- Parameters (path, query, header)
- Error responses
- Security schemes

### 3. Semantic Versioning
- Shared component changes affect all consumers; version carefully.
- Breaking changes (removing fields, changing types) require major version bump.
- Adding optional fields or new endpoints is non-breaking (minor version).

### 4. Validation Rules in Schemas
Encode validation rules (min/max length, patterns, required fields) in OpenAPI schemas. Use these for both runtime validation and UI validation.

### 5. OperationIds
Assign unique `operationId` to each endpoint for client generation and traceability.

### 6. Examples & Descriptions
Provide `examples` and `description` for all schemas, parameters, and responses. This improves auto-generated docs and developer experience.

### 7. Security Schemes
Define security schemes in shared components:
```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT issued by Authorizer service
```

Apply globally or per-operation:
```yaml
security:
  - BearerAuth: []
```

## Maintenance Workflow

### Adding a New Endpoint
1. Check if domain models exist in shared components; add if missing.
2. Define endpoint in service's `openapi.yaml` using `$ref` to shared components.
3. Run OpenAPI linter: `npx @redocly/cli lint openapi.yaml`.
4. Regenerate TypeScript types: `npm run generate-types`.
5. Implement endpoint with validation middleware.
6. Test against spec using contract testing tools (e.g., Dredd, Postman).

### Modifying Shared Components
1. Update schema in `packages/openapi-components/*.yaml`.
2. Check impact on all consuming services (grep for references).
3. Update service specs if needed (e.g., new required field).
4. Regenerate types for all affected services.
5. Update implementations to match schema changes.
6. Run full test suite to catch breaking changes.

### Aggregating Specs (Optional)
Create `docs/openapi/aggregated.yaml` that combines all service specs for unified documentation:
```yaml
openapi: 3.1.0
info:
  title: Event Streaming Platform API
  version: 0.1.0
servers:
  - url: http://localhost:8080
    description: Control API
  - url: http://localhost:8081
    description: HTTP Source Connector
paths:
  # Include paths from all services
  $ref: ../../services/control-api/openapi.yaml#/paths
  $ref: ../../services/connector-http-source/openapi.yaml#/paths
```

Use Redocly CLI to bundle and serve:
```bash
npx @redocly/cli bundle docs/openapi/aggregated.yaml -o docs/openapi/bundle.yaml
npx @redocly/cli preview-docs docs/openapi/bundle.yaml
```

## Tooling

### Recommended Packages
- **Validation**: `express-openapi-validator` (runtime request/response validation)
- **Type Generation**: `openapi-typescript` (TypeScript type definitions)
- **Client Generation**: `@hey-api/openapi-ts` (typed API clients)
- **Documentation**: `swagger-ui-express` or `redocly` (interactive API docs)
- **Linting**: `@redocly/cli` (OpenAPI spec linting and bundling)
- **Contract Testing**: `dredd` or `portman` (verify implementation matches spec)

### Setup Scripts (per service)
Add to `package.json`:
```json
{
  "scripts": {
    "generate-types": "openapi-typescript openapi.yaml -o src/types/api.d.ts",
    "lint-spec": "redocly lint openapi.yaml",
    "validate-spec": "swagger-cli validate openapi.yaml"
  }
}
```

## Migration Path

### Phase 1: Create Shared Components
- Create `packages/openapi-components/control-api.yaml` with core domain schemas.
- Document existing `Pipeline`, `Workspace`, `Client`, `User` models from `@event-streaming-platform/data-models`.

### Phase 2: Document Existing Services
- Create `services/control-api/openapi.yaml` documenting all current endpoints.
- Create `services/authorizer/openapi.yaml` for auth endpoints.
- Reference shared components via `$ref`.

### Phase 3: Add Validation
- Install `express-openapi-validator` in control-api and authorizer.
- Add validation middleware.
- Fix any schema mismatches discovered.

### Phase 4: Type Generation
- Generate TypeScript types from OpenAPI specs.
- Refactor services to use generated types.
- Replace manual webapp API clients with generated clients.

### Phase 5: Documentation & Tooling
- Serve Swagger UI at `/api-docs` endpoint.
- Set up CI checks for OpenAPI linting and validation.
- Add contract tests to verify implementation matches spec.

## Related Documentation
- [Control API Service](./control-api.md)
- [Authorizer Service](./authorizer.md)
- [Connector HTTP Source](./connectors.md)
- [Data Models Package](./data-models.md)
