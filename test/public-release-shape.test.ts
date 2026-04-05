import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as publicSurface from '../src/index.ts';
import type {
  BidviaExecutionIdentityContext,
  BidviaExecutionSession,
  BidviaRuntimeOwnedResultCommitInput,
  BidviaRuntimeOwnedResultCommitResponse,
  BidviaTaskRuntimeState,
  BuildExecutionSessionInput,
  CreateBidviaTaskRuntimeInput,
} from '../src/contracts.ts';

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
  assert.match(readme, /CLI and MCP are the direct runtime consumers of the shared local runtime core/i);
  assert.match(readme, /OpenClaw stays a config and bundle handoff around that same local stdio MCP path/i);
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
  assert.match(corePlaneGaps, /that completion is proven for the shipped CLI and MCP execution paths/i);
  assert.match(corePlaneGaps, /OpenClaw currently rides that same local stdio MCP path through config and bundle surfaces, rather than as a separately proven direct runtime consumer/i);
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

test('public release surface does not expose internal cli runtime extraction helpers from the main package entrypoint', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal('buildCliOnboardingActionExecutionContext' in exports, false);
  assert.equal('runCliRuntimeOnboardingAction' in exports, false);
  assert.equal('runCliRuntimeExecutionCommand' in exports, false);
});

test('public release contracts preserve compatibility re-exports for runtime-owned session and task types', () => {
  const identity: BidviaExecutionIdentityContext = {
    tenantId: 'tenant-a',
    registrationId: 'areg-1',
    sessionId: 'session-a',
  };
  const buildInput: BuildExecutionSessionInput = {
    sessionId: 'session-envelope-1',
    identity,
    runtime: {
      sessionRef: 'local-session-1',
      transport: 'sdk-client',
      dependencies: {
        createClient: async () => ({
          async createClaim() {
            return { claimId: 'claim-1' };
          },
          async acceptClaim() {
            return { ackId: 'ack-1' };
          },
          async createLease() {
            return { leaseId: 'lease-1' };
          },
          async suspendTaskDispatch() {
            return { suspended: true };
          },
          async resumeTaskDispatch() {
            return { resumed: true };
          },
          async completeTaskDispatch() {
            return { completed: true };
          },
          async failTaskDispatch() {
            return { failed: true };
          },
        }),
        now: () => '2026-04-04T10:00:00.000Z',
      },
    },
    task: {
      localTaskRef: 'local-task-1',
      status: 'idle',
    },
    capabilityMemory: {
      scope: 'local-capability-memory',
      capabilityKey: 'proposal.write',
      memoryRef: 'memory-1',
    },
    hooks: {
      onSessionOpened: [],
      onTaskAttached: [],
      onCapabilityMemoryAccessed: [],
      onTaskDetached: [],
      onSessionClosed: [],
      onTaskReceived: [],
      onTaskClaimed: [],
      onCapabilityCalled: [],
      onResultStaged: [],
      onResultCommitted: [],
      onTaskFailed: [],
      onTaskTimedOut: [],
      onTaskResumed: [],
    },
  };
  const session: BidviaExecutionSession = {
    ...buildInput,
    scope: 'local-execution-session',
    hookAudit: {
      failures: [],
    },
  };
  const runtimeState: BidviaTaskRuntimeState = {
    scope: 'local-task-runtime',
    sessionRef: 'local-session-1',
    localTaskRef: 'local-task-1',
    taskDispatchId: 'dispatch-1',
    status: 'idle',
    attempt: 1,
  };
  const taskRuntimeInput: CreateBidviaTaskRuntimeInput = {
    session,
    taskDispatchId: 'dispatch-1',
  };
  const commitInput: BidviaRuntimeOwnedResultCommitInput = {
    transport: 'cli',
    helperKey: 'proposal.write',
    taskDispatchId: 'dispatch-1',
    resultRef: 'result-1',
    kind: 'proposal',
    terminalState: 'complete',
  };
  const commitResponse: BidviaRuntimeOwnedResultCommitResponse = {
    outcomeRef: 'outcome-1',
  };

  assert.equal(taskRuntimeInput.session.sessionId, 'session-envelope-1');
  assert.equal(runtimeState.scope, 'local-task-runtime');
  assert.equal(commitInput.terminalState, 'complete');
  assert.equal(commitResponse.outcomeRef, 'outcome-1');
});

test('public release keeps runtime-owned contracts behind compatibility re-exports', () => {
  const runtimeContracts = readText('src/runtime/contracts.ts');
  const contracts = readText('src/contracts.ts');
  const runtimeIndex = readText('src/runtime/index.ts');

  assert.match(runtimeContracts, /export interface BidviaExecutionIdentityContext/);
  assert.match(runtimeContracts, /export interface BidviaExecutionSession/);
  assert.match(runtimeContracts, /export interface BidviaTaskRuntimeState/);
  assert.match(runtimeContracts, /export interface BidviaRuntimeOwnedResultCommitInput/);
  assert.match(contracts, /export type \* from '\.\/runtime\/contracts\.js';/);
  assert.match(runtimeIndex, /export \* from '\.\/contracts\.js';/);
});
