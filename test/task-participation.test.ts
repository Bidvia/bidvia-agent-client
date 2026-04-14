import test from 'node:test';
import assert from 'node:assert/strict';

test('task-participation helpers export local observation builders for offer, claim, ack, lease, timeout, and retry awareness', async () => {
  const taskParticipationModule = await import('../src/index.ts');

  assert.equal(typeof taskParticipationModule.buildTaskPlaneView, 'function');
  assert.equal(typeof taskParticipationModule.getTaskPlaneCapabilityMode, 'function');
  assert.equal(typeof taskParticipationModule.buildLocalTaskOfferObservation, 'function');
  assert.equal(typeof taskParticipationModule.buildLocalTaskClaimIntent, 'function');
  assert.equal(typeof taskParticipationModule.buildLocalTaskAckObservation, 'function');
  assert.equal(typeof taskParticipationModule.buildLocalTaskLeaseObservation, 'function');
  assert.equal(typeof taskParticipationModule.buildLocalTaskTimeoutObservation, 'function');
  assert.equal(typeof taskParticipationModule.buildLocalTaskRetryAwareness, 'function');
  assert.equal(typeof taskParticipationModule.buildTaskOfferShell, 'function');
  assert.equal(typeof taskParticipationModule.buildTaskClaimShell, 'function');
  assert.equal(typeof taskParticipationModule.buildTaskAckShell, 'function');
  assert.equal(typeof taskParticipationModule.buildTaskLeaseShell, 'function');
  assert.equal(typeof taskParticipationModule.buildTaskTimeoutShell, 'function');
  assert.equal(typeof taskParticipationModule.buildTaskRetryAwarenessShell, 'function');
});

test('task-plane adapter groups governed task semantics while keeping local shells descriptive-only', async () => {
  const taskParticipationModule = await import('../src/index.ts');

  const taskPlane = taskParticipationModule.buildTaskPlaneView();
  const sharedAdoptionStatus = taskParticipationModule.listCorePlaneAdoptionStatuses()
    .find((status: { plane: string }) => status.plane === 'task');

  assert.deepEqual(taskPlane.localShellBoundary, {
    descriptiveOnly: true,
    schedulerAuthorityClaim: false,
    timeoutSemantics: 'local-only',
    notes: [
      'Local task shells stay descriptive-only and do not become scheduler authority.',
      'Do not invent remote timeout payload fields from local timeout observations.',
    ],
  });
  assert.deepEqual(taskPlane.adoptionStatus, sharedAdoptionStatus);
  assert.equal(taskPlane.timeoutTruth.payloadPacketStatus, 'packet-grounded');
  assert.equal(taskPlane.timeoutTruth.localOnly, true);
  assert.equal(taskPlane.timeoutTruth.remotePayloadSupported, true);
  assert.equal(taskPlane.timeoutTruth.blockedBy, null);
  assert.equal(taskParticipationModule.getTaskPlaneCapabilityMode('listTaskDispatches'), 'visibility-only');
  assert.equal(taskParticipationModule.getTaskPlaneCapabilityMode('createTaskDispatch'), 'packet-grounded-execution');
  assert.equal(taskParticipationModule.getTaskPlaneCapabilityMode('suspendTaskDispatch'), 'packet-grounded-execution');
  assert.equal(taskParticipationModule.getTaskPlaneCapabilityMode('createParticipationState'), 'packet-grounded-execution');
  assert.equal(taskParticipationModule.getTaskPlaneCapabilityMode('missingTaskHelper'), undefined);
});

