import test from 'node:test';
import assert from 'node:assert/strict';

import { BidviaClient } from '../src/client.ts';
import { runCli } from '../src/cli.ts';

type TaskPlaneWriteClientStub = Pick<
  BidviaClient,
  | 'createLease'
  | 'createTaskDispatch'
  | 'assignTaskDispatch'
  | 'suspendTaskDispatch'
  | 'resumeTaskDispatch'
  | 'completeTaskDispatch'
  | 'failTaskDispatch'
  | 'createClaim'
  | 'acceptClaim'
  | 'rejectClaim'
>;

function createTaskPlaneWriteClientStub(overrides: TaskPlaneWriteClientStub): BidviaClient {
  return Object.assign(new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      sessionId: 'sess-1',
    },
  }), overrides);
}

test('runCli routes approved task-plane write commands through the matching client helpers', async () => {
  const printed: unknown[] = [];
  const calls: Array<{ command: string; args: unknown[] }> = [];

  const createClient = (): BidviaClient => createTaskPlaneWriteClientStub({
    createLease: async (...args: Parameters<BidviaClient['createLease']>) => {
      calls.push({ command: 'create-lease', args });
      return { ok: true, command: 'create-lease' };
    },
    createTaskDispatch: async (...args: Parameters<BidviaClient['createTaskDispatch']>) => {
      calls.push({ command: 'create-task-dispatch', args });
      return { ok: true, command: 'create-task-dispatch' };
    },
    assignTaskDispatch: async (...args: Parameters<BidviaClient['assignTaskDispatch']>) => {
      calls.push({ command: 'assign-task-dispatch', args });
      return { ok: true, command: 'assign-task-dispatch' };
    },
    suspendTaskDispatch: async (...args: Parameters<BidviaClient['suspendTaskDispatch']>) => {
      calls.push({ command: 'suspend-task-dispatch', args });
      return { ok: true, command: 'suspend-task-dispatch' };
    },
    resumeTaskDispatch: async (...args: Parameters<BidviaClient['resumeTaskDispatch']>) => {
      calls.push({ command: 'resume-task-dispatch', args });
      return { ok: true, command: 'resume-task-dispatch' };
    },
    completeTaskDispatch: async (...args: Parameters<BidviaClient['completeTaskDispatch']>) => {
      calls.push({ command: 'complete-task-dispatch', args });
      return { ok: true, command: 'complete-task-dispatch' };
    },
    failTaskDispatch: async (...args: Parameters<BidviaClient['failTaskDispatch']>) => {
      calls.push({ command: 'fail-task-dispatch', args });
      return { ok: true, command: 'fail-task-dispatch' };
    },
    createClaim: async (...args: Parameters<BidviaClient['createClaim']>) => {
      calls.push({ command: 'create-claim', args });
      return { ok: true, command: 'create-claim' };
    },
    acceptClaim: async (...args: Parameters<BidviaClient['acceptClaim']>) => {
      calls.push({ command: 'accept-claim', args });
      return { ok: true, command: 'accept-claim' };
    },
    rejectClaim: async (...args: Parameters<BidviaClient['rejectClaim']>) => {
      calls.push({ command: 'reject-claim', args });
      return { ok: true, command: 'reject-claim' };
    },
  });

  const sharedOverrides = {
    createClient,
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-a',
      BIDVIA_SESSION_ID: 'sess-1',
      BIDVIA_PRINCIPAL_ID: 'principal-a',
      BIDVIA_COMPANY_ID: 'company-a',
    }),
    readLocalOnboardingState: async () => null,
    printJson: (value: unknown) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('task-plane execution commands should not print help lines');
    },
  } satisfies Parameters<typeof runCli>[1];

  const exitCodes = [
    await runCli(['create-lease', '--agent-id', 'agent-1', '--input', '{"leaseScope":"dispatch-window","now":"2026-05-06T17:00:00Z","expiresAt":"2026-05-06T17:05:00Z"}'], sharedOverrides),
    await runCli(['create-task-dispatch', '--agent-id', 'agent-1', '--input', '{"taskKind":"notification-review","taskRef":"task://dispatch/1","now":"2026-05-06T17:01:00Z","reason":"new notification work"}'], sharedOverrides),
    await runCli(['assign-task-dispatch', '--agent-id', 'agent-1', '--task-dispatch-id', 'dispatch-1', '--input', '{"assignedToRegistrationId":"areg-2","now":"2026-05-06T17:02:00Z","reason":"handoff to active worker"}'], sharedOverrides),
    await runCli(['suspend-task-dispatch', '--agent-id', 'agent-1', '--task-dispatch-id', 'dispatch-1', '--input', '{"now":"2026-05-06T17:03:00Z","reason":"waiting for upstream dependency"}'], sharedOverrides),
    await runCli(['resume-task-dispatch', '--agent-id', 'agent-1', '--task-dispatch-id', 'dispatch-1', '--input', '{"now":"2026-05-06T17:04:00Z","reason":"dependency resolved"}'], sharedOverrides),
    await runCli(['complete-task-dispatch', '--agent-id', 'agent-1', '--task-dispatch-id', 'dispatch-1', '--input', '{"now":"2026-05-06T17:05:00Z","reason":"task finished","outcomeRef":"outcome://dispatch/1"}'], sharedOverrides),
    await runCli(['fail-task-dispatch', '--agent-id', 'agent-1', '--task-dispatch-id', 'dispatch-1', '--input', '{"now":"2026-05-06T17:06:00Z","reason":"task failed","outcomeRef":"outcome://dispatch/1/failure"}'], sharedOverrides),
    await runCli(['create-claim', '--agent-id', 'agent-1', '--input', '{"claimKind":"ownership","claimRef":"claim://1","taskDispatchId":"dispatch-1","now":"2026-05-06T17:07:00Z"}'], sharedOverrides),
    await runCli(['accept-claim', '--agent-id', 'agent-1', '--claim-id', 'claim-1', '--input', '{"taskDispatchId":"dispatch-1","now":"2026-05-06T17:08:00Z"}'], sharedOverrides),
    await runCli(['reject-claim', '--agent-id', 'agent-1', '--claim-id', 'claim-1', '--input', '{"taskDispatchId":"dispatch-1","reason":"claim conflicts with active lease","now":"2026-05-06T17:09:00Z"}'], sharedOverrides),
  ];

  assert.deepEqual(exitCodes, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(calls, [
    { command: 'create-lease', args: ['agent-1', { leaseScope: 'dispatch-window', now: '2026-05-06T17:00:00Z', expiresAt: '2026-05-06T17:05:00Z' }] },
    { command: 'create-task-dispatch', args: ['agent-1', { taskKind: 'notification-review', taskRef: 'task://dispatch/1', now: '2026-05-06T17:01:00Z', reason: 'new notification work' }] },
    { command: 'assign-task-dispatch', args: ['agent-1', 'dispatch-1', { assignedToRegistrationId: 'areg-2', now: '2026-05-06T17:02:00Z', reason: 'handoff to active worker' }] },
    { command: 'suspend-task-dispatch', args: ['agent-1', 'dispatch-1', { now: '2026-05-06T17:03:00Z', reason: 'waiting for upstream dependency' }] },
    { command: 'resume-task-dispatch', args: ['agent-1', 'dispatch-1', { now: '2026-05-06T17:04:00Z', reason: 'dependency resolved' }] },
    { command: 'complete-task-dispatch', args: ['agent-1', 'dispatch-1', { now: '2026-05-06T17:05:00Z', reason: 'task finished', outcomeRef: 'outcome://dispatch/1' }] },
    { command: 'fail-task-dispatch', args: ['agent-1', 'dispatch-1', { now: '2026-05-06T17:06:00Z', reason: 'task failed', outcomeRef: 'outcome://dispatch/1/failure' }] },
    { command: 'create-claim', args: ['agent-1', { claimKind: 'ownership', claimRef: 'claim://1', taskDispatchId: 'dispatch-1', now: '2026-05-06T17:07:00Z' }] },
    { command: 'accept-claim', args: ['agent-1', 'claim-1', { taskDispatchId: 'dispatch-1', now: '2026-05-06T17:08:00Z' }] },
    { command: 'reject-claim', args: ['agent-1', 'claim-1', { taskDispatchId: 'dispatch-1', reason: 'claim conflicts with active lease', now: '2026-05-06T17:09:00Z' }] },
  ]);
  assert.deepEqual(printed, [
    { ok: true, command: 'create-lease' },
    { ok: true, command: 'create-task-dispatch' },
    { ok: true, command: 'assign-task-dispatch' },
    { ok: true, command: 'suspend-task-dispatch' },
    { ok: true, command: 'resume-task-dispatch' },
    { ok: true, command: 'complete-task-dispatch' },
    { ok: true, command: 'fail-task-dispatch' },
    { ok: true, command: 'create-claim' },
    { ok: true, command: 'accept-claim' },
    { ok: true, command: 'reject-claim' },
  ]);
});

