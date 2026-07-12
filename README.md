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
- Node.js · AWS Lambda · API Gateway (HTTP API) · Amazon S3 · DynamoDB
- AWS CDK · Gemini API
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

The web app is served by Vite (`apps/web`).

## Quality checks

```bash
pnpm format:check   # Prettier
pnpm lint           # ESLint
pnpm typecheck      # TypeScript (per package)
pnpm test           # Vitest
pnpm build          # build all packages
```

These run for every pull request in CI (`.github/workflows/ci.yml`).

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
