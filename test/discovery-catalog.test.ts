import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLocalDiagnosticCommandCatalog,
  buildLocalDiscoveryCatalog,
  buildLocalMcpProductizationSnapshot,
  buildLocalMcpToolCatalog,
} from '../src/discovery-catalog.ts';
import { buildCapabilityPlaneView } from '../src/capability-plane.ts';

function requireDiscoveryEntry(helperKey: string) {
  const catalog = buildLocalDiscoveryCatalog();
  const entry = catalog.find((candidate) => candidate.helperKey === helperKey);
  assert.ok(entry, `expected discovery catalog entry for ${helperKey}`);
  return entry;
}

const approvedTaskPlaneCliParityMatrix = [
  ['createLease', 'create-lease-execution'],
  ['createTaskDispatch', 'create-task-dispatch-execution'],
  ['assignTaskDispatch', 'assign-task-dispatch-execution'],
  ['suspendTaskDispatch', 'suspend-task-dispatch-execution'],
  ['resumeTaskDispatch', 'resume-task-dispatch-execution'],
  ['completeTaskDispatch', 'complete-task-dispatch-execution'],
  ['failTaskDispatch', 'fail-task-dispatch-execution'],
  ['createClaim', 'create-claim-execution'],
  ['acceptClaim', 'accept-claim-execution'],
  ['rejectClaim', 'reject-claim-execution'],
] as const;

test('discovery catalog exposes the approved task-plane CLI parity commands alongside their runnable MCP tools', () => {
  for (const [helperKey, toolName] of approvedTaskPlaneCliParityMatrix) {
    const entry = requireDiscoveryEntry(helperKey);
    assert.equal(entry.cliCommands.length, 1, `expected one CLI command for ${helperKey}`);
    assert.deepEqual(entry.mcpTools, [{ toolName, outputMode: 'execution-result' }]);
  }

  assert.deepEqual(requireDiscoveryEntry('createLease').cliCommands, ['create-lease']);
  assert.deepEqual(requireDiscoveryEntry('createTaskDispatch').cliCommands, ['create-task-dispatch']);
  assert.deepEqual(requireDiscoveryEntry('assignTaskDispatch').cliCommands, ['assign-task-dispatch']);
  assert.deepEqual(requireDiscoveryEntry('suspendTaskDispatch').cliCommands, ['suspend-task-dispatch']);
  assert.deepEqual(requireDiscoveryEntry('resumeTaskDispatch').cliCommands, ['resume-task-dispatch']);
  assert.deepEqual(requireDiscoveryEntry('completeTaskDispatch').cliCommands, ['complete-task-dispatch']);
  assert.deepEqual(requireDiscoveryEntry('failTaskDispatch').cliCommands, ['fail-task-dispatch']);
  assert.deepEqual(requireDiscoveryEntry('createClaim').cliCommands, ['create-claim']);
  assert.deepEqual(requireDiscoveryEntry('acceptClaim').cliCommands, ['accept-claim']);
  assert.deepEqual(requireDiscoveryEntry('rejectClaim').cliCommands, ['reject-claim']);
});

