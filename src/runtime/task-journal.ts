import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

import type { BidviaTaskHandleStatus } from './contracts.js';

export interface BidviaLocalTaskJournalAttempt {
  attempt: number;
  status: BidviaTaskHandleStatus;
  participationKind?: string;
  recordedAt: string;
}

export interface BidviaLocalTaskProgressMarker {
  marker: string;
  recordedAt: string;
  detail?: string;
}

export interface BidviaLocalPendingResultRef {
  resultRef: string;
  kind: string;
  recordedAt: string;
  terminalState?: 'complete' | 'fail';
  commitState?: 'staged' | 'committed';
  outcomeRef?: string;
  detail?: string;
}

export interface BidviaLocalTaskRecoveryMetadata {
  checkpointRef: string;
  resumeFromMarker?: string;
  lastCheckpointAt: string;
}

export interface BidviaLocalTaskProtocolState {
  claimId?: string;
  ackId?: string;
  leaseId?: string;
}

export interface BidviaLocalTaskJournal {
  scope: 'local-task-journal';
  locality: 'local-only';
  authority: 'non-authoritative-cache';
  sessionRef: string;
  localTaskRef: string;
  taskId?: string;
  memoryRef: string;
  attempts: BidviaLocalTaskJournalAttempt[];
  progressMarkers: BidviaLocalTaskProgressMarker[];
  pendingResultRefs: BidviaLocalPendingResultRef[];
  recovery: BidviaLocalTaskRecoveryMetadata;
  protocolState?: BidviaLocalTaskProtocolState;
  createdAt: string;
  updatedAt: string;
}

export interface BidviaLocalTaskJournalInput extends BidviaLocalTaskJournal {
  sessionId?: string;
  adminSessionId?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface ResolveLocalTaskJournalPathOptions {
  env?: NodeJS.ProcessEnv;
  homeDirectory?: string;
}

export interface LocalTaskJournalIoOptions extends ResolveLocalTaskJournalPathOptions {
  path?: string;
}

export interface WriteLocalTaskJournalResult {
  path: string;
  journal: BidviaLocalTaskJournal;
}

export interface BidviaLocalTaskJournalWarning {
  code: 'invalid-local-task-journal';
  path: string;
  message: string;
}

export interface ReadLocalTaskJournalResult {
  journal: BidviaLocalTaskJournal | null;
  warnings: BidviaLocalTaskJournalWarning[];
}

function buildInvalidLocalTaskJournalWarning(journalPath: string): BidviaLocalTaskJournalWarning {
  return {
    code: 'invalid-local-task-journal',
    path: journalPath,
    message: 'Local task journal file is malformed JSON. Ignoring cached task recovery state for this command.',
  };
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isAttempt(value: unknown): value is BidviaLocalTaskJournalAttempt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return typeof candidate.attempt === 'number'
    && isString(candidate.status)
    && isOptionalString(candidate.participationKind)
    && isString(candidate.recordedAt);
}

function isProgressMarker(value: unknown): value is BidviaLocalTaskProgressMarker {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return isString(candidate.marker)
    && isString(candidate.recordedAt)
    && isOptionalString(candidate.detail);
}

function isPendingResultRef(value: unknown): value is BidviaLocalPendingResultRef {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return isString(candidate.resultRef)
    && isString(candidate.kind)
    && isString(candidate.recordedAt);
}

function isRecoveryMetadata(value: unknown): value is BidviaLocalTaskRecoveryMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return isString(candidate.checkpointRef)
    && isOptionalString(candidate.resumeFromMarker)
    && isString(candidate.lastCheckpointAt);
}

