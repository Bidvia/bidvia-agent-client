import type {
  BidviaExecutionSession,
  BidviaTaskHandleStatus,
} from './contracts.js';
import type {
  BidviaLocalPendingResultRef,
  BidviaLocalTaskProtocolState,
  BidviaLocalTaskJournal,
} from './task-journal.js';
import {
  readLocalTaskJournal,
  writeLocalTaskJournal,
} from './task-journal.js';
import {
  buildTaskAckShell,
  buildTaskClaimShell,
  buildTaskLeaseShell,
  buildTaskOfferShell,
  buildTaskTimeoutShell,
} from '../task-participation.js';
import {
  cloneRuntimeHookFailures,
  dispatchRuntimeHooks,
} from './hooks.js';
import {
  buildBlockedCapabilityExecutionResult,
  type BidviaCapabilityOrchestrator,
  createCapabilityOrchestrator,
  isBlockedCapabilityExecutionError,
} from './capability-orchestration.js';
import type {
  BidviaTaskRuntimeAcceptInput,
  BidviaTaskRuntimeCapabilityCallInput,
  BidviaTaskRuntimeClaimInput,
  BidviaTaskRuntimeCommitResultInput,
  BidviaTaskRuntimeCompleteInput,
  BidviaTaskRuntimeFailInput,
  BidviaTaskRuntimeLeaseInput,
  BidviaTaskRuntimePendingResult,
  BidviaTaskRuntimeReceiveInput,
  BidviaTaskRuntimeResumeInput,
  BidviaTaskRuntimeState,
  BidviaTaskRuntimeStatus,
  BidviaTaskRuntimeSuspendInput,
  BidviaTaskRuntimeTimeoutInput,
  BidviaTaskRuntimeClientPort,
  BidviaTaskRuntimeStageResultInput,
  CreateBidviaTaskRuntimeInput,
} from './contracts.js';
import type {
  BidviaRuntimeHookEvent,
  BidviaRuntimeHookFailure,
} from './hooks.js';

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return value;
}

function readStringProperty(value: unknown, fieldName: string): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const property = (value as Record<string, unknown>)[fieldName];
  return typeof property === 'string' ? property : undefined;
}

