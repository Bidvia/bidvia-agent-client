import test from 'node:test';
import assert from 'node:assert/strict';

import { runCli } from '../src/cli.ts';

test('runCli routes first-class account-plane continuation commands through the matching client helpers', async () => {
  const printed: unknown[] = [];
  const calls: Array<{ command: string; args: unknown[] }> = [];

  const exitCodes = [
    await runCli(['account-agent-closure-status', '--agent-id', 'agent-1'], {
      createClient: () => ({
        getAccountAgentClosureStatus: async (...args: unknown[]) => {
          calls.push({ command: 'account-agent-closure-status', args });
          return { ok: true, command: 'account-agent-closure-status' };
        },
      }) as never,
      resolveProcessEnv: () => ({
        BIDVIA_TENANT_ID: 'tenant-a',
        BIDVIA_SESSION_ID: 'sess-1',
      }),
      readLocalOnboardingState: async () => null,
      printJson: (value) => {
        printed.push(value);
      },
        printLine: () => {
          throw new Error('account-agent-closure-status should not print help lines');
        },
    }),
    await runCli(['account-agent-authorization-refresh', '--agent-id', 'agent-1', '--input', '{"now":"2026-05-01T12:00:00Z"}'], {
      createClient: () => ({
        refreshAccountAgentAuthorization: async (...args: unknown[]) => {
          calls.push({ command: 'account-agent-authorization-refresh', args });
          return { ok: true, command: 'account-agent-authorization-refresh' };
        },
      }) as never,
      resolveProcessEnv: () => ({
        BIDVIA_TENANT_ID: 'tenant-a',
        BIDVIA_SESSION_ID: 'sess-1',
      }),
      readLocalOnboardingState: async () => null,
      printJson: (value) => {
        printed.push(value);
      },
        printLine: () => {
          throw new Error('account-agent-authorization-refresh should not print help lines');
        },
    }),
    await runCli(['account-agent-external-binding', '--agent-id', 'agent-1', '--input', '{"systemType":"wms","systemName":"integration-smoke","externalAccountRef":"wms-agent-1","now":"2026-05-01T12:01:00Z"}'], {
      createClient: () => ({
        createAccountAgentExternalBinding: async (...args: unknown[]) => {
          calls.push({ command: 'account-agent-external-binding', args });
          return { ok: true, command: 'account-agent-external-binding' };
        },
      }) as never,
      resolveProcessEnv: () => ({
        BIDVIA_TENANT_ID: 'tenant-a',
        BIDVIA_SESSION_ID: 'sess-1',
      }),
      readLocalOnboardingState: async () => null,
      printJson: (value) => {
        printed.push(value);
      },
        printLine: () => {
          throw new Error('account-agent-external-binding should not print help lines');
        },
    }),
    await runCli(['operator-dispatch-authority-decision', '--request-id', 'daar-1', '--input', '{"decision":"APPROVE","resolutionReason":"approve-for-live-run","now":"2026-05-01T12:02:00Z"}'], {
      createClient: () => ({
        decideDispatchAuthorityRequest: async (...args: unknown[]) => {
          calls.push({ command: 'operator-dispatch-authority-decision', args });
          return { ok: true, command: 'operator-dispatch-authority-decision' };
        },
      }) as never,
      resolveProcessEnv: () => ({
        BIDVIA_TENANT_ID: 'tenant-a',
        BIDVIA_ADMIN_SESSION_ID: 'admin-sess-1',
      }),
      readLocalOnboardingState: async () => null,
      printJson: (value) => {
        printed.push(value);
      },
        printLine: () => {
          throw new Error('operator-dispatch-authority-decision should not print help lines');
        },
    }),
    await runCli(['governed-work-closure', '--agent-id', 'agent-1', '--task-dispatch-id', 'dispatch-1'], {
      createClient: () => ({
        getAccountAgentGovernedWorkClosure: async (...args: unknown[]) => {
          calls.push({ command: 'governed-work-closure', args });
          return { ok: true, command: 'governed-work-closure' };
        },
      }) as never,
      resolveProcessEnv: () => ({
        BIDVIA_TENANT_ID: 'tenant-a',
        BIDVIA_SESSION_ID: 'sess-1',
      }),
      readLocalOnboardingState: async () => null,
      printJson: (value) => {
        printed.push(value);
      },
        printLine: () => {
          throw new Error('governed-work-closure should not print help lines');
        },
    }),
  ];

  assert.deepEqual(exitCodes, [0, 0, 0, 0, 0]);
  assert.deepEqual(calls, [
    { command: 'account-agent-closure-status', args: ['agent-1'] },
    { command: 'account-agent-authorization-refresh', args: ['agent-1', { now: '2026-05-01T12:00:00Z' }] },
    {
      command: 'account-agent-external-binding',
      args: ['agent-1', {
        systemType: 'wms',
        systemName: 'integration-smoke',
        externalAccountRef: 'wms-agent-1',
        now: '2026-05-01T12:01:00Z',
      }],
    },
    {
      command: 'operator-dispatch-authority-decision',
      args: ['daar-1', {
        decision: 'APPROVE',
        resolutionReason: 'approve-for-live-run',
        now: '2026-05-01T12:02:00Z',
      }],
    },
    { command: 'governed-work-closure', args: ['agent-1', 'dispatch-1'] },
  ]);
  assert.deepEqual(printed, [
    { ok: true, command: 'account-agent-closure-status' },
    { ok: true, command: 'account-agent-authorization-refresh' },
    { ok: true, command: 'account-agent-external-binding' },
    { ok: true, command: 'operator-dispatch-authority-decision' },
    { ok: true, command: 'governed-work-closure' },
  ]);
});
