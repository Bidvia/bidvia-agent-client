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

test('README presents @bidvia/client as a customer-facing V1 entrypoint', () => {
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
  assert.match(readme, /^## Boundaries, contract truth, and compatibility-only surfaces/m);

  assert.match(readme, /Bidvia is the governed platform for onboarding, running, and integrating agents/i);
  assert.match(readme, /`@bidvia\/client` is the open-source Bidvia client project/i);
  assert.match(readme, /current package version is `1\.0\.0`/i);
  assert.match(readme, /customer-facing V1 entrypoint/i);
  assert.match(readme, /`1\.0\.0` package state/i);
  assert.match(readme, /Stage 3 release gate remains blocked/i);
  assert.match(readme, /npm publication is still a separate final human step/i);
  assert.match(readme, /Node\.js `>=20`/i);
  assert.match(readme, /npm install @bidvia\/client/);
  assert.match(readme, /installs the `bidvia` CLI and the local `bidvia mcp-server` entrypoint/i);

  assert.match(readme, /bidvia sign-up-personal/);
  assert.match(readme, /bidvia sign-in/);
  assert.match(readme, /bidvia select-org/);
  assert.match(readme, /bidvia onboard/);
  assert.match(readme, /bidvia whoami/);
  assert.match(readme, /bidvia context show/);
  assert.match(readme, /bidvia doctor/);
  assert.match(readme, /bidvia create-provisional-agent/);
  assert.match(readme, /bidvia query-provisional-agent/);
  assert.match(readme, /bidvia claim-provisional-agent/);
  assert.match(readme, /bidvia route-context-matrix/);
  assert.match(readme, /bidvia registration-lifecycle-plan/);

  assert(readme.indexOf('bidvia onboard') < readme.indexOf('bidvia sign-up-personal'));
  assert(readme.indexOf('bidvia onboard') < readme.indexOf('bidvia sign-in'));
  assert(readme.indexOf('bidvia onboard') < readme.indexOf('bidvia select-org'));
  assert(readme.indexOf('bidvia onboard') < readme.indexOf('bidvia create-provisional-agent'));
  assert(readme.indexOf('bidvia create-provisional-agent') < readme.indexOf('bidvia route-context-matrix'));

  assert.match(readme, /import \{ BidviaClient, buildHeartbeatInput \} from '@bidvia\/client';/);
  assert.match(readme, /baseUrl: 'https:\/\/api\.bidvia\.cn'/);
  assert.match(readme, /tenantId/);
  assert.match(readme, /principalId/);
  assert.match(readme, /registrationId/);
  assert.match(readme, /openclaw-mcp-config/);
  assert.match(readme, /openclaw-bundle-export/);
  assert.match(readme, /downstream contract center/i);
  assert.match(readme, /compatibility-only/i);
  assert.match(readme, /hosted runtime/i);
  assert.match(readme, /platform-auth/i);

  assert.equal(packageJson.version, '1.0.0');
  assert.equal(packageJson.engines?.node, '>=20');
  assert.equal(
    packageJson.description,
    'Customer-facing V1 Bidvia SDK, CLI, and local MCP entrypoint for governed agent onboarding and operations.',
  );
});
