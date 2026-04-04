import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import * as publicSurface from '../src/index.ts';

test('resolveLocalAccumulationPath defaults to ~/.bidvia/runtime/local-accumulation and lets BIDVIA_LOCAL_ACCUMULATION_PATH win when provided', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.resolveLocalAccumulationPath, 'function');

  const resolveLocalAccumulationPath = exports.resolveLocalAccumulationPath as (options?: {
    env?: NodeJS.ProcessEnv;
    homeDirectory?: string;
  }) => string;

  assert.equal(
    resolveLocalAccumulationPath({
      env: {},
      homeDirectory: '/Users/example-user',
    }),
    '/Users/example-user/.bidvia/runtime/local-accumulation',
  );
  assert.equal(
    resolveLocalAccumulationPath({
      env: {
        BIDVIA_LOCAL_ACCUMULATION_PATH: '/tmp/bidvia/custom-local-accumulation',
      },
      homeDirectory: '/Users/example-user',
    }),
    '/tmp/bidvia/custom-local-accumulation',
  );
});

test('writeLocalAccumulation persists onboarding, task, capability, and result memory as distinct local non-authoritative records and readLocalAccumulation reloads them', async () => {
  const exports = publicSurface as Record<string, unknown>;
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-local-accumulation-'));
  const accumulationPath = path.join(tempDirectory, 'local-accumulation');

  assert.equal(typeof exports.writeLocalAccumulation, 'function');
  assert.equal(typeof exports.readLocalAccumulation, 'function');

  const writeLocalAccumulation = exports.writeLocalAccumulation as (
    accumulation: Record<string, unknown>,
    options?: { path?: string },
  ) => Promise<{ path: string; accumulation: Record<string, unknown> }>;
  const readLocalAccumulation = exports.readLocalAccumulation as (
    options?: { path?: string },
  ) => Promise<Record<string, unknown> | null>;

  const result = await writeLocalAccumulation({
    onboardingMemory: {
      scope: 'local-onboarding-memory',
      locality: 'local-only',
      authority: 'non-authoritative-cache',
      sessionRef: 'local-session-1',
      facts: [
        {
          key: 'lastCompletedStep',
          value: 'claim-provisional-agent',
          recordedAt: '2026-04-04T10:00:00.000Z',
        },
      ],
      updatedAt: '2026-04-04T10:00:00.000Z',
    },
    taskExecutionMemory: {
      scope: 'local-task-execution-memory',
      locality: 'local-only',
      authority: 'non-authoritative-cache',
      sessionRef: 'local-session-1',
      localTaskRef: 'local-task-1',
      taskDispatchId: 'dispatch-1',
      attempts: [
        {
          attempt: 1,
          status: 'executing',
          recordedAt: '2026-04-04T10:01:00.000Z',
        },
      ],
      progressMarkers: [
        {
          marker: 'execution-started',
          recordedAt: '2026-04-04T10:01:00.000Z',
        },
      ],
      updatedAt: '2026-04-04T10:01:00.000Z',
    },
    capabilityUsageMemory: {
      scope: 'local-capability-usage-memory',
      locality: 'local-only',
      authority: 'non-authoritative-cache',
      sessionRef: 'local-session-1',
      localTaskRef: 'local-task-1',
      capabilities: [
        {
          capabilityKey: 'proposal.write',
          usage: [
            {
              helperKey: 'postProposal',
              recordedAt: '2026-04-04T10:02:00.000Z',
              outcome: 'succeeded',
            },
          ],
          blockedAttempts: [
            {
              helperKey: 'createTaskDispatch',
              recordedAt: '2026-04-04T10:03:00.000Z',
              executionKind: 'governed-write',
              missingContext: ['companyId'],
            },
          ],
        },
      ],
      updatedAt: '2026-04-04T10:03:00.000Z',
    },
    resultMemory: {
      scope: 'local-result-memory',
      locality: 'local-only',
      authority: 'non-authoritative-cache',
      sessionRef: 'local-session-1',
      localTaskRef: 'local-task-1',
      taskDispatchId: 'dispatch-1',
      results: [
        {
          resultRef: 'result-local-1',
          kind: 'proposal',
          terminalState: 'complete',
          commitState: 'committed',
          outcomeRef: 'outcome://dispatch/1',
          recordedAt: '2026-04-04T10:04:00.000Z',
        },
      ],
      updatedAt: '2026-04-04T10:04:00.000Z',
    },
  }, {
    path: accumulationPath,
  });

  assert.equal(result.path, accumulationPath);
  assert.deepEqual(Object.keys(result.accumulation).sort(), [
    'authority',
    'capabilityUsageMemory',
    'locality',
    'onboardingMemory',
    'resultMemory',
    'scope',
    'taskExecutionMemory',
  ]);
  assert.equal(result.accumulation.scope, 'local-accumulation');
  assert.equal(result.accumulation.locality, 'local-only');
  assert.equal(result.accumulation.authority, 'non-authoritative-cache');

  assert.deepEqual(JSON.parse(readFileSync(path.join(accumulationPath, 'onboarding-memory.json'), 'utf8')), result.accumulation.onboardingMemory);
  assert.deepEqual(JSON.parse(readFileSync(path.join(accumulationPath, 'task-execution-memory.json'), 'utf8')), result.accumulation.taskExecutionMemory);
  assert.deepEqual(JSON.parse(readFileSync(path.join(accumulationPath, 'capability-usage-memory.json'), 'utf8')), result.accumulation.capabilityUsageMemory);
  assert.deepEqual(JSON.parse(readFileSync(path.join(accumulationPath, 'result-memory.json'), 'utf8')), result.accumulation.resultMemory);

  const reloaded = await readLocalAccumulation({
    path: accumulationPath,
  });

  assert.deepEqual(reloaded, result.accumulation);
});

