import { defineConfig } from 'orval';

/**
 * Generates a typed fetch client + TanStack Query hooks from the OpenAPI
 * document that `@cloud-gtm/contracts` produces from its Zod schemas. Output is
 * committed under `src/generated` and verified up to date in CI.
 */
export default defineConfig({
  cloudGtm: {
    input: {
      target: '../contracts/openapi.json',
    },
    output: {
      mode: 'single',
      target: './src/generated/endpoints.ts',
      schemas: './src/generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      prettier: false,
      override: {
        mutator: {
          path: './src/fetch-client.ts',
          name: 'customFetch',
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
        query: {
          useQuery: true,
        },
      },
    },
  },
});