test('runCli task-plane write commands fail fast with stable missing-context output before remote execution', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['create-task-dispatch', '--agent-id', 'agent-1', '--input', '{"taskKind":"notification-review","taskRef":"task://dispatch/1","now":"2026-05-06T17:01:00Z","reason":"new notification work"}'], {
    createClient: () => {
      throw new Error('missing-context should fail before createClient');
    },
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-a',
    }),
    readLocalOnboardingState: async () => null,
    printJson: (value: unknown) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('create-task-dispatch should not print help lines');
    },
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(printed, [
    {
      error: {
        code: 'missing-context',
        command: 'create-task-dispatch',
        message: 'The create-task-dispatch command requires local execution context before it can run remotely. Missing: sessionId, principalId, companyId.',
      },
    },
  ]);
});

test('runCli task-plane write commands reject registrationId compatibility flags so account-plane writes stay canonical on agentId', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['create-task-dispatch', '--registration-id', 'areg-1', '--input', '{"taskKind":"notification-review","taskRef":"task://dispatch/1","now":"2026-05-06T17:01:00Z","reason":"new notification work"}'], {
    createClient: () => {
      throw new Error('registration-id compatibility should be rejected before createClient');
    },
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-a',
      BIDVIA_SESSION_ID: 'sess-1',
      BIDVIA_PRINCIPAL_ID: 'principal-a',
      BIDVIA_COMPANY_ID: 'company-a',
    }),
    readLocalOnboardingState: async () => null,
    printJson: (value: unknown) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('create-task-dispatch should not print help lines');
    },
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(printed, [
    {
      error: {
        code: 'invalid-input',
        command: 'create-task-dispatch',
        message: 'Unknown option(s): --registration-id. Run --help to review supported commands and flags.',
        details: ['--registration-id'],
      },
    },
  ]);
});
