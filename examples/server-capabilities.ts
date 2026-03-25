import type { BidviaServerCapabilityPayload } from '../src/contracts.js';
import { normalizeServerCapabilityPayload } from '../src/server-capabilities.js';

const samplePayload: BidviaServerCapabilityPayload = {
  environment_mode: 'production' as const,
  route_capabilities: [
    {
      helper_key: 'postHeartbeat',
      route_path_template: '/runtime/agents/:registrationId/heartbeat',
      http_method: 'POST' as const,
      access_context_family: 'registration' as const,
      required_context: ['tenantId', 'registrationId', 'principalId'],
      scope: 'write' as const,
      level: 'atomic-route' as const,
    },
  ],
  mcp_tools: [
    {
      tool_name: 'industry-universe-plan-preview',
      description: 'Previews the bounded industry universe scenario plan payload.',
      input_schema_ref: {
        schema_key: 'BidviaIndustryUniverseScenarioPlanInput',
      },
      output_mode: 'plan-preview' as const,
      helper_ref: {
        helper_key: 'buildIndustryUniverseScenarioPlan',
        capability_key: 'buildIndustryUniverseScenarioPlan',
      },
    },
  ],
  mcp_server: {
    available: true,
    transport: 'stdio' as const,
    supported_methods: ['initialize', 'tools/list', 'tools/call'] as const,
  },
};

console.log(JSON.stringify(normalizeServerCapabilityPayload(samplePayload), null, 2));
