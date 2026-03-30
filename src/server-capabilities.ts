import type {
  BidviaLocalCapabilityRiskTier,
  BidviaLocalCapabilityTier,
  BidviaMcpToolDescriptor,
  BidviaNormalizedServerCapabilitySnapshot,
  BidviaRouteCapability,
  BidviaServerCapabilityPayload,
} from './contracts.js';
import {
  getLocalMcpToolDescriptor,
  getRouteCapabilityFromLocalCatalog,
} from './discovery-catalog.js';

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

function deriveLocalRouteClassification(routeCapability: {
  helper_key: string;
  access_context_family: BidviaRouteCapability['accessContextFamily'];
  level: BidviaRouteCapability['level'];
  scope: BidviaRouteCapability['scope'];
}): {
  localCapabilityTier: BidviaLocalCapabilityTier;
  localCapabilityRiskTier: BidviaLocalCapabilityRiskTier;
} {
  const localCapability = getRouteCapabilityFromLocalCatalog(routeCapability.helper_key);
  if (localCapability) {
    return {
      localCapabilityTier: localCapability.localCapabilityTier,
      localCapabilityRiskTier: localCapability.localCapabilityRiskTier,
    };
  }

  if (routeCapability.level === 'scenario-helper') {
    return {
      localCapabilityTier: 'L1-review-safe',
      localCapabilityRiskTier: 'review-safe',
    };
  }

  if (routeCapability.scope === 'read') {
    return {
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    };
  }

  if (
    routeCapability.access_context_family === 'tenant'
    || routeCapability.access_context_family === 'registration'
    || routeCapability.access_context_family === 'session'
  ) {
    return {
      localCapabilityTier: 'L2-registration-runtime',
      localCapabilityRiskTier: 'runtime-execution',
    };
  }

  return {
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
  };
}

function deriveLocalMcpClassification(toolName: string): {
  localCapabilityTier: BidviaLocalCapabilityTier;
  localCapabilityRiskTier: BidviaLocalCapabilityRiskTier;
  accessContextFamily: BidviaMcpToolDescriptor['accessContextFamily'];
  requiredContext: BidviaMcpToolDescriptor['requiredContext'];
} {
  const localDescriptor = getLocalMcpToolDescriptor(toolName);
  if (localDescriptor) {
    return {
      localCapabilityTier: localDescriptor.localCapabilityTier,
      localCapabilityRiskTier: localDescriptor.localCapabilityRiskTier,
      accessContextFamily: localDescriptor.accessContextFamily,
      requiredContext: [...localDescriptor.requiredContext],
    };
  }

  return {
    localCapabilityTier: 'L1-review-safe',
    localCapabilityRiskTier: 'review-safe',
    accessContextFamily: 'scenario',
    requiredContext: [],
  };
}

function normalizeRouteCapabilities(
  routeCapabilities: BidviaServerCapabilityPayload['route_capabilities'],
): BidviaRouteCapability[] {
  return routeCapabilities.map((routeCapability) => {
    const classification = deriveLocalRouteClassification(routeCapability);

    return {
      helperKey: routeCapability.helper_key,
      routePathTemplate: routeCapability.route_path_template,
      httpMethod: routeCapability.http_method,
      accessContextFamily: routeCapability.access_context_family,
      requiredContext: [...routeCapability.required_context],
      scope: routeCapability.scope,
      level: routeCapability.level,
      ...classification,
    };
  });
}

function normalizeMcpTools(
  mcpTools: BidviaServerCapabilityPayload['mcp_tools'],
): BidviaMcpToolDescriptor[] {
  return mcpTools.map((mcpTool) => {
    const classification = deriveLocalMcpClassification(mcpTool.tool_name);

    return {
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
      ...classification,
    };
  });
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
