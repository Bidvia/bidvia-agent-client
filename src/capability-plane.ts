import {
  bidviaMcpServerSupportedMethods,
} from './contracts.js';
import type {
  BidviaBlockedCoreCapabilityTruthRefresh,
  BidviaCapabilityPlaneView,
  BidviaCorePlaneAdoptionStatus,
  BidviaLocalCapabilityRiskTier,
  BidviaLocalCapabilityTier,
  BidviaLocalRuntimeCapabilitySnapshot,
  BidviaMcpServerSupportedMethod,
  BidviaMcpToolDescriptor,
  BidviaNormalizedServerCapabilitySnapshot,
  BidviaRemoteCapabilityRefreshInput,
  BidviaRemoteCapabilityRefreshSnapshot,
  BidviaRouteCapability,
  BidviaServerCapabilityPayload,
} from './contracts.js';
import {
  resolveBidviaBaseUrl,
  resolveBidviaEnvironmentMode,
} from './config.js';
import type { ResolveBidviaBaseUrlOptions } from './config.js';
import {
  buildStage3ReleaseGate,
  listCorePlaneAdoptionStatuses,
} from './core-plane-adoption.js';
import { getCorePlaneExecutionSummary } from './plane-execution-gate.js';

const runtimeCapabilitySnapshotSchemaVersion = '2026-03-27';
const localRuntimeCapabilitySnapshotVersion = 'local-runtime-capability-snapshot';
const serverCapabilityPayloadVersion = 'server-capability-payload';
const localStaticFallbackPolicy = 'prefer-local-static-until-server-negotiation';
const deferredNegotiationFallbackPolicy = 'await-explicit-server-negotiation';
const serverDerivedFallbackPolicy = 'retain-server-derived-snapshot-until-replaced';
const localDiscoverySourceOfTruth = 'local-sdk-helpers' as const;

const capabilityPlaneAdoptionStatus: BidviaCorePlaneAdoptionStatus = {
  plane: 'capability',
  frozenInCore: true,
  payloadPacketStatus: 'blocked-pending-packet',
  ...getCorePlaneExecutionSummary('capability'),
  blockedBy: 'core-plane-payload-packet-not-yet-frozen',
  notes: ['Route remote capability refresh through one fail-closed capability-plane adapter.'],
};

const blockedCoreTruthRefreshTemplate: BidviaBlockedCoreCapabilityTruthRefresh = {
  source: 'dependency-gated',
  status: 'blocked',
  blockedBy: 'bidvia-core-capability-truth',
  reason: 'Frozen core capability truth is unavailable.',
  serverProvidedCapabilitiesKnown: false,
};

function buildLocalStaticMetadata(revision: string, lastUpdatedAt: string) {
  return {
    schemaVersion: runtimeCapabilitySnapshotSchemaVersion,
    version: localRuntimeCapabilitySnapshotVersion,
    revision,
    lastUpdatedAt,
    ttl: null,
    expiresAt: null,
    stale: false,
    fallbackPolicy: localStaticFallbackPolicy,
  };
}

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

function buildBlockedCoreTruthRefresh(): BidviaBlockedCoreCapabilityTruthRefresh {
  return {
    ...blockedCoreTruthRefreshTemplate,
  };
}

export function buildCapabilityPlaneView(): BidviaCapabilityPlaneView {
  return {
    adoptionStatus: {
      ...capabilityPlaneAdoptionStatus,
      notes: [...capabilityPlaneAdoptionStatus.notes],
    },
    localSnapshots: {
      descriptiveOnly: true,
      liveServerNegotiationClaimed: false,
      remoteRegistryBehaviorClaimed: false,
      notes: [
        'Local runtime, server, discovery, and MCP capability snapshots stay descriptive-only.',
        'Do not read local snapshots as live server negotiation or remote registry behavior.',
      ],
    },
    remoteTruth: {
      payloadPacketStatus: 'blocked-pending-packet',
      blockedBy: 'core-plane-payload-packet-not-yet-frozen',
      liveServerNegotiationClaimed: false,
      remoteRegistryBehaviorClaimed: false,
      notes: [
        'Keep remote capability refresh fail-closed until Core ships packet-complete capability truth.',
      ],
    },
  };
}

export function buildCapabilityPlaneDiscoveryBoundary() {
  return {
    sourceOfTruth: localDiscoverySourceOfTruth,
    localOnly: true as const,
    remoteDiscovery: false as const,
    hosted: false as const,
  };
}

type BidviaCapabilityPlaneLocalRuntimeSnapshotDependencies = {
  buildRouteCapabilityCatalog: () => BidviaRouteCapability[];
  buildMcpToolCatalog: () => BidviaMcpToolDescriptor[];
};

