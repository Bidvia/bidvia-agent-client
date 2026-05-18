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

test('agent-first outward docs present role-stage product entry and migration guidance', () => {
  const readme = readText('README.md');
  const onboarding = readText('docs/ONBOARDING.md');
  const boundary = readText('docs/CONTRACT_BOUNDARY.md');
  const validationLanes = readText('docs/VALIDATION_LANES.md');
  const migration = readText('docs/AGENT_FIRST_MIGRATION.md');

  assert.match(readme, /agent-first operating entry/i);
  assert.match(readme, /role-stage/i);
  assert.match(readme, /client\.claimant/i);
  assert.match(readme, /client\.operator/i);
  assert.match(readme, /client\.universe/i);
  assert.match(readme, /--output evidence/i);
  assert.match(readme, /AGENT_FIRST_MIGRATION\.md/i);

  assert.match(onboarding, /claimant/i);
  assert.match(onboarding, /operator/i);
  assert.match(onboarding, /platform-managed/i);
  assert.match(onboarding, /universe/i);
  assert.match(onboarding, /role-stage/i);

  assert.match(boundary, /product-facing role-stage layer/i);
  assert.match(boundary, /client\.claimant/i);
  assert.match(boundary, /client\.operator/i);
  assert.match(boundary, /client\.platformManaged/i);
  assert.match(boundary, /client\.universe/i);

  assert.match(validationLanes, /evidence output/i);
  assert.match(validationLanes, /role-stage/i);

  assert.match(migration, /^# Agent-First Migration Guide/m);
  assert.match(migration, /helper-first/i);
  assert.match(migration, /role-stage/i);
  assert.match(migration, /inspectClaimantReadiness/);
  assert.match(migration, /client\.claimant\.readiness\.inspect/);
  assert.match(migration, /consumeOperatorHandoff/);
  assert.match(migration, /client\.operator\.handoff\.consume/);
  assert.match(migration, /buildRouteContextMatrix/);
  assert.match(migration, /client\.universe\.inspect/);
});
