import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildOpenApiDocument } from '../src/openapi';

const outputPath = fileURLToPath(new URL('../openapi.json', import.meta.url));
const document = buildOpenApiDocument();

writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
