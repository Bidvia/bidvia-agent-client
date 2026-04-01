import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as publicSurface from '../src/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');

function readText(relativePath: string) {
  return readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

test('public release docs no longer depend on transitional publication wording in the main install path', () => {
  const readme = readText('README.md');
  const onboardingGuide = readText('docs/ONBOARDING.md');
  const contractBoundary = readText('docs/CONTRACT_BOUNDARY.md');
  const roadmap = readText('docs/ROADMAP.md');
  const onboardingDoc = readText('docs/OPENCLAW_GATEWAY_ONBOARDING.md');
  const smokeDoc = readText('docs/OPENCLAW_GATEWAY_SMOKE.md');
  const releaseChecklist = readText('docs/INTERNAL_RELEASE_CHECKLIST.md');
  const releaseNotes = readText('docs/RELEASE_NOTES_LOCAL_ONLY_NEXT_VERSION.md');
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

  for (const document of [readme, onboardingGuide, contractBoundary, roadmap]) {
    assert.match(document, /\.sisyphus\/plans\/agent-client-core-vnext-alignment-and-joint-debug\.md/);
    assert.doesNotMatch(document, /agent-client-next-version-productization/);
  }

  for (const document of [readme, onboardingGuide, contractBoundary, releaseChecklist, releaseNotes]) {
    assert.match(document, /tenantId/);
    assert.match(document, /principalId/);
  }

  for (const document of [readme, onboardingGuide, contractBoundary, releaseNotes]) {
    assert.match(document, /capability-profile/);
    assert.match(document, /authority-profiles/);
  }

  assert.match(readme, /task-dispatch/);
  assert.match(onboardingGuide, /participation-state/);
  assert.match(contractBoundary, /\/runtime\/agents\/:registration_id\/task-dispatches/);
  assert.match(smokeDoc, /credential-less local or sim probes/i);
});

test('public release surface exports the OpenClaw config and companion bundle helpers from the main package entrypoint', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.buildOpenClawConfig, 'function');
  assert.equal(typeof exports.exportOpenClawConfig, 'function');
  assert.equal(typeof exports.buildOpenClawCompanionBundle, 'function');
  assert.equal(typeof exports.exportOpenClawCompanionBundle, 'function');
});
