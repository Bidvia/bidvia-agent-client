import type { BidviaLocalRuntimeCapabilitySnapshot } from './contracts.js';
import { bidviaRouteCapabilities } from './capabilities.js';
import {
  resolveBidviaBaseUrl,
  resolveBidviaEnvironmentMode,
} from './config.js';
import type { ResolveBidviaBaseUrlOptions } from './config.js';
import { bidviaMcpTools } from './mcp.js';

export function buildLocalRuntimeCapabilitySnapshot(
  options: ResolveBidviaBaseUrlOptions = {},
): BidviaLocalRuntimeCapabilitySnapshot {
  return {
    baseUrl: resolveBidviaBaseUrl(options),
    environmentMode: resolveBidviaEnvironmentMode(options),
    routeCapabilities: {
      source: 'local-static',
      items: structuredClone([...bidviaRouteCapabilities]),
    },
    mcpTools: {
      source: 'local-static',
      items: structuredClone([...bidviaMcpTools]),
    },
    localMcpServer: {
      source: 'local-static',
      available: true,
      transport: 'stdio',
      entrypoint: 'src/mcp-server.ts',
      supportedMethods: ['initialize', 'tools/list', 'tools/call'],
    },
    deferredServerNegotiation: {
      source: 'deferred-server-negotiation',
      status: 'deferred',
      serverProvidedCapabilitiesKnown: false,
    },
  };
}
