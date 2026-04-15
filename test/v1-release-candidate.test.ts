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

test('V1 release candidate reflects the actual public release state', () => {
  const packageJson = JSON.parse(readText('package.json')) as {
    version?: string;
  };
  const readme = readText('README.md');
  const releaseNotes = readText('docs/RELEASE_NOTES_LOCAL_ONLY_NEXT_VERSION.md');
  const gate = buildStage3ReleaseGate();

  assert.equal(packageJson.version, '1.0.0');
  assert.equal(gate.status, 'blocked');
  assert.deepEqual(gate.blockedBy, ['plane-adoption-incomplete']);
  assert.deepEqual(gate.waves, [
    {
      wave: 'P0',
      status: 'complete',
      planes: ['identity-session', 'task', 'event-notification'],
    },
    {
      wave: 'P1',
      status: 'blocked',
      planes: ['capability', 'workflow-stage'],
    },
    {
      wave: 'P2',
      status: 'complete',
      planes: ['enterprise-integration'],
    },
  ]);

  assert.match(readme, /current package version is `1\.0\.0`/i);
  assert.match(readme, /`1\.0\.0` package state/i);
  assert.doesNotMatch(readme, /release-ready public surface/i);
  assert.match(readme, /workflow-stage and other packet-incomplete seams remain blocked/i);

  assert.match(releaseNotes, /formal `1\.0\.0` package state/i);
  assert.doesNotMatch(releaseNotes, /Stage 3 release gate is now ready/i);
  assert.match(releaseNotes, /workflow-stage and other packet-incomplete seams remain blocked/i);
});
