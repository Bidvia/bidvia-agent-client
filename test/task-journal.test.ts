import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import * as publicSurface from '../src/index.ts';

function setEnvVar(name: string, value: string | undefined) {
  const previousValue = process.env[name];

  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }

  return () => {
    if (previousValue === undefined) {
      delete process.env[name];
      return;
    }

    process.env[name] = previousValue;
  };
}

test('resolveLocalTaskJournalPath defaults to ~/.bidvia/runtime/task-journal.json and lets BIDVIA_TASK_JOURNAL_PATH win when provided', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.resolveLocalTaskJournalPath, 'function');

  const resolveLocalTaskJournalPath = exports.resolveLocalTaskJournalPath as (options?: {
    env?: NodeJS.ProcessEnv;
    homeDirectory?: string;
  }) => string;

  assert.equal(
    resolveLocalTaskJournalPath({
      env: {},
      homeDirectory: '/Users/example-user',
    }),
    '/Users/example-user/.bidvia/runtime/task-journal.json',
  );
  assert.equal(
    resolveLocalTaskJournalPath({
      env: {
        BIDVIA_TASK_JOURNAL_PATH: '/tmp/bidvia/custom-task-journal.json',
      },
      homeDirectory: '/Users/example-user',
    }),
    '/tmp/bidvia/custom-task-journal.json',
  );
});

test('writeLocalTaskJournal persists non-authoritative task attempt state, progress markers, pending result refs, and recovery metadata for reload', async () => {
  const exports = publicSurface as Record<string, unknown>;
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-task-journal-'));
  const journalPath = path.join(tempDirectory, 'task-journal.json');

  assert.equal(typeof exports.writeLocalTaskJournal, 'function');
  assert.equal(typeof exports.readLocalTaskJournal, 'function');

  const writeLocalTaskJournal = exports.writeLocalTaskJournal as (
    journal: Record<string, unknown>,
    options?: {
      env?: NodeJS.ProcessEnv;
      homeDirectory?: string;
    },
  ) => Promise<{ path: string; journal: Record<string, unknown> }>;
  const readLocalTaskJournal = exports.readLocalTaskJournal as (options?: {
    env?: NodeJS.ProcessEnv;
    homeDirectory?: string;
  }) => Promise<Record<string, unknown> | null>;
  const restoreTaskJournalPath = setEnvVar('BIDVIA_TASK_JOURNAL_PATH', journalPath);

  try {
    const result = await writeLocalTaskJournal({
      scope: 'local-task-journal',
      locality: 'local-only',
      authority: 'non-authoritative-cache',
      sessionRef: 'local-session-1',
      localTaskRef: 'local-task-1',
      taskId: 'task-1',
      memoryRef: 'capmem-1',
      attempts: [
        {
          attempt: 1,
          status: 'leased',
          participationKind: 'local-task-lease-observation',
          recordedAt: '2026-04-04T10:00:00.000Z',
        },
      ],
      progressMarkers: [
        {
          marker: 'result-staged',
          recordedAt: '2026-04-04T10:05:00.000Z',
          detail: 'awaiting-core-commit',
        },
      ],
      pendingResultRefs: [
        {
          resultRef: 'local-result-1',
          kind: 'proposal',
          recordedAt: '2026-04-04T10:06:00.000Z',
        },
      ],
       recovery: {
         checkpointRef: 'checkpoint-1',
         resumeFromMarker: 'result-staged',
         lastCheckpointAt: '2026-04-04T10:07:00.000Z',
       },
       protocolState: {
         claimId: 'claim-1',
         ackId: 'ack-1',
         leaseId: 'lease-1',
       },
       createdAt: '2026-04-04T10:00:00.000Z',
       updatedAt: '2026-04-04T10:07:00.000Z',
       sessionId: 'secret-session-id',
       accessToken: 'secret-token',
     });

    assert.equal(result.path, journalPath);
    assert.deepEqual(result.journal, {
      scope: 'local-task-journal',
      locality: 'local-only',
      authority: 'non-authoritative-cache',
      sessionRef: 'local-session-1',
      localTaskRef: 'local-task-1',
      taskId: 'task-1',
      memoryRef: 'capmem-1',
      attempts: [
        {
          attempt: 1,
          status: 'leased',
          participationKind: 'local-task-lease-observation',
          recordedAt: '2026-04-04T10:00:00.000Z',
        },
      ],
      progressMarkers: [
        {
          marker: 'result-staged',
          recordedAt: '2026-04-04T10:05:00.000Z',
          detail: 'awaiting-core-commit',
        },
      ],
      pendingResultRefs: [
        {
          resultRef: 'local-result-1',
          kind: 'proposal',
          recordedAt: '2026-04-04T10:06:00.000Z',
        },
      ],
       recovery: {
         checkpointRef: 'checkpoint-1',
         resumeFromMarker: 'result-staged',
         lastCheckpointAt: '2026-04-04T10:07:00.000Z',
       },
       protocolState: {
         claimId: 'claim-1',
         ackId: 'ack-1',
         leaseId: 'lease-1',
       },
       createdAt: '2026-04-04T10:00:00.000Z',
       updatedAt: '2026-04-04T10:07:00.000Z',
     });

    assert.deepEqual(JSON.parse(readFileSync(journalPath, 'utf8')), result.journal);

    const reloaded = await readLocalTaskJournal();

    assert.deepEqual(reloaded, result.journal);
    assert.equal((reloaded as { sessionId?: string }).sessionId, undefined);
    assert.equal((reloaded as { accessToken?: string }).accessToken, undefined);
  } finally {
    restoreTaskJournalPath();
  }
});

