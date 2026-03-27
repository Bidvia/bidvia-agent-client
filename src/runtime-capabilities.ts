import {
  bidviaMcpServerSupportedMethods,
} from './contracts.js';
import type { BidviaLocalRuntimeCapabilitySnapshot } from './contracts.js';
import { bidviaRouteCapabilities } from './capabilities.js';
import {
  resolveBidviaBaseUrl,
  resolveBidviaEnvironmentMode,
} from './config.js';
import type { ResolveBidviaBaseUrlOptions } from './config.js';
import { bidviaMcpTools } from './mcp.js';

const runtimeCapabilitySnapshotSchemaVersion = '2026-03-27';
const localRuntimeCapabilitySnapshotVersion = 'local-runtime-capability-snapshot';
const localStaticFallbackPolicy = 'prefer-local-static-until-server-negotiation';
const deferredNegotiationFallbackPolicy = 'await-explicit-server-negotiation';

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

export function buildLocalRuntimeCapabilitySnapshot(
  options: ResolveBidviaBaseUrlOptions = {},
): BidviaLocalRuntimeCapabilitySnapshot {
  const lastUpdatedAt = new Date().toISOString();

  return {
    baseUrl: resolveBidviaBaseUrl(options),
    environmentMode: resolveBidviaEnvironmentMode(options),
    routeCapabilities: {
      source: 'local-static',
      ...buildLocalStaticMetadata('repo-route-capabilities', lastUpdatedAt),
      items: structuredClone([...bidviaRouteCapabilities]),
    } as BidviaLocalRuntimeCapabilitySnapshot['routeCapabilities'],
    mcpTools: {
      source: 'local-static',
      ...buildLocalStaticMetadata('repo-mcp-tools', lastUpdatedAt),
      items: structuredClone([...bidviaMcpTools]),
    } as BidviaLocalRuntimeCapabilitySnapshot['mcpTools'],
    localMcpServer: {
      source: 'local-static',
      ...buildLocalStaticMetadata('repo-local-mcp-server', lastUpdatedAt),
      available: true,
      transport: 'stdio',
      entrypoint: 'src/mcp-server.ts',
      supportedMethods: [...bidviaMcpServerSupportedMethods],
    } as BidviaLocalRuntimeCapabilitySnapshot['localMcpServer'],
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
    } as BidviaLocalRuntimeCapabilitySnapshot['deferredServerNegotiation'],
  };
}
