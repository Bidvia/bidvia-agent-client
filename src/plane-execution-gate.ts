import type {
  BidviaCorePlaneAdoptionStatus,
  BidviaCorePlaneName,
  BidviaPlaneExecutionGate,
} from './contracts.js';

const blockedByPendingPacket = 'core-plane-payload-packet-not-yet-frozen' as const;

const planeExecutionSummaryByPlane: Record<
  BidviaCorePlaneName,
  Pick<BidviaCorePlaneAdoptionStatus, 'descriptiveVisibility' | 'executableHelperEligibility'>
> = {
  'identity-session': {
    descriptiveVisibility: 'descriptive-plane-visible',
    executableHelperEligibility: 'packet-grounded-execution',
  },
  task: {
    descriptiveVisibility: 'descriptive-plane-visible',
    executableHelperEligibility: 'discoverable-only',
  },
  capability: {
    descriptiveVisibility: 'descriptive-plane-visible',
    executableHelperEligibility: 'discoverable-only',
  },
  'workflow-stage': {
    descriptiveVisibility: 'descriptive-plane-visible',
    executableHelperEligibility: 'discoverable-only',
  },
  'event-notification': {
    descriptiveVisibility: 'descriptive-plane-visible',
    executableHelperEligibility: 'discoverable-only',
  },
  'enterprise-integration': {
    descriptiveVisibility: 'descriptive-plane-visible',
    executableHelperEligibility: 'discoverable-only',
  },
};

const planeExecutionGates: readonly BidviaPlaneExecutionGate[] = [
  {
    plane: 'identity-session',
    helperKey: 'createProvisionalAgent',
    executionTruth: 'packet-grounded-execution',
    blockedBy: null,
    notes: ['Public provisional agent creation is a shipped packet-grounded onboarding helper.'],
  },
  {
    plane: 'identity-session',
    helperKey: 'queryProvisionalAgent',
    executionTruth: 'packet-grounded-execution',
    blockedBy: null,
    notes: ['Public provisional status query remains a shipped packet-grounded onboarding helper.'],
  },
  {
    plane: 'identity-session',
    helperKey: 'claimProvisionalAgent',
    executionTruth: 'packet-grounded-execution',
    blockedBy: null,
    notes: ['Session-bound provisional claim remains a shipped packet-grounded onboarding helper.'],
  },
  {
    plane: 'identity-session',
    helperKey: 'getAgentReadiness',
    executionTruth: 'packet-grounded-execution',
    blockedBy: null,
    notes: ['Governed readiness reads stay runnable without reopening broader identity-session payload claims.'],
  },
  {
    plane: 'task',
    helperKey: 'postHeartbeat',
    executionTruth: 'blocked-pending-packet',
    blockedBy: blockedByPendingPacket,
    notes: ['Registration runtime writes stay blocked until the task-plane packet is frozen end to end.'],
  },
  {
    plane: 'enterprise-integration',
    helperKey: 'createCommercialAction',
    executionTruth: 'blocked-pending-packet',
    blockedBy: blockedByPendingPacket,
    notes: ['Commercial-action execution stays blocked until enterprise-integration packet truth is frozen.'],
  },
  {
    plane: 'event-notification',
    helperKey: 'getNotification',
    executionTruth: 'packet-grounded-execution',
    blockedBy: null,
    notes: ['Notification detail reads remain runnable as packet-grounded visibility without reopening write semantics.'],
  },
  {
    plane: 'event-notification',
    helperKey: 'createNotificationDelivery',
    executionTruth: 'blocked-pending-packet',
    blockedBy: blockedByPendingPacket,
    notes: ['Delivery payload fields are not packet-complete yet, so execution stays blocked.'],
  },
  {
    plane: 'event-notification',
    helperKey: 'acknowledgeNotification',
    executionTruth: 'blocked-pending-packet',
    blockedBy: blockedByPendingPacket,
    notes: ['Acknowledgement payload fields are not packet-complete yet, so execution stays blocked.'],
  },
  {
    plane: 'event-notification',
    helperKey: 'retryNotification',
    executionTruth: 'blocked-pending-packet',
    blockedBy: blockedByPendingPacket,
    notes: ['Retry payload fields are not packet-complete yet, so execution stays blocked.'],
  },
  {
    plane: 'event-notification',
    helperKey: 'expireNotification',
    executionTruth: 'blocked-pending-packet',
    blockedBy: blockedByPendingPacket,
    notes: ['Expire payload fields are not packet-complete yet, so execution stays blocked.'],
  },
];

const planeExecutionGateByHelperKey = new Map(
  planeExecutionGates.map((gate) => [gate.helperKey, gate]),
);

export function getCorePlaneExecutionSummary(
  plane: BidviaCorePlaneName,
): Pick<BidviaCorePlaneAdoptionStatus, 'descriptiveVisibility' | 'executableHelperEligibility'> {
  return {
    ...planeExecutionSummaryByPlane[plane],
  };
}

export function listPlaneExecutionGates(): BidviaPlaneExecutionGate[] {
  return planeExecutionGates.map((gate) => ({
    ...gate,
    notes: [...gate.notes],
  }));
}

export function getPlaneExecutionGate(helperKey: string): BidviaPlaneExecutionGate | undefined {
  const gate = planeExecutionGateByHelperKey.get(helperKey);
  if (!gate) {
    return undefined;
  }

  return {
    ...gate,
    notes: [...gate.notes],
  };
}

export function requirePlaneExecutionGate(helperKey: string): BidviaPlaneExecutionGate {
  const gate = getPlaneExecutionGate(helperKey);
  if (!gate) {
    throw new Error(`Missing plane execution gate for ${helperKey}`);
  }

  return gate;
}
