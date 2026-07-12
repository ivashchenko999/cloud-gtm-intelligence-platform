# ADR 0004: Separate deterministic scoring from generative AI

## Status

Accepted

## Context

Purchase-intent scoring drives prioritization and must be predictable and
auditable. Generative AI is valuable for customer-facing explanation but is
non-deterministic.

## Decision

Compute the purchase-intent score with a deterministic, versioned rule-based
engine (`rules-v1`) behind a `ScoringProvider` interface. Use Gemini only to
interpret the already-computed score (explanation, next action, outreach).

## Consequences

- The core decision logic is testable and reproducible.
- The rules engine can later be swapped for an ML model without changing the API.
- AI output is treated as presentation, cached, and never trusted for numbers.
