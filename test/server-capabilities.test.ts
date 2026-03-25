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
  assert.equal(snapshot.mcpTools.source, 'server-derived');
  assert.equal(snapshot.mcpTools.items[0]?.toolName, 'industry-universe-plan-preview');
  assert.deepEqual(snapshot.serverNegotiation, {
    source: 'server-derived',
    status: 'provided',
    serverProvidedCapabilitiesKnown: true,
  });
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
  assert.deepEqual(snapshot.serverNegotiation, {
    source: 'server-derived',
    status: 'provided',
    serverProvidedCapabilitiesKnown: true,
  });
  assert.equal(snapshot.localMcpServer.available, false);
});