test('buildLocalDiscoveryCatalog returns operator-readable local mappings without remote discovery semantics', () => {
  const catalog = buildLocalDiscoveryCatalog();

  const accountAgents = catalog.find((entry) => entry.helperKey === 'listAccountAgents');
  assert.deepEqual(accountAgents, {
    helperKey: 'listAccountAgents',
    routePathTemplate: '/runtime/account/agents',
    httpMethod: 'GET',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    discoveryKind: 'read',
    recommendedOutputMode: 'truth-fetch-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    cliCommands: ['account-agents'],
    mcpTools: [
      {
        toolName: 'account-agents-read',
        outputMode: 'truth-fetch-result',
      },
    ],
  });

  const accountAgentDispatchAuthority = catalog.find((entry) => entry.helperKey === 'getAccountAgentDispatchAuthority');
  assert.deepEqual(accountAgentDispatchAuthority, {
    helperKey: 'getAccountAgentDispatchAuthority',
    routePathTemplate: '/runtime/account/agents/:agentId/dispatch-authority',
    httpMethod: 'GET',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    discoveryKind: 'read',
    recommendedOutputMode: 'truth-fetch-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    cliCommands: ['account-agent-dispatch-authority'],
    mcpTools: [],
  });

  const industryUniverse = catalog.find((entry) => entry.helperKey === 'buildIndustryUniverseScenarioPlan');
  assert.deepEqual(industryUniverse, {
    helperKey: 'buildIndustryUniverseScenarioPlan',
    routePathTemplate: '/scenarios/industry-universe',
    httpMethod: 'POST',
    accessContextFamily: 'scenario',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    scope: 'write',
    level: 'scenario-helper',
    localCapabilityTier: 'L1-review-safe',
    localCapabilityRiskTier: 'review-safe',
    discoveryKind: 'review-safe',
    recommendedOutputMode: 'plan-preview',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    cliCommands: [
      'industry-universe-plan',
      'industry-universe-review-packet-preview',
      'industry-universe-review-packet-export',
    ],
    mcpTools: [
      {
        toolName: 'industry-universe-plan-preview',
        outputMode: 'plan-preview',
      },
      {
        toolName: 'industry-universe-review-packet-preview',
        outputMode: 'review-packet-preview',
      },
      {
        toolName: 'industry-universe-review-packet-export',
        outputMode: 'review-packet-export',
      },
    ],
  });

  const industryUniverseExecution = catalog.find((entry) => entry.helperKey === 'executeIndustryUniverseScenario');
  assert.deepEqual(industryUniverseExecution, {
    helperKey: 'executeIndustryUniverseScenario',
    routePathTemplate: '/scenarios/industry-universe',
    httpMethod: 'POST',
    accessContextFamily: 'scenario',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    scope: 'write',
    level: 'scenario-helper',
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
    discoveryKind: 'execute',
    recommendedOutputMode: 'execution-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    runnable: true,
    blockedBy: null,
    cliCommands: ['industry-universe-execution'],
    mcpTools: [
      {
        toolName: 'industry-universe-execution',
        outputMode: 'execution-result',
      },
    ],
  });

  const capabilityProfile = catalog.find((entry) => entry.helperKey === 'getAgentCapabilityProfile');
  assert.deepEqual(capabilityProfile, {
    helperKey: 'getAgentCapabilityProfile',
    routePathTemplate: '/runtime/agents/:agent_registration_id/capability-profile',
    httpMethod: 'GET',
    accessContextFamily: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    capabilityPlaneCapabilityMode: 'packet-grounded-read',
    dispatchEligibilityDerivedFromCapabilityReadTruth: false,
    governedRunAuthorizationDerivedFromCapabilityReadTruth: false,
    discoveryKind: 'read',
    recommendedOutputMode: 'truth-fetch-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    cliCommands: ['agent-capability-profile'],
    mcpTools: [
      {
        toolName: 'agent-capability-profile-read',
        outputMode: 'truth-fetch-result',
      },
    ],
  });

  const integrationOnboarding = catalog.find((entry) => entry.helperKey === 'submitIntegrationOnboardingContract');
  assert.deepEqual(integrationOnboarding, {
    helperKey: 'submitIntegrationOnboardingContract',
    routePathTemplate: '/runtime/integrations/:integrationCode/onboarding-contract',
    httpMethod: 'POST',
    accessContextFamily: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
    discoveryKind: 'blocked',
    recommendedOutputMode: 'execution-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    runnable: false,
    blockedBy: null,
    cliCommands: [],
    mcpTools: [],
  });

  const accountIntegrationCapabilities = catalog.find((entry) => entry.helperKey === 'listAccountIntegrationCapabilities');
  assert.deepEqual(accountIntegrationCapabilities, {
    helperKey: 'listAccountIntegrationCapabilities',
    routePathTemplate: '/runtime/account/integration-capabilities',
    httpMethod: 'GET',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    discoveryKind: 'read',
    recommendedOutputMode: 'truth-fetch-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    cliCommands: ['account-integration-capabilities'],
    mcpTools: [
      {
        toolName: 'account-integration-capabilities-read',
        outputMode: 'truth-fetch-result',
      },
    ],
  });

  const haisiWarehouses = catalog.find((entry) => entry.helperKey === 'listHaisiWmsWarehouses');
  assert.deepEqual(haisiWarehouses, {
    helperKey: 'listHaisiWmsWarehouses',
    routePathTemplate: '/runtime/integrations/haisi-wms/warehouses',
    httpMethod: 'GET',
    accessContextFamily: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    discoveryKind: 'read',
    recommendedOutputMode: 'truth-fetch-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    cliCommands: [],
    mcpTools: [],
  });

  const participationStates = catalog.find((entry) => entry.helperKey === 'listParticipationStates');
  assert.deepEqual(participationStates, {
    helperKey: 'listParticipationStates',
    routePathTemplate: '/runtime/agents/:agent_registration_id/participation-states',
    httpMethod: 'GET',
    accessContextFamily: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    discoveryKind: 'read',
    recommendedOutputMode: 'truth-fetch-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    taskPlaneCapabilityMode: 'visibility-only',
    cliCommands: [],
    mcpTools: [
      {
        toolName: 'participation-states-read',
        outputMode: 'truth-fetch-result',
      },
    ],
  });

  const createProvisionalAgent = catalog.find((entry) => entry.helperKey === 'createProvisionalAgent');
  assert.deepEqual(createProvisionalAgent, {
    helperKey: 'createProvisionalAgent',
    routePathTemplate: '/runtime/agents/provisional',
    httpMethod: 'POST',
    accessContextFamily: 'tenant',
    contextSemantic: 'public-provisional',
    requiredContext: ['tenantId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L2-registration-runtime',
    localCapabilityRiskTier: 'runtime-execution',
    discoveryKind: 'execute',
    recommendedOutputMode: 'execution-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    runnable: true,
    blockedBy: null,
    cliCommands: [],
    mcpTools: [
      {
        toolName: 'create-provisional-agent-execution',
        outputMode: 'execution-result',
      },
    ],
  });

  const queryProvisionalAgent = catalog.find((entry) => entry.helperKey === 'queryProvisionalAgent');
  assert.deepEqual(queryProvisionalAgent, {
    helperKey: 'queryProvisionalAgent',
    routePathTemplate: '/runtime/agents/provisional',
    httpMethod: 'GET',
    accessContextFamily: 'tenant',
    contextSemantic: 'public-provisional',
    requiredContext: ['tenantId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    discoveryKind: 'read',
    recommendedOutputMode: 'truth-fetch-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    cliCommands: [],
    mcpTools: [
      {
        toolName: 'query-provisional-agent-read',
        outputMode: 'truth-fetch-result',
      },
    ],
  });

  const claimProvisionalAgent = catalog.find((entry) => entry.helperKey === 'claimProvisionalAgent');
  assert.deepEqual(claimProvisionalAgent, {
    helperKey: 'claimProvisionalAgent',
    routePathTemplate: '/runtime/agents/provisional/claim',
    httpMethod: 'POST',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L2-registration-runtime',
    localCapabilityRiskTier: 'runtime-execution',
    discoveryKind: 'execute',
    recommendedOutputMode: 'execution-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    runnable: true,
    blockedBy: null,
    cliCommands: [],
    mcpTools: [
      {
        toolName: 'claim-provisional-agent-execution',
        outputMode: 'execution-result',
      },
    ],
  });

  const postAgentCapabilityProfile = catalog.find((entry) => entry.helperKey === 'postAgentCapabilityProfile');
  assert.deepEqual(postAgentCapabilityProfile, {
    helperKey: 'postAgentCapabilityProfile',
    routePathTemplate: '/runtime/agents/:agent_registration_id/capability-profile',
    httpMethod: 'POST',
    accessContextFamily: 'operator-company',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
    discoveryKind: 'execute',
    recommendedOutputMode: 'execution-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    runnable: true,
    blockedBy: null,
    cliCommands: [],
    mcpTools: [
      {
        toolName: 'agent-capability-profile-write-execution',
        outputMode: 'execution-result',
      },
    ],
  });

  const requestCommercialActionApproval = catalog.find(
    (entry) => entry.helperKey === 'requestCommercialActionApproval',
  );
  assert.deepEqual(requestCommercialActionApproval, {
    helperKey: 'requestCommercialActionApproval',
    routePathTemplate: '/runtime/commercial-actions/:commercialActionRequestId/request-approval',
    httpMethod: 'POST',
    accessContextFamily: 'operator-company',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
    discoveryKind: 'blocked',
    recommendedOutputMode: 'execution-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    runnable: false,
    blockedBy: null,
    cliCommands: [],
    mcpTools: [],
  });

  const createCommercialAction = catalog.find((entry) => entry.helperKey === 'createCommercialAction');
  assert.deepEqual(createCommercialAction?.mcpTools, []);

  const executeCommercialAction = catalog.find((entry) => entry.helperKey === 'executeCommercialAction');
  assert.deepEqual(executeCommercialAction?.mcpTools, []);

  assert.equal(catalog.some((entry) => entry.helperKey === 'listAgentCapabilityProfiles'), false);
  assert.equal(catalog.some((entry) => entry.helperKey === 'listCanonicalSemanticTaxonomyEntries'), false);
  assert.equal(catalog.some((entry) => entry.helperKey === 'listCanonicalSemanticLineageLinks'), false);
});

test('buildLocalDiagnosticCommandCatalog exposes a first-class public runtime interpretation probe command', () => {
  assert.deepEqual(buildLocalDiagnosticCommandCatalog(), [
    {
      command: 'install-integrity',
      scope: 'local-only',
      summary: 'Reports the active bidvia binary, local package roots, package version, and likely install-path drift.',
    },
    {
      command: 'validation-smoke',
      scope: 'local-only',
      summary: 'Runs a bounded local-first smoke pass over install, environment, runtime capability, server capability, and context diagnostics.',
    },
    {
      command: 'diagnostic-bundle-export',
      scope: 'local-only',
      summary: 'Exports the bounded smoke report as machine-readable JSON plus a shareable markdown summary.',
    },
    {
      command: 'public-runtime-interpretation-probe',
      scope: 'local-only',
      summary: 'Probes live /healthz and /readyz and exports bounded runtime interpretation evidence without overclaiming release truth.',
    },
  ]);
});

test('discovery catalog freezes the approved task-plane CLI parity candidates with explicit CLI bindings', () => {
  for (const [helperKey, mcpToolName] of approvedTaskPlaneCliParityMatrix) {
    const entry = requireDiscoveryEntry(helperKey);
    assert.equal(entry.cliCommands.length, 1);
    assert.deepEqual(entry.mcpTools, [
      {
        toolName: mcpToolName,
        outputMode: 'execution-result',
      },
    ]);
  }
});

test('discovery catalog marks the canonical downstream task consumer routes as account-scoped', () => {
  assert.deepEqual(requireDiscoveryEntry('createTaskDispatch'), {
    helperKey: 'createTaskDispatch',
    routePathTemplate: '/runtime/account/agents/:agentId/task-dispatches',
    httpMethod: 'POST',
    accessContextFamily: 'operator-company',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
    discoveryKind: 'execute',
    recommendedOutputMode: 'execution-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    runnable: true,
    blockedBy: null,
    taskPlaneCapabilityMode: 'packet-grounded-execution',
    cliCommands: ['create-task-dispatch'],
    mcpTools: [
      {
        toolName: 'create-task-dispatch-execution',
        outputMode: 'execution-result',
      },
    ],
  });

  assert.deepEqual(requireDiscoveryEntry('createLease'), {
    helperKey: 'createLease',
    routePathTemplate: '/runtime/account/agents/:agentId/leases',
    httpMethod: 'POST',
    accessContextFamily: 'operator-company',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
    discoveryKind: 'execute',
    recommendedOutputMode: 'execution-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    runnable: true,
    blockedBy: null,
    taskPlaneCapabilityMode: 'packet-grounded-execution',
    cliCommands: ['create-lease'],
    mcpTools: [
      {
        toolName: 'create-lease-execution',
        outputMode: 'execution-result',
      },
    ],
  });

  assert.deepEqual(requireDiscoveryEntry('createTaskDispatchOutcome'), {
    helperKey: 'createTaskDispatchOutcome',
    routePathTemplate: '/runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/outcomes',
    httpMethod: 'POST',
    accessContextFamily: 'operator-company',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
    discoveryKind: 'execute',
    recommendedOutputMode: 'execution-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    runnable: true,
    blockedBy: null,
    taskPlaneCapabilityMode: 'packet-grounded-execution',
    cliCommands: ['create-task-dispatch-outcome'],
    mcpTools: [
      {
        toolName: 'create-task-dispatch-outcome-execution',
        outputMode: 'execution-result',
      },
    ],
  });

  assert.deepEqual(requireDiscoveryEntry('createTaskDispatchEvidenceBundle'), {
    helperKey: 'createTaskDispatchEvidenceBundle',
    routePathTemplate: '/runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/evidence-bundles',
    httpMethod: 'POST',
    accessContextFamily: 'operator-company',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
    discoveryKind: 'execute',
    recommendedOutputMode: 'execution-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    runnable: true,
    blockedBy: null,
    taskPlaneCapabilityMode: 'packet-grounded-execution',
    cliCommands: ['create-task-dispatch-evidence-bundle'],
    mcpTools: [
      {
        toolName: 'create-task-dispatch-evidence-bundle-execution',
        outputMode: 'execution-result',
      },
    ],
  });

  assert.deepEqual(requireDiscoveryEntry('createTaskDispatchConfirmationCycle'), {
    helperKey: 'createTaskDispatchConfirmationCycle',
    routePathTemplate: '/runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/confirmation-cycles',
    httpMethod: 'POST',
    accessContextFamily: 'operator-company',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
    discoveryKind: 'execute',
    recommendedOutputMode: 'execution-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    runnable: true,
    blockedBy: null,
    taskPlaneCapabilityMode: 'packet-grounded-execution',
    cliCommands: ['create-task-dispatch-confirmation-cycle'],
    mcpTools: [
      {
        toolName: 'create-task-dispatch-confirmation-cycle-execution',
        outputMode: 'execution-result',
      },
    ],
  });
});

test('discovery catalog marks the canonical downstream notification consumer routes as account-scoped acknowledgement-only execution', () => {
  const catalog = buildLocalDiscoveryCatalog();

  assert.deepEqual(requireDiscoveryEntry('getNotification'), {
    helperKey: 'getNotification',
    routePathTemplate: '/runtime/account/agents/:agentId/notifications/:notification_id',
    httpMethod: 'GET',
    accessContextFamily: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    discoveryKind: 'read',
    recommendedOutputMode: 'truth-fetch-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    eventNotificationPlaneCapabilityMode: 'visibility-only',
    cliCommands: [],
    mcpTools: [
      {
        toolName: 'notification-read',
        outputMode: 'truth-fetch-result',
      },
    ],
  });

  assert.deepEqual(requireDiscoveryEntry('acknowledgeNotification'), {
    helperKey: 'acknowledgeNotification',
    routePathTemplate: '/runtime/account/agents/:agentId/notifications/:notification_id/acknowledgements',
    httpMethod: 'POST',
    accessContextFamily: 'operator-company',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
    discoveryKind: 'execute',
    recommendedOutputMode: 'execution-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    runnable: true,
    blockedBy: null,
    eventNotificationPlaneCapabilityMode: 'packet-grounded-execution',
    cliCommands: [],
    mcpTools: [
      {
        toolName: 'acknowledge-notification-execution',
        outputMode: 'execution-result',
      },
    ],
  });

  assert.equal(catalog.some((entry) => entry.helperKey === 'createNotificationDelivery'), false);
  assert.equal(catalog.some((entry) => entry.helperKey === 'retryNotification'), false);
  assert.equal(catalog.some((entry) => entry.helperKey === 'expireNotification'), false);
});

test('discovery catalog includes the dispatch-authority route family in the downstream baseline', () => {
  const catalog = buildLocalDiscoveryCatalog();

  assert.equal(
    catalog.some(
      (entry) => entry.routePathTemplate === '/runtime/account/agents/:agentId/dispatch-authority',
    ),
    true,
  );
  assert.equal(
    catalog.some(
      (entry) =>
        entry.routePathTemplate ===
        '/runtime/account/agents/:agentId/dispatch-authority-requests',
    ),
    true,
  );
});

test('buildLocalMcpToolCatalog derives MCP descriptors from the shared local discovery catalog', () => {
  const mcpTools = buildLocalMcpToolCatalog();

  assert.deepEqual(mcpTools.find((tool) => tool.toolName === 'heartbeat-execution'), {
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
    localCapabilityTier: 'L2-registration-runtime',
    localCapabilityRiskTier: 'runtime-execution',
    accessContextFamily: 'registration',
    requiredContext: ['tenantId', 'registrationId', 'principalId'],
    runnable: true,
    blockedBy: null,
    taskPlaneCapabilityMode: 'packet-grounded-execution',
  });

  assert.deepEqual(mcpTools.find((tool) => tool.toolName === 'agent-presence-read'), {
    toolName: 'agent-presence-read',
    description: 'Reads the current governed agent presence through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaAgentRegistrationIdentifierInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'getAgentPresence',
      capabilityKey: 'getAgentPresence',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
  });

  assert.deepEqual(mcpTools.find((tool) => tool.toolName === 'agent-readiness-read'), {
    toolName: 'agent-readiness-read',
    description: 'Reads the current governed agent readiness through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaAgentRegistrationIdentifierInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'getAgentReadiness',
      capabilityKey: 'getAgentReadiness',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    capabilityPlaneCapabilityMode: 'packet-grounded-read',
    dispatchEligibilityDerivedFromCapabilityReadTruth: false,
    governedRunAuthorizationDerivedFromCapabilityReadTruth: false,
  });

  assert.deepEqual(mcpTools.find((tool) => tool.toolName === 'account-agent-integration-eligibility-read'), {
    toolName: 'account-agent-integration-eligibility-read',
    description: 'Reads the canonical account-agent integration eligibility through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaAccountAgentIntegrationIdentifierInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'getAccountAgentIntegrationEligibility',
      capabilityKey: 'getAccountAgentIntegrationEligibility',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
  });

  assert.deepEqual(mcpTools.find((tool) => tool.toolName === 'query-provisional-agent-read'), {
    toolName: 'query-provisional-agent-read',
    description: 'Reads public provisional agent status through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaQueryProvisionalAgentInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'queryProvisionalAgent',
      capabilityKey: 'queryProvisionalAgent',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'tenant',
    contextSemantic: 'public-provisional',
    requiredContext: ['tenantId'],
  });

  assert.deepEqual(mcpTools.find((tool) => tool.toolName === 'task-dispatches-read'), {
    toolName: 'task-dispatches-read',
    description: 'Reads the current governed task dispatches through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaAccountAgentIdentifierInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'listTaskDispatches',
      capabilityKey: 'listTaskDispatches',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    taskPlaneCapabilityMode: 'visibility-only',
  });

  assert.deepEqual(mcpTools.find((tool) => tool.toolName === 'agent-capability-profile-write-execution'), {
    toolName: 'agent-capability-profile-write-execution',
    description: 'Executes the governed agent capability profile write through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaAgentCapabilityProfileExecutionInput',
    },
    outputMode: 'execution-result',
    helperRef: {
      helperKey: 'agent-capability-profile-write-execution',
      capabilityKey: 'postAgentCapabilityProfile',
    },
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
    accessContextFamily: 'operator-company',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    runnable: true,
    blockedBy: null,
  });

  assert.deepEqual(mcpTools.find((tool) => tool.toolName === 'create-provisional-agent-execution'), {
    toolName: 'create-provisional-agent-execution',
    description: 'Executes public provisional agent creation through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaProvisionalAgentCreateInput',
    },
    outputMode: 'execution-result',
    helperRef: {
      helperKey: 'createProvisionalAgent',
      capabilityKey: 'createProvisionalAgent',
    },
    localCapabilityTier: 'L2-registration-runtime',
    localCapabilityRiskTier: 'runtime-execution',
    accessContextFamily: 'tenant',
    contextSemantic: 'public-provisional',
    requiredContext: ['tenantId'],
    runnable: true,
    blockedBy: null,
  });

  assert.deepEqual(mcpTools.find((tool) => tool.toolName === 'claim-provisional-agent-execution'), {
    toolName: 'claim-provisional-agent-execution',
    description: 'Executes the session-bound provisional agent claim through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaProvisionalAgentClaimInput',
    },
    outputMode: 'execution-result',
    helperRef: {
      helperKey: 'claimProvisionalAgent',
      capabilityKey: 'claimProvisionalAgent',
    },
    localCapabilityTier: 'L2-registration-runtime',
    localCapabilityRiskTier: 'runtime-execution',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
    runnable: true,
    blockedBy: null,
  });
});