function isProtocolState(value: unknown): value is BidviaLocalTaskProtocolState {
  if (value === undefined) {
    return true;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return isOptionalString(candidate.claimId)
    && isOptionalString(candidate.ackId)
    && isOptionalString(candidate.leaseId);
}

function isLocalTaskJournal(value: unknown): value is BidviaLocalTaskJournal {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return candidate.scope === 'local-task-journal'
    && candidate.locality === 'local-only'
    && candidate.authority === 'non-authoritative-cache'
    && isString(candidate.sessionRef)
    && isString(candidate.localTaskRef)
    && isOptionalString(candidate.taskId)
    && isString(candidate.memoryRef)
    && Array.isArray(candidate.attempts)
    && candidate.attempts.every(isAttempt)
    && Array.isArray(candidate.progressMarkers)
    && candidate.progressMarkers.every(isProgressMarker)
    && Array.isArray(candidate.pendingResultRefs)
    && candidate.pendingResultRefs.every(isPendingResultRef)
    && isRecoveryMetadata(candidate.recovery)
    && isProtocolState(candidate.protocolState)
    && isString(candidate.createdAt)
    && isString(candidate.updatedAt);
}

function buildPersistedLocalTaskJournal(journal: BidviaLocalTaskJournalInput): BidviaLocalTaskJournal {
  return {
    scope: 'local-task-journal',
    locality: 'local-only',
    authority: 'non-authoritative-cache',
    sessionRef: journal.sessionRef,
    localTaskRef: journal.localTaskRef,
    ...(journal.taskId === undefined ? {} : { taskId: journal.taskId }),
    memoryRef: journal.memoryRef,
    attempts: journal.attempts.map((attempt) => ({
      attempt: attempt.attempt,
      status: attempt.status,
      ...(attempt.participationKind === undefined ? {} : { participationKind: attempt.participationKind }),
      recordedAt: attempt.recordedAt,
    })),
    progressMarkers: journal.progressMarkers.map((progressMarker) => ({
      marker: progressMarker.marker,
      recordedAt: progressMarker.recordedAt,
      ...(progressMarker.detail === undefined ? {} : { detail: progressMarker.detail }),
    })),
    pendingResultRefs: journal.pendingResultRefs.map((pendingResultRef) => ({
      resultRef: pendingResultRef.resultRef,
      kind: pendingResultRef.kind,
      recordedAt: pendingResultRef.recordedAt,
      ...(pendingResultRef.terminalState === undefined
        ? {}
        : { terminalState: pendingResultRef.terminalState }),
      ...(pendingResultRef.commitState === undefined
        ? {}
        : { commitState: pendingResultRef.commitState }),
      ...(pendingResultRef.outcomeRef === undefined
        ? {}
        : { outcomeRef: pendingResultRef.outcomeRef }),
      ...(pendingResultRef.detail === undefined ? {} : { detail: pendingResultRef.detail }),
    })),
    recovery: {
      checkpointRef: journal.recovery.checkpointRef,
      ...(journal.recovery.resumeFromMarker === undefined
        ? {}
        : { resumeFromMarker: journal.recovery.resumeFromMarker }),
      lastCheckpointAt: journal.recovery.lastCheckpointAt,
    },
    ...(journal.protocolState === undefined
      ? {}
      : {
          protocolState: {
            ...(journal.protocolState.claimId === undefined ? {} : { claimId: journal.protocolState.claimId }),
            ...(journal.protocolState.ackId === undefined ? {} : { ackId: journal.protocolState.ackId }),
            ...(journal.protocolState.leaseId === undefined ? {} : { leaseId: journal.protocolState.leaseId }),
          },
        }),
    createdAt: journal.createdAt,
    updatedAt: journal.updatedAt,
  };
}

export function resolveLocalTaskJournalPath(
  options: ResolveLocalTaskJournalPathOptions = {},
): string {
  const env = options.env ?? process.env;

  if (env.BIDVIA_TASK_JOURNAL_PATH) {
    return env.BIDVIA_TASK_JOURNAL_PATH;
  }

  return path.join(options.homeDirectory ?? homedir(), '.bidvia', 'runtime', 'task-journal.json');
}

function resolveLocalTaskJournalIoPath(options: LocalTaskJournalIoOptions = {}): string {
  return options.path ?? resolveLocalTaskJournalPath(options);
}

export async function readLocalTaskJournal(
  options: LocalTaskJournalIoOptions = {},
): Promise<BidviaLocalTaskJournal | null> {
  const result = await readLocalTaskJournalWithDiagnostics(options);
  return result.journal;
}

export async function readLocalTaskJournalWithDiagnostics(
  options: LocalTaskJournalIoOptions = {},
): Promise<ReadLocalTaskJournalResult> {
  const journalPath = resolveLocalTaskJournalIoPath(options);

  try {
    const content = await readFile(journalPath, 'utf8');
    const parsed = JSON.parse(content) as unknown;

    if (!isLocalTaskJournal(parsed)) {
      return {
        journal: null,
        warnings: [buildInvalidLocalTaskJournalWarning(journalPath)],
      };
    }

    return {
      journal: parsed,
      warnings: [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        journal: null,
        warnings: [],
      };
    }

    if (error instanceof SyntaxError) {
      return {
        journal: null,
        warnings: [buildInvalidLocalTaskJournalWarning(journalPath)],
      };
    }

    throw error;
  }
}

export async function writeLocalTaskJournal(
  journal: BidviaLocalTaskJournalInput,
  options: LocalTaskJournalIoOptions = {},
): Promise<WriteLocalTaskJournalResult> {
  const journalPath = resolveLocalTaskJournalIoPath(options);
  const persistedJournal = buildPersistedLocalTaskJournal(journal);

  await mkdir(path.dirname(journalPath), { recursive: true });
  await writeFile(journalPath, JSON.stringify(persistedJournal, null, 2), 'utf8');

  return {
    path: journalPath,
    journal: persistedJournal,
  };
}
