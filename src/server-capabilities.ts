import type {
  BidviaMcpToolDescriptor,
  BidviaNormalizedServerCapabilitySnapshot,
  BidviaRouteCapability,
  BidviaServerCapabilityPayload,
} from './contracts.js';

function normalizeRouteCapabilities(
  routeCapabilities: BidviaServerCapabilityPayload['route_capabilities'],
): BidviaRouteCapability[] {
  return routeCapabilities.map((routeCapability) => ({
    helperKey: routeCapability.helper_key,
    routePathTemplate: routeCapability.route_path_template,
    httpMethod: routeCapability.http_method,
    accessContextFamily: routeCapability.access_context_family,
    requiredContext: [...routeCapability.required_context],
    scope: routeCapability.scope,
    level: routeCapability.level,
  }));
}

function normalizeMcpTools(
  mcpTools: BidviaServerCapabilityPayload['mcp_tools'],
): BidviaMcpToolDescriptor[] {
  return mcpTools.map((mcpTool) => ({
    toolName: mcpTool.tool_name,
    description: mcpTool.description,
    inputSchemaRef: {
      schemaKey: mcpTool.input_schema_ref.schema_key,
    },
    outputMode: mcpTool.output_mode,
    helperRef: {
      helperKey: mcpTool.helper_ref.helper_key,
      capabilityKey: mcpTool.helper_ref.capability_key,
    },
  }));
}

export function normalizeServerCapabilityPayload(
  payload: BidviaServerCapabilityPayload,
): BidviaNormalizedServerCapabilitySnapshot {
  return {
    environmentMode: payload.environment_mode ?? 'production',
    routeCapabilities: {
      source: 'server-derived',
      items: normalizeRouteCapabilities(payload.route_capabilities),
    },
    mcpTools: {
      source: 'server-derived',
      items: normalizeMcpTools(payload.mcp_tools),
    },
    localMcpServer: {
      source: 'server-derived',
      available: payload.mcp_server.available,
      transport: payload.mcp_server.transport,
      supportedMethods: payload.mcp_server.supported_methods,
    },
    serverNegotiation: {
      source: 'server-derived',
      status: 'provided',
      serverProvidedCapabilitiesKnown: true,
    },
  };
}
