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
  const openClawExample = readText('examples/openclaw-gateway-bidvia-setup.md');

  for (const document of [readme, onboardingDoc, smokeDoc]) {
    assert.doesNotMatch(document, /once the final (public )?publish gate is open/i);
    assert.doesNotMatch(document, /once publication is actually live/i);
    assert.doesNotMatch(document, /until that gate is open/i);
    assert.doesNotMatch(document, /do not assume the package is already available on npm/i);
  }

  for (const document of [readme, onboardingDoc, openClawExample]) {
    assert.match(document, /npm install @bidvia\/client/);
    assert.match(document, /bidvia mcp-server/);
    assert.doesNotMatch(document, /npm install bidvia-agent-client/);
    assert.doesNotMatch(document, /bidvia-agent-client mcp-server/);
  }

  assert.match(readme, /bidvia openclaw-mcp-config/);
  assert.match(readme, /bidvia onboarding-readiness/);
  assert.match(onboardingDoc, /bidvia openclaw-mcp-config/);
  assert.match(smokeDoc, /bidvia openclaw-mcp-config/);
  assert.match(smokeDoc, /bidvia mcp-server/);
  assert.doesNotMatch(readme, /bidvia-agent-client openclaw-mcp-config/);
  assert.doesNotMatch(smokeDoc, /bidvia-agent-client openclaw-mcp-config/);
});
