export interface BidviaLocalTaskParticipationObservation {
  scope: 'local-task-participation';
  localTaskRef: string;
  taskId: string;
  localCoordinationRef?: string;
  schedulerDecisionRef?: string;
}

export interface BidviaLocalTaskOfferObservation
  extends BidviaLocalTaskParticipationObservation {
  kind: 'local-task-offer-observation';
  offerId: string;
  observedAt: string;
  summary: string;
  offerSummary: string;
  leaseExpiresAt?: string;
  timeoutAt?: string;
}

export interface BidviaLocalTaskClaimIntent extends BidviaLocalTaskParticipationObservation {
  kind: 'local-task-claim-intent';
  offerId: string;
  claimId: string;
  observedAt: string;
  claimedAt: string;
  summary: string;
  claimSummary: string;
}

export interface BidviaLocalTaskAckObservation extends BidviaLocalTaskParticipationObservation {
  kind: 'local-task-ack-observation';
  claimId: string;
  ackId: string;
  observedAt: string;
  acknowledgedAt: string;
  summary: string;
  ackSummary: string;
}

export interface BidviaLocalTaskLeaseObservation extends BidviaLocalTaskParticipationObservation {
  kind: 'local-task-lease-observation';
  leaseId: string;
  observedAt: string;
  leasedAt: string;
  leaseExpiresAt: string;
  summary: string;
  leaseSummary: string;
}

export interface BidviaLocalTaskTimeoutObservation extends BidviaLocalTaskParticipationObservation {
  kind: 'local-task-timeout-observation';
  timeoutId: string;
  observedAt: string;
  timedOutAt: string;
  summary: string;
  timeoutSummary: string;
  priorLeaseId?: string;
}

export interface BidviaLocalTaskRetryAwareness {
  kind: 'local-task-retry-awareness';
  scope: 'local-task-participation';
  localTaskRef: string;
  taskId: string;
  observedAt: string;
  attempt: number;
  maxAttempts: number;
  retryable: boolean;
  nextRetryAt?: string;
  rationale: string;
  localCoordinationRef?: string;
  schedulerDecisionRef?: string;
}

export type BidviaLocalTaskShell = BidviaLocalTaskParticipationObservation;
export type BidviaTaskOfferShell = BidviaLocalTaskOfferObservation;
export type BidviaTaskClaimShell = BidviaLocalTaskClaimIntent;
export type BidviaTaskAckShell = BidviaLocalTaskAckObservation;
export type BidviaTaskLeaseShell = BidviaLocalTaskLeaseObservation;
export type BidviaTaskTimeoutShell = BidviaLocalTaskTimeoutObservation;
export type BidviaTaskRetryAwarenessShell = BidviaLocalTaskRetryAwareness;

export interface BuildLocalTaskOfferObservationOptions {
  localTaskRef: string;
  offerId: string;
  observedAt: string;
  summary: string;
  leaseExpiresAt?: string;
  timeoutAt?: string;
  localCoordinationRef?: string;
}

export interface BuildLocalTaskClaimIntentOptions {
  localTaskRef: string;
  offerId: string;
  claimId: string;
  observedAt: string;
  summary: string;
  localCoordinationRef?: string;
}

export interface BuildLocalTaskAckObservationOptions {
  localTaskRef: string;
  claimId: string;
  ackId: string;
  observedAt: string;
  summary: string;
  localCoordinationRef?: string;
}

export interface BuildLocalTaskLeaseObservationOptions {
  localTaskRef: string;
  leaseId: string;
  observedAt: string;
  leaseExpiresAt: string;
  summary: string;
  localCoordinationRef?: string;
}

export interface BuildLocalTaskTimeoutObservationOptions {
  localTaskRef: string;
  timeoutId: string;
  observedAt: string;
  summary: string;
  priorLeaseId?: string;
  localCoordinationRef?: string;
}

export interface BuildLocalTaskRetryAwarenessOptions {
  localTaskRef: string;
  observedAt: string;
  attempt: number;
  maxAttempts: number;
  retryable: boolean;
  nextRetryAt?: string;
  rationale: string;
  localCoordinationRef?: string;
}

export interface BuildTaskOfferShellOptions {
  taskId: string;
  offerId: string;
  observedAt: string;
  offerSummary: string;
  leaseExpiresAt?: string;
  timeoutAt?: string;
  schedulerDecisionRef?: string;
}