export function buildCapabilityPlaneLocalRuntimeSnapshot(
  options: ResolveBidviaBaseUrlOptions = {},
  dependencies: BidviaCapabilityPlaneLocalRuntimeSnapshotDependencies,
): BidviaLocalRuntimeCapabilitySnapshot {
  const lastUpdatedAt = new Date().toISOString();

  return {
    baseUrl: resolveBidviaBaseUrl(options),
    environmentMode: resolveBidviaEnvironmentMode(options),
    routeCapabilities: {
      source: 'local-static',
      ...buildLocalStaticMetadata('repo-route-capabilities', lastUpdatedAt),
      items: structuredClone(dependencies.buildRouteCapabilityCatalog()),
    },
    mcpTools: {
      source: 'local-static',
      ...buildLocalStaticMetadata('repo-mcp-tools', lastUpdatedAt),
      items: structuredClone(dependencies.buildMcpToolCatalog()),
    },
    localMcpServer: {
      source: 'local-static',
      ...buildLocalStaticMetadata('repo-local-mcp-server', lastUpdatedAt),
      available: true,
      transport: 'stdio',
      entrypoint: 'src/mcp-server.ts',
      supportedMethods: [...bidviaMcpServerSupportedMethods],
    },
    deferredServerNegotiation: {
      source: 'deferred-server-negotiation',
      schemaVersion: runtimeCapabilitySnapshotSchemaVersion,
      version: localRuntimeCapabilitySnapshotVersion,
      revision: 'deferred-server-negotiation',
      lastUpdatedAt,
      ttl: null,
      expiresAt: null,
      stale: false,
      fallbackPolicy: deferredNegotiationFallbackPolicy,
      status: 'deferred',
      serverProvidedCapabilitiesKnown: false,
    },
    planeAdoption: listCorePlaneAdoptionStatuses(),
    stage3ReleaseGate: buildStage3ReleaseGate(),
  };
}

type BidviaCapabilityPlaneServerSnapshotDependencies = {
  getRouteCapabilityFromLocalCatalog: (helperKey: string) => BidviaRouteCapability | undefined;
  getLocalMcpToolDescriptor: (toolName: string) => BidviaMcpToolDescriptor | undefined;
};

function deriveLocalRouteClassification(
  routeCapability: BidviaServerCapabilityPayload['route_capabilities'][number],
  dependencies: BidviaCapabilityPlaneServerSnapshotDependencies,
): {
  localCapabilityTier: BidviaLocalCapabilityTier;
  localCapabilityRiskTier: BidviaLocalCapabilityRiskTier;
  contextSemantic: BidviaRouteCapability['contextSemantic'];
} {
  const localCapability = dependencies.getRouteCapabilityFromLocalCatalog(routeCapability.helper_key);
  if (localCapability) {
    return {
      localCapabilityTier: localCapability.localCapabilityTier,
      localCapabilityRiskTier: localCapability.localCapabilityRiskTier,
      contextSemantic: localCapability.contextSemantic,
    };
  }

  if (routeCapability.level === 'scenario-helper') {
    return {
      localCapabilityTier: 'L1-review-safe',
      localCapabilityRiskTier: 'review-safe',
      contextSemantic: routeCapability.access_context_family,
    };
  }

  if (routeCapability.scope === 'read') {
    return {
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
      contextSemantic: routeCapability.access_context_family,
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
      contextSemantic: routeCapability.access_context_family,
    };
  }

  return {
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
    contextSemantic: routeCapability.access_context_family,
  };
}

function deriveLocalMcpClassification(
  toolName: string,
  dependencies: BidviaCapabilityPlaneServerSnapshotDependencies,
): {
  localCapabilityTier: BidviaLocalCapabilityTier;
  localCapabilityRiskTier: BidviaLocalCapabilityRiskTier;
  accessContextFamily: BidviaMcpToolDescriptor['accessContextFamily'];
  contextSemantic?: BidviaMcpToolDescriptor['contextSemantic'];
  requiredContext: BidviaMcpToolDescriptor['requiredContext'];
} {
  const localDescriptor = dependencies.getLocalMcpToolDescriptor(toolName);
  if (localDescriptor) {
    return {
      localCapabilityTier: localDescriptor.localCapabilityTier,
      localCapabilityRiskTier: localDescriptor.localCapabilityRiskTier,
      accessContextFamily: localDescriptor.accessContextFamily,
      ...(localDescriptor.contextSemantic ? { contextSemantic: localDescriptor.contextSemantic } : {}),
      requiredContext: [...localDescriptor.requiredContext],
    };
  }

  return {
    localCapabilityTier: 'L1-review-safe',
    localCapabilityRiskTier: 'review-safe',
    accessContextFamily: 'scenario',
    contextSemantic: 'scenario',
    requiredContext: [],
  };
}

