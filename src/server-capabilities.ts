import type {
  BidviaNormalizedServerCapabilitySnapshot,
  BidviaServerCapabilityPayload,
} from './contracts.js';
import { buildCapabilityPlaneServerSnapshot } from './capability-plane.js';
import {
  getLocalMcpToolDescriptor,
  getRouteCapabilityFromLocalCatalog,
} from './discovery-catalog.js';

export function buildSampleServerCapabilityPayload(): BidviaServerCapabilityPayload {
  return {
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
  };
}

export function normalizeServerCapabilityPayload(
  payload: BidviaServerCapabilityPayload,
): BidviaNormalizedServerCapabilitySnapshot {
  return buildCapabilityPlaneServerSnapshot(payload, {
    getRouteCapabilityFromLocalCatalog,
    getLocalMcpToolDescriptor,
  });
}
