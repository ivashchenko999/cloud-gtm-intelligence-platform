# ADR 0001: Use a TypeScript monorepo

## Status

Accepted

## Context

The project contains a React application, a Lambda backend, shared contracts,
scoring logic and AWS infrastructure — all in TypeScript.

## Decision

Use pnpm workspaces and Turborepo with TypeScript across frontend, backend,
shared packages and infrastructure.

## Consequences

- Shared contracts and domain logic are reused without duplication.
- Builds, checks and tests are coordinated from the root via Turborepo.
- Repository setup is more complex than a single application.
