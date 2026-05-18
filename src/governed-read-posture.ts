import type { BidviaIdentitySessionPlaneGovernedReadPosture as BidviaGovernedReadPosture } from './contracts.js';
import { buildIdentitySessionPlaneView } from './identity-session-plane.js';

export type { BidviaGovernedReadPosture };

export function buildGovernedReadPosture(): BidviaGovernedReadPosture {
  return buildIdentitySessionPlaneView().governedReadPosture;
}
