import type { BidviaLocalRuntimeCapabilitySnapshot } from './contracts.js';
import type { ResolveBidviaBaseUrlOptions } from './config.js';
import { buildCapabilityPlaneLocalRuntimeSnapshot } from './capability-plane.js';
import {
  buildStage3ReleaseGate,
  listCorePlaneAdoptionStatuses,
} from './core-plane-adoption.js';
import {
  buildLocalMcpToolCatalog,
  buildLocalRouteCapabilityCatalog,
} from './discovery-catalog.js';

export function buildLocalRuntimeCapabilitySnapshot(
  options: ResolveBidviaBaseUrlOptions = {},
): BidviaLocalRuntimeCapabilitySnapshot {
  const snapshot = buildCapabilityPlaneLocalRuntimeSnapshot(options, {
    buildRouteCapabilityCatalog: buildLocalRouteCapabilityCatalog,
    buildMcpToolCatalog: buildLocalMcpToolCatalog,
  });

  return {
    ...snapshot,
    planeAdoption: listCorePlaneAdoptionStatuses(),
    stage3ReleaseGate: buildStage3ReleaseGate(),
  };
}
