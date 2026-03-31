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

test('public release docs no longer depend on transitional publication wording in the main install path', () => {
  const readme = readText('README.md');
  const onboardingDoc = readText('docs/OPENCLAW_GATEWAY_ONBOARDING.md');
  const smokeDoc = readText('docs/OPENCLAW_GATEWAY_SMOKE.md');

  for (const document of [readme, onboardingDoc, smokeDoc]) {
    assert.doesNotMatch(document, /once the final (public )?publish gate is open/i);
    assert.doesNotMatch(document, /once publication is actually live/i);
    assert.doesNotMatch(document, /until that gate is open/i);
    assert.doesNotMatch(document, /do not assume the package is already available on npm/i);
  }

  assert.match(readme, /npm install bidvia-agent-client/);
  assert.match(readme, /bidvia-agent-client openclaw-mcp-config/);
  assert.match(readme, /bidvia-agent-client mcp-server/);
  assert.match(onboardingDoc, /bidvia-agent-client mcp-server/);
  assert.match(smokeDoc, /bidvia-agent-client mcp-server/);
});
