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
  const corePlaneGaps = readText('docs/CORE_AGENT_CLIENT_PLANE_CONTRACT_GAPS.md');
  const onboardingDoc = readText('docs/OPENCLAW_GATEWAY_ONBOARDING.md');
  const smokeDoc = readText('docs/OPENCLAW_GATEWAY_SMOKE.md');
  const websiteHandoff = readText('docs/WEBSITE_FIRST_ACCESS_HANDOFF.md');
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
  assert.match(readme, /bidvia onboard/);
  assert.match(onboardingGuide, /bidvia onboard/);
  assert.match(onboardingDoc, /bidvia openclaw-mcp-config/);
  assert.match(smokeDoc, /bidvia openclaw-mcp-config/);
  assert.match(smokeDoc, /bidvia mcp-server/);
  assert.match(websiteHandoff, /Learn/);
  assert.match(websiteHandoff, /Public Provisional create -> query -> claim/);
  assert.match(websiteHandoff, /Governed Run/);
  assert.match(websiteHandoff, /bidvia onboard/);
  assert.match(websiteHandoff, /stdio MCP first/i);
  assert.doesNotMatch(websiteHandoff, /HTTP MCP product/i);
  assert.doesNotMatch(readme, /bidvia-agent-client openclaw-mcp-config/);
  assert.doesNotMatch(smokeDoc, /bidvia-agent-client openclaw-mcp-config/);

  assert.match(corePlaneGaps, /Stage 1 is complete on the client side/i);
  assert.match(corePlaneGaps, /Identity \/ session plane \| partial/);
  assert.match(corePlaneGaps, /Task plane \| partial/);
  assert.match(corePlaneGaps, /Capability plane \| partial/);
  assert.match(corePlaneGaps, /Workflow \/ stage plane \| missing/);
  assert.match(corePlaneGaps, /Event \/ notification plane \| missing/);
  assert.match(corePlaneGaps, /Enterprise integration plane \| partial/);
  assert.match(corePlaneGaps, /Local runtime \/ execution session plane \| frozen/);
  assert.match(corePlaneGaps, /Local accumulation \/ memory plane \| frozen/);
  assert.match(corePlaneGaps, /CLI and MCP execution now write local accumulation through the runtime core/i);
  assert.doesNotMatch(corePlaneGaps, /hosted runtime behavior is shipped/i);

  for (const document of [readme, onboardingGuide, contractBoundary]) {
    assert.match(document, /\.sisyphus\/plans\/agent-client-core-vnext-alignment-and-joint-debug\.md/);
    assert.doesNotMatch(document, /agent-client-next-version-productization/);
  }

  assert.match(roadmap, /This file remains the single roadmap for `bidvia-agent-client`\./);
  assert.match(roadmap, /Individual `\.sisyphus\/plans\/\*\.md` files are execution slices/);
  assert.doesNotMatch(roadmap, /agent-client-core-vnext-alignment-and-joint-debug/);
  assert.doesNotMatch(roadmap, /agent-client-next-version-productization/);

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
