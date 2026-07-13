import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

/**
 * Single extended `z` used by every contract. Calling `extendZodWithOpenApi`
 * once here (before any schema is constructed) lets schemas carry `.openapi()`
 * component names, so the generated OpenAPI/Orval output uses shared `$ref`s
 * instead of re-inlining every enum and nested object.
 */
extendZodWithOpenApi(z);

export { z };
