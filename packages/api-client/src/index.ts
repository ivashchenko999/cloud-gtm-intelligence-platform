/**
 * Public surface of the generated API client. Consumers import typed request
 * functions, TanStack Query hooks, and DTO types from here — never from the
 * `generated/` folder directly.
 */
export * from './generated/endpoints';
export * from './generated/model';
export { ApiError, configureApiClient, customFetch } from './fetch-client';
