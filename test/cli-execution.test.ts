import test from 'node:test';
import assert from 'node:assert/strict';

import type { BidviaHeartbeatInput } from '../src/contracts.ts';
import { runCli } from '../src/cli.ts';

test('runCli routes heartbeat through the explicit execution adapter and creates a client for that invocation', async () => {
  const printed: unknown[] = [];
  let clientCreateCount = 0;
  const client = {
    marker: 'runtime-client',
  };

  const exitCode = await runCli(['heartbeat'], {
    createClient: () => {
      clientCreateCount += 1;
      return client as never;
    },
    resolveExecutionContext: () => ({
      tenantId: 'tenant-a',
      registrationId: 'areg-1',
      principalId: 'agent-1',
    }),
    now: () => '2026-03-29T10:00:00Z',
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('help output should not be used for heartbeat');
    },
    executionCommands: {
      heartbeat: {
        buildInput: () => ({
          now: '2026-03-29T10:00:00Z',
          expiresAt: '2026-03-29T10:05:00.000Z',
        }),
        run: async (receivedClient, now) => {
          const input: BidviaHeartbeatInput = {
            now,
            expiresAt: '2026-03-29T10:05:00.000Z',
          };

          assert.equal(receivedClient, client);
          assert.equal(input.expiresAt, '2026-03-29T10:05:00.000Z');
          return { ok: true, via: 'adapter' };
        },
      },
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(clientCreateCount, 1);
  assert.deepEqual(printed, [{ ok: true, via: 'adapter' }]);
});

test('runCli does not create a client for read-only commands', async () => {
  const printed: unknown[] = [];
  let clientCreateCount = 0;

  const exitCode = await runCli(['environment-mode'], {
    createClient: () => {
      clientCreateCount += 1;
      throw new Error('read-only command should not create a client');
    },
    resolveBaseUrl: () => 'http://127.0.0.1:8787',
    resolveEnvironmentMode: () => 'local',
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('help output should not be used for environment-mode');
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(clientCreateCount, 0);
  assert.deepEqual(printed, [{
    baseUrl: 'http://127.0.0.1:8787',
    environmentMode: 'local',
  }]);
});
