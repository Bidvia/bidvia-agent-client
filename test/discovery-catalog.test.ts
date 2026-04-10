import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLocalDiscoveryCatalog,
  buildLocalMcpProductizationSnapshot,
  buildLocalMcpToolCatalog,
} from '../src/discovery-catalog.ts';
import { buildCapabilityPlaneView } from '../src/capability-plane.ts';

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

  const notification = catalog.find((entry) => entry.helperKey === 'getNotification');
  assert.deepEqual(notification, {
    helperKey: 'getNotification',
    routePathTemplate: '/runtime/notifications/:notification_id',
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

  const createTaskDispatch = catalog.find((entry) => entry.helperKey === 'createTaskDispatch');
  assert.deepEqual(createTaskDispatch, {
    helperKey: 'createTaskDispatch',
    routePathTemplate: '/runtime/agents/:agent_registration_id/task-dispatches',
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
    taskPlaneCapabilityMode: 'compatibility-only',
    cliCommands: [],
    mcpTools: [
      {
        toolName: 'create-task-dispatch-execution',
        outputMode: 'execution-result',
      },
    ],
  });

  const createLease = catalog.find((entry) => entry.helperKey === 'createLease');
  assert.deepEqual(createLease, {
    helperKey: 'createLease',
    routePathTemplate: '/runtime/agents/:agent_registration_id/leases',
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
    cliCommands: [],
    mcpTools: [
      {
        toolName: 'create-lease-execution',
        outputMode: 'execution-result',
      },
    ],
  });

  const acknowledgeNotification = catalog.find((entry) => entry.helperKey === 'acknowledgeNotification');
  assert.deepEqual(acknowledgeNotification, {
    helperKey: 'acknowledgeNotification',
    routePathTemplate: '/runtime/notifications/:notification_id/acknowledgements',
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
    mcpTools: [
      {
        toolName: 'request-commercial-action-approval-execution',
        outputMode: 'execution-result',
      },
    ],
  });

  assert.equal(catalog.some((entry) => entry.helperKey === 'listAgentCapabilityProfiles'), false);
  assert.equal(catalog.some((entry) => entry.helperKey === 'listCanonicalSemanticTaxonomyEntries'), false);
  assert.equal(catalog.some((entry) => entry.helperKey === 'listCanonicalSemanticLineageLinks'), false);
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
      schemaKey: 'BidviaAgentRegistrationIdentifierInput',
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