test('task-plane executable helper coverage derives from the shared plane execution gate', async () => {
  const taskParticipationModule = await import('../src/index.ts');

  const taskPlane = taskParticipationModule.buildTaskPlaneView();
  const readHelperKeys = taskParticipationModule.listPlaneExecutionGates()
    .filter((gate: { plane: string; executionTruth: string }) => (
      gate.plane === 'task' && gate.executionTruth === 'packet-grounded-read'
    ))
    .map((gate: { helperKey: string }) => gate.helperKey);
  const executableHelperKeys = taskParticipationModule.listPlaneExecutionGates()
    .filter((gate: { plane: string; executionTruth: string }) => (
      gate.plane === 'task' && gate.executionTruth === 'packet-grounded-execution'
    ))
    .map((gate: { helperKey: string }) => gate.helperKey);
  const canonicalExecutableHelperKeys = [
    'createParticipationState',
    'createLease',
    'createTaskDispatch',
    'assignTaskDispatch',
    'suspendTaskDispatch',
    'resumeTaskDispatch',
    'completeTaskDispatch',
    'failTaskDispatch',
    'createClaim',
    'acceptClaim',
    'rejectClaim',
    'postHeartbeat',
  ];

  assert.deepEqual(taskPlane.capabilityModes.visibilityOnlyHelperKeys, readHelperKeys);
  assert.deepEqual(taskPlane.capabilityModes.executableHelperKeys, canonicalExecutableHelperKeys);
  assert.deepEqual([...taskPlane.capabilityModes.executableHelperKeys].sort(), [...executableHelperKeys].sort());
  assert.equal(taskParticipationModule.getTaskPlaneCapabilityMode('postHeartbeat'), 'packet-grounded-execution');
});

test('task-participation helpers keep task offers and retry awareness local and descriptive', async () => {
  const taskParticipationModule = await import('../src/index.ts');

  const offer = taskParticipationModule.buildLocalTaskOfferObservation({
    localTaskRef: 'task-1',
    offerId: 'offer-1',
    observedAt: '2026-03-27T00:00:00.000Z',
    summary: 'local shell observed an offered task without claiming runtime dispatch authority',
    leaseExpiresAt: '2026-03-27T00:05:00.000Z',
    timeoutAt: '2026-03-27T00:06:00.000Z',
    localCoordinationRef: 'local://task-observations/offer-1',
  });

  const retryAwareness = taskParticipationModule.buildLocalTaskRetryAwareness({
    localTaskRef: 'task-1',
    observedAt: '2026-03-27T00:01:00.000Z',
    attempt: 2,
    maxAttempts: 5,
    retryable: true,
    nextRetryAt: '2026-03-27T00:02:00.000Z',
    rationale: 'local shell tracks retry context without deciding whether runtime will redispatch the task',
  });

  assert.deepEqual(offer, {
    kind: 'local-task-offer-observation',
    scope: 'local-task-participation',
    localTaskRef: 'task-1',
    localCoordinationRef: 'local://task-observations/offer-1',
    taskId: 'task-1',
    schedulerDecisionRef: 'local://task-observations/offer-1',
    offerId: 'offer-1',
    observedAt: '2026-03-27T00:00:00.000Z',
    summary: 'local shell observed an offered task without claiming runtime dispatch authority',
    offerSummary: 'local shell observed an offered task without claiming runtime dispatch authority',
    leaseExpiresAt: '2026-03-27T00:05:00.000Z',
    timeoutAt: '2026-03-27T00:06:00.000Z',
  });
  assert.deepEqual(retryAwareness, {
    kind: 'local-task-retry-awareness',
    scope: 'local-task-participation',
    localTaskRef: 'task-1',
    taskId: 'task-1',
    observedAt: '2026-03-27T00:01:00.000Z',
    attempt: 2,
    maxAttempts: 5,
    retryable: true,
    nextRetryAt: '2026-03-27T00:02:00.000Z',
    rationale: 'local shell tracks retry context without deciding whether runtime will redispatch the task',
  });
  assert.equal('authority' in offer, false);
  assert.equal('schedulerStatus' in offer, false);
  assert.equal('authority' in retryAwareness, false);
  assert.equal('leaseExpiresAt' in retryAwareness, false);
});

