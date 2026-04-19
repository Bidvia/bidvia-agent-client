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

test('client docs distinguish local validation lanes and task-write-ready guidance boundaries', () => {
  const onboarding = readText('docs/ONBOARDING.md');
  const roadmap = readText('docs/ROADMAP.md');

  assert.match(onboarding, /default local docker/i);
  assert.match(onboarding, /proof-lane/i);
  assert.match(onboarding, /admin-session/i);
  assert.match(onboarding, /seeded/i);
  assert.match(onboarding, /runtime-generated object/i);
  assert.match(onboarding, /fixed proof ids are not assumed/i);
  assert.match(onboarding, /task-write-ready progression/i);
  assert.match(onboarding, /not an implied side effect of claim/i);
  assert.match(onboarding, /where admin\/operator context is required/i);

  assert.match(roadmap, /validation lane/i);
  assert.match(roadmap, /proof-lane/i);
  assert.match(roadmap, /task-write-ready/i);
});
