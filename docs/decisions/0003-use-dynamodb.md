# ADR 0003: Use DynamoDB with single-table design

## Status

Accepted

## Context

The application is serverless and has well-understood access patterns. A managed,
serverless data store keeps the operational surface small.

## Decision

Use a single DynamoDB table (`CloudGtmTable`) with entity-typed items and three
global secondary indexes for the imports, score-level and cloud-provider access
patterns.

## Consequences

- Access patterns must be designed up front.
- Reads are efficient and predictable.
- Storage-specific keys never leak past the mapper layer into API DTOs.
