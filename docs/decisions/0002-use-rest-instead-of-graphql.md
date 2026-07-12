# ADR 0002: Use REST instead of GraphQL

## Status

Accepted

## Context

The frontend needs a typed contract with the backend. The product has a small
number of stable, resource-oriented access patterns (dashboard, accounts,
imports, insights).

## Decision

Expose a REST API through API Gateway HTTP API. GraphQL and Apollo are not used
for the MVP.

## Consequences

- Maps directly onto API Gateway + Lambda + DynamoDB.
- TanStack Query provides the required client-side caching without GraphQL
  schema, resolvers and Apollo cache complexity.
- Complex dynamic nested queries would need extra endpoints — acceptable given
  the known access patterns.
