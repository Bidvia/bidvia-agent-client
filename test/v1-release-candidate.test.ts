import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildStage3ReleaseGate } from '../src/core-plane-adoption.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');

function readText(relativePath: string) {
  return readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

test('V1 release candidate docs stay honest without depending on internal release notes', () => {
  const packageJson = JSON.parse(readText('package.json')) as { version?: string };
  const readme = readText('README.md');
  const onboarding = readText('docs/ONBOARDING.md');
  const validationLanes = readText('docs/VALIDATION_LANES.md');
  const gate = buildStage3ReleaseGate();

  assert.equal(packageJson.version, '1.0.0');
  assert.equal(gate.status, 'blocked');
  assert.deepEqual(gate.blockedBy, ['plane-adoption-incomplete']);

  assert.match(readme, /current package version is `1\.0\.0`/i);
  assert.match(onboarding, /bounded task closure, not full business closure/i);
  assert.match(validationLanes, /default local docker/i);

  assert.doesNotMatch(readme, /release-ready public surface/i);
  assert.doesNotMatch(readme, /docs\/superpowers\//i);
  assert.doesNotMatch(readme, /INTERNAL_RELEASE_CHECKLIST/i);
});
