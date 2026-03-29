import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeServerCapabilityPayload,
} from '../src/server-capabilities.ts';
import type {
  BidviaNormalizedServerCapabilitySnapshot,
} from '../src/contracts.ts';

test('normalizeServerCapabilityPayload maps server-provided capability payloads into the repo capability shape with explicit server-derived sources', () => {
  const snapshot = normalizeServerCapabilityPayload({
    environment_mode: 'production',
    route_capabilities: [
      {
        helper_key: 'postHeartbeat',
        route_path_template: '/runtime/agents/:registrationId/heartbeat',
        http_method: 'POST',
        access_context_family: 'registration',
        required_context: ['tenantId', 'registrationId', 'principalId'],
        scope: 'write',
        level: 'atomic-route',
      },
    ],
    mcp_tools: [
      {
        tool_name: 'industry-universe-plan-preview',
        description: 'Previews the bounded industry universe scenario plan payload.',
        input_schema_ref: {
          schema_key: 'BidviaIndustryUniverseScenarioPlanInput',
        },
        output_mode: 'plan-preview',
        helper_ref: {
          helper_key: 'buildIndustryUniverseScenarioPlan',
          capability_key: 'buildIndustryUniverseScenarioPlan',
        },
      },
    ],
    mcp_server: {
      available: true,
      transport: 'stdio',
      supported_methods: ['initialize', 'tools/list', 'tools/call'],
    },
  });

  assert.equal(snapshot.environmentMode, 'production');
  assert.equal(snapshot.routeCapabilities.source, 'server-derived');
  assert.equal(snapshot.routeCapabilities.items[0]?.helperKey, 'postHeartbeat');
  assert.equal(snapshot.routeCapabilities.schemaVersion, '2026-03-27');
  assert.equal(snapshot.routeCapabilities.version, 'server-capability-payload');
  assert.equal(snapshot.routeCapabilities.etag, null);
  assert.match(snapshot.routeCapabilities.lastUpdatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(snapshot.routeCapabilities.ttl, null);
  assert.equal(snapshot.routeCapabilities.expiresAt, null);
  assert.equal(snapshot.routeCapabilities.stale, false);
  assert.equal(snapshot.routeCapabilities.fallbackPolicy, 'retain-server-derived-snapshot-until-replaced');
  assert.equal(snapshot.mcpTools.source, 'server-derived');
  assert.equal(snapshot.mcpTools.items[0]?.toolName, 'industry-universe-plan-preview');
  assert.equal(snapshot.mcpTools.schemaVersion, '2026-03-27');
  assert.equal(snapshot.mcpTools.version, 'server-capability-payload');
  assert.equal(snapshot.mcpTools.etag, null);
  assert.match(snapshot.mcpTools.lastUpdatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(snapshot.mcpTools.ttl, null);
  assert.equal(snapshot.mcpTools.expiresAt, null);
  assert.equal(snapshot.mcpTools.stale, false);
  assert.equal(snapshot.mcpTools.fallbackPolicy, 'retain-server-derived-snapshot-until-replaced');
  assert.deepEqual(snapshot.localMcpServer, {
    source: 'server-derived',
    schemaVersion: '2026-03-27',
    version: 'server-capability-payload',
    etag: null,
    lastUpdatedAt: snapshot.localMcpServer.lastUpdatedAt,
    ttl: null,
    expiresAt: null,
    stale: false,
    fallbackPolicy: 'retain-server-derived-snapshot-until-replaced',
    available: true,
    transport: 'stdio',
    supportedMethods: ['initialize', 'tools/list', 'tools/call'],
  });
  assert.match(snapshot.localMcpServer.lastUpdatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(snapshot.serverNegotiation, {
    source: 'server-derived',
    schemaVersion: '2026-03-27',
    version: 'server-capability-payload',
    etag: null,
    lastUpdatedAt: snapshot.serverNegotiation.lastUpdatedAt,
    ttl: null,
    expiresAt: null,
    stale: false,
    fallbackPolicy: 'retain-server-derived-snapshot-until-replaced',
    status: 'provided',
    serverProvidedCapabilitiesKnown: true,
  });
  assert.match(snapshot.serverNegotiation.lastUpdatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('normalizeServerCapabilityPayload keeps local and deferred server knowledge distinct in type and shape', () => {
  const snapshot: BidviaNormalizedServerCapabilitySnapshot = normalizeServerCapabilityPayload({
    route_capabilities: [],
    mcp_tools: [],
    mcp_server: {
      available: false,
      transport: 'stdio',
      supported_methods: ['initialize', 'tools/list', 'tools/call'],
    },
  });

  assert.equal(snapshot.routeCapabilities.source, 'server-derived');
  assert.equal(snapshot.mcpTools.source, 'server-derived');
  assert.equal(snapshot.localMcpServer.source, 'server-derived');
  assert.equal(snapshot.routeCapabilities.fallbackPolicy, 'retain-server-derived-snapshot-until-replaced');
  assert.equal(snapshot.mcpTools.stale, false);
  assert.equal(snapshot.localMcpServer.ttl, null);
  assert.deepEqual(snapshot.serverNegotiation, {
    source: 'server-derived',
    schemaVersion: '2026-03-27',
    version: 'server-capability-payload',
    etag: null,
    lastUpdatedAt: snapshot.serverNegotiation.lastUpdatedAt,
    ttl: null,
    expiresAt: null,
    stale: false,
    fallbackPolicy: 'retain-server-derived-snapshot-until-replaced',
    status: 'provided',
    serverProvidedCapabilitiesKnown: true,
  });
  assert.equal(snapshot.localMcpServer.available, false);
});

test('normalizeServerCapabilityPayload classifies widened truth-fetch reads from payload data without synthesizing extra support', () => {
  const snapshot = normalizeServerCapabilityPayload({
    route_capabilities: [
      {
        helper_key: 'listCanonicalSemanticConcepts',
        route_path_template: '/runtime/canonical-semantic-concepts',
        http_method: 'GET',
        access_context_family: 'tenant',
        required_context: ['tenantId'],
        scope: 'read',
        level: 'atomic-route',
      },
      {
        helper_key: 'getAttachmentBinding',
        route_path_template: '/runtime/attachment-bindings/:attachment_binding_id',
        http_method: 'GET',
        access_context_family: 'tenant',
        required_context: ['tenantId'],
        scope: 'read',
        level: 'atomic-route',
      },
    ],
    mcp_tools: [],
    mcp_server: {
      available: true,
      transport: 'stdio',
      supported_methods: ['initialize', 'tools/list', 'tools/call'],
    },
  });

  assert.deepEqual(snapshot.routeCapabilities.items, [
    {
      helperKey: 'listCanonicalSemanticConcepts',
      routePathTemplate: '/runtime/canonical-semantic-concepts',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
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
  ]);
});
