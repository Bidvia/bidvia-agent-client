import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLocalDiscoveryCatalog,
  buildLocalMcpToolCatalog,
} from '../src/discovery-catalog.ts';

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
  });
});
