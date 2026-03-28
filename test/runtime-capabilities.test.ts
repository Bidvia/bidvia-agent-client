import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLocalRuntimeCapabilitySnapshot,
} from '../src/runtime-capabilities.ts';
import type {
  BidviaLocalRuntimeCapabilitySnapshot,
} from '../src/contracts.ts';

test('buildLocalRuntimeCapabilitySnapshot derives a machine-readable local capability view from shipped facts only', () => {
  const snapshot = buildLocalRuntimeCapabilitySnapshot({
    profile: 'global',
  });

  assert.equal(snapshot.baseUrl, 'https://bidvia.ai');
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
  assert.equal(snapshot.mcpTools.items.length, 13);
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
