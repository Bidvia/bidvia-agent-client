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
  assert.equal(gate.status, 'ready');
  assert.deepEqual(gate.blockedBy, []);
  assert(gate.waves.every((wave) => wave.status === 'complete'));

  assert.match(readme, /current package version is `1\.0\.0`/i);
  assert.match(readme, /formal `1\.0\.0` release/i);
  assert.doesNotMatch(readme, /Stage 3 release gate is still blocked/i);

  assert.match(releaseNotes, /formal `1\.0\.0` release/i);
  assert.match(releaseNotes, /Stage 3 release gate is now ready/i);
  assert.doesNotMatch(releaseNotes, /must not be described as full `1\.0\.0` closure/i);
});
