import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');

function readText(relativePath: string) {
  return readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

test('README presents @bidvia/client as a public package entrypoint without internal plan references', () => {
  const readme = readText('README.md');
  const packageJson = JSON.parse(readText('package.json')) as {
    description?: string;
    version?: string;
    engines?: { node?: string };
  };

  assert.match(readme, /^# Bidvia Agent Client/m);
  assert.match(readme, /^## What is Bidvia\?/m);
  assert.match(readme, /^## What is `@bidvia\/client`\?/m);
  assert.match(readme, /^## Current version and release maturity/m);
  assert.match(readme, /^## Installation/m);
  assert.match(readme, /^## Quick start/m);
  assert.match(readme, /^## CLI onboarding path/m);
  assert.match(readme, /^## SDK quick start/m);
  assert.match(readme, /^## OpenClaw and advanced integration/m);

  assert.match(readme, /`@bidvia\/client` is the open-source Bidvia client project/i);
  assert.match(readme, /npm install @bidvia\/client/);
  assert.match(readme, /Node\.js `>=20`/i);
  assert.match(readme, /bidvia onboard/);
  assert.match(readme, /bidvia sign-in/);
  assert.match(readme, /bidvia create-provisional-agent/);
  assert.match(readme, /bidvia route-context-matrix/);
  assert.match(readme, /bidvia install-integrity/);
  assert.match(readme, /bidvia validation-smoke/);
  assert.match(readme, /bidvia diagnostic-bundle-export/);
  assert.match(readme, /bidvia public-runtime-interpretation-probe/);
  assert.match(readme, /bounded task closure, not full business closure/i);

  assert.doesNotMatch(readme, /docs\/superpowers\//i);
  assert.doesNotMatch(readme, /INTERNAL_RELEASE_CHECKLIST/i);
  assert.doesNotMatch(readme, /WEBSITE_FIRST_ACCESS_HANDOFF/i);
  assert.doesNotMatch(readme, /OPTIMIZATION_BACKLOG/i);

  assert.equal(packageJson.version, '1.0.0');
  assert.equal(packageJson.engines?.node, '>=20');
  assert.equal(
    packageJson.description,
    'Customer-facing V1 Bidvia SDK, CLI, and local MCP entrypoint for governed agent onboarding and operations.',
  );
});