export function buildCapabilityPlaneServerSnapshot(
  payload: BidviaServerCapabilityPayload,
  dependencies: BidviaCapabilityPlaneServerSnapshotDependencies,
): BidviaNormalizedServerCapabilitySnapshot {
  const lastUpdatedAt = new Date().toISOString();

  return {
    environmentMode: payload.environment_mode ?? 'production',
    routeCapabilities: {
      source: 'server-derived',
      ...buildServerDerivedMetadata(lastUpdatedAt),
      items: payload.route_capabilities.map((routeCapability) => {
        const classification = deriveLocalRouteClassification(routeCapability, dependencies);

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
      }),
    },
    mcpTools: {
      source: 'server-derived',
      ...buildServerDerivedMetadata(lastUpdatedAt),
      items: payload.mcp_tools.map((mcpTool) => {
        const classification = deriveLocalMcpClassification(mcpTool.tool_name, dependencies);

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
          ...(mcpTool.context_semantic ? { contextSemantic: mcpTool.context_semantic } : {}),
        };
      }),
    },
    localMcpServer: {
      source: 'server-derived',
      ...buildServerDerivedMetadata(lastUpdatedAt),
      available: payload.mcp_server.available,
      transport: payload.mcp_server.transport,
      supportedMethods: [...payload.mcp_server.supported_methods],
    },
    serverNegotiation: {
      source: 'server-derived',
      ...buildServerDerivedMetadata(lastUpdatedAt),
      status: 'provided',
      serverProvidedCapabilitiesKnown: true,
    },
  };
}

type BidviaCapabilityPlaneRemoteTruthSnapshotDependencies = {
  normalizeServerCapabilityPayload: (
    payload: BidviaServerCapabilityPayload,
  ) => BidviaNormalizedServerCapabilitySnapshot;
};

export function buildCapabilityPlaneRemoteTruthSnapshot(
  input: BidviaRemoteCapabilityRefreshInput,
  dependencies: BidviaCapabilityPlaneRemoteTruthSnapshotDependencies,
): BidviaRemoteCapabilityRefreshSnapshot {
  const { localSnapshot, coreCapabilityPayload } = input;

  if (!coreCapabilityPayload) {
    return {
      baseUrl: localSnapshot.baseUrl,
      environmentMode: localSnapshot.environmentMode,
      routeCapabilities: {
        localSnapshot: localSnapshot.routeCapabilities,
        coreSnapshot: null,
        effectiveSource: 'dependency-gated',
        effectiveItems: [],
      },
      mcpTools: {
        localSnapshot: localSnapshot.mcpTools,
        coreSnapshot: null,
        effectiveSource: 'dependency-gated',
        effectiveItems: [],
      },
      localMcpServer: {
        localSnapshot: localSnapshot.localMcpServer,
        coreSnapshot: null,
        effectiveSource: 'dependency-gated',
        effectiveValue: {
          available: false,
          transport: 'stdio',
          supportedMethods: [...bidviaMcpServerSupportedMethods],
        },
      },
      coreTruthRefresh: buildBlockedCoreTruthRefresh(),
    };
  }

  const normalizedCoreSnapshot = dependencies.normalizeServerCapabilityPayload(coreCapabilityPayload);

  return {
    baseUrl: localSnapshot.baseUrl,
    environmentMode: normalizedCoreSnapshot.environmentMode,
    routeCapabilities: {
      localSnapshot: localSnapshot.routeCapabilities,
      coreSnapshot: normalizedCoreSnapshot.routeCapabilities,
      effectiveSource: 'server-derived',
      effectiveItems: structuredClone(normalizedCoreSnapshot.routeCapabilities.items),
    },
    mcpTools: {
      localSnapshot: localSnapshot.mcpTools,
      coreSnapshot: normalizedCoreSnapshot.mcpTools,
      effectiveSource: 'server-derived',
      effectiveItems: structuredClone(normalizedCoreSnapshot.mcpTools.items),
    },
    localMcpServer: {
      localSnapshot: localSnapshot.localMcpServer,
      coreSnapshot: normalizedCoreSnapshot.localMcpServer,
      effectiveSource: 'server-derived',
      effectiveValue: {
        available: normalizedCoreSnapshot.localMcpServer.available,
        transport: normalizedCoreSnapshot.localMcpServer.transport,
        supportedMethods: [...normalizedCoreSnapshot.localMcpServer.supportedMethods],
      },
    },
    coreTruthRefresh: {
      source: 'server-derived',
      status: 'provided',
      serverProvidedCapabilitiesKnown: true,
    },
  };
}

export function cloneCapabilityPlaneSupportedMethods(): BidviaMcpServerSupportedMethod[] {
  return [...bidviaMcpServerSupportedMethods];
}
