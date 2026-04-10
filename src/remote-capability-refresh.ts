import type {
  BidviaRemoteCapabilityRefreshInput,
  BidviaRemoteCapabilityRefreshSnapshot,
} from './contracts.js';
import { buildCapabilityPlaneRemoteTruthSnapshot } from './capability-plane.js';
import { normalizeServerCapabilityPayload } from './server-capabilities.js';

export function refreshRemoteCapabilityTruth(
  input: BidviaRemoteCapabilityRefreshInput,
): BidviaRemoteCapabilityRefreshSnapshot {
  return buildCapabilityPlaneRemoteTruthSnapshot(input, {
    normalizeServerCapabilityPayload,
  });
}