test('discovery catalog exposes the first-class account-plane continuation surfaces proven by local-docker evidence', () => {
  assert.deepEqual(requireDiscoveryEntry('listAccountIntegrationCapabilities'), {
    helperKey: 'listAccountIntegrationCapabilities',
    routePathTemplate: '/runtime/account/integration-capabilities',
    httpMethod: 'GET',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    discoveryKind: 'read',
    recommendedOutputMode: 'truth-fetch-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    cliCommands: ['account-integration-capabilities'],
    mcpTools: [
      {
        toolName: 'account-integration-capabilities-read',
        outputMode: 'truth-fetch-result',
      },
    ],
  });

  assert.deepEqual(requireDiscoveryEntry('getAccountAgentIntegrationEligibility'), {
    helperKey: 'getAccountAgentIntegrationEligibility',
    routePathTemplate: '/runtime/account/agents/:agentId/integrations/:integrationCode/eligibility',
    httpMethod: 'GET',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    discoveryKind: 'read',
    recommendedOutputMode: 'truth-fetch-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    cliCommands: ['account-agent-integration-eligibility'],
    mcpTools: [
      {
        toolName: 'account-agent-integration-eligibility-read',
        outputMode: 'truth-fetch-result',
      },
    ],
  });

  assert.deepEqual(requireDiscoveryEntry('getAccountAgentClosureStatus'), {
    helperKey: 'getAccountAgentClosureStatus',
    routePathTemplate: '/runtime/account/agents/:agentId/closure-status',
    httpMethod: 'GET',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    discoveryKind: 'read',
    recommendedOutputMode: 'truth-fetch-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    cliCommands: ['account-agent-closure-status'],
    mcpTools: [
      {
        toolName: 'account-agent-closure-status-read',
        outputMode: 'truth-fetch-result',
      },
    ],
  });

  assert.deepEqual(requireDiscoveryEntry('refreshAccountAgentAuthorization'), {
    helperKey: 'refreshAccountAgentAuthorization',
    routePathTemplate: '/runtime/account/agents/:agentId/governed-runtime/authorization-refresh',
    httpMethod: 'POST',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L1-review-safe',
    localCapabilityRiskTier: 'review-safe',
    discoveryKind: 'review-safe',
    recommendedOutputMode: 'execution-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    cliCommands: ['account-agent-authorization-refresh'],
    mcpTools: [
      {
        toolName: 'account-agent-authorization-refresh-execution',
        outputMode: 'execution-result',
      },
    ],
  });

  assert.deepEqual(requireDiscoveryEntry('createAccountAgentExternalBinding'), {
    helperKey: 'createAccountAgentExternalBinding',
    routePathTemplate: '/runtime/account/agents/:agentId/external-account-bindings',
    httpMethod: 'POST',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L1-review-safe',
    localCapabilityRiskTier: 'review-safe',
    discoveryKind: 'review-safe',
    recommendedOutputMode: 'execution-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    cliCommands: ['account-agent-external-binding'],
    mcpTools: [
      {
        toolName: 'account-agent-external-binding-execution',
        outputMode: 'execution-result',
      },
    ],
  });

  assert.deepEqual(requireDiscoveryEntry('decideDispatchAuthorityRequest'), {
    helperKey: 'decideDispatchAuthorityRequest',
    routePathTemplate: '/operator/dispatch-authority-requests/:request_id/decision',
    httpMethod: 'POST',
    accessContextFamily: 'admin-session',
    requiredContext: ['tenantId', 'adminSessionId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
    discoveryKind: 'execute',
    recommendedOutputMode: 'execution-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    runnable: true,
    blockedBy: null,
    cliCommands: ['operator-dispatch-authority-decision'],
    mcpTools: [
      {
        toolName: 'operator-dispatch-authority-decision-execution',
        outputMode: 'execution-result',
      },
    ],
  });

  assert.deepEqual(requireDiscoveryEntry('getAccountAgentGovernedWorkClosure'), {
    helperKey: 'getAccountAgentGovernedWorkClosure',
    routePathTemplate: '/runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/governed-work-closure',
    httpMethod: 'GET',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    discoveryKind: 'read',
    recommendedOutputMode: 'truth-fetch-result',
    sourceOfTruth: 'local-sdk-helpers',
    localOnly: true,
    remoteDiscovery: false,
    taskPlaneCapabilityMode: 'visibility-only',
    cliCommands: ['governed-work-closure'],
    mcpTools: [
      {
        toolName: 'governed-work-closure-read',
        outputMode: 'truth-fetch-result',
      },
    ],
  });
});

test('discovery and MCP productization snapshots stay local-only under the capability-plane boundary', () => {
  const capabilityPlane = buildCapabilityPlaneView();
  const mcpProductization = buildLocalMcpProductizationSnapshot();

  assert.equal(capabilityPlane.localSnapshots.descriptiveOnly, true);
  assert.equal(capabilityPlane.localSnapshots.liveServerNegotiationClaimed, false);
  assert.equal(capabilityPlane.localSnapshots.remoteRegistryBehaviorClaimed, false);
  assert.equal(mcpProductization.serverBoundary.remoteDiscovery, false);
  assert.equal(mcpProductization.serverBoundary.hosted, false);
  assert.equal(mcpProductization.serverBoundary.sourceOfTruth, 'local-sdk-helpers');
});

test('buildLocalDiagnosticCommandCatalog exposes install-integrity as an explicit local-only diagnostic surface', () => {
  assert.deepEqual(buildLocalDiagnosticCommandCatalog(), [
    {
      command: 'install-integrity',
      scope: 'local-only',
      summary: 'Reports the active bidvia binary, local package roots, package version, and likely install-path drift.',
    },
    {
      command: 'validation-smoke',
      scope: 'local-only',
      summary: 'Runs a bounded local-first smoke pass over install, environment, runtime capability, server capability, and context diagnostics.',
    },
    {
      command: 'diagnostic-bundle-export',
      scope: 'local-only',
      summary: 'Exports the bounded smoke report as machine-readable JSON plus a shareable markdown summary.',
    },
    {
      command: 'public-runtime-interpretation-probe',
      scope: 'local-only',
      summary: 'Probes live /healthz and /readyz and exports bounded runtime interpretation evidence without overclaiming release truth.',
    },
  ]);
});
