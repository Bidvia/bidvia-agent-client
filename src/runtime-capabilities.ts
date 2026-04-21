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
import { buildExecutionGuidanceEntries } from './execution-guidance.js';
import { buildAgentLifecycleGuidance } from './task-plane.js';

export function buildLocalRuntimeCapabilitySnapshot(
  options: ResolveBidviaBaseUrlOptions = {},
): BidviaLocalRuntimeCapabilitySnapshot {
  const snapshot = buildCapabilityPlaneLocalRuntimeSnapshot(options, {
    buildRouteCapabilityCatalog: buildLocalRouteCapabilityCatalog,
    buildMcpToolCatalog: buildLocalMcpToolCatalog,
  });
  const planeAdoption = listCorePlaneAdoptionStatuses();
  const stage3ReleaseGate = buildStage3ReleaseGate();

  return {
    ...snapshot,
    planeAdoption,
    stage3ReleaseGate,
    executionGuidance: buildExecutionGuidanceEntries(),
    agentLifecycleGuidance: buildAgentLifecycleGuidance(),
  };
}