function buildInitialJournal(input: CreateBidviaTaskRuntimeInput, now: string): BidviaLocalTaskJournal {
  return {
    scope: 'local-task-journal',
    locality: 'local-only',
    authority: 'non-authoritative-cache',
    sessionRef: input.session.runtime.sessionRef,
    localTaskRef: input.session.task.localTaskRef,
    ...(input.session.task.taskId === undefined ? {} : { taskId: input.session.task.taskId }),
    memoryRef: input.session.capabilityMemory.memoryRef,
    attempts: [
      {
        attempt: 1,
        status: input.session.task.status,
        recordedAt: now,
      },
    ],
    progressMarkers: [],
    pendingResultRefs: [],
    recovery: {
      checkpointRef: 'checkpoint://runtime/initial',
      lastCheckpointAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function clonePendingResult(pendingResult: BidviaLocalPendingResultRef | undefined) {
  if (pendingResult === undefined) {
    return undefined;
  }

  return {
    resultRef: pendingResult.resultRef,
    kind: pendingResult.kind,
    terminalState: pendingResult.terminalState ?? 'complete',
    commitState: pendingResult.commitState ?? 'staged',
    ...(pendingResult.outcomeRef === undefined ? {} : { outcomeRef: pendingResult.outcomeRef }),
    ...(pendingResult.detail === undefined ? {} : { detail: pendingResult.detail }),
  } satisfies BidviaTaskRuntimePendingResult;
}

function cloneProtocolState(protocolState: BidviaLocalTaskProtocolState | undefined): BidviaLocalTaskProtocolState | undefined {
  if (protocolState === undefined) {
    return undefined;
  }

  return {
    ...(protocolState.claimId === undefined ? {} : { claimId: protocolState.claimId }),
    ...(protocolState.ackId === undefined ? {} : { ackId: protocolState.ackId }),
    ...(protocolState.leaseId === undefined ? {} : { leaseId: protocolState.leaseId }),
  };
}

function deriveStatusFromJournal(journal: BidviaLocalTaskJournal): BidviaTaskRuntimeStatus {
  const pendingResult = journal.pendingResultRefs[0];

  if (pendingResult?.commitState === 'committed') {
    return 'result-committed';
  }

  if (pendingResult?.terminalState === 'fail') {
    return 'locally-failed';
  }

  if (pendingResult !== undefined) {
    return 'locally-completed';
  }

  const lastMarker = journal.progressMarkers[journal.progressMarkers.length - 1]?.marker;

  switch (lastMarker) {
    case 'task-completed':
      return 'completed';
    case 'task-failed':
      return 'failed';
    case 'task-suspended':
      return 'suspended';
    case 'execution-started':
    case 'task-resumed':
      return 'executing';
    case 'lease-renewed':
      return 'leased';
    case 'claim-accepted':
      return 'accepted';
    case 'claim-created':
      return 'claimed';
    default:
      return journal.attempts[journal.attempts.length - 1]?.status === 'failed' ? 'failed' : 'idle';
  }
}

function extractAttempt(journal: BidviaLocalTaskJournal): number {
  return journal.attempts[journal.attempts.length - 1]?.attempt ?? 1;
}

function shouldIncrementAttempt(
  journal: BidviaLocalTaskJournal,
  status: BidviaTaskHandleStatus,
): boolean {
  if (status !== 'executing') {
    return false;
  }

  return journal.progressMarkers[journal.progressMarkers.length - 1]?.marker === 'task-timed-out';
}

function updateAttemptStatus(
  journal: BidviaLocalTaskJournal,
  status: BidviaTaskHandleStatus,
  recordedAt: string,
  participationKind?: string,
): void {
  const previousAttempt = extractAttempt(journal);
  journal.attempts.push({
    attempt: shouldIncrementAttempt(journal, status) ? previousAttempt + 1 : previousAttempt,
    status,
    ...(participationKind === undefined ? {} : { participationKind }),
    recordedAt,
  });
}

function pushProgressMarker(
  journal: BidviaLocalTaskJournal,
  marker: string,
  recordedAt: string,
  detail?: string,
): void {
  journal.progressMarkers.push({
    marker,
    recordedAt,
    ...(detail === undefined ? {} : { detail }),
  });
}

function ensureMatchingJournal(session: BidviaExecutionSession, journal: BidviaLocalTaskJournal): void {
  if (journal.localTaskRef !== session.task.localTaskRef) {
    throw new Error('journal localTaskRef does not match session.task.localTaskRef');
  }

  if (journal.sessionRef !== session.runtime.sessionRef) {
    throw new Error('journal sessionRef does not match session.runtime.sessionRef');
  }
}

export class BidviaTaskRuntime {
  private readonly registrationId?: string;
  private readonly taskId?: string;
  private readonly clientPromise: Promise<BidviaTaskRuntimeClientPort>;
  private readonly capabilityOrchestrator: BidviaCapabilityOrchestrator;
  private state: BidviaTaskRuntimeState;

  constructor(
    private readonly session: BidviaExecutionSession,
    private readonly taskDispatchId: string,
    private readonly journal: BidviaLocalTaskJournal,
    private readonly journalPath?: string,
  ) {
    this.registrationId = session.identity.registrationId;
    this.taskId = session.task.taskId;
    this.clientPromise = Promise.resolve(session.runtime.dependencies.createClient());
    this.capabilityOrchestrator = createCapabilityOrchestrator(session.identity);
    this.state = this.buildState();
  }

  getState(): BidviaTaskRuntimeState {
    return {
      ...this.state,
      attempt: extractAttempt(this.journal),
      ...(this.state.pendingResult === undefined
        ? {}
        : { pendingResult: { ...this.state.pendingResult } }),
    };
  }

  getJournal(): BidviaLocalTaskJournal {
    return {
      ...this.journal,
      attempts: this.journal.attempts.map((attempt) => ({ ...attempt })),
      progressMarkers: this.journal.progressMarkers.map((marker) => ({ ...marker })),
      pendingResultRefs: this.journal.pendingResultRefs.map((pendingResult) => ({ ...pendingResult })),
      recovery: { ...this.journal.recovery },
      ...(this.journal.protocolState === undefined ? {} : { protocolState: cloneProtocolState(this.journal.protocolState) }),
    };
  }

  getHookFailures(): BidviaRuntimeHookFailure[] {
    return cloneRuntimeHookFailures(this.session.hookAudit);
  }

  async receiveTask(input: BidviaTaskRuntimeReceiveInput): Promise<BidviaTaskRuntimeState> {
    const now = this.now();

    this.state.status = 'idle';
    this.state.participation = buildTaskOfferShell({
      taskId: this.taskId ?? this.session.task.localTaskRef,
      offerId: input.offerId,
      observedAt: now,
      offerSummary: input.summary,
      ...(input.leaseExpiresAt === undefined ? {} : { leaseExpiresAt: input.leaseExpiresAt }),
      ...(input.timeoutAt === undefined ? {} : { timeoutAt: input.timeoutAt }),
    });

    updateAttemptStatus(this.journal, 'offered', now, 'local-task-offer-observation');
    pushProgressMarker(this.journal, 'task-received', now, input.summary);

    await this.persistJournal({
      checkpointRef: `checkpoint://runtime/${this.taskDispatchId}/receive`,
      resumeFromMarker: 'task-received',
      lastCheckpointAt: now,
    });
    await this.dispatchHook({
      eventName: 'task-received',
      recordedAt: now,
      status: this.state.status,
      detail: input.summary,
      input,
      payload: this.state.participation,
    });

    return this.getState();
  }

  async claim(input: BidviaTaskRuntimeClaimInput): Promise<BidviaTaskRuntimeState> {
    const now = this.now();
    const client = await this.clientPromise;
    const response = await client.createClaim(this.requireRegistrationId('claim'), {
      claimKind: input.claimKind,
      claimRef: input.claimRef,
      taskDispatchId: this.taskDispatchId,
      now,
    });
    const claimId = readStringProperty(response, 'claimId') ?? input.claimRef;

    this.state.claimId = claimId;
    this.journal.protocolState = {
      ...cloneProtocolState(this.journal.protocolState),
      claimId,
    };
    this.state.status = 'claimed';
    this.state.participation = buildTaskClaimShell({
      taskId: this.taskId ?? this.session.task.localTaskRef,
      offerId: input.offerId,
      claimId,
      claimedAt: now,
      claimSummary: input.summary,
    });

    updateAttemptStatus(this.journal, 'claimed', now, 'local-task-claim-intent');
    pushProgressMarker(this.journal, 'claim-created', now, input.summary);

    await this.persistJournal({
      checkpointRef: `checkpoint://runtime/${this.taskDispatchId}/claim`,
      resumeFromMarker: 'claim-created',
      lastCheckpointAt: now,
    });
    await this.dispatchHook({
      eventName: 'task-claimed',
      recordedAt: now,
      status: this.state.status,
      detail: input.summary,
      input,
      payload: this.state.participation,
    });

    return this.getState();
  }

  async accept(input: BidviaTaskRuntimeAcceptInput): Promise<BidviaTaskRuntimeState> {
    const now = this.now();
    const client = await this.clientPromise;
    const response = await client.acceptClaim(this.requireRegistrationId('accept'), input.claimId, {
      taskDispatchId: this.taskDispatchId,
      now,
    });
    const ackId = readStringProperty(response, 'ackId') ?? `ack://${input.claimId}`;

    this.state.claimId = input.claimId;
    this.state.ackId = ackId;
    this.journal.protocolState = {
      ...cloneProtocolState(this.journal.protocolState),
      claimId: input.claimId,
      ackId,
    };
    this.state.status = 'accepted';
    this.state.participation = buildTaskAckShell({
      taskId: this.taskId ?? this.session.task.localTaskRef,
      claimId: input.claimId,
      ackId,
      acknowledgedAt: now,
      ackSummary: input.summary,
    });

    updateAttemptStatus(this.journal, 'claimed', now, 'local-task-ack-observation');
    pushProgressMarker(this.journal, 'claim-accepted', now, input.summary);

    await this.persistJournal({
      checkpointRef: `checkpoint://runtime/${this.taskDispatchId}/accept`,
      resumeFromMarker: 'claim-accepted',
      lastCheckpointAt: now,
    });

    return this.getState();
  }

  async renewLease(input: BidviaTaskRuntimeLeaseInput): Promise<BidviaTaskRuntimeState> {
    const now = this.now();
    const client = await this.clientPromise;
    const response = await client.createLease(this.requireRegistrationId('renewLease'), {
      leaseScope: input.leaseScope,
      now,
      expiresAt: input.expiresAt,
    });
    const leaseId = readStringProperty(response, 'leaseId') ?? `lease://${this.taskDispatchId}`;

    this.state.leaseId = leaseId;
    this.journal.protocolState = {
      ...cloneProtocolState(this.journal.protocolState),
      leaseId,
    };
    this.state.status = 'leased';
    this.state.participation = buildTaskLeaseShell({
      taskId: this.taskId ?? this.session.task.localTaskRef,
      leaseId,
      leasedAt: now,
      leaseExpiresAt: input.expiresAt,
      leaseSummary: input.summary,
    });

    updateAttemptStatus(this.journal, 'leased', now, 'local-task-lease-observation');
    pushProgressMarker(this.journal, 'lease-renewed', now, input.summary);

    await this.persistJournal({
      checkpointRef: `checkpoint://runtime/${this.taskDispatchId}/lease`,
      resumeFromMarker: 'lease-renewed',
      lastCheckpointAt: now,
    });

    return this.getState();
  }

  async startExecution(): Promise<BidviaTaskRuntimeState> {
    const now = this.now();

    this.state.status = 'executing';
    updateAttemptStatus(this.journal, 'executing', now);
    pushProgressMarker(this.journal, 'execution-started', now);

    await this.persistJournal({
      checkpointRef: `checkpoint://runtime/${this.taskDispatchId}/execution`,
      resumeFromMarker: 'execution-started',
      lastCheckpointAt: now,
    });

    return this.getState();
  }

  async suspend(input: BidviaTaskRuntimeSuspendInput): Promise<BidviaTaskRuntimeState> {
    const now = this.now();
    const client = await this.clientPromise;
    await client.suspendTaskDispatch(this.requireRegistrationId('suspend'), this.taskDispatchId, {
      now,
      reason: input.reason,
    });

    this.state.status = 'suspended';
    updateAttemptStatus(this.journal, 'suspended', now);
    pushProgressMarker(this.journal, 'task-suspended', now, input.reason);

    await this.persistJournal({
      checkpointRef: `checkpoint://runtime/${this.taskDispatchId}/suspend`,
      resumeFromMarker: 'task-suspended',
      lastCheckpointAt: now,
    });

    return this.getState();
  }

  async resume(input: BidviaTaskRuntimeResumeInput): Promise<BidviaTaskRuntimeState> {
    const now = this.now();
    const client = await this.clientPromise;
    await client.resumeTaskDispatch(this.requireRegistrationId('resume'), this.taskDispatchId, {
      now,
      reason: input.reason,
    });

    this.state.status = 'executing';
    updateAttemptStatus(this.journal, 'executing', now);
    pushProgressMarker(this.journal, 'task-resumed', now, input.reason);

    await this.persistJournal({
      checkpointRef: `checkpoint://runtime/${this.taskDispatchId}/resume`,
      resumeFromMarker: 'task-resumed',
      lastCheckpointAt: now,
    });
    await this.dispatchHook({
      eventName: 'task-resumed',
      recordedAt: now,
      status: this.state.status,
      detail: input.reason,
      input,
    });

    return this.getState();
  }

  async callCapability<T>(input: BidviaTaskRuntimeCapabilityCallInput<T>): Promise<T> {
    const capabilityKey = requireNonEmptyString(
      input.capabilityKey ?? this.session.capabilityMemory.capabilityKey,
      'capabilityKey',
    );

    try {
      const result = await this.capabilityOrchestrator.call({
        helperKey: input.helperKey,
        call: input.call,
      });
      const now = this.now();

      await this.dispatchHook({
        eventName: 'capability-called',
        recordedAt: now,
        capabilityKey,
        status: this.state.status,
        input: input.input,
        result,
      });

      return result;
    } catch (error) {
      if (!isBlockedCapabilityExecutionError(error)) {
        throw error;
      }

      const now = this.now();
      pushProgressMarker(this.journal, 'capability-blocked', now, error.message);

      await this.persistJournal({
        checkpointRef: `checkpoint://runtime/${this.taskDispatchId}/capability-blocked`,
        resumeFromMarker: this.journal.recovery.resumeFromMarker,
        lastCheckpointAt: now,
      });
      await this.dispatchHook({
        eventName: 'capability-called',
        recordedAt: now,
        capabilityKey,
        status: this.state.status,
        detail: error.message,
        input: input.input,
        result: buildBlockedCapabilityExecutionResult(error),
      });

      throw error;
    }
  }

  async stageResult(input: BidviaTaskRuntimeStageResultInput): Promise<BidviaTaskRuntimeState> {
    const now = this.now();

    const pendingResult: BidviaLocalPendingResultRef = {
      resultRef: input.resultRef,
      kind: input.kind,
      recordedAt: now,
      terminalState: input.terminalState,
      commitState: 'staged',
      ...(input.detail === undefined ? {} : { detail: input.detail }),
    };

    this.journal.pendingResultRefs = [pendingResult];
    this.state.pendingResult = clonePendingResult(pendingResult);
    this.state.status = input.terminalState === 'fail' ? 'locally-failed' : 'locally-completed';

    pushProgressMarker(this.journal, 'result-staged', now, input.detail);

    await this.persistJournal({
      checkpointRef: input.checkpointRef,
      resumeFromMarker: 'result-commit',
      lastCheckpointAt: now,
    });
    await this.dispatchHook({
      eventName: 'result-staged',
      recordedAt: now,
      status: this.state.status,
      detail: input.detail,
      input,
      payload: this.state.pendingResult,
    });

    return this.getState();
  }

  async commitStagedResult(input: BidviaTaskRuntimeCommitResultInput): Promise<BidviaTaskRuntimeState> {
    const pendingResult = this.journal.pendingResultRefs[0];

    if (pendingResult === undefined) {
      throw new Error('a staged result is required before commit');
    }

    try {
      const response = await input.commit();
      const now = this.now();

      pendingResult.commitState = 'committed';
      pendingResult.outcomeRef = response.outcomeRef;
      this.state.pendingResult = clonePendingResult(pendingResult);
      this.state.status = 'result-committed';

      pushProgressMarker(this.journal, 'result-committed', now, pendingResult.outcomeRef);

      await this.persistJournal({
        checkpointRef: `checkpoint://runtime/${this.taskDispatchId}/result-committed`,
        resumeFromMarker:
          pendingResult.terminalState === 'fail' ? 'task-fail' : 'task-complete',
        lastCheckpointAt: now,
      });
      await this.dispatchHook({
        eventName: 'result-committed',
        recordedAt: now,
        status: this.state.status,
        detail: pendingResult.outcomeRef,
        result: response,
        payload: this.state.pendingResult,
      });

      return this.getState();
    } catch (error) {
      const now = this.now();
      await this.persistJournal({
        checkpointRef: this.journal.recovery.checkpointRef,
        resumeFromMarker: 'result-commit',
        lastCheckpointAt: now,
      });
      throw error;
    }
  }

  async completeTask(input: BidviaTaskRuntimeCompleteInput): Promise<BidviaTaskRuntimeState> {
    const pendingResult = this.requireCommittedResult('complete');
    const now = this.now();
    const client = await this.clientPromise;

    await client.completeTaskDispatch(this.requireRegistrationId('completeTask'), this.taskDispatchId, {
      now,
      reason: input.reason,
      outcomeRef: requireNonEmptyString(pendingResult.outcomeRef, 'pendingResult.outcomeRef'),
    });

    this.state.status = 'completed';
    this.state.pendingResult = undefined;
    this.journal.pendingResultRefs = [];
    updateAttemptStatus(this.journal, 'completed', now);
    pushProgressMarker(this.journal, 'task-completed', now, input.reason);

    await this.persistJournal({
      checkpointRef: `checkpoint://runtime/${this.taskDispatchId}/completed`,
      lastCheckpointAt: now,
    });

    return this.getState();
  }

  async failTask(input: BidviaTaskRuntimeFailInput): Promise<BidviaTaskRuntimeState> {
    const pendingResult = this.requireCommittedResult('fail');
    const now = this.now();
    const client = await this.clientPromise;

    await client.failTaskDispatch(this.requireRegistrationId('failTask'), this.taskDispatchId, {
      now,
      reason: input.reason,
      outcomeRef: requireNonEmptyString(pendingResult.outcomeRef, 'pendingResult.outcomeRef'),
    });

    this.state.status = 'failed';
    this.state.pendingResult = undefined;
    this.journal.pendingResultRefs = [];
    updateAttemptStatus(this.journal, 'failed', now);
    pushProgressMarker(this.journal, 'task-failed', now, input.reason);

    await this.persistJournal({
      checkpointRef: `checkpoint://runtime/${this.taskDispatchId}/failed`,
      lastCheckpointAt: now,
    });
    await this.dispatchHook({
      eventName: 'task-failed',
      recordedAt: now,
      status: this.state.status,
      detail: input.reason,
      input,
    });

    return this.getState();
  }

  async recordTimeout(input: BidviaTaskRuntimeTimeoutInput): Promise<BidviaTaskRuntimeState> {
    const now = this.now();

    this.state.status = 'suspended';
    this.state.participation = buildTaskTimeoutShell({
      taskId: this.taskId ?? this.session.task.localTaskRef,
      timeoutId: input.timeoutId,
      timedOutAt: now,
      timeoutSummary: input.summary,
      ...(input.priorLeaseId === undefined ? {} : { priorLeaseId: input.priorLeaseId }),
    });

    updateAttemptStatus(this.journal, 'suspended', now, 'local-task-timeout-observation');
    pushProgressMarker(this.journal, 'task-timed-out', now, input.summary);

    await this.persistJournal({
      checkpointRef: `checkpoint://runtime/${this.taskDispatchId}/timeout`,
      resumeFromMarker: 'task-timed-out',
      lastCheckpointAt: now,
    });
    await this.dispatchHook({
      eventName: 'task-timed-out',
      recordedAt: now,
      status: this.state.status,
      detail: input.summary,
      input,
      payload: this.state.participation,
    });

    return this.getState();
  }

  private buildState(): BidviaTaskRuntimeState {
    const pendingResult = clonePendingResult(this.journal.pendingResultRefs[0]);

    return {
      scope: 'local-task-runtime',
      sessionRef: this.session.runtime.sessionRef,
      localTaskRef: this.session.task.localTaskRef,
      ...(this.taskId === undefined ? {} : { taskId: this.taskId }),
      taskDispatchId: this.taskDispatchId,
      status: deriveStatusFromJournal(this.journal),
      attempt: extractAttempt(this.journal),
      ...(this.journal.protocolState?.claimId === undefined ? {} : { claimId: this.journal.protocolState.claimId }),
      ...(this.journal.protocolState?.ackId === undefined ? {} : { ackId: this.journal.protocolState.ackId }),
      ...(this.journal.protocolState?.leaseId === undefined ? {} : { leaseId: this.journal.protocolState.leaseId }),
      ...(pendingResult === undefined ? {} : { pendingResult }),
    };
  }

  private async persistJournal(recovery: BidviaLocalTaskJournal['recovery']): Promise<void> {
    this.journal.recovery = recovery;
    this.journal.updatedAt = recovery.lastCheckpointAt;
    await writeLocalTaskJournal(this.journal, {
      ...(this.journalPath === undefined ? {} : { path: this.journalPath }),
    });
  }

  private now(): string {
    return this.session.runtime.dependencies.now();
  }

  private requireRegistrationId(operation: string): string {
    return requireNonEmptyString(this.registrationId, `session.identity.registrationId is required for ${operation}`);
  }

  private requireCommittedResult(expectedTerminalState: 'complete' | 'fail'): BidviaTaskRuntimePendingResult {
    const pendingResult = this.state.pendingResult;

    if (pendingResult?.commitState !== 'committed' || pendingResult.terminalState !== expectedTerminalState) {
      throw new Error(
        expectedTerminalState === 'complete'
          ? 'result commit must succeed before task completion'
          : 'result commit must succeed before task failure',
      );
    }

    return pendingResult;
  }

  private async dispatchHook(event: Omit<BidviaRuntimeHookEvent, 'sessionId' | 'sessionRef' | 'localTaskRef' | 'taskDispatchId' | 'taskId'>): Promise<void> {
    await dispatchRuntimeHooks(this.session.hooks, this.session.hookAudit, {
      ...event,
      sessionId: this.session.sessionId,
      sessionRef: this.session.runtime.sessionRef,
      localTaskRef: this.session.task.localTaskRef,
      taskDispatchId: this.taskDispatchId,
      ...(this.taskId === undefined ? {} : { taskId: this.taskId }),
    });
  }
}

export async function createBidviaTaskRuntime(
  input: CreateBidviaTaskRuntimeInput,
): Promise<BidviaTaskRuntime> {
  requireNonEmptyString(input.taskDispatchId, 'taskDispatchId');

  const now = input.session.runtime.dependencies.now();
  const existingJournal = await readLocalTaskJournal({
    ...(input.journalPath === undefined ? {} : { path: input.journalPath }),
  });
  const journal = existingJournal ?? buildInitialJournal(input, now);

  ensureMatchingJournal(input.session, journal);

  return new BidviaTaskRuntime(input.session, input.taskDispatchId, journal, input.journalPath);
}

export type * from './contracts.js';
