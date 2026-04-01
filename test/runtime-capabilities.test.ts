import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLocalRuntimeCapabilitySnapshot,
} from '../src/runtime-capabilities.ts';
import type {
  BidviaLocalRuntimeCapabilitySnapshot,
} from '../src/contracts.ts';

test('buildLocalRuntimeCapabilitySnapshot defaults to the public global API while keeping its capability view derived from shipped facts only', () => {
  const snapshot = buildLocalRuntimeCapabilitySnapshot();

  assert.equal(snapshot.baseUrl, 'https://api.bidvia.ai');
  assert.equal(snapshot.environmentMode, 'production');
  assert.equal(snapshot.routeCapabilities.source, 'local-static');
  assert.equal(snapshot.routeCapabilities.items.length > 0, true);
  assert.equal(snapshot.routeCapabilities.schemaVersion, '2026-03-27');
  assert.equal(snapshot.routeCapabilities.version, 'local-runtime-capability-snapshot');
  assert.equal(snapshot.routeCapabilities.revision, 'repo-route-capabilities');
  assert.match(snapshot.routeCapabilities.lastUpdatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(snapshot.routeCapabilities.ttl, null);
  assert.equal(snapshot.routeCapabilities.expiresAt, null);
  assert.equal(snapshot.routeCapabilities.stale, false);
  assert.equal(snapshot.routeCapabilities.fallbackPolicy, 'prefer-local-static-until-server-negotiation');
  assert.equal(snapshot.routeCapabilities.items.every((capability) => capability.localCapabilityTier !== undefined), true);
  assert.equal(
    snapshot.routeCapabilities.items.every((capability) => capability.localCapabilityRiskTier !== undefined),
    true,
  );
  assert.equal(snapshot.mcpTools.source, 'local-static');
  assert.equal(snapshot.mcpTools.items.length, 30);
  assert.equal(snapshot.mcpTools.schemaVersion, '2026-03-27');
  assert.equal(snapshot.mcpTools.version, 'local-runtime-capability-snapshot');
  assert.equal(snapshot.mcpTools.revision, 'repo-mcp-tools');
  assert.match(snapshot.mcpTools.lastUpdatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(snapshot.mcpTools.ttl, null);
  assert.equal(snapshot.mcpTools.expiresAt, null);
  assert.equal(snapshot.mcpTools.stale, false);
  assert.equal(snapshot.mcpTools.fallbackPolicy, 'prefer-local-static-until-server-negotiation');
  assert.equal(snapshot.mcpTools.items.every((tool) => tool.localCapabilityTier !== undefined), true);
  assert.equal(snapshot.mcpTools.items.every((tool) => tool.localCapabilityRiskTier !== undefined), true);
  assert.deepEqual(snapshot.localMcpServer, {
    source: 'local-static',
    schemaVersion: '2026-03-27',
    version: 'local-runtime-capability-snapshot',
    revision: 'repo-local-mcp-server',
    lastUpdatedAt: snapshot.localMcpServer.lastUpdatedAt,
    ttl: null,
    expiresAt: null,
    stale: false,
    fallbackPolicy: 'prefer-local-static-until-server-negotiation',
    available: true,
    transport: 'stdio',
    entrypoint: 'src/mcp-server.ts',
    supportedMethods: ['initialize', 'tools/list', 'tools/call'],
  });
  assert.match(snapshot.localMcpServer.lastUpdatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('buildLocalRuntimeCapabilitySnapshot keeps explicit local and sim base URLs classified without falling back to the public default', () => {
  const localSnapshot = buildLocalRuntimeCapabilitySnapshot({
    explicitBaseUrl: 'http://127.0.0.1:8787',
  });
  const simSnapshot = buildLocalRuntimeCapabilitySnapshot({
    explicitBaseUrl: 'https://staging.bidvia.internal',
  });

  assert.equal(localSnapshot.baseUrl, 'http://127.0.0.1:8787');
  assert.equal(localSnapshot.environmentMode, 'local');
  assert.notEqual(localSnapshot.environmentMode, 'sim');
  assert.equal(simSnapshot.baseUrl, 'https://staging.bidvia.internal');
  assert.equal(simSnapshot.environmentMode, 'sim');
  assert.notEqual(simSnapshot.environmentMode, 'local');
});

test('buildLocalRuntimeCapabilitySnapshot keeps deferred server negotiation explicit and separate from local facts', () => {
  const snapshot: BidviaLocalRuntimeCapabilitySnapshot = buildLocalRuntimeCapabilitySnapshot({
    explicitBaseUrl: 'https://staging.bidvia.internal',
  });

  assert.equal(snapshot.environmentMode, 'sim');
  assert.deepEqual(snapshot.deferredServerNegotiation, {
    source: 'deferred-server-negotiation',
    schemaVersion: '2026-03-27',
    version: 'local-runtime-capability-snapshot',
    revision: 'deferred-server-negotiation',
    lastUpdatedAt: snapshot.deferredServerNegotiation.lastUpdatedAt,
    ttl: null,
    expiresAt: null,
    stale: false,
    fallbackPolicy: 'await-explicit-server-negotiation',
    status: 'deferred',
    serverProvidedCapabilitiesKnown: false,
  });
  assert.match(snapshot.deferredServerNegotiation.lastUpdatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(snapshot.localMcpServer.available, true);
  assert.equal(snapshot.routeCapabilities.items.some((capability) => capability.helperKey === 'postHeartbeat'), true);
  assert.equal(
    snapshot.routeCapabilities.items.some((capability) => capability.helperKey === 'listCanonicalSemanticConcepts'),
    true,
  );
  assert.deepEqual(
    snapshot.routeCapabilities.items.find((capability) => capability.helperKey === 'postHeartbeat'),
    {
      helperKey: 'postHeartbeat',
      routePathTemplate: '/runtime/agents/:registrationId/heartbeat',
      httpMethod: 'POST',
      accessContextFamily: 'registration',
      requiredContext: ['tenantId', 'registrationId', 'principalId'],
      scope: 'write',
      level: 'atomic-route',
      localCapabilityTier: 'L2-registration-runtime',
      localCapabilityRiskTier: 'runtime-execution',
    },
  );
  assert.deepEqual(
    snapshot.routeCapabilities.items.find((capability) => capability.helperKey === 'getAttachmentBinding'),
    {
      helperKey: 'getAttachmentBinding',
      routePathTemplate: '/runtime/attachment-bindings/:attachment_binding_id',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
  );
  assert.deepEqual(
    snapshot.mcpTools.items.find((tool) => tool.toolName === 'industry-universe-plan-preview'),
    {
      toolName: 'industry-universe-plan-preview',
      description: 'Previews the bounded industry universe scenario plan payload.',
      inputSchemaRef: {
        schemaKey: 'BidviaIndustryUniverseScenarioPlanInput',
      },
      outputMode: 'plan-preview',
      helperRef: {
        helperKey: 'buildIndustryUniverseScenarioPlan',
        capabilityKey: 'buildIndustryUniverseScenarioPlan',
      },
      localCapabilityTier: 'L1-review-safe',
      localCapabilityRiskTier: 'review-safe',
      accessContextFamily: 'scenario',
      requiredContext: ['tenantId', 'principalId', 'companyId'],
    },
  );
});

test('buildLocalRuntimeCapabilitySnapshot includes shipped widened read helpers in local route capability discovery', () => {
  const snapshot = buildLocalRuntimeCapabilitySnapshot();

  assert.deepEqual(
    snapshot.routeCapabilities.items.find((capability) => capability.helperKey === 'getAgentReadiness'),
    {
      helperKey: 'getAgentReadiness',
      routePathTemplate: '/runtime/agents/:agent_registration_id/readiness',
      httpMethod: 'GET',
      accessContextFamily: 'principal-governed-read',
      requiredContext: ['tenantId', 'principalId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
  );
  assert.deepEqual(
    snapshot.routeCapabilities.items.find((capability) => capability.helperKey === 'listCanonicalSemanticLabels'),
    {
      helperKey: 'listCanonicalSemanticLabels',
      routePathTemplate: '/runtime/canonical-semantic-labels',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
  );
  assert.deepEqual(
    snapshot.routeCapabilities.items.find((capability) => capability.helperKey === 'getPricingExplanation'),
    {
      helperKey: 'getPricingExplanation',
      routePathTemplate: '/runtime/pricing-explanations/:pricing_explanation_id',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
  );
  assert.deepEqual(
    snapshot.routeCapabilities.items.find((capability) => capability.helperKey === 'listTargetAttachmentBindings'),
    {
      helperKey: 'listTargetAttachmentBindings',
      routePathTemplate: '/runtime/targets/:target_ref/attachment-bindings',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
  );
});
