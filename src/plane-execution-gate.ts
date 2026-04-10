import type {
  BidviaCorePlaneAdoptionStatus,
  BidviaCorePlaneName,
  BidviaPlaneExecutionGate,
} from './contracts.js';
import {
  getCorePayloadContractMatrixEntry,
  getCorePayloadPlaneExecutionSummary,
  listCorePayloadPlaneExecutionGates,
} from './core-payload-contract-matrix.js';

export function getCorePlaneExecutionSummary(
  plane: BidviaCorePlaneName,
): Pick<BidviaCorePlaneAdoptionStatus, 'descriptiveVisibility' | 'executableHelperEligibility'> {
  return getCorePayloadPlaneExecutionSummary(plane);
}

export function listPlaneExecutionGates(): BidviaPlaneExecutionGate[] {
  return listCorePayloadPlaneExecutionGates();
}

export function listPlaneExecutableHelperKeys(plane: BidviaCorePlaneName): string[] {
  return listCorePayloadPlaneExecutionGates()
    .filter((gate) => gate.plane === plane && gate.executionTruth === 'packet-grounded-execution')
    .map((gate) => gate.helperKey);
}

export function getPlaneExecutionGate(helperKey: string): BidviaPlaneExecutionGate | undefined {
  const entry = getCorePayloadContractMatrixEntry(helperKey);
  if (!entry) {
    return undefined;
  }

  return {
    plane: entry.plane,
    helperKey: entry.helperKey,
    executionTruth: entry.helperState,
    blockedBy: entry.blockedBy,
    notes: [...entry.notes],
  };
}

export function requirePlaneExecutionGate(helperKey: string): BidviaPlaneExecutionGate {
  const gate = getPlaneExecutionGate(helperKey);
  if (!gate) {
    throw new Error(`Missing plane execution gate for ${helperKey}`);
  }

  return gate;
}
