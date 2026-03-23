import type { BidviaHeartbeatInput } from './contracts.js';

export function buildHeartbeatInput(now: string, expiresAt: string): BidviaHeartbeatInput {
  return {
    now,
    expiresAt,
  };
}
