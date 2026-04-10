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
  assert.match(corePlaneGaps, /Identity \/ session plane \| frozen-in-Core/);
  assert.match(corePlaneGaps, /Task plane \| frozen-in-Core/);
  assert.match(corePlaneGaps, /Capability plane \| frozen-in-Core/);
  assert.match(corePlaneGaps, /Workflow \/ stage plane \| frozen-in-Core/);
  assert.match(corePlaneGaps, /Event \/ notification plane \| frozen-in-Core/);
  assert.match(corePlaneGaps, /Enterprise integration plane \| frozen-in-Core/);
  assert.match(corePlaneGaps, /Local runtime \/ execution session plane \| frozen/);
  assert.match(corePlaneGaps, /Local accumulation \/ memory plane \| frozen/);
  assert.match(corePlaneGaps, /blocked pending payload packet/i);
  assert.match(corePlaneGaps, /CLI and MCP execution now write local accumulation through the runtime core/i);
  assert.doesNotMatch(corePlaneGaps, /should add one explicit identity\/session adapter/i);
  assert.doesNotMatch(corePlaneGaps, /does not yet expose one explicit event\/notification plane adapter/i);
  assert.doesNotMatch(corePlaneGaps, /should move capability adoption behind one capability-plane adapter/i);
  assert.doesNotMatch(corePlaneGaps, /What still needs adoption work in this repo:[\s\S]*one explicit workflow\/stage adapter/i);
  assert.doesNotMatch(corePlaneGaps, /What still needs adoption work in this repo:[\s\S]*one explicit enterprise integration plane adapter/i);
  assert.doesNotMatch(corePlaneGaps, /shipped pricing, asset, evidence, document, attachment, and commercial-action helper slices/i);
  assert.match(corePlaneGaps, /identity\/session adapter now centralizes onboarding/i);
  assert.match(corePlaneGaps, /event\/notification adapter now exposes frozen route visibility/i);
  assert.match(corePlaneGaps, /The client now groups bounded asset, evidence, document, attachment, and commercial-action helper slices behind one enterprise integration adapter/i);
  assert.match(corePlaneGaps, /one explicit enterprise integration adapter now groups the bounded helper slices/i);
  assert.doesNotMatch(corePlaneGaps, /hosted runtime behavior is shipped/i);

  for (const document of [readme, onboardingGuide, contractBoundary]) {
    assert.match(document, /\.sisyphus\/plans\/agent-client-stage-2-stage-3-frozen-plane-execution\.md/);
    assert.doesNotMatch(document, /agent-client-next-version-productization/);
  }

  for (const document of [readme, onboardingGuide, releaseChecklist, releaseNotes]) {
    assert.match(document, /downstream-contract-center/i);
  }

  for (const document of [readme, roadmap, onboardingGuide, releaseChecklist, releaseNotes]) {
    assert.match(document, /Stage 3 (release )?(closure|gate)/i);
    assert.match(document, /blocked/i);
  }

  for (const document of [readme, onboardingGuide, releaseChecklist, releaseNotes]) {
    assert.match(document, /npm test/);
    assert.match(document, /npm run typecheck/);
    assert.match(document, /npm run build/);
    assert.match(document, /npm run validate/);
    assert.match(document, /npm run validate:release-readiness/);
    assert.match(document, /npm run validate:release-gate/);
  }

  assert.match(readme, /validator commands to stay green together/i);
  assert.doesNotMatch(readme, /validator evidence is present/i);
  assert.match(roadmap, /P0, P1, and P2 adoption/i);
  assert.match(onboardingGuide, /route-context-matrix/i);
  assert.match(onboardingGuide, /runtime-capabilities/i);
  assert.match(releaseChecklist, /If any Stage 3 gate surface still reports blocked/i);
  assert.match(releaseNotes, /must not be described as full `1\.0\.0` closure/i);
  assert.doesNotMatch(releaseNotes, /completed shipped package surface with full `1\.0\.0` closure/i);

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
  assert.equal(typeof exports.buildEventNotificationPlaneView, 'function');
  assert.equal(typeof exports.buildStage3ReleaseGate, 'function');
});
