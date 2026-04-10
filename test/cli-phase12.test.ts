import test from 'node:test';
import assert from 'node:assert/strict';

import type { BidviaHeartbeatInput } from '../src/contracts.ts';
import { runCli } from '../src/cli.ts';

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
    '  route-context-matrix',
    'Prerequisite Account / Session Support:',
    '  sign-in --input ...',
    '  sign-up-personal --input ...',
    '  sign-up-enterprise --input ...',
    '  account-me',
    '  select-org --input ...',
    '  session-refresh',
    '  session-revoke',
    '  openclaw-mcp-config',
    '  openclaw-bundle-export --output ...',
    'Agent Onboarding (Public Provisional -> Claim):',
    '  create-provisional-agent --provisional-agent-ref ...',
    '  query-provisional-agent --provisional-agent-ref ...',
    '  claim-provisional-agent --provisional-agent-ref ... --claim-token ...',
    'Agent Runtime (Run):',
    '  registration-lifecycle-plan',
    '  registered-agent-operations-plan',
    '  mcp-server',
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
    '  account-agent --registration-id ...',
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
    '  file-resources',
    '  file-resource --file-resource-id ...',
    '  target-attachment-bindings --target-ref ...',
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
    status: 'ready',
    blockedBy: [],
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
        status: 'complete',
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
      journeyStage: 'governed-run-execution',
      journeyStageSemantics: 'local-only',
      relevance: 'governed-run-secondary',
      command: 'registered-agent-operations-plan',
      rationale: 'Use the post-onboarding operations plan after Governed Run has the required registration context.',
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
      steps: Array<{
        helperKey: string;
        routePathTemplate: string;
        accessContextFamily: string;
        contextSemantic: string;
        requiredContext: string[];
      }>;
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
    steps: [
      {
        helperKey: 'getAgentReadiness',
        routePathTemplate: '/runtime/agents/:agent_registration_id/readiness',
        accessContextFamily: 'principal-governed-read',
        contextSemantic: 'principal-governed-read',
        requiredContext: ['tenantId', 'principalId'],
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
        rationale: 'Confirm the required context family for each guided route before enabling local OpenClaw operator execution.',
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
    status: 'ready',
    blockedBy: [],
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
        status: 'complete',
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
    {
      journeyKey: 'governed-run',
      helperKey: 'postHeartbeat',
      routePathTemplate: '/runtime/agents/:registrationId/heartbeat',
      routeFamily: 'agent-runtime',
      journeyStage: 'governed-run-execution',
      journeyStageSemantics: 'local-only',
      accessContextFamily: 'registration',
      contextSemantic: 'registration',
      requiredContext: ['tenantId', 'registrationId', 'principalId'],
      operationKind: 'execute',
      executionTruth: 'packet-grounded-execution',
      executionBlockedBy: null,
      localCapabilityRiskTier: 'runtime-execution',
      relevance: 'governed-run-secondary',
      presentationTier: 'secondary',
      recommendedOutputMode: 'execution-result',
    },
    {
      journeyKey: 'governed-run',
      helperKey: 'createCommercialAction',
      routePathTemplate: '/runtime/commercial-actions',
      routeFamily: 'agent-runtime',
      journeyStage: 'governed-run-execution',
      journeyStageSemantics: 'local-only',
      accessContextFamily: 'operator-company',
      contextSemantic: 'operator-company',
      requiredContext: ['tenantId', 'principalId', 'companyId'],
      operationKind: 'execute',
      executionTruth: 'compatibility-only',
      executionBlockedBy: null,
      localCapabilityRiskTier: 'governed-commercial',
      relevance: 'governed-run-secondary',
      presentationTier: 'secondary',
      recommendedOutputMode: 'execution-result',
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
      command: 'registered-agent-operations-plan',
      rationale: 'Use the post-onboarding operations plan after Governed Run has the required registration context.',
      journeyStage: 'governed-run-execution',
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
      status: 'ready',
      blockedBy: [],
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
          status: 'complete',
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
      hints: [
        'Dry-run stays local and does not execute the remote registration-bound route.',
        'Set BIDVIA_TENANT_ID and BIDVIA_REGISTRATION_ID and BIDVIA_PRINCIPAL_ID before running the real execution command.',
        'Risk tier runtime-execution means the non-dry-run command writes to the remote runtime route.',
      ],
    },
    input: {
      now: '2026-03-29T10:00:00Z',
      expiresAt: '2026-03-29T10:05:00.000Z',
    },
  }]);
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
