import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

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

test('runCli requires an explicit output path before writing the companion bundle to disk', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['openclaw-bundle-export'], {
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('help output should not be used for openclaw-bundle-export');
    },
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(printed, [{
    error: {
      code: 'invalid-input',
      command: 'openclaw-bundle-export',
      message: 'Missing required --output for openclaw-bundle-export.',
      details: ['--output'],
    },
  }]);
});

test('runCli describes the companion bundle as additive packaging around the stdio MCP path after writing to disk', async () => {
  const printed: unknown[] = [];
  const outputDirectory = path.join(mkdtempSync(path.join(tmpdir(), 'bidvia-openclaw-cli-exec-')), 'bundle');

  const exitCode = await runCli(['openclaw-bundle-export', '--output', outputDirectory], {
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('help output should not be used for openclaw-bundle-export');
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(printed.length, 1);

  const output = printed[0] as {
    command: string;
    scope: string;
    outputPath: string;
    writtenFiles: string[];
    operatorNotes: {
      executionBoundary: string;
      developmentNote: string;
      primaryPath?: string;
      deferredNativePlugin?: string;
    };
  };

  assert.equal(output.command, 'openclaw-bundle-export');
  assert.equal(output.scope, 'local-only');
  assert.equal(output.outputPath, outputDirectory);
  assert.deepEqual(output.writtenFiles, [
    '.codex-plugin/plugin.json',
    '.mcp.json',
    'docs/bidvia-openclaw-local-operator.md',
  ]);
  assert.match(output.operatorNotes.executionBoundary, /local stdio MCP server/i);
  assert.match(output.operatorNotes.developmentNote, /development-only/i);
  assert.equal(
    output.operatorNotes.primaryPath,
    'Primary OpenClaw path: export stdio MCP config first, then add the companion bundle when you want bundle/bootstrap packaging around the same local server.',
  );
  assert.equal(
    output.operatorNotes.deferredNativePlugin,
    'Native-plugin-first and HTTP MCP paths stay out of scope for this version.',
  );
});
