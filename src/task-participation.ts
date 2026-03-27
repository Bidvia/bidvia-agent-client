export interface BidviaLocalTaskShell {
  scope: 'local-participation-shell';
  taskId: string;
  schedulerDecisionRef?: string;
}

export interface BidviaTaskOfferShell extends BidviaLocalTaskShell {
  kind: 'task-offer';
  offerId: string;
  observedAt: string;
  offerSummary: string;
  leaseExpiresAt?: string;
  timeoutAt?: string;
}

export interface BidviaTaskClaimShell extends BidviaLocalTaskShell {
  kind: 'task-claim';
  offerId: string;
  claimId: string;
  claimedAt: string;
  claimSummary: string;
}

export interface BidviaTaskAckShell extends BidviaLocalTaskShell {
  kind: 'task-ack';
  claimId: string;
  ackId: string;
  acknowledgedAt: string;
  ackSummary: string;
}

export interface BidviaTaskLeaseShell extends BidviaLocalTaskShell {
  kind: 'task-lease';
  leaseId: string;
  leasedAt: string;
  leaseExpiresAt: string;
  leaseSummary: string;
}

export interface BidviaTaskTimeoutShell extends BidviaLocalTaskShell {
  kind: 'task-timeout';
  timeoutId: string;
  timedOutAt: string;
  timeoutSummary: string;
  priorLeaseId?: string;
}

export interface BidviaTaskRetryAwarenessShell extends BidviaLocalTaskShell {
  kind: 'task-retry-awareness';
  observedAt: string;
  attempt: number;
  maxAttempts: number;
  retryable: boolean;
  nextRetryAt?: string;
  rationale: string;
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

export function buildTaskOfferShell({
  taskId,
  offerId,
  observedAt,
  offerSummary,
  leaseExpiresAt,
  timeoutAt,
  schedulerDecisionRef,
}: BuildTaskOfferShellOptions): BidviaTaskOfferShell {
  return {
    kind: 'task-offer',
    scope: 'local-participation-shell',
    taskId,
    offerId,
    observedAt,
    offerSummary,
    ...(leaseExpiresAt === undefined ? {} : { leaseExpiresAt }),
    ...(timeoutAt === undefined ? {} : { timeoutAt }),
    ...(schedulerDecisionRef === undefined ? {} : { schedulerDecisionRef }),
  };
}

export function buildTaskClaimShell({
  taskId,
  offerId,
  claimId,
  claimedAt,
  claimSummary,
  schedulerDecisionRef,
}: BuildTaskClaimShellOptions): BidviaTaskClaimShell {
  return {
    kind: 'task-claim',
    scope: 'local-participation-shell',
    taskId,
    offerId,
    claimId,
    claimedAt,
    claimSummary,
    ...(schedulerDecisionRef === undefined ? {} : { schedulerDecisionRef }),
  };
}

export function buildTaskAckShell({
  taskId,
  claimId,
  ackId,
  acknowledgedAt,
  ackSummary,
  schedulerDecisionRef,
}: BuildTaskAckShellOptions): BidviaTaskAckShell {
  return {
    kind: 'task-ack',
    scope: 'local-participation-shell',
    taskId,
    claimId,
    ackId,
    acknowledgedAt,
    ackSummary,
    ...(schedulerDecisionRef === undefined ? {} : { schedulerDecisionRef }),
  };
}

export function buildTaskLeaseShell({
  taskId,
  leaseId,
  leasedAt,
  leaseExpiresAt,
  leaseSummary,
  schedulerDecisionRef,
}: BuildTaskLeaseShellOptions): BidviaTaskLeaseShell {
  return {
    kind: 'task-lease',
    scope: 'local-participation-shell',
    taskId,
    leaseId,
    leasedAt,
    leaseExpiresAt,
    leaseSummary,
    ...(schedulerDecisionRef === undefined ? {} : { schedulerDecisionRef }),
  };
}

export function buildTaskTimeoutShell({
  taskId,
  timeoutId,
  timedOutAt,
  timeoutSummary,
  priorLeaseId,
  schedulerDecisionRef,
}: BuildTaskTimeoutShellOptions): BidviaTaskTimeoutShell {
  return {
    kind: 'task-timeout',
    scope: 'local-participation-shell',
    taskId,
    timeoutId,
    timedOutAt,
    timeoutSummary,
    ...(priorLeaseId === undefined ? {} : { priorLeaseId }),
    ...(schedulerDecisionRef === undefined ? {} : { schedulerDecisionRef }),
  };
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
  return {
    kind: 'task-retry-awareness',
    scope: 'local-participation-shell',
    taskId,
    observedAt,
    attempt,
    maxAttempts,
    retryable,
    rationale,
    ...(nextRetryAt === undefined ? {} : { nextRetryAt }),
    ...(schedulerDecisionRef === undefined ? {} : { schedulerDecisionRef }),
  };
}
