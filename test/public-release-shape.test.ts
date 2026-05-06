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
  const integrationCapabilityDiscoveryContract = readText(
    '.sisyphus/evidence/contract-snapshots/2026-05-01/agent-client/integration-capability-discovery-contract.md',
  );
  const enterpriseIntegrationPlaneContract = readText(
    '.sisyphus/evidence/contract-snapshots/2026-05-01/agent-client/enterprise-integration-plane-contract.md',
  );
  const canonicalRouteAndStatusContract = readText(
    '.sisyphus/evidence/contract-snapshots/2026-05-01/shared/canonical-route-and-status-contract.md',
  );

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
  assert.match(corePlaneGaps, /Identity \/ session plane \| packet-grounded-execution/i);
  assert.match(corePlaneGaps, /Task plane \| packet-grounded-execution/i);
  assert.match(corePlaneGaps, /Capability plane \| packet-grounded-read/i);
  assert.match(corePlaneGaps, /Workflow \/ stage plane \| blocked-pending-packet/i);
  assert.match(corePlaneGaps, /Event \/ notification plane \| packet-grounded-execution/i);
  assert.match(corePlaneGaps, /Event \/ notification plane \| packet-grounded-execution \| Notification detail reads are payload-grounded and acknowledgement is the only packet-grounded execution helper in this wave\./i);
  assert.match(corePlaneGaps, /Enterprise integration plane \| packet-grounded-read/i);
  assert.match(corePlaneGaps, /helper-level payload matrix/i);
  assert.match(corePlaneGaps, /three-layer client architecture/i);
  assert.match(corePlaneGaps, /atomic helpers, executable scenario runners, and productized CLI\/MCP surfaces/i);
  assert.match(corePlaneGaps, /packet-grounded-execution/i);
  assert.match(corePlaneGaps, /packet-grounded-read/i);
  assert.match(corePlaneGaps, /blocked-pending-packet/i);
  assert.match(corePlaneGaps, /compatibility-only/i);
  assert.match(corePlaneGaps, /CLI and MCP execution now write local accumulation through the runtime core/i);
  assert.match(corePlaneGaps, /sign-up, sign-in, select-org, and session hygiene/i);
  assert.match(corePlaneGaps, /notification detail visibility is packet-grounded-read and acknowledgement is the only packet-grounded-execution helper in this wave/i);
  assert.match(corePlaneGaps, /notification delivery, retry, and expiry remain compatibility-only/i);
  assert.match(corePlaneGaps, /integration and commercial read helpers are packet-grounded/i);
  assert.match(corePlaneGaps, /workflow-stage remains the only broadly blocked Core-facing plane/i);
  assert.doesNotMatch(corePlaneGaps, /hosted runtime behavior is shipped/i);

  for (const document of [onboardingGuide, contractBoundary]) {
    assert.match(document, /docs\/superpowers\/plans\/2026-04-30-client-truth-alignment-v3-implementation\.md/);
    assert.doesNotMatch(document, /agent-client-v1-payload-contract-release/);
    assert.doesNotMatch(document, /agent-client-next-version-productization/);
  }

  assert.doesNotMatch(readme, /\.sisyphus\/plans\//);

  for (const document of [readme, onboardingGuide, releaseChecklist, releaseNotes]) {
    assert.match(document, /downstream-contract-center/i);
  }

  for (const document of [readme, roadmap, onboardingGuide, releaseChecklist, releaseNotes]) {
    assert.match(document, /Stage 3 (release )?(closure|gate)/i);
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
  assert.match(roadmap, /agent-first with bounded login\/session prerequisite support/i);
  assert.match(roadmap, /helper-level payload matrix/i);
  assert.match(roadmap, /identity-session \| packet-grounded-execution/i);
  assert.match(roadmap, /task \| packet-grounded-execution/i);
  assert.match(roadmap, /capability \| packet-grounded-read/i);
  assert.match(roadmap, /workflow-stage \| blocked-pending-packet/i);
  assert.match(roadmap, /event-notification \| packet-grounded-execution/i);
  assert.match(roadmap, /enterprise-integration \| packet-grounded-read/i);
  assert.match(contractBoundary, /sign-up-personal/i);
  assert.match(contractBoundary, /sign-up-enterprise/i);
  assert.match(contractBoundary, /sign-in/i);
  assert.match(contractBoundary, /select-org/i);
  assert.match(contractBoundary, /account-me/i);
  assert.match(contractBoundary, /session-refresh/i);
  assert.match(contractBoundary, /session-revoke/i);
  assert.match(contractBoundary, /`GET \/runtime\/account\/agents\/:agentId\/notifications\/:notification_id`/i);
  assert.match(contractBoundary, /`POST \/runtime\/account\/agents\/:agentId\/notifications\/:notification_id\/acknowledgements`/i);
  assert.match(contractBoundary, /`GET \/runtime\/account\/integration-capabilities`/i);
  assert.match(contractBoundary, /`GET \/runtime\/account\/agents\/:agentId\/integrations\/:integrationCode\/eligibility`/i);
  assert.doesNotMatch(contractBoundary, /`POST \/runtime\/account\/agents\/:agentId\/integrations\/:integrationCode\/inbound`/i);
  assert.match(contractBoundary, /compatibility-only support seams/i);
  assert.doesNotMatch(contractBoundary, /`GET \/runtime\/account\/agents\/:registration_id\/notifications`/i);
  assert.doesNotMatch(contractBoundary, /`GET \/runtime\/notifications\/:notification_id`/i);
  assert.doesNotMatch(contractBoundary, /`POST \/runtime\/notifications\/:notification_id\/acknowledge`/i);
  assert.match(contractBoundary, /agent-first but login-capable/i);
  assert.match(contractBoundary, /executable, review-safe, and compatibility-only/i);
  assert.match(integrationCapabilityDiscoveryContract, /`GET \/runtime\/account\/integration-capabilities`/i);
  assert.match(integrationCapabilityDiscoveryContract, /`GET \/runtime\/account\/agents\/:agentId\/integrations\/:integrationCode\/eligibility`/i);
  assert.doesNotMatch(integrationCapabilityDiscoveryContract, /`POST \/runtime\/account\/agents\/:agentId\/integrations\/:integrationCode\/inbound`/i);
  assert.match(enterpriseIntegrationPlaneContract, /`GET \/runtime\/account\/integration-capabilities`/i);
  assert.match(enterpriseIntegrationPlaneContract, /`GET \/runtime\/account\/agents\/:agentId\/integrations\/:integrationCode\/eligibility`/i);
  assert.doesNotMatch(enterpriseIntegrationPlaneContract, /`POST \/runtime\/account\/agents\/:agentId\/integrations\/:integrationCode\/inbound`/i);
  assert.match(canonicalRouteAndStatusContract, /`GET \/runtime\/account\/integration-capabilities`/i);
  assert.match(canonicalRouteAndStatusContract, /`GET \/runtime\/account\/agents\/:agentId\/integrations\/:integrationCode\/eligibility`/i);
  assert.doesNotMatch(canonicalRouteAndStatusContract, /`POST \/runtime\/account\/agents\/:agentId\/integrations\/:integrationCode\/inbound`/i);
  assert.match(onboardingGuide, /agent-first but login-capable/i);
  assert.match(onboardingGuide, /bounded account\/session prerequisite support/i);
  assert.match(onboardingGuide, /bounded task closure, not full business closure/i);
  assert.match(onboardingGuide, /bounded local stdio MCP seam now includes review-safe and explicit execution tooling/i);
  assert.doesNotMatch(onboardingGuide, /MCP stays read-only/i);
  assert.match(onboardingGuide, /bidvia sign-in/);
  assert.match(onboardingGuide, /bidvia sign-up-personal/);
  assert.match(onboardingGuide, /bidvia sign-up-enterprise/);
  assert.match(onboardingGuide, /bidvia select-org/);
  assert.match(releaseNotes, /agent-first but login-capable/i);
  assert.match(releaseNotes, /helper-level payload matrix/i);
  assert.match(releaseNotes, /platform-auth/i);
  assert.match(websiteHandoff, /agent-first but login-capable/i);
  assert.match(websiteHandoff, /sign-up-personal/i);
  assert.match(websiteHandoff, /sign-in/i);
  assert.match(websiteHandoff, /select-org/i);
  assert.match(roadmap, /P0, P1, and P2 adoption/i);
  assert.match(onboardingGuide, /route-context-matrix/i);
  assert.match(onboardingGuide, /runtime-capabilities/i);
  assert.match(readme, /formal `1\.0\.0` release/i);
  assert.match(releaseNotes, /formal release packet/i);
  assert.match(readme, /Stage 3 release gate remains blocked/i);
  assert.match(releaseNotes, /Stage 3 release gate remains blocked/i);
  assert.match(releaseChecklist, /do not describe `1\.0\.0` closure as complete/i);
  assert.match(releaseNotes, /downstream contract center/i);
  assert.doesNotMatch(releaseNotes, /Stage 3 release gate is now ready/i);
  assert.doesNotMatch(readme, /release-ready public surface/i);

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
