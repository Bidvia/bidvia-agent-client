import type {
  BidviaMcpToolDescriptor,
  BidviaNormalizedServerCapabilitySnapshot,
  BidviaRouteCapability,
  BidviaServerCapabilityPayload,
} from './contracts.js';

const runtimeCapabilitySnapshotSchemaVersion = '2026-03-27';
const serverCapabilityPayloadVersion = 'server-capability-payload';
const serverDerivedFallbackPolicy = 'retain-server-derived-snapshot-until-replaced';

function buildServerDerivedMetadata(lastUpdatedAt: string) {
  return {
    schemaVersion: runtimeCapabilitySnapshotSchemaVersion,
    version: serverCapabilityPayloadVersion,
    etag: null,
    lastUpdatedAt,
    ttl: null,
    expiresAt: null,
    stale: false,
    fallbackPolicy: serverDerivedFallbackPolicy,
  };
}

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
  const lastUpdatedAt = new Date().toISOString();

  return {
    environmentMode: payload.environment_mode ?? 'production',
    routeCapabilities: {
      source: 'server-derived',
      ...buildServerDerivedMetadata(lastUpdatedAt),
      items: normalizeRouteCapabilities(payload.route_capabilities),
    } as BidviaNormalizedServerCapabilitySnapshot['routeCapabilities'],
    mcpTools: {
      source: 'server-derived',
      ...buildServerDerivedMetadata(lastUpdatedAt),
      items: normalizeMcpTools(payload.mcp_tools),
    } as BidviaNormalizedServerCapabilitySnapshot['mcpTools'],
    localMcpServer: {
      source: 'server-derived',
      ...buildServerDerivedMetadata(lastUpdatedAt),
      available: payload.mcp_server.available,
      transport: payload.mcp_server.transport,
      supportedMethods: [...payload.mcp_server.supported_methods],
    } as BidviaNormalizedServerCapabilitySnapshot['localMcpServer'],
    serverNegotiation: {
      source: 'server-derived',
      ...buildServerDerivedMetadata(lastUpdatedAt),
      status: 'provided',
      serverProvidedCapabilitiesKnown: true,
    } as BidviaNormalizedServerCapabilitySnapshot['serverNegotiation'],
  };
}
