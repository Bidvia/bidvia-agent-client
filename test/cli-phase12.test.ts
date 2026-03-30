import test from 'node:test';
import assert from 'node:assert/strict';

import type { BidviaHeartbeatInput } from '../src/contracts.ts';
import { runCli } from '../src/cli.ts';

test('runCli prints grouped help output for visibility, execution, review-safe, and verification commands', async () => {
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
    'bidvia-agent-client',
    'Visibility commands:',
    '  environment-mode',
    '  runtime-capabilities',
    '  launch-topology-smoke',
    '  server-capabilities',
    '  operator-discovery',
    '  account-agents',
    '  account-agent --registration-id ...',
    '  account-agent-bindings',
    '  account-records',
    '  agent-presence --registration-id ...',
    '  agent-authority --registration-id ...',
    '  agent-readiness --registration-id ...',
    '  agent-summary --registration-id ...',
    '  agent-authority-profile --registration-id ...',
    '  agent-authority-ladder --registration-id ...',
    '  agent-capability-profiles --registration-id ...',
    '  agent-capability-profile --registration-id ... --capability-profile-id ...',
    '  canonical-semantic-concepts',
    '  canonical-semantic-concept --concept-id ...',
    '  canonical-semantic-labels',
    '  canonical-semantic-label --label-id ...',
    '  canonical-semantic-mappings',
    '  canonical-semantic-mapping --mapping-id ...',
    '  canonical-semantic-taxonomy-entries',
    '  canonical-semantic-taxonomy-entry --taxonomy-entry-id ...',
    '  canonical-semantic-lineage-links',
    '  canonical-semantic-lineage-link --lineage-link-id ...',
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
    'Execution commands:',
    '  heartbeat [--dry-run]',
    '  sync-upload [--dry-run]',
    '  evidence [--dry-run]',
    '  proposal [--dry-run]',
    'Review-safe commands:',
    '  industry-universe-plan',
    '  industry-universe-review-packet-preview',
    '  industry-universe-review-packet-export',
    '  connection-approval-plan',
    '  connection-approval-review-packet-preview',
    '  connection-approval-review-packet-export',
    '  opportunity-package-handoff-plan',
    '  opportunity-package-handoff-review-packet-preview',
    '  opportunity-package-handoff-review-packet-export',
    '  registration-lifecycle-plan',
    '  registered-agent-operations-plan',
    'Verification commands:',
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
      nextStageReadRouteDiscoveryGroups: Array<{ groupKey: string; discoveryStatus: string; memberCount: number }>;
    };
    mcp: {
      serverBoundary: { transport: string; hosted: boolean; remoteDiscovery: boolean; sourceOfTruth: string };
      discoverability: {
        truthFetchReadOnly: boolean;
        reviewSafeLocalOnly: boolean;
        executionRequiresLocalExecutionClient: boolean;
      };
      tools: Array<{ toolName: string; routePathTemplate: string; httpMethod: string; scope: string }>;
    };
  };
  assert.equal(snapshot.command, 'operator-discovery');
  assert.equal(snapshot.scope, 'local-only');
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
  });
  assert.deepEqual(snapshot.cli.routeCapabilities.find((entry) => entry.helperKey === 'getAgentReadiness'), {
    helperKey: 'getAgentReadiness',
    routePathTemplate: '/runtime/agents/:agent_registration_id/readiness',
    httpMethod: 'GET',
    accessContextFamily: 'admin-session',
    requiredContext: ['tenantId', 'adminSessionId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
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
  });
  assert.deepEqual(snapshot.cli.nextStageReadRouteDiscoveryGroups.find((entry) => entry.groupKey === 'governance-deep-reads'), {
    groupKey: 'governance-deep-reads',
    label: 'Richer governance deep reads',
    discoveryStatus: 'metadata-only',
    discoveryOnly: true,
    serverTruthClaimed: false,
    memberCount: 0,
  });
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
    baseUrl: 'https://api.bidvia.ai',
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
    baseUrl: 'https://api.bidvia.ai',
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

  assert.equal(defaultSnapshot.baseUrl, 'https://api.bidvia.ai');
  assert.equal(defaultSnapshot.environmentMode, 'production');
  assert.equal(localSnapshot.baseUrl, 'http://127.0.0.1:8787');
  assert.equal(localSnapshot.environmentMode, 'local');
  assert.notEqual(localSnapshot.environmentMode, 'sim');
  assert.equal(simSnapshot.baseUrl, 'https://staging.bidvia.internal');
  assert.equal(simSnapshot.environmentMode, 'sim');
  assert.notEqual(simSnapshot.environmentMode, 'local');
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
      missingContext: ['registrationId', 'principalId'],
      hints: [
        'Dry-run stays local and does not execute the remote registration-bound route.',
        'Set BIDVIA_REGISTRATION_ID and BIDVIA_PRINCIPAL_ID before running the real execution command.',
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
