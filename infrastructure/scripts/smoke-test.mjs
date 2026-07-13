#!/usr/bin/env node
// Post-deploy smoke test: hits the live CloudFront URL and asserts the SPA and
// the API are both reachable. Reads the base URL from $SMOKE_URL, or extracts
// the `SiteUrl` output from a `cdk deploy --outputs-file` JSON document passed
// as the first argument.
import { readFile } from 'node:fs/promises';

const RETRIES = 10;
const RETRY_DELAY_MS = 15_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveBaseUrl() {
  if (process.env.SMOKE_URL) {
    return process.env.SMOKE_URL.replace(/\/+$/, '');
  }

  const outputsPath = process.argv[2];
  if (!outputsPath) {
    throw new Error('Provide $SMOKE_URL or a cdk outputs JSON file path.');
  }

  const outputs = JSON.parse(await readFile(outputsPath, 'utf8'));
  for (const stackOutputs of Object.values(outputs)) {
    for (const [key, value] of Object.entries(stackOutputs ?? {})) {
      if (key.includes('SiteUrl') && typeof value === 'string') {
        return value.replace(/\/+$/, '');
      }
    }
  }
  throw new Error(`No SiteUrl output found in ${outputsPath}`);
}

async function fetchWithRetry(url, check) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(url);
      await check(response);
      console.log(`✓ ${url} (attempt ${attempt})`);
      return;
    } catch (error) {
      lastError = error;
      console.log(`… ${url} not ready (attempt ${attempt}/${RETRIES}): ${error.message}`);
      if (attempt < RETRIES) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  throw lastError;
}

async function main() {
  const baseUrl = await resolveBaseUrl();
  console.log(`Running smoke tests against ${baseUrl}`);

  await fetchWithRetry(`${baseUrl}/`, async (response) => {
    if (!response.ok) throw new Error(`expected 200, got ${response.status}`);
    const body = await response.text();
    if (!body.toLowerCase().includes('<!doctype html')) {
      throw new Error('response did not look like the SPA shell');
    }
  });

  await fetchWithRetry(`${baseUrl}/api/health`, async (response) => {
    if (!response.ok) throw new Error(`expected 200, got ${response.status}`);
    const body = await response.json();
    if (body.status !== 'ok') {
      throw new Error(`expected status "ok", got ${JSON.stringify(body.status)}`);
    }
  });

  console.log('Smoke tests passed.');
}

main().catch((error) => {
  console.error(`Smoke tests failed: ${error.message}`);
  process.exit(1);
});