export interface BuildTaskClaimShellOptions {
  taskId: string;
  offerId: string;
  claimId: string;
  claimedAt: string;
  claimSummary: string;
  schedulerDecisionRef?: string;
}

export interface BuildTaskAckShellOptions {
  taskId: string;
  claimId: string;
  ackId: string;
  acknowledgedAt: string;
  ackSummary: string;
  schedulerDecisionRef?: string;
}

export interface BuildTaskLeaseShellOptions {
  taskId: string;
  leaseId: string;
  leasedAt: string;
  leaseExpiresAt: string;
  leaseSummary: string;
  schedulerDecisionRef?: string;
}

export interface BuildTaskTimeoutShellOptions {
  taskId: string;
  timeoutId: string;
  timedOutAt: string;
  timeoutSummary: string;
  priorLeaseId?: string;
  schedulerDecisionRef?: string;
}

export interface BuildTaskRetryAwarenessShellOptions {
  taskId: string;
  observedAt: string;
  attempt: number;
  maxAttempts: number;
  retryable: boolean;
  nextRetryAt?: string;
  rationale: string;
  schedulerDecisionRef?: string;
}

export function buildLocalTaskOfferObservation({
  localTaskRef,
  offerId,
  observedAt,
  summary,
  leaseExpiresAt,
  timeoutAt,
  localCoordinationRef,
}: BuildLocalTaskOfferObservationOptions): BidviaLocalTaskOfferObservation {
  return {
    kind: 'local-task-offer-observation',
    scope: 'local-task-participation',
    localTaskRef,
    taskId: localTaskRef,
    offerId,
    observedAt,
    summary,
    offerSummary: summary,
    ...(leaseExpiresAt === undefined ? {} : { leaseExpiresAt }),
    ...(timeoutAt === undefined ? {} : { timeoutAt }),
    ...(localCoordinationRef === undefined
      ? {}
      : {
          localCoordinationRef,
          schedulerDecisionRef: localCoordinationRef,
        }),
  };
}

export function buildLocalTaskClaimIntent({
  localTaskRef,
  offerId,
  claimId,
  observedAt,
  summary,
  localCoordinationRef,
}: BuildLocalTaskClaimIntentOptions): BidviaLocalTaskClaimIntent {
  return {
    kind: 'local-task-claim-intent',
    scope: 'local-task-participation',
    localTaskRef,
    taskId: localTaskRef,
    offerId,
    claimId,
    observedAt,
    claimedAt: observedAt,
    summary,
    claimSummary: summary,
    ...(localCoordinationRef === undefined
      ? {}
      : {
          localCoordinationRef,
          schedulerDecisionRef: localCoordinationRef,
        }),
  };
}

export function buildLocalTaskAckObservation({
  localTaskRef,
  claimId,
  ackId,
  observedAt,
  summary,
  localCoordinationRef,
}: BuildLocalTaskAckObservationOptions): BidviaLocalTaskAckObservation {
  return {
    kind: 'local-task-ack-observation',
    scope: 'local-task-participation',
    localTaskRef,
    taskId: localTaskRef,
    claimId,
    ackId,
    observedAt,
    acknowledgedAt: observedAt,
    summary,
    ackSummary: summary,
    ...(localCoordinationRef === undefined
      ? {}
      : {
          localCoordinationRef,
          schedulerDecisionRef: localCoordinationRef,
        }),
  };
}

export function buildLocalTaskLeaseObservation({
  localTaskRef,
  leaseId,
  observedAt,
  leaseExpiresAt,
  summary,
  localCoordinationRef,
}: BuildLocalTaskLeaseObservationOptions): BidviaLocalTaskLeaseObservation {
  return {
    kind: 'local-task-lease-observation',
    scope: 'local-task-participation',
    localTaskRef,
    taskId: localTaskRef,
    leaseId,
    observedAt,
    leasedAt: observedAt,
    leaseExpiresAt,
    summary,
    leaseSummary: summary,
    ...(localCoordinationRef === undefined
      ? {}
      : {
          localCoordinationRef,
          schedulerDecisionRef: localCoordinationRef,
        }),
  };
}

