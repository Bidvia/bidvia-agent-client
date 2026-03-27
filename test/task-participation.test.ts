import test from 'node:test';
import assert from 'node:assert/strict';

test('task-participation helpers export local shell builders for offer, claim, ack, lease, timeout, and retry awareness', async () => {
  const taskParticipationModule = await import('../src/index.ts');

  assert.equal(typeof taskParticipationModule.buildTaskOfferShell, 'function');
  assert.equal(typeof taskParticipationModule.buildTaskClaimShell, 'function');
  assert.equal(typeof taskParticipationModule.buildTaskAckShell, 'function');
  assert.equal(typeof taskParticipationModule.buildTaskLeaseShell, 'function');
  assert.equal(typeof taskParticipationModule.buildTaskTimeoutShell, 'function');
  assert.equal(typeof taskParticipationModule.buildTaskRetryAwarenessShell, 'function');
});

test('task-participation helpers keep task offers and retry awareness local and descriptive', async () => {
  const taskParticipationModule = await import('../src/index.ts');

  const offer = taskParticipationModule.buildTaskOfferShell({
    taskId: 'task-1',
    offerId: 'offer-1',
    observedAt: '2026-03-27T00:00:00.000Z',
    offerSummary: 'local shell observed an offered task without claiming scheduler authority',
    leaseExpiresAt: '2026-03-27T00:05:00.000Z',
    timeoutAt: '2026-03-27T00:06:00.000Z',
    schedulerDecisionRef: 'scheduler://offers/offer-1',
  });

  const retryAwareness = taskParticipationModule.buildTaskRetryAwarenessShell({
    taskId: 'task-1',
    observedAt: '2026-03-27T00:01:00.000Z',
    attempt: 2,
    maxAttempts: 5,
    retryable: true,
    nextRetryAt: '2026-03-27T00:02:00.000Z',
    rationale: 'local shell tracks retry context without deciding whether the scheduler will re-offer the task',
  });

  assert.deepEqual(offer, {
    kind: 'task-offer',
    scope: 'local-participation-shell',
    taskId: 'task-1',
    offerId: 'offer-1',
    observedAt: '2026-03-27T00:00:00.000Z',
    offerSummary: 'local shell observed an offered task without claiming scheduler authority',
    leaseExpiresAt: '2026-03-27T00:05:00.000Z',
    timeoutAt: '2026-03-27T00:06:00.000Z',
    schedulerDecisionRef: 'scheduler://offers/offer-1',
  });
  assert.deepEqual(retryAwareness, {
    kind: 'task-retry-awareness',
    scope: 'local-participation-shell',
    taskId: 'task-1',
    observedAt: '2026-03-27T00:01:00.000Z',
    attempt: 2,
    maxAttempts: 5,
    retryable: true,
    nextRetryAt: '2026-03-27T00:02:00.000Z',
    rationale: 'local shell tracks retry context without deciding whether the scheduler will re-offer the task',
  });
  assert.equal('authority' in offer, false);
  assert.equal('schedulerStatus' in offer, false);
  assert.equal('authority' in retryAwareness, false);
  assert.equal('leaseExpiresAt' in retryAwareness, false);
});

test('task-participation helpers keep claim, ack, lease, and timeout shells descriptive instead of acting like a scheduler', async () => {
  const taskParticipationModule = await import('../src/index.ts');

  const claim = taskParticipationModule.buildTaskClaimShell({
    taskId: 'task-1',
    offerId: 'offer-1',
    claimId: 'claim-1',
    claimedAt: '2026-03-27T00:00:30.000Z',
    claimSummary: 'local agent intends to participate in the offered task',
    schedulerDecisionRef: 'scheduler://claims/claim-1',
  });
  const ack = taskParticipationModule.buildTaskAckShell({
    taskId: 'task-1',
    claimId: 'claim-1',
    ackId: 'ack-1',
    acknowledgedAt: '2026-03-27T00:00:45.000Z',
    ackSummary: 'local shell recorded that a claim acknowledgement was observed',
    schedulerDecisionRef: 'scheduler://acks/ack-1',
  });
  const lease = taskParticipationModule.buildTaskLeaseShell({
    taskId: 'task-1',
    leaseId: 'lease-1',
    leasedAt: '2026-03-27T00:01:00.000Z',
    leaseExpiresAt: '2026-03-27T00:05:00.000Z',
    leaseSummary: 'local shell recorded a temporary lease window for work already offered elsewhere',
    schedulerDecisionRef: 'scheduler://leases/lease-1',
  });
  const timeout = taskParticipationModule.buildTaskTimeoutShell({
    taskId: 'task-1',
    timeoutId: 'timeout-1',
    timedOutAt: '2026-03-27T00:05:30.000Z',
    timeoutSummary: 'local shell observed that the lease window timed out',
    priorLeaseId: 'lease-1',
    schedulerDecisionRef: 'scheduler://timeouts/timeout-1',
  });

  assert.deepEqual(claim, {
    kind: 'task-claim',
    scope: 'local-participation-shell',
    taskId: 'task-1',
    offerId: 'offer-1',
    claimId: 'claim-1',
    claimedAt: '2026-03-27T00:00:30.000Z',
    claimSummary: 'local agent intends to participate in the offered task',
    schedulerDecisionRef: 'scheduler://claims/claim-1',
  });
  assert.deepEqual(ack, {
    kind: 'task-ack',
    scope: 'local-participation-shell',
    taskId: 'task-1',
    claimId: 'claim-1',
    ackId: 'ack-1',
    acknowledgedAt: '2026-03-27T00:00:45.000Z',
    ackSummary: 'local shell recorded that a claim acknowledgement was observed',
    schedulerDecisionRef: 'scheduler://acks/ack-1',
  });
  assert.deepEqual(lease, {
    kind: 'task-lease',
    scope: 'local-participation-shell',
    taskId: 'task-1',
    leaseId: 'lease-1',
    leasedAt: '2026-03-27T00:01:00.000Z',
    leaseExpiresAt: '2026-03-27T00:05:00.000Z',
    leaseSummary: 'local shell recorded a temporary lease window for work already offered elsewhere',
    schedulerDecisionRef: 'scheduler://leases/lease-1',
  });
  assert.deepEqual(timeout, {
    kind: 'task-timeout',
    scope: 'local-participation-shell',
    taskId: 'task-1',
    timeoutId: 'timeout-1',
    timedOutAt: '2026-03-27T00:05:30.000Z',
    timeoutSummary: 'local shell observed that the lease window timed out',
    priorLeaseId: 'lease-1',
    schedulerDecisionRef: 'scheduler://timeouts/timeout-1',
  });
  assert.equal('assignedAgentId' in claim, false);
  assert.equal('dispatchDecision' in ack, false);
  assert.equal('authority' in lease, false);
  assert.equal('retryable' in timeout, false);
});