test('readLocalTaskJournal returns null when no local task journal exists at the resolved path', async () => {
  const exports = publicSurface as Record<string, unknown>;
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-task-journal-missing-'));
  const journalPath = path.join(tempDirectory, 'missing.json');

  assert.equal(typeof exports.readLocalTaskJournal, 'function');

  const readLocalTaskJournal = exports.readLocalTaskJournal as (options?: {
    env?: NodeJS.ProcessEnv;
    homeDirectory?: string;
  }) => Promise<Record<string, unknown> | null>;

  const journal = await readLocalTaskJournal({
    env: {
      BIDVIA_TASK_JOURNAL_PATH: journalPath,
    },
  });

  assert.equal(journal, null);
});

test('readLocalTaskJournalWithDiagnostics returns a warning instead of throwing when the local task journal contains malformed json', async () => {
  const exports = publicSurface as Record<string, unknown>;
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-task-journal-malformed-'));
  const journalPath = path.join(tempDirectory, 'malformed.json');

  assert.equal(typeof exports.readLocalTaskJournalWithDiagnostics, 'function');

  writeFileSync(journalPath, '{not-valid-json', 'utf8');

  const readLocalTaskJournalWithDiagnostics = exports.readLocalTaskJournalWithDiagnostics as (options?: {
    env?: NodeJS.ProcessEnv;
    homeDirectory?: string;
  }) => Promise<{ journal: Record<string, unknown> | null; warnings: unknown[] }>;

  const result = await readLocalTaskJournalWithDiagnostics({
    env: {
      BIDVIA_TASK_JOURNAL_PATH: journalPath,
    },
  });

  assert.equal(result.journal, null);
  assert.deepEqual(result.warnings, [{
    code: 'invalid-local-task-journal',
    path: journalPath,
    message: 'Local task journal file is malformed JSON. Ignoring cached task recovery state for this command.',
  }]);
});

test('readLocalTaskJournalWithDiagnostics treats invalid task journal shapes as malformed and returns a warning', async () => {
  const exports = publicSurface as Record<string, unknown>;
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-task-journal-bad-fields-'));
  const journalPath = path.join(tempDirectory, 'bad-fields.json');

  assert.equal(typeof exports.readLocalTaskJournalWithDiagnostics, 'function');

  writeFileSync(journalPath, JSON.stringify({
    scope: 'local-task-journal',
    locality: 'local-only',
    authority: 'non-authoritative-cache',
    sessionRef: 'local-session-1',
    localTaskRef: 'local-task-1',
    memoryRef: 123,
    attempts: 'not-an-array',
  }), 'utf8');

  const readLocalTaskJournalWithDiagnostics = exports.readLocalTaskJournalWithDiagnostics as (options?: {
    env?: NodeJS.ProcessEnv;
    homeDirectory?: string;
  }) => Promise<{ journal: Record<string, unknown> | null; warnings: unknown[] }>;

  const result = await readLocalTaskJournalWithDiagnostics({
    env: {
      BIDVIA_TASK_JOURNAL_PATH: journalPath,
    },
  });

  assert.equal(result.journal, null);
  assert.deepEqual(result.warnings, [{
    code: 'invalid-local-task-journal',
    path: journalPath,
    message: 'Local task journal file is malformed JSON. Ignoring cached task recovery state for this command.',
  }]);
});