test('task-participation helpers keep claim, ack, lease, and timeout shells descriptive instead of acting like a scheduler', async () => {
  const taskParticipationModule = await import('../src/index.ts');

  const claim = taskParticipationModule.buildLocalTaskClaimIntent({
    localTaskRef: 'task-1',
    offerId: 'offer-1',
    claimId: 'claim-1',
    observedAt: '2026-03-27T00:00:30.000Z',
    summary: 'local agent intends to participate in the observed task',
    localCoordinationRef: 'local://task-observations/claim-1',
  });
  const ack = taskParticipationModule.buildLocalTaskAckObservation({
    localTaskRef: 'task-1',
    claimId: 'claim-1',
    ackId: 'ack-1',
    observedAt: '2026-03-27T00:00:45.000Z',
    summary: 'local shell recorded that a coordination acknowledgement was observed',
    localCoordinationRef: 'local://task-observations/ack-1',
  });
  const lease = taskParticipationModule.buildLocalTaskLeaseObservation({
    localTaskRef: 'task-1',
    leaseId: 'lease-1',
    observedAt: '2026-03-27T00:01:00.000Z',
    leaseExpiresAt: '2026-03-27T00:05:00.000Z',
    summary: 'local shell recorded a temporary work window already decided elsewhere',
    localCoordinationRef: 'local://task-observations/lease-1',
  });
  const timeout = taskParticipationModule.buildLocalTaskTimeoutObservation({
    localTaskRef: 'task-1',
    timeoutId: 'timeout-1',
    observedAt: '2026-03-27T00:05:30.000Z',
    summary: 'local shell observed that the temporary work window timed out',
    priorLeaseId: 'lease-1',
    localCoordinationRef: 'local://task-observations/timeout-1',
  });

  assert.deepEqual(claim, {
    kind: 'local-task-claim-intent',
    scope: 'local-task-participation',
    localTaskRef: 'task-1',
    localCoordinationRef: 'local://task-observations/claim-1',
    taskId: 'task-1',
    schedulerDecisionRef: 'local://task-observations/claim-1',
    offerId: 'offer-1',
    claimId: 'claim-1',
    observedAt: '2026-03-27T00:00:30.000Z',
    claimedAt: '2026-03-27T00:00:30.000Z',
    summary: 'local agent intends to participate in the observed task',
    claimSummary: 'local agent intends to participate in the observed task',
  });
  assert.deepEqual(ack, {
    kind: 'local-task-ack-observation',
    scope: 'local-task-participation',
    localTaskRef: 'task-1',
    localCoordinationRef: 'local://task-observations/ack-1',
    taskId: 'task-1',
    schedulerDecisionRef: 'local://task-observations/ack-1',
    claimId: 'claim-1',
    ackId: 'ack-1',
    observedAt: '2026-03-27T00:00:45.000Z',
    acknowledgedAt: '2026-03-27T00:00:45.000Z',
    summary: 'local shell recorded that a coordination acknowledgement was observed',
    ackSummary: 'local shell recorded that a coordination acknowledgement was observed',
  });
  assert.deepEqual(lease, {
    kind: 'local-task-lease-observation',
    scope: 'local-task-participation',
    localTaskRef: 'task-1',
    localCoordinationRef: 'local://task-observations/lease-1',
    taskId: 'task-1',
    schedulerDecisionRef: 'local://task-observations/lease-1',
    leaseId: 'lease-1',
    observedAt: '2026-03-27T00:01:00.000Z',
    leasedAt: '2026-03-27T00:01:00.000Z',
    leaseExpiresAt: '2026-03-27T00:05:00.000Z',
    summary: 'local shell recorded a temporary work window already decided elsewhere',
    leaseSummary: 'local shell recorded a temporary work window already decided elsewhere',
  });
  assert.deepEqual(timeout, {
    kind: 'local-task-timeout-observation',
    scope: 'local-task-participation',
    localTaskRef: 'task-1',
    localCoordinationRef: 'local://task-observations/timeout-1',
    taskId: 'task-1',
    schedulerDecisionRef: 'local://task-observations/timeout-1',
    timeoutId: 'timeout-1',
    observedAt: '2026-03-27T00:05:30.000Z',
    timedOutAt: '2026-03-27T00:05:30.000Z',
    summary: 'local shell observed that the temporary work window timed out',
    timeoutSummary: 'local shell observed that the temporary work window timed out',
    priorLeaseId: 'lease-1',
  });
  assert.equal('assignedAgentId' in claim, false);
  assert.equal('dispatchDecision' in ack, false);
  assert.equal('authority' in lease, false);
  assert.equal('retryable' in timeout, false);
  assert.equal('outcomeRef' in timeout, false);
  assert.equal('timeoutReason' in timeout, false);
});
