import test from 'node:test';
import assert from 'node:assert/strict';

import type { BidviaHeartbeatInput } from '../src/contracts.ts';
import { runCli } from '../src/cli.ts';

function setEnvVar(name: string, value: string | undefined) {
  const previousValue = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }

  return () => {
    if (previousValue === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = previousValue;
    }
  };
}

test('runCli prints grouped help output for the learn, create-claim, run, diagnostics, and advanced review journey', async () => {
  const lines: string[] = [];

  const exitCode = await runCli(['--help'], {
    printLine: (value) => {
      lines.push(value);
    },
    printJson: () => {
      throw new Error('help should not print json');
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(lines, [
    'bidvia',
    'OpenClaw primary path: export stdio MCP config first, then add the companion bundle when you want bundle/bootstrap packaging.',
    'OpenClaw scope for this version: local-first, Core-truth-consuming, stdio MCP primary.',
    'Stage 1 client runtime is complete locally: CLI and MCP execution share one runtime core and local accumulation layer.',
    'Getting Started (Agent-first Learn):',
    '  onboard',
    '  whoami',
    '  context show',
    '  doctor',
    '  onboarding-readiness',
    'Prerequisite Account / Session Support:',
    '  sign-in --input ...',
    '  sign-up-personal --input ...',
    '  sign-up-enterprise --input ...',
    '  account-me',
    '  select-org --input ...',
    '  agent-self-service --agent-id ... --input ...',
    '  account-agent-dispatch-authority-request --agent-id ...',
    '  session-refresh',
    '  session-revoke',
    'Advanced Integration (OpenClaw / Companion Bundle):',
    '  openclaw-mcp-config',
    '  openclaw-bundle-export --output ...',
    'Agent Onboarding (Public Provisional -> Claim):',
    '  create-provisional-agent --provisional-agent-ref ...',
    '  query-provisional-agent --provisional-agent-ref ...',
    '  claim-provisional-agent --provisional-agent-ref ... --claim-token ...',
    'Agent Runtime (Run):',
    '  route-context-matrix',
    '  registration-lifecycle-plan',
    '  registered-agent-operations-plan',
    '  mcp-server',
    '  industry-universe-execution --input ...',
    '  heartbeat [--dry-run]',
    '  sync-upload [--dry-run]',
    '  evidence [--dry-run]',
    '  proposal [--dry-run]',
    'Diagnostics:',
    '  environment-mode',
    '  runtime-capabilities',
    '  launch-topology-smoke',
    '  server-capabilities',
    '  operator-discovery',
    'Advanced Governance / Internal Review:',
    '  account-agents',
    '  account-agent --agent-id ...',
    '  account-agent-dispatch-authority --agent-id ...',
    '  account-agent-bindings',
    '  account-records',
    '  agent-presence --registration-id ...',
    '  agent-authority --registration-id ...',
    '  agent-readiness --registration-id ...',
    '  agent-summary --registration-id ...',
    '  agent-registrations',
    '  agent-registration --registration-id ...',
    '  authority-profiles',
    '  agent-authority-profile --registration-id ...',
    '  agent-authority-ladder --registration-id ...',
    '  capability-profiles',
    '  agent-capability-profile --registration-id ...',
    '  participation-states --registration-id ...',
    '  participation-state --registration-id ... --participation-state-id ...',
    '  task-dispatches --registration-id ...',
    '  task-dispatch --registration-id ... --task-dispatch-id ...',
    '  canonical-semantic-concepts',
    '  canonical-semantic-concept --concept-id ...',
    '  canonical-semantic-labels',
    '  canonical-semantic-label --label-id ...',
    '  canonical-semantic-mappings',
    '  canonical-semantic-mapping --mapping-id ...',
    '  pricing-bases',
    '  pricing-basis --pricing-basis-id ...',
    '  pricing-rule-atoms',
    '  pricing-rule-atom --pricing-rule-atom-id ...',
    '  pricing-quotation-method-modules',
    '  pricing-quotation-method-module --pricing-quotation-method-module-id ...',
    '  pricing-quote-templates',
    '  pricing-quote-template --pricing-quote-template-id ...',
    '  pricing-quotations',
    '  pricing-quotation --pricing-quotation-id ...',
    '  pricing-explanations',
    '  pricing-explanation --pricing-explanation-id ...',
    '  document-artifacts',
    '  document-artifact --document-artifact-id ...',
    '  media-assets',
    '  media-asset --media-asset-id ...',
    '  evidence-assets',
    '  evidence-asset --evidence-asset-id ...',
    '  attachment-bindings',
    '  attachment-binding --attachment-binding-id ...',
    '  industry-universe-plan',
    '  industry-universe-review-packet-preview',
    '  industry-universe-review-packet-export',
    '  connection-approval-plan',
    '  connection-approval-review-packet-preview',
    '  connection-approval-review-packet-export',
    '  opportunity-package-handoff-plan',
    '  opportunity-package-handoff-review-packet-preview',
    '  opportunity-package-handoff-review-packet-export',
    '  multi-business-chain-verification-wave-preview',
    '  commercial-action-verification-wave-preview',
    '  verification-bundle-preview [--input registration-lifecycle|registered-agent-operations]',
    '  verification-bundle-export [--input registration-lifecycle|registered-agent-operations]',
  ]);
});

test('runCli prints operator discovery snapshots for CLI route metadata and local MCP packaging', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['operator-discovery'], {
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('operator-discovery should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(printed.length, 1);
  const snapshot = printed[0] as {
    command: string;
    scope: string;
      cli: {
        routeCapabilities: Array<{ helperKey: string; routePathTemplate: string; accessContextFamily: string }>;
        planeAdoption: Array<{
          plane: string;
          frozenInCore: boolean;
          payloadPacketStatus: string;
          canExecuteNow: boolean;
          blockedBy: string | null;
        }>;
        releaseGate: {
          status: string;
          blockedBy: string[];
          requiredValidatorCommands: string[];
          waves: Array<{ wave: string; status: string; planes: string[] }>;
        };
      nextStageReadRouteDiscoveryGroups: Array<{ groupKey: string; discoveryStatus: string; memberCount: number }>;
      nextStepHints: Array<{ journeyKey: string; relevance: string; command: string; rationale: string }>;
      executionGuidance: Array<{
        guidanceKey: string;
        lane: string;
        appliesWhen: string;
        signal: string;
        nextStepOwner: string;
        nextStepAction: string;
        checkpoints?: Array<{
          stepKey: string;
          actor: string;
          lane: string;
          surfacedAction: string;
          verificationCheckpoint: {
            helperKeys: string[];
            truthFields: string[];
            guidance: string;
          };
          failClosedState: string;
        }>;
      }>;
      };
    mcp: {
      serverBoundary: { transport: string; hosted: boolean; remoteDiscovery: boolean; sourceOfTruth: string };
      discoverability: {
        truthFetchReadOnly: boolean;
        reviewSafeLocalOnly: boolean;
        executionRequiresLocalExecutionClient: boolean;
      };
      tools: Array<{
        toolName: string;
        routePathTemplate: string;
        httpMethod: string;
        scope: string;
        runnable: boolean;
        blockedBy: string | null;
      }>;
    };
  };
  assert.equal(snapshot.command, 'operator-discovery');
  assert.equal(snapshot.scope, 'local-only');
  assert.deepEqual(snapshot.cli.planeAdoption, [
    {
      plane: 'identity-session',
      frozenInCore: true,
      payloadPacketStatus: 'packet-grounded',
      descriptiveVisibility: 'descriptive-plane-visible',
      executableHelperEligibility: 'packet-grounded-execution',
      blockedBy: null,
      notes: ['Adopt canonical onboarding and governed-read posture without inventing broader session semantics.'],
    },
    {
      plane: 'task',
      frozenInCore: true,
      payloadPacketStatus: 'packet-grounded',
      descriptiveVisibility: 'descriptive-plane-visible',
      executableHelperEligibility: 'packet-grounded-execution',
      blockedBy: null,
      notes: ['Keep local task shells descriptive-only and block packet-incomplete task semantics.'],
    },
    {
      plane: 'capability',
      frozenInCore: true,
      payloadPacketStatus: 'packet-grounded',
      descriptiveVisibility: 'descriptive-plane-visible',
      executableHelperEligibility: 'packet-grounded-read',
      blockedBy: null,
      notes: ['Route remote capability refresh through one fail-closed capability-plane adapter.'],
    },
    {
      plane: 'workflow-stage',
      frozenInCore: true,
      payloadPacketStatus: 'blocked-pending-packet',
      descriptiveVisibility: 'descriptive-plane-visible',
      executableHelperEligibility: 'blocked-pending-packet',
      blockedBy: 'core-plane-payload-packet-not-yet-frozen',
      notes: ['Keep local journey labels separate from Core workflow and stage truth until packet-grounded.'],
    },
    {
      plane: 'event-notification',
      frozenInCore: true,
      payloadPacketStatus: 'packet-grounded',
      descriptiveVisibility: 'descriptive-plane-visible',
      executableHelperEligibility: 'packet-grounded-execution',
      blockedBy: null,
      notes: ['Expose frozen notification visibility and packet-grounded delivery or acknowledgement semantics directly from Core-owned payload truth.'],
    },
    {
      plane: 'enterprise-integration',
      frozenInCore: true,
      payloadPacketStatus: 'packet-grounded',
      descriptiveVisibility: 'descriptive-plane-visible',
      executableHelperEligibility: 'packet-grounded-execution',
      blockedBy: null,
      notes: ['Regroup bounded commercial, document, media, attachment, and evidence helpers behind one plane adapter.'],
    },
  ]);
  assert.deepEqual(snapshot.cli.releaseGate, {
    status: 'blocked',
    blockedBy: ['plane-adoption-incomplete'],
    requiredValidatorCommands: [
      'npm test',
      'npm run typecheck',
      'npm run build',
      'npm run validate',
      'npm run validate:release-readiness',
      'npm run validate:release-gate',
    ],
    waves: [
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
    ],
  });
  assert.deepEqual(snapshot.cli.routeCapabilities.find((entry) => entry.helperKey === 'listAccountAgents'), {
    helperKey: 'listAccountAgents',
    routePathTemplate: '/runtime/account/agents',
    httpMethod: 'GET',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    contextSemantic: 'session',
  });
  assert.deepEqual(snapshot.cli.routeCapabilities.find((entry) => entry.helperKey === 'getAgentReadiness'), {
    helperKey: 'getAgentReadiness',
    routePathTemplate: '/runtime/agents/:agent_registration_id/readiness',
    httpMethod: 'GET',
    accessContextFamily: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    contextSemantic: 'principal-governed-read',
    capabilityPlaneCapabilityMode: 'packet-grounded-read',
    dispatchEligibilityDerivedFromCapabilityReadTruth: false,
    governedRunAuthorizationDerivedFromCapabilityReadTruth: false,
  });
  assert.deepEqual(snapshot.cli.routeCapabilities.find((entry) => entry.helperKey === 'listCanonicalSemanticLabels'), {
    helperKey: 'listCanonicalSemanticLabels',
    routePathTemplate: '/runtime/canonical-semantic-labels',
    httpMethod: 'GET',
    accessContextFamily: 'tenant',
    requiredContext: ['tenantId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    contextSemantic: 'tenant',
  });
  assert.deepEqual(snapshot.cli.nextStageReadRouteDiscoveryGroups.find((entry) => entry.groupKey === 'governance-deep-reads'), {
    groupKey: 'governance-deep-reads',
    label: 'Richer governance deep reads',
    discoveryStatus: 'metadata-only',
    discoveryOnly: true,
    serverTruthClaimed: false,
    memberCount: 0,
  });
  assert.deepEqual(snapshot.cli.nextStepHints, [
    {
      journeyKey: 'public-first-onboarding',
      journeyStage: 'governed-run-execution',
      journeyStageSemantics: 'local-only',
      relevance: 'public-first-common',
      command: 'registration-lifecycle-plan',
      rationale: 'Use the lifecycle plan next so the first successful onboarding path stays aligned with the shipped provisional-to-registration chain.',
    },
    {
      journeyKey: 'governed-run',
      journeyStage: 'governed-run-support',
      journeyStageSemantics: 'local-only',
      relevance: 'governed-run-secondary',
      command: 'account-agent --agent-id ...',
      rationale: 'Use the canonical account-plane claimed-agent detail readback first so post-claim continuation starts from the current account-owned surface instead of older registration-bound operational packaging.',
    },
  ]);
  assert.deepEqual(snapshot.cli.executionGuidance, [
    {
      guidanceKey: 'task-write-ready',
      lane: 'default-local-docker',
      appliesWhen: 'route-exists-but-subject-not-runnable',
      signal: 'authority_class_not_dispatchable',
      nextStepOwner: 'operator-or-admin',
      nextStepAction: 'Follow the surfaced task-write-ready progression and keep unresolved Core-owned progression visible instead of assuming claim is sufficient.',
      checkpoints: [
        {
          stepKey: 'self-service-patch',
          actor: 'external-claimed-agent',
          lane: 'default-local-docker',
          surfacedAction: 'Patch claimed-agent self-service state first so task-dispatch acceptance and related readiness inputs are explicit before requesting operator intervention.',
          verificationCheckpoint: {
            helperKeys: ['getAgentReadiness'],
            truthFields: ['taskWriteReady', 'dispatchEligibility'],
            guidance: 'Re-read readiness after the self-service patch and stay blocked if Core truth still does not show task-write-ready or dispatch-eligible state.',
          },
          failClosedState: 'A successful self-service patch does not itself make the claimed agent task-write-ready or dispatch-eligible.',
        },
        {
          stepKey: 'dispatch-authority-request',
          actor: 'external-claimed-agent',
          lane: 'default-local-docker',
          surfacedAction: 'If readiness is still blocked, submit the bounded dispatch-authority request rather than assuming claim already granted runnable authority.',
          verificationCheckpoint: {
            helperKeys: ['getAccountAgentDispatchAuthority', 'getAgentReadiness'],
            truthFields: ['taskWriteReady', 'dispatchEligibility'],
            guidance: 'Re-read dispatch-authority and readiness after the request; treat the request as pending until Core-owned truth changes.',
          },
          failClosedState: 'Submitting the request alone does not make the subject dispatchable and does not close operator/admin review.',
        },
        {
          stepKey: 'operator-review-closure',
          actor: 'operator-or-admin',
          lane: 'default-local-docker',
          surfacedAction: 'Wait for the real operator/admin review closure on the requested authority path instead of inventing a client-side approval outcome.',
          verificationCheckpoint: {
            helperKeys: ['getAccountAgentDispatchAuthority', 'getAgentReadiness'],
            truthFields: ['taskWriteReady', 'dispatchEligibility'],
            guidance: 'After review closes, re-read the surfaced truth helpers to confirm whether Core now reports runnable authority.',
          },
          failClosedState: 'If operator/admin closure is absent or unresolved, keep the subject non-dispatchable.',
        },
        {
          stepKey: 'external-binding-completion-unresolved',
          actor: 'operator-or-admin',
          lane: 'default-local-docker',
          surfacedAction: 'Inspect the shipped account-agent binding read surface to confirm visibility, and only use claimant or operator/admin binding writes when the current Core-owned route/body contract for that lane is explicit. The repo still does not ship a first-class binding-completion helper, so stay fail-closed instead of guessing the write path.',
          verificationCheckpoint: {
            helperKeys: ['listAccountAgentBindings'],
            truthFields: [],
            guidance: 'Use the account-agent binding read surface for visibility and verify returned task-write-ready or dispatch-eligibility truth after any binding write. Current repo truth does not yet package a first-class binding-completion helper, and claimant and operator routes use different body contracts.',
          },
          failClosedState: 'Until the current lane has an explicit Core-owned binding route/body contract and the returned reads confirm runnable truth, keep the subject non-dispatchable.',
        },
        {
          stepKey: 'post-step-truth-check',
          actor: 'external-claimed-agent',
          lane: 'default-local-docker',
          surfacedAction: 'Use the shipped read helpers to verify the final task-write-ready and dispatch-eligibility truth before attempting task execution.',
          verificationCheckpoint: {
            helperKeys: ['getAgentReadiness', 'getAccountAgentDispatchAuthority'],
            truthFields: ['taskWriteReady', 'dispatchEligibility'],
            guidance: 'Only treat the progression as complete when the returned truth confirms task-write-ready and dispatch-eligibility state.',
          },
          failClosedState: 'If the post-step reads do not confirm both truth fields, remain fail-closed and do not treat the subject as runnable.',
        },
      ],
    },
    {
      guidanceKey: 'authorization-projection',
      lane: 'default-local-docker',
      appliesWhen: 'account-plane-succeeds-but-governed-runtime-still-denied',
      signal: 'active_role_binding_required',
      nextStepOwner: 'enterprise-admin',
      nextStepAction: 'Keep claimant continuation on the account-owned plane, use only the allowed account/session/org repair actions surfaced by Core, and if the gate still remains after those repairs, treat it as an unresolved Core-owned authorization projection issue rather than inventing a new claimant or operator workflow.',
    },
    {
      guidanceKey: 'proof-lane',
      lane: 'proof-lane-admin-session',
      appliesWhen: 'deterministic-proof-validation',
      signal: 'admin-session-required',
      nextStepOwner: 'admin',
      nextStepAction: 'Use a real admin session for proof-lane walkthroughs rather than assuming fixed proof ids are runnable on default local docker.',
    },
    {
      guidanceKey: 'runtime-generated-closure',
      lane: 'runtime-generated',
      appliesWhen: 'business-universe-closure',
      signal: 'fixed-fixture-not-required',
      nextStepOwner: 'agent',
      nextStepAction: 'Create the required runtime objects yourself and continue with the returned ids instead of depending on fixed fixture identifiers.',
    },
  ]);
  assert.deepEqual(snapshot.mcp.serverBoundary, {
    transport: 'stdio',
    hosted: false,
    remoteDiscovery: false,
    sourceOfTruth: 'local-sdk-helpers',
  });
  assert.deepEqual(snapshot.mcp.discoverability, {
    truthFetchReadOnly: true,
    reviewSafeLocalOnly: true,
    executionRequiresLocalExecutionClient: true,
  });
  assert.deepEqual(snapshot.mcp.tools.find((tool) => tool.toolName === 'account-agents-read'), {
    toolName: 'account-agents-read',
    description: 'Reads the current governed account agent records through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaTruthFetchEmptyInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'listAccountAgents',
      capabilityKey: 'listAccountAgents',
    },
    routePathTemplate: '/runtime/account/agents',
    httpMethod: 'GET',
    scope: 'read',
    level: 'atomic-route',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
  });
  assert.deepEqual(snapshot.mcp.tools.find((tool) => tool.toolName === 'heartbeat-execution'), {
    toolName: 'heartbeat-execution',
    description: 'Executes the real remote heartbeat over the local registration-bound client seam.',
    inputSchemaRef: {
      schemaKey: 'BidviaHeartbeatInput',
    },
    outputMode: 'execution-result',
    helperRef: {
      helperKey: 'heartbeat-execution',
      capabilityKey: 'postHeartbeat',
    },
    routePathTemplate: '/runtime/agents/:registrationId/heartbeat',
    httpMethod: 'POST',
    scope: 'write',
    level: 'atomic-route',
    accessContextFamily: 'registration',
    requiredContext: ['tenantId', 'registrationId', 'principalId'],
    localCapabilityTier: 'L2-registration-runtime',
    localCapabilityRiskTier: 'runtime-execution',
    runnable: true,
    blockedBy: null,
          taskPlaneCapabilityMode: 'packet-grounded-execution',
  });
});

test('runCli prints public-first onboarding readiness without requiring environment switching', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['onboarding-readiness'], {
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('onboarding-readiness should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(printed.length, 1);
  const snapshot = printed[0] as {
    command: string;
    defaults: {
      baseUrl: string;
      environmentMode: string;
      environmentSelectionRequired: boolean;
    };
    governedReadPosture: {
      accessContextFamily: string;
      requiredContext: string[];
      adminSessionOptional: boolean;
      operatorGuidance: string;
    };
    journey: {
      journeyKey: string;
      label: string;
      steps: Array<{
        helperKey: string;
        routePathTemplate: string;
        accessContextFamily: string;
        contextSemantic: string;
        requiredContext: string[];
      }>;
      firstSuccessNextStep: {
        command: string;
        rationale: string;
        journeyStage: string;
        journeyStageSemantics: string;
      };
    };
    postClaimSupport: {
      label: string;
      progression: {
        guidanceKey: string;
        lane: string;
        appliesWhen: string;
        signal: string;
        nextStepOwner: string;
        nextStepAction: string;
        checkpoints: Array<{
          stepKey: string;
          actor: string;
          lane: string;
          surfacedAction: string;
          surfacedSteps: Array<{
            helperKey: string;
            routePathTemplate: string;
            accessContextFamily: string;
            contextSemantic: string;
            requiredContext: string[];
          }>;
          verificationCheckpoint: {
            helperKeys: string[];
            truthFields: string[];
            guidance: string;
          };
          failClosedState: string;
        }>;
      };
    };
  };
  assert.equal(snapshot.command, 'onboarding-readiness');
  assert.deepEqual(snapshot.defaults, {
    baseUrl: 'https://api.bidvia.cn',
    environmentMode: 'production',
    environmentSelectionRequired: false,
  });
  assert.deepEqual(snapshot.governedReadPosture, {
    accessContextFamily: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    adminSessionOptional: true,
    operatorGuidance: 'On local docker host, authority and presence reads require principal-governed tenant context. Authority-ladder reads use the same principal-governed posture, while ladder writes remain operator-governed and separate from workspace admin-session routes.',
  });
  assert.deepEqual(snapshot.journey, {
    journeyKey: 'public-first-onboarding',
    label: 'Public provisional onboarding',
    steps: [
      {
        helperKey: 'createProvisionalAgent',
        routePathTemplate: '/runtime/agents/provisional',
        accessContextFamily: 'tenant',
        contextSemantic: 'public-provisional',
        requiredContext: ['tenantId'],
      },
      {
        helperKey: 'queryProvisionalAgent',
        routePathTemplate: '/runtime/agents/provisional',
        accessContextFamily: 'tenant',
        contextSemantic: 'public-provisional',
        requiredContext: ['tenantId'],
      },
      {
        helperKey: 'claimProvisionalAgent',
        routePathTemplate: '/runtime/agents/provisional/claim',
        accessContextFamily: 'session',
        contextSemantic: 'session',
        requiredContext: ['tenantId', 'sessionId'],
      },
    ],
    firstSuccessNextStep: {
      command: 'registration-lifecycle-plan',
      rationale: 'Use the lifecycle plan next so the first successful onboarding path stays aligned with the shipped provisional-to-registration chain.',
      journeyStage: 'governed-run-execution',
      journeyStageSemantics: 'local-only',
    },
  });
  assert.deepEqual(snapshot.postClaimSupport, {
    label: 'Governed-run support',
    progression: {
      guidanceKey: 'task-write-ready',
      lane: 'default-local-docker',
      appliesWhen: 'route-exists-but-subject-not-runnable',
      signal: 'authority_class_not_dispatchable',
      nextStepOwner: 'operator-or-admin',
      nextStepAction: 'Follow the surfaced task-write-ready progression and keep unresolved Core-owned progression visible instead of assuming claim is sufficient.',
      checkpoints: [
        {
          actor: 'external-claimed-agent',
          lane: 'default-local-docker',
          stepKey: 'self-service-patch',
          surfacedAction: 'Patch claimed-agent self-service state first so task-dispatch acceptance and related readiness inputs are explicit before requesting operator intervention.',
          surfacedSteps: [
            {
              helperKey: 'getAgentReadiness',
              routePathTemplate: '/runtime/agents/:agent_registration_id/readiness',
              accessContextFamily: 'principal-governed-read',
              contextSemantic: 'principal-governed-read',
              requiredContext: ['tenantId', 'principalId'],
            },
            {
              helperKey: 'getAccountMe',
              routePathTemplate: '/runtime/account/me',
              accessContextFamily: 'session',
              contextSemantic: 'session',
              requiredContext: ['tenantId', 'sessionId'],
            },
            {
              helperKey: 'selectOrg',
              routePathTemplate: '/runtime/account/select-org',
              accessContextFamily: 'session',
              contextSemantic: 'session',
              requiredContext: ['tenantId', 'sessionId'],
            },
            {
              helperKey: 'patchAgentSelfService',
              routePathTemplate: '/runtime/account/agents/:agentId/self-service',
              accessContextFamily: 'session',
              contextSemantic: 'session',
              requiredContext: ['tenantId', 'sessionId'],
            },
          ],
          verificationCheckpoint: {
            helperKeys: ['getAgentReadiness'],
            truthFields: ['taskWriteReady', 'dispatchEligibility'],
            guidance: 'Re-read readiness after the self-service patch and stay blocked if Core truth still does not show task-write-ready or dispatch-eligible state.',
          },
          failClosedState: 'A successful self-service patch does not itself make the claimed agent task-write-ready or dispatch-eligible.',
        },
        {
          actor: 'external-claimed-agent',
          lane: 'default-local-docker',
          stepKey: 'dispatch-authority-request',
          surfacedAction: 'If readiness is still blocked, submit the bounded dispatch-authority request rather than assuming claim already granted runnable authority.',
          surfacedSteps: [
            {
              helperKey: 'getAccountAgentDispatchAuthority',
              routePathTemplate: '/runtime/account/agents/:agentId/dispatch-authority',
              accessContextFamily: 'session',
              contextSemantic: 'session',
              requiredContext: ['tenantId', 'sessionId'],
            },
            {
              helperKey: 'createAccountAgentDispatchAuthorityRequest',
              routePathTemplate: '/runtime/account/agents/:agentId/dispatch-authority-requests',
              accessContextFamily: 'session',
              contextSemantic: 'session',
              requiredContext: ['tenantId', 'sessionId'],
            },
          ],
          verificationCheckpoint: {
            helperKeys: ['getAccountAgentDispatchAuthority', 'getAgentReadiness'],
            truthFields: ['taskWriteReady', 'dispatchEligibility'],
            guidance: 'Re-read dispatch-authority and readiness after the request; treat the request as pending until Core-owned truth changes.',
          },
          failClosedState: 'Submitting the request alone does not make the subject dispatchable and does not close operator/admin review.',
        },
        {
          actor: 'operator-or-admin',
          lane: 'default-local-docker',
          stepKey: 'operator-review-closure',
          surfacedAction: 'Wait for the real operator/admin review closure on the requested authority path instead of inventing a client-side approval outcome.',
          surfacedSteps: [
            {
              helperKey: 'getAccountAgentDispatchAuthority',
              routePathTemplate: '/runtime/account/agents/:agentId/dispatch-authority',
              accessContextFamily: 'session',
              contextSemantic: 'session',
              requiredContext: ['tenantId', 'sessionId'],
            },
          ],
          verificationCheckpoint: {
            helperKeys: ['getAccountAgentDispatchAuthority', 'getAgentReadiness'],
            truthFields: ['taskWriteReady', 'dispatchEligibility'],
            guidance: 'After review closes, re-read the surfaced truth helpers to confirm whether Core now reports runnable authority.',
          },
          failClosedState: 'If operator/admin closure is absent or unresolved, keep the subject non-dispatchable.',
        },
        {
          actor: 'operator-or-admin',
          lane: 'default-local-docker',
          stepKey: 'external-binding-completion-unresolved',
          surfacedAction: 'Inspect the shipped account-agent binding read surface to confirm visibility, and only use claimant or operator/admin binding writes when the current Core-owned route/body contract for that lane is explicit. The repo still does not ship a first-class binding-completion helper, so stay fail-closed instead of guessing the write path.',
          surfacedSteps: [
            {
              helperKey: 'listAccountAgentBindings',
              routePathTemplate: '/runtime/account/agent-bindings',
              accessContextFamily: 'session',
              contextSemantic: 'session',
              requiredContext: ['tenantId', 'sessionId'],
            },
          ],
          verificationCheckpoint: {
            helperKeys: ['listAccountAgentBindings'],
            truthFields: [],
            guidance: 'Use the account-agent binding read surface for visibility and verify returned task-write-ready or dispatch-eligibility truth after any binding write. Current repo truth does not yet package a first-class binding-completion helper, and claimant and operator routes use different body contracts.',
          },
          failClosedState: 'Until the current lane has an explicit Core-owned binding route/body contract and the returned reads confirm runnable truth, keep the subject non-dispatchable.',
        },
        {
          actor: 'external-claimed-agent',
          lane: 'default-local-docker',
          stepKey: 'post-step-truth-check',
          surfacedAction: 'Use the shipped read helpers to verify the final task-write-ready and dispatch-eligibility truth before attempting task execution.',
          surfacedSteps: [
            {
              helperKey: 'getAgentReadiness',
              routePathTemplate: '/runtime/agents/:agent_registration_id/readiness',
              accessContextFamily: 'principal-governed-read',
              contextSemantic: 'principal-governed-read',
              requiredContext: ['tenantId', 'principalId'],
            },
            {
              helperKey: 'getAccountAgentDispatchAuthority',
              routePathTemplate: '/runtime/account/agents/:agentId/dispatch-authority',
              accessContextFamily: 'session',
              contextSemantic: 'session',
              requiredContext: ['tenantId', 'sessionId'],
            },
          ],
          verificationCheckpoint: {
            helperKeys: ['getAgentReadiness', 'getAccountAgentDispatchAuthority'],
            truthFields: ['taskWriteReady', 'dispatchEligibility'],
            guidance: 'Only treat the progression as complete when the returned truth confirms task-write-ready and dispatch-eligibility state.',
          },
          failClosedState: 'If the post-step reads do not confirm both truth fields, remain fail-closed and do not treat the subject as runnable.',
        },
      ],
    },
    authorizationProjectionGate: {
      guidanceKey: 'authorization-projection',
      lane: 'default-local-docker',
      appliesWhen: 'account-plane-succeeds-but-governed-runtime-still-denied',
      signal: 'active_role_binding_required',
      nextStepOwner: 'enterprise-admin',
      nextStepAction: 'Keep claimant continuation on the account-owned plane, use only the allowed account/session/org repair actions surfaced by Core, and if the gate still remains after those repairs, treat it as an unresolved Core-owned authorization projection issue rather than inventing a new claimant or operator workflow.',
    },
    claimantContinuations: [
      {
        stepKey: 'self-service-patch',
        actor: 'external-claimed-agent',
        command: 'agent-self-service --agent-id ... --input ...',
        recognizedCoreSuggestedNextSteps: ['patch_agent_self_service'],
        recognizedCoreNextStepKinds: ['self_service_patch'],
      },
      {
        stepKey: 'dispatch-authority-request',
        actor: 'external-claimed-agent',
        command: 'account-agent-dispatch-authority-request --agent-id ...',
        recognizedCoreSuggestedNextSteps: ['create_dispatch_authority_request'],
        recognizedCoreNextStepKinds: ['dispatch_authority_request'],
      },
    ],
    decisionTable: [
      {
        decisionKey: 'broken-core-suggested-next-step',
        priority: 300,
      },
      {
        decisionKey: 'supported-claimant-next-step',
        priority: 200,
      },
      {
        decisionKey: 'authorization-projection-gate',
        priority: 100,
      },
    ],
  });
});

test('runCli prints an OpenClaw MCP config export that stays local stdio first and treats endpoint override as advanced', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['openclaw-mcp-config'], {
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('openclaw-mcp-config should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(printed, [{
    command: 'openclaw-mcp-config',
    scope: 'local-only',
    config: {
      mcpServers: {
        bidvia: {
          command: 'bidvia',
          args: ['mcp-server'],
      env: {
        BIDVIA_BASE_URL: 'https://api.bidvia.cn',
        BIDVIA_TENANT_ID: '<required>',
        BIDVIA_SESSION_ID: '<optional>',
        BIDVIA_ADMIN_SESSION_ID: '<optional>',
        BIDVIA_REGISTRATION_ID: '<optional>',
        BIDVIA_PRINCIPAL_ID: '<optional>',
        BIDVIA_PRINCIPAL_TYPE: '<optional>',
        BIDVIA_AUTHORIZED_ROLE: '<optional>',
        BIDVIA_COMPANY_ID: '<optional>',
      },
        },
      },
      localExecutionExpectations: {
        transport: 'stdio',
        localOnly: true,
        hosted: false,
        remoteDiscovery: false,
        publishedPackageRequired: true,
        endpointOverride: 'advanced-operator-only',
        developmentFallback: 'node dist/mcp-server.js',
      },
      firstSuccessNextStep: {
        command: 'route-context-matrix',
        rationale: 'Confirm the required context family for each guided route before wiring OpenClaw config around the shared local stdio MCP runtime path.',
      },
    },
    operatorNotes: {
      transportBoundary: 'Local stdio MCP on your side, remote HTTPS Bidvia API on the other side.',
      endpointOverride: 'Advanced/operator-only: set BIDVIA_BASE_URL only when you need a non-default deployment endpoint.',
    },
  }]);
});

test('runCli dispatches the stable installed MCP server subcommand while leaving repo-local fallback to the direct file entrypoint', async () => {
  let runLocalMcpServerCalls = 0;

  const exitCode = await runCli(['mcp-server'], {
    runLocalMcpServer: () => {
      runLocalMcpServerCalls += 1;
    },
    printJson: () => {
      throw new Error('mcp-server should not print json');
    },
    printLine: () => {
      throw new Error('mcp-server should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(runLocalMcpServerCalls, 1);
});

test('runCli prints a route-context matrix that keeps public-first rows ahead of governed-run rows', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['route-context-matrix'], {
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('route-context-matrix should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(printed.length, 1);
  const snapshot = printed[0] as {
    command: string;
    defaults: {
      baseUrl: string;
      environmentMode: string;
      environmentSelectionRequired: boolean;
    };
    governedReadPosture: {
      accessContextFamily: string;
      requiredContext: string[];
      adminSessionOptional: boolean;
      operatorGuidance: string;
    };
    stage3ReleaseGate?: {
      status: string;
      blockedBy: string[];
      requiredValidatorCommands: string[];
      waves: Array<{ wave: string; status: string; planes: string[] }>;
    };
    rows: Array<{
      journeyKey: string;
      helperKey: string;
      routePathTemplate: string;
      routeFamily: string;
      journeyStage: string;
      journeyStageSemantics: string;
      accessContextFamily: string;
      contextSemantic: string;
      requiredContext: string[];
      operationKind: string;
      localCapabilityRiskTier: string;
      relevance: string;
      presentationTier: string;
      recommendedOutputMode: string;
    }>;
    firstSuccessNextSteps: Record<string, {
      command: string;
      rationale: string;
      journeyStage: string;
      journeyStageSemantics: string;
    }>;
  };
  assert.equal(snapshot.command, 'route-context-matrix');
  assert.deepEqual(snapshot.defaults, {
    baseUrl: 'https://api.bidvia.cn',
    environmentMode: 'production',
    environmentSelectionRequired: false,
  });
  assert.deepEqual(snapshot.governedReadPosture, {
    accessContextFamily: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    adminSessionOptional: true,
    operatorGuidance: 'On local docker host, authority and presence reads require principal-governed tenant context. Authority-ladder reads use the same principal-governed posture, while ladder writes remain operator-governed and separate from workspace admin-session routes.',
  });
  assert.deepEqual(snapshot.stage3ReleaseGate, {
    status: 'blocked',
    blockedBy: ['plane-adoption-incomplete'],
    requiredValidatorCommands: [
      'npm test',
      'npm run typecheck',
      'npm run build',
      'npm run validate',
      'npm run validate:release-readiness',
      'npm run validate:release-gate',
    ],
    waves: [
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
    ],
  });
  assert.deepEqual(snapshot.rows, [
    {
      journeyKey: 'public-first-onboarding',
      helperKey: 'createProvisionalAgent',
      routePathTemplate: '/runtime/agents/provisional',
      routeFamily: 'agent-onboarding',
      journeyStage: 'public-provisional',
      journeyStageSemantics: 'local-only',
      accessContextFamily: 'tenant',
      contextSemantic: 'public-provisional',
      requiredContext: ['tenantId'],
      operationKind: 'execute',
      executionTruth: 'packet-grounded-execution',
      executionBlockedBy: null,
      localCapabilityRiskTier: 'runtime-execution',
      relevance: 'public-first-common',
      presentationTier: 'primary',
      recommendedOutputMode: 'execution-result',
    },
    {
      journeyKey: 'public-first-onboarding',
      helperKey: 'queryProvisionalAgent',
      routePathTemplate: '/runtime/agents/provisional',
      routeFamily: 'agent-onboarding',
      journeyStage: 'public-provisional',
      journeyStageSemantics: 'local-only',
      accessContextFamily: 'tenant',
      contextSemantic: 'public-provisional',
      requiredContext: ['tenantId'],
      operationKind: 'read-only',
        executionTruth: 'packet-grounded-read',
      executionBlockedBy: null,
      localCapabilityRiskTier: 'observe-only',
      relevance: 'public-first-common',
      presentationTier: 'primary',
      recommendedOutputMode: 'truth-fetch-result',
    },
    {
      journeyKey: 'public-first-onboarding',
      helperKey: 'claimProvisionalAgent',
      routePathTemplate: '/runtime/agents/provisional/claim',
      routeFamily: 'agent-onboarding',
      journeyStage: 'public-provisional',
      journeyStageSemantics: 'local-only',
      accessContextFamily: 'session',
      contextSemantic: 'session',
      requiredContext: ['tenantId', 'sessionId'],
      operationKind: 'execute',
      executionTruth: 'packet-grounded-execution',
      executionBlockedBy: null,
      localCapabilityRiskTier: 'runtime-execution',
      relevance: 'public-first-common',
      presentationTier: 'primary',
      recommendedOutputMode: 'execution-result',
    },
    {
      journeyKey: 'governed-run',
      helperKey: 'getAgentReadiness',
      routePathTemplate: '/runtime/agents/:agent_registration_id/readiness',
      routeFamily: 'agent-runtime',
      journeyStage: 'governed-run-support',
      journeyStageSemantics: 'local-only',
      accessContextFamily: 'principal-governed-read',
      contextSemantic: 'principal-governed-read',
      requiredContext: ['tenantId', 'principalId'],
      operationKind: 'read-only',
      executionTruth: 'packet-grounded-read',
      executionBlockedBy: null,
      localCapabilityRiskTier: 'observe-only',
      relevance: 'governed-run-secondary',
      presentationTier: 'secondary',
      recommendedOutputMode: 'truth-fetch-result',
    },
  ]);
  assert.deepEqual(snapshot.firstSuccessNextSteps, {
    'public-first-onboarding': {
      command: 'registration-lifecycle-plan',
      rationale: 'Use the lifecycle plan next so the first successful onboarding path stays aligned with the shipped provisional-to-registration chain.',
      journeyStage: 'governed-run-execution',
      journeyStageSemantics: 'local-only',
    },
    'governed-run': {
      command: 'account-agent --agent-id ...',
      rationale: 'Use the canonical account-plane claimed-agent detail readback first so post-claim continuation starts from the current account-owned surface instead of older registration-bound operational packaging.',
      journeyStage: 'governed-run-support',
      journeyStageSemantics: 'local-only',
    },
  });
});

test('runCli prints the public-default environment visibility output instead of silently falling back to local', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['environment-mode'], {
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('environment-mode should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(printed, [{
    baseUrl: 'https://api.bidvia.cn',
    environmentMode: 'production',
  }]);
});

test('runCli prints launch topology smoke output with canonical api domains and compatibility-only root mappings', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['launch-topology-smoke'], {
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('launch-topology-smoke should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(printed, [{
    baseUrl: 'https://api.bidvia.cn',
    environmentMode: 'production',
    canonicalGlobalApiDomain: 'https://api.bidvia.ai',
    canonicalChinaApiDomain: 'https://api.bidvia.cn',
    compatibilityProfileMappings: {
      global: 'https://bidvia.ai',
      china: 'https://bidvia.cn',
    },
  }]);
});

test('runCli prints runtime capability snapshots for the public default and preserves explicit local and sim classification', async () => {
  const defaultPrinted: unknown[] = [];
  const localPrinted: unknown[] = [];
  const simPrinted: unknown[] = [];

  const defaultExitCode = await runCli(['runtime-capabilities'], {
    printJson: (value) => {
      defaultPrinted.push(value);
    },
    printLine: () => {
      throw new Error('runtime-capabilities should not print help lines');
    },
  });
  const localExitCode = await runCli(['runtime-capabilities'], {
    resolveBaseUrl: () => 'http://127.0.0.1:8787',
    printJson: (value) => {
      localPrinted.push(value);
    },
    printLine: () => {
      throw new Error('runtime-capabilities should not print help lines for explicit local override');
    },
  });
  const simExitCode = await runCli(['runtime-capabilities'], {
    resolveBaseUrl: () => 'https://staging.bidvia.internal',
    printJson: (value) => {
      simPrinted.push(value);
    },
    printLine: () => {
      throw new Error('runtime-capabilities should not print help lines for explicit sim override');
    },
  });

  assert.equal(defaultExitCode, 0);
  assert.equal(localExitCode, 0);
  assert.equal(simExitCode, 0);
  assert.equal(defaultPrinted.length, 1);
  assert.equal(localPrinted.length, 1);
  assert.equal(simPrinted.length, 1);

  const defaultSnapshot = defaultPrinted[0] as { baseUrl: string; environmentMode: string };
  const localSnapshot = localPrinted[0] as { baseUrl: string; environmentMode: string };
  const simSnapshot = simPrinted[0] as { baseUrl: string; environmentMode: string };

  assert.equal(defaultSnapshot.baseUrl, 'https://api.bidvia.cn');
  assert.equal(defaultSnapshot.environmentMode, 'production');
  assert.equal(localSnapshot.baseUrl, 'http://127.0.0.1:8787');
  assert.equal(localSnapshot.environmentMode, 'local');
  assert.notEqual(localSnapshot.environmentMode, 'sim');
  assert.equal(simSnapshot.baseUrl, 'https://staging.bidvia.internal');
  assert.equal(simSnapshot.environmentMode, 'sim');
  assert.notEqual(simSnapshot.environmentMode, 'local');
  for (const snapshot of [defaultSnapshot, localSnapshot, simSnapshot] as Array<{
    stage3ReleaseGate?: {
      status: string;
      blockedBy: string[];
      requiredValidatorCommands: string[];
      waves: Array<{ wave: string; status: string; planes: string[] }>;
    };
  }>) {
    assert.deepEqual(snapshot.stage3ReleaseGate, {
      status: 'blocked',
      blockedBy: ['plane-adoption-incomplete'],
      requiredValidatorCommands: [
        'npm test',
        'npm run typecheck',
        'npm run build',
        'npm run validate',
        'npm run validate:release-readiness',
        'npm run validate:release-gate',
      ],
      waves: [
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
      ],
    });
  }
});

test('runCli dry-runs execution commands with structured output instead of invoking the client', async () => {
  const printed: unknown[] = [];
  let clientCreateCount = 0;

  const restoreTenantId = setEnvVar('BIDVIA_TENANT_ID', undefined);
  const restoreRegistrationId = setEnvVar('BIDVIA_REGISTRATION_ID', undefined);
  const restorePrincipalId = setEnvVar('BIDVIA_PRINCIPAL_ID', undefined);

  try {
    const exitCode = await runCli(['heartbeat', '--dry-run'], {
      createClient: () => {
        clientCreateCount += 1;
        throw new Error('dry-run should not create a client');
      },
      now: () => '2026-03-29T10:00:00Z',
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('dry-run should not print help lines');
      },
      readLocalOnboardingState: async () => null,
      executionCommands: {
        heartbeat: {
          buildInput: (now) => ({
            now,
            expiresAt: '2026-03-29T10:05:00.000Z',
          }),
          run: async (_receivedClient, now) => {
            const input: BidviaHeartbeatInput = {
              now,
              expiresAt: '2026-03-29T10:05:00.000Z',
            };

            return input;
          },
        },
      },
    });

    assert.equal(exitCode, 0);
    assert.equal(clientCreateCount, 0);
    assert.deepEqual(printed, [{
    command: 'heartbeat',
    mode: 'dry-run',
    scope: 'local-only',
    preflight: {
      target: 'heartbeat',
      surface: 'cli',
      scope: 'local-only',
      routePathTemplate: '/runtime/agents/:registrationId/heartbeat',
      httpMethod: 'POST',
      accessContextFamily: 'registration',
      localCapabilityTier: 'L2-registration-runtime',
      localCapabilityRiskTier: 'runtime-execution',
        requiredContext: ['tenantId', 'registrationId', 'principalId'],
        missingContext: ['tenantId', 'registrationId', 'principalId'],
        runnable: true,
        blockedBy: null,
        blockerClass: 'missing-local-context',
        ownership: 'claimant',
        hints: [
          'Dry-run stays local and does not execute the remote registration-bound route.',
          'Set BIDVIA_TENANT_ID and BIDVIA_REGISTRATION_ID and BIDVIA_PRINCIPAL_ID before running the real execution command.',
          'Blocker class missing-local-context keeps this command fail-closed until the required execution context is present.',
          'Risk tier runtime-execution means the non-dry-run command writes to the remote runtime route.',
        ],
    },
    input: {
      now: '2026-03-29T10:00:00Z',
      expiresAt: '2026-03-29T10:05:00.000Z',
    },
    }]);
  } finally {
    restoreTenantId();
    restoreRegistrationId();
    restorePrincipalId();
  }
});

test('runCli industry-universe execution uses the provided input instead of a built-in fixed scenario payload', async () => {
  const printed: unknown[] = [];
  const calls: Array<{ helper: string; listingId?: string; idempotencyKey?: string }> = [];

  const exitCode = await runCli([
    'industry-universe-execution',
    '--input',
    JSON.stringify({
      scenarioId: 'scenario-industry-universe-user-1',
      scenarioLabel: 'industry-universe-user-input',
      sourceRefs: ['source://market/user-1'],
      evidenceRefs: ['evidence://cli/user-1'],
      traceIds: ['trace-user-1'],
      workflowIds: ['wf-user-1'],
      createListing: {
        listingId: 'listing-user-1',
        listingType: 'supply',
        category: 'basic inorganic industrial chemical',
        sku: 'sodium-carbonate-user-1',
        quantityValue: '15',
        quantityUnit: 'tons',
        regionSummary: 'China -> Vietnam',
        verificationStatus: 'verified',
        freshnessTs: '2026-03-29T10:00:00Z',
        traceId: 'trace-user-1',
        idempotencyKey: 'listing-user-1',
        now: '2026-03-29T10:00:00Z',
      },
      activateListing: {
        now: '2026-03-29T10:01:00Z',
      },
      generateMatchCandidates: {
        upstreamDecision: 'READY_FOR_ROUTING',
        requiredEvidenceLevel: 1,
        detectedEvidenceLevel: 1,
        workflowRunId: 'wf-user-1',
        triggerEventId: 'evt-user-1',
        topN: 10,
        now: '2026-03-29T10:02:00Z',
      },
    }),
  ], {
    createClient: () => ({
      async createListing(input: { listingId: string; idempotencyKey: string }) {
        calls.push({ helper: 'createListing', listingId: input.listingId, idempotencyKey: input.idempotencyKey });
        return { ok: true, route: 'create-listing' };
      },
      async activateListing() {
        calls.push({ helper: 'activateListing' });
        return { ok: true, route: 'activate-listing' };
      },
      async generateMatchCandidates() {
        calls.push({ helper: 'generateMatchCandidates' });
        return { ok: true, route: 'generate-match-candidates' };
      },
    }) as never,
    resolveExecutionContext: () => ({
      tenantId: 'tenant-a',
      principalId: 'principal-a',
      companyId: 'company-a',
    }),
    now: () => '2026-03-29T10:00:00Z',
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('industry-universe-execution should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(calls, [
    {
      helper: 'createListing',
      listingId: 'listing-user-1',
      idempotencyKey: 'listing-user-1',
    },
    {
      helper: 'activateListing',
    },
    {
      helper: 'generateMatchCandidates',
    },
  ]);
  assert.equal(printed.length, 1);
  const payload = printed[0] as {
    verificationBundle: {
      scenarioFamily: string;
      verificationMode: string;
      completedRouteChain: Array<{ routeKey: string }>;
    };
    executionResult: {
      scenarioFamily: string;
      status: string;
      closureStage: string;
      ownership: string;
    };
  };
  assert.equal(payload.verificationBundle.scenarioFamily, 'industry-universe');
  assert.equal(payload.verificationBundle.verificationMode, 'review-safe');
  assert.deepEqual(
    payload.verificationBundle.completedRouteChain.map((detail) => detail.routeKey),
    [
      'createListing',
      'activateListing',
      'generateMatchCandidates',
    ],
  );
  assert.equal(payload.executionResult.scenarioFamily, 'industry-universe');
  assert.equal(payload.executionResult.status, 'succeeded');
  assert.equal(payload.executionResult.closureStage, 'business-closure-deferred');
  assert.equal(payload.executionResult.ownership, 'claimant');
});

test('runCli returns a structured actionable invalid-input failure for verification bundle export', async () => {
  const printed: unknown[] = [];
  const errors: string[] = [];
  const lines: string[] = [];

  const exitCode = await runCli(['verification-bundle-export', '--input', 'invalid'], {
    printJson: (value) => {
      printed.push(value);
    },
    printError: (value) => {
      errors.push(value);
    },
    printLine: (value) => {
      lines.push(value);
    },
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(printed, [{
    error: {
      code: 'invalid-input',
      command: 'verification-bundle-export',
      message: 'Invalid --input value "invalid". Use one of: registration-lifecycle, registered-agent-operations.',
      validInputs: ['registration-lifecycle', 'registered-agent-operations'],
    },
  }]);
  assert.deepEqual(errors, []);
  assert.deepEqual(lines, []);
});