test('clearLocalAccumulation removes only the local accumulation records and leaves onboarding state and task journal files untouched', async () => {
  const exports = publicSurface as Record<string, unknown>;
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-local-accumulation-clear-'));
  const accumulationPath = path.join(tempDirectory, 'local-accumulation');
  const onboardingStatePath = path.join(tempDirectory, 'onboarding-state.json');
  const taskJournalPath = path.join(tempDirectory, 'task-journal.json');

  assert.equal(typeof exports.writeLocalAccumulation, 'function');
  assert.equal(typeof exports.readLocalAccumulation, 'function');
  assert.equal(typeof exports.clearLocalAccumulation, 'function');

  const writeLocalAccumulation = exports.writeLocalAccumulation as (
    accumulation: Record<string, unknown>,
    options?: { path?: string },
  ) => Promise<{ path: string; accumulation: Record<string, unknown> }>;
  const readLocalAccumulation = exports.readLocalAccumulation as (
    options?: { path?: string },
  ) => Promise<Record<string, unknown> | null>;
  const clearLocalAccumulation = exports.clearLocalAccumulation as (
    options?: { path?: string },
  ) => Promise<{ path: string; cleared: true; removedPaths: string[] }>;

  writeFileSync(onboardingStatePath, JSON.stringify({ tenantId: 'tenant-a' }, null, 2), 'utf8');
  writeFileSync(taskJournalPath, JSON.stringify({ scope: 'local-task-journal' }, null, 2), 'utf8');

  await writeLocalAccumulation({
    onboardingMemory: {
      scope: 'local-onboarding-memory',
      locality: 'local-only',
      authority: 'non-authoritative-cache',
      sessionRef: 'local-session-1',
      facts: [],
      updatedAt: '2026-04-04T10:00:00.000Z',
    },
    taskExecutionMemory: {
      scope: 'local-task-execution-memory',
      locality: 'local-only',
      authority: 'non-authoritative-cache',
      sessionRef: 'local-session-1',
      localTaskRef: 'local-task-1',
      taskDispatchId: 'dispatch-1',
      attempts: [],
      progressMarkers: [],
      updatedAt: '2026-04-04T10:01:00.000Z',
    },
    capabilityUsageMemory: {
      scope: 'local-capability-usage-memory',
      locality: 'local-only',
      authority: 'non-authoritative-cache',
      sessionRef: 'local-session-1',
      localTaskRef: 'local-task-1',
      capabilities: [],
      updatedAt: '2026-04-04T10:02:00.000Z',
    },
    resultMemory: {
      scope: 'local-result-memory',
      locality: 'local-only',
      authority: 'non-authoritative-cache',
      sessionRef: 'local-session-1',
      localTaskRef: 'local-task-1',
      taskDispatchId: 'dispatch-1',
      results: [],
      updatedAt: '2026-04-04T10:03:00.000Z',
    },
  }, {
    path: accumulationPath,
  });

  const cleared = await clearLocalAccumulation({
    path: accumulationPath,
  });

  assert.equal(cleared.path, accumulationPath);
  assert.equal(cleared.cleared, true);
  assert.deepEqual(cleared.removedPaths.sort(), [
    path.join(accumulationPath, 'capability-usage-memory.json'),
    path.join(accumulationPath, 'onboarding-memory.json'),
    path.join(accumulationPath, 'result-memory.json'),
    path.join(accumulationPath, 'task-execution-memory.json'),
  ]);
  assert.equal(await readLocalAccumulation({ path: accumulationPath }), null);
  assert.equal(existsSync(onboardingStatePath), true);
  assert.equal(existsSync(taskJournalPath), true);
  assert.deepEqual(JSON.parse(readFileSync(onboardingStatePath, 'utf8')), { tenantId: 'tenant-a' });
  assert.deepEqual(JSON.parse(readFileSync(taskJournalPath, 'utf8')), { scope: 'local-task-journal' });
});
