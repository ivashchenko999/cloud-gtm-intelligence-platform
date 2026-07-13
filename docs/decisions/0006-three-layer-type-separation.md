# ADR 0006: Three-layer type separation (item / domain / DTO)

## Status

Accepted

## Context

The same entity — an account, an import — is shaped differently at each layer of
the system. DynamoDB items carry storage keys (`PK`, `SK`, GSI attributes,
`entityType`) that must never reach the client. API responses are localized and
paginated views that the storage layer should not know about. Letting a single
type serve all three roles leaks storage concerns into the API and couples the
frontend to the table design.

## Decision

Model every entity at three distinct layers:

1. **Persistence item** — the raw DynamoDB record including `PK`/`SK`/`GSI*`
   and `entityType`. Lives in `@cloud-gtm/database`; never exported past a
   repository.
2. **Domain model** — the storage-agnostic in-memory shape the backend reasons
   about (e.g. `Account`, `Import`). Produced by mappers in
   `@cloud-gtm/database` from items.
3. **API DTO** — the wire contract defined by the Zod schemas in
   `@cloud-gtm/contracts` (e.g. `AccountResponse`, `DashboardResponse`). These
   are the single source of truth; the OpenAPI document and the
   `@cloud-gtm/api-client` hooks are generated from them.

Mapping only ever flows item → domain → DTO. The `@cloud-gtm/contracts` package
owns layer 3 and knows nothing about layers 1 and 2.

## Consequences

- Storage keys, GSI attributes, and `entityType` can never leak into a response.
- The table design can change without touching the API contract, and the API
  contract can evolve without a storage migration.
- Frontend and backend share exactly one set of types (the DTOs), generated —
  not hand-duplicated — from the Zod contracts.
