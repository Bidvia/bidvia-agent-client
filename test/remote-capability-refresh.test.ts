import test from 'node:test';
import assert from 'node:assert/strict';

import * as bidvia from '../src/index.ts';
import { buildLocalRuntimeCapabilitySnapshot } from '../src/runtime-capabilities.ts';
import { refreshRemoteCapabilityTruth } from '../src/remote-capability-refresh.ts';

test('main package barrel exports refreshRemoteCapabilityTruth', () => {
  assert.equal(bidvia.refreshRemoteCapabilityTruth, refreshRemoteCapabilityTruth);
});

test('refreshRemoteCapabilityTruth consumes provided frozen core payloads and merges them into descriptive local state', () => {
  const localSnapshot = buildLocalRuntimeCapabilitySnapshot({
    explicitBaseUrl: 'https://api.bidvia.ai',
  });

  const refreshed = refreshRemoteCapabilityTruth({
    localSnapshot,
    coreCapabilityPayload: {
      environment_mode: 'production',
      route_capabilities: [
        {
          helper_key: 'refreshCapabilityTruth',
          route_path_template: '/runtime/capabilities/refresh',
          http_method: 'GET',
          access_context_family: 'tenant',
          required_context: ['tenantId'],
          scope: 'read',
          level: 'atomic-route',
        },
      ],
      mcp_tools: [
        {
          tool_name: 'capability-truth-refresh-preview',
          description: 'Explains the dependency-gated capability refresh seam.',
          input_schema_ref: {
            schema_key: 'BidviaRemoteCapabilityRefreshInput',
          },
          output_mode: 'plan-preview',
          helper_ref: {
            helper_key: 'refreshRemoteCapabilityTruth',
            capability_key: 'refreshRemoteCapabilityTruth',
          },
        },
      ],
      mcp_server: {
        available: false,
        transport: 'stdio',
        supported_methods: ['initialize', 'tools/list', 'tools/call'],
      },
    },
  });

  assert.equal(refreshed.coreTruthRefresh.status, 'provided');
  assert.equal(refreshed.coreTruthRefresh.source, 'server-derived');
  assert.equal(refreshed.routeCapabilities.localSnapshot.source, 'local-static');
  assert.equal(refreshed.routeCapabilities.coreSnapshot?.source, 'server-derived');
  assert.equal(refreshed.routeCapabilities.effectiveSource, 'server-derived');
  assert.deepEqual(refreshed.routeCapabilities.effectiveItems, [
    {
      helperKey: 'refreshCapabilityTruth',
      routePathTemplate: '/runtime/capabilities/refresh',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
  ]);
  assert.equal(refreshed.routeCapabilities.localSnapshot.items.some((capability) => capability.helperKey === 'postHeartbeat'), true);
  assert.equal(refreshed.mcpTools.effectiveSource, 'server-derived');
  assert.deepEqual(refreshed.mcpTools.coreSnapshot?.items[0], {
    toolName: 'capability-truth-refresh-preview',
    description: 'Explains the dependency-gated capability refresh seam.',
    inputSchemaRef: {
      schemaKey: 'BidviaRemoteCapabilityRefreshInput',
    },
    outputMode: 'plan-preview',
    helperRef: {
      helperKey: 'refreshRemoteCapabilityTruth',
      capabilityKey: 'refreshRemoteCapabilityTruth',
    },
    localCapabilityTier: 'L1-review-safe',
    localCapabilityRiskTier: 'review-safe',
    accessContextFamily: 'scenario',
    requiredContext: [],
  });
  assert.equal(refreshed.localMcpServer.effectiveSource, 'server-derived');
  assert.equal(refreshed.localMcpServer.effectiveValue.available, false);
});

test('refreshRemoteCapabilityTruth fails closed with explicit dependency-gated state when frozen core truth is unavailable', () => {
  const localSnapshot = buildLocalRuntimeCapabilitySnapshot({
    explicitBaseUrl: 'https://staging.bidvia.internal',
  });

  const refreshed = refreshRemoteCapabilityTruth({
    localSnapshot,
  });

  assert.equal(refreshed.environmentMode, 'sim');
  assert.deepEqual(refreshed.coreTruthRefresh, {
    source: 'dependency-gated',
    status: 'blocked',
    blockedBy: 'bidvia-core-capability-truth',
    reason: 'Frozen core capability truth is unavailable.',
    serverProvidedCapabilitiesKnown: false,
  });
  assert.equal(refreshed.routeCapabilities.localSnapshot.source, 'local-static');
  assert.equal(refreshed.routeCapabilities.coreSnapshot, null);
  assert.equal(refreshed.routeCapabilities.effectiveSource, 'dependency-gated');
  assert.deepEqual(refreshed.routeCapabilities.effectiveItems, []);
  assert.equal(refreshed.mcpTools.effectiveSource, 'dependency-gated');
  assert.deepEqual(refreshed.mcpTools.effectiveItems, []);
  assert.equal(refreshed.localMcpServer.effectiveSource, 'dependency-gated');
  assert.equal(refreshed.localMcpServer.effectiveValue.available, false);
  assert.equal(refreshed.localMcpServer.localSnapshot.available, true);
  assert.equal(refreshed.localMcpServer.coreSnapshot, null);
});