export function buildLocalTaskTimeoutObservation({
  localTaskRef,
  timeoutId,
  observedAt,
  summary,
  priorLeaseId,
  localCoordinationRef,
}: BuildLocalTaskTimeoutObservationOptions): BidviaLocalTaskTimeoutObservation {
  return {
    kind: 'local-task-timeout-observation',
    scope: 'local-task-participation',
    localTaskRef,
    taskId: localTaskRef,
    timeoutId,
    observedAt,
    timedOutAt: observedAt,
    summary,
    timeoutSummary: summary,
    ...(priorLeaseId === undefined ? {} : { priorLeaseId }),
    ...(localCoordinationRef === undefined
      ? {}
      : {
          localCoordinationRef,
          schedulerDecisionRef: localCoordinationRef,
        }),
  };
}

export function buildLocalTaskRetryAwareness({
  localTaskRef,
  observedAt,
  attempt,
  maxAttempts,
  retryable,
  nextRetryAt,
  rationale,
  localCoordinationRef,
}: BuildLocalTaskRetryAwarenessOptions): BidviaLocalTaskRetryAwareness {
  return {
    kind: 'local-task-retry-awareness',
    scope: 'local-task-participation',
    localTaskRef,
    taskId: localTaskRef,
    observedAt,
    attempt,
    maxAttempts,
    retryable,
    rationale,
    ...(nextRetryAt === undefined ? {} : { nextRetryAt }),
    ...(localCoordinationRef === undefined
      ? {}
      : {
          localCoordinationRef,
          schedulerDecisionRef: localCoordinationRef,
        }),
  };
}

export function buildTaskOfferShell({
  taskId,
  offerId,
  observedAt,
  offerSummary,
  leaseExpiresAt,
  timeoutAt,
  schedulerDecisionRef,
}: BuildTaskOfferShellOptions): BidviaTaskOfferShell {
  return buildLocalTaskOfferObservation({
    localTaskRef: taskId,
    offerId,
    observedAt,
    summary: offerSummary,
    leaseExpiresAt,
    timeoutAt,
    localCoordinationRef: schedulerDecisionRef,
  });
}

export function buildTaskClaimShell({
  taskId,
  offerId,
  claimId,
  claimedAt,
  claimSummary,
  schedulerDecisionRef,
}: BuildTaskClaimShellOptions): BidviaTaskClaimShell {
  return buildLocalTaskClaimIntent({
    localTaskRef: taskId,
    offerId,
    claimId,
    observedAt: claimedAt,
    summary: claimSummary,
    localCoordinationRef: schedulerDecisionRef,
  });
}

export function buildTaskAckShell({
  taskId,
  claimId,
  ackId,
  acknowledgedAt,
  ackSummary,
  schedulerDecisionRef,
}: BuildTaskAckShellOptions): BidviaTaskAckShell {
  return buildLocalTaskAckObservation({
    localTaskRef: taskId,
    claimId,
    ackId,
    observedAt: acknowledgedAt,
    summary: ackSummary,
    localCoordinationRef: schedulerDecisionRef,
  });
}

export function buildTaskLeaseShell({
  taskId,
  leaseId,
  leasedAt,
  leaseExpiresAt,
  leaseSummary,
  schedulerDecisionRef,
}: BuildTaskLeaseShellOptions): BidviaTaskLeaseShell {
  return buildLocalTaskLeaseObservation({
    localTaskRef: taskId,
    leaseId,
    observedAt: leasedAt,
    leaseExpiresAt,
    summary: leaseSummary,
    localCoordinationRef: schedulerDecisionRef,
  });
}

export function buildTaskTimeoutShell({
  taskId,
  timeoutId,
  timedOutAt,
  timeoutSummary,
  priorLeaseId,
  schedulerDecisionRef,
}: BuildTaskTimeoutShellOptions): BidviaTaskTimeoutShell {
  return buildLocalTaskTimeoutObservation({
    localTaskRef: taskId,
    timeoutId,
    observedAt: timedOutAt,
    summary: timeoutSummary,
    priorLeaseId,
    localCoordinationRef: schedulerDecisionRef,
  });
}

export function buildTaskRetryAwarenessShell({
  taskId,
  observedAt,
  attempt,
  maxAttempts,
  retryable,
  nextRetryAt,
  rationale,
  schedulerDecisionRef,
}: BuildTaskRetryAwarenessShellOptions): BidviaTaskRetryAwarenessShell {
  return buildLocalTaskRetryAwareness({
    localTaskRef: taskId,
    observedAt,
    attempt,
    maxAttempts,
    retryable,
    nextRetryAt,
    rationale,
    localCoordinationRef: schedulerDecisionRef,
  });
}
