# ADR 0005: Support English and French localization

## Status

Accepted

## Context

The product targets a Canadian B2B context and should be usable in English
(en-CA) and French (fr-CA).

## Decision

Localize the UI with i18next / react-i18next. Store enum values untranslated in
DynamoDB and the API; map them to display values in the frontend. Format dates,
numbers and currency with `Intl`. AI insights accept a locale and are cached per
locale.

## Consequences

- Adding a locale means adding locale files, an MUI locale, a language
  instruction for AI, and extending `SupportedLocaleSchema`.
- User content (company names, domains, product names, cloud providers) is never
  translated.
