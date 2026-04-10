import type {
  BidviaNormalizedServerCapabilitySnapshot,
  BidviaServerCapabilityPayload,
} from './contracts.js';
import { buildCapabilityPlaneServerSnapshot } from './capability-plane.js';
import {
  getLocalMcpToolDescriptor,
  getRouteCapabilityFromLocalCatalog,
} from './discovery-catalog.js';

export function normalizeServerCapabilityPayload(
  payload: BidviaServerCapabilityPayload,
): BidviaNormalizedServerCapabilitySnapshot {
  return buildCapabilityPlaneServerSnapshot(payload, {
    getRouteCapabilityFromLocalCatalog,
    getLocalMcpToolDescriptor,
  });
}
