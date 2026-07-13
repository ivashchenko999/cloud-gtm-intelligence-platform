# Cloud GTM Intelligence Platform

A serverless Cloud GTM intelligence application that turns a CRM export into a
prioritized list of purchase-intent accounts. It imports account data through an
event-driven AWS pipeline, normalizes it, calculates a **deterministic**
purchase-intent score, and surfaces the result through a React + TypeScript
dashboard. Gemini is used only for customer-facing interpretation (explaining
scores, recommending next actions, drafting outreach) — never for the core
numeric logic.

## Technology stack

- React · TypeScript · Vite · Material UI · MUI X Data Grid · TanStack Query
- Node.js · AWS Lambda · API Gateway (HTTP API) · Amazon S3 · CloudFront · DynamoDB
- AWS CDK · CloudWatch · Secrets Manager · Gemini API
- pnpm workspaces · Turborepo

## Repository layout

```text
apps/
  web/              React SPA (@cloud-gtm/web)
  api/              Lambda handlers & backend services (@cloud-gtm/api)
packages/
  contracts/        Shared Zod contracts (source of truth)
  scoring/          Deterministic rule-based scoring engine
  csv-import/       CSV normalization & validation helpers
  ai/               Gemini prompts, schemas & language instructions
  database/         Single-table-design keys, repositories & mappers
infrastructure/     AWS CDK stacks
docs/               Architecture notes & decision records
```

## Prerequisites

- Node.js >= 22
- pnpm 11 (via Corepack: `corepack enable`)

## Local development

```bash
pnpm install
pnpm dev            # runs app dev servers via Turborepo
```

The web app is served by Vite (`apps/web`). There is currently no local API dev
server in `apps/api`; production runs the API as AWS Lambda behind API Gateway.
For local product testing, run the React app locally and point it at the deployed
AWS API:

```bash
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @cloud-gtm/web dev
```

That gives this flow:

```text
http://localhost:5173
  -> https://4njro4e2y6.execute-api.ca-central-1.amazonaws.com/api
  -> Lambda
  -> DynamoDB / S3
```

Use [`demo-crm-import.csv`](demo-crm-import.csv) as a known-good CRM upload file
when testing the import flow.

## Quality checks

```bash
pnpm format:check   # Prettier
pnpm lint           # ESLint
pnpm typecheck      # TypeScript (per package)
pnpm test           # Vitest
pnpm build          # build all packages
```

These run for every pull request in CI (`.github/workflows/ci.yml`). On `main`,
a deploy job runs after they pass and ships the stacks to AWS.

## Deployment

The app is deployed to AWS (region `ca-central-1`) with the AWS CDK: a private S3
bucket + CloudFront serve the SPA, an HTTP API Gateway + Lambda serve `/api/*`,
DynamoDB stores data, and CloudWatch provides dashboards and alarms. CloudFront is
the single public origin and proxies `/api/*` to the API.

```bash
pnpm --filter @cloud-gtm/infrastructure bootstrap   # once per account/region
pnpm build
pnpm --filter @cloud-gtm/infrastructure deploy
```

See [`docs/deployment.md`](docs/deployment.md) for OIDC setup, the Gemini secret,
CI-driven delivery and smoke tests.

## Key decisions

- **Deterministic scoring is separate from generative AI** — the score is
  predictable, testable and versioned (`rules-v1`); AI only interprets it.
- **REST over GraphQL** — the product has a small set of stable,
  resource-oriented access patterns; TanStack Query provides client caching.
- **DynamoDB single-table design** — modeled around known access patterns.
- **Bilingual EN-CA / FR-CA UI** — enums are stored untranslated; the frontend
  maps them to display values and AI insights are cached per locale.

See [`docs/decisions`](docs/decisions) for the full architecture decision records.

## Status

Milestone 1 (Foundation) — monorepo, tooling, application shell, shared
contracts, scoring engine and CDK data stack are in place. Remaining milestones
(M2–M8) are tracked in Linear.
