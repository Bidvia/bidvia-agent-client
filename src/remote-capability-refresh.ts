import {
  bidviaMcpServerSupportedMethods,
} from './contracts.js';
import type {
  BidviaBlockedCoreCapabilityTruthRefresh,
  BidviaRemoteCapabilityRefreshInput,
  BidviaRemoteCapabilityRefreshSnapshot,
} from './contracts.js';
import { normalizeServerCapabilityPayload } from './server-capabilities.js';

const blockedCoreTruthRefreshTemplate: BidviaBlockedCoreCapabilityTruthRefresh = {
  source: 'dependency-gated',
  status: 'blocked',
  blockedBy: 'bidvia-core-capability-truth',
  reason: 'Frozen core capability truth is unavailable.',
  serverProvidedCapabilitiesKnown: false,
};

function buildBlockedCoreTruthRefresh(): BidviaBlockedCoreCapabilityTruthRefresh {
  return {
    ...blockedCoreTruthRefreshTemplate,
  };
}

export function refreshRemoteCapabilityTruth(
  input: BidviaRemoteCapabilityRefreshInput,
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

  const normalizedCoreSnapshot = normalizeServerCapabilityPayload(coreCapabilityPayload);

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
