import type {
  BidviaHeartbeatInput,
  BidviaHeartbeatLifecycleGuidance,
} from './contracts.js';

export function buildHeartbeatInput(now: string, expiresAt: string): BidviaHeartbeatInput {
  return {
    now,
    expiresAt,
  };
}

export function buildHeartbeatLifecycleGuidance(): BidviaHeartbeatLifecycleGuidance {
  return {
    helperKey: 'postHeartbeat',
    lane: 'default-local-docker',
    responsibility: 'Refresh registration liveness for an already-governed agent session after readiness is real.',
    doesNotImply: 'Heartbeat does not imply task wakeup, assignment delivery, notification consumption, or result completion by itself.',
  };
}
