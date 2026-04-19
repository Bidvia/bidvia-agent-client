import test from 'node:test';
import assert from 'node:assert/strict';

import { BidviaClient } from '../src/client.ts';
import type { BidviaClientContext, BidviaMcpToolCallResponse } from '../src/contracts.ts';
import { runCli } from '../src/cli.ts';
import { dispatchMcpToolCall } from '../src/mcp.ts';
import {
  buildExecutionGuidanceEntries,
  buildMcpMissingContextMessage,
} from '../src/operator-ergonomics.ts';

const dispatchMcpToolCallWithExecution = dispatchMcpToolCall as unknown as (
  request: {
    toolName: string;
    arguments: unknown;
  },
  dependencies?: {
    createExecutionClient?: () => unknown;
  },
) => Promise<BidviaMcpToolCallResponse>;

type ExecutionPreflight = {
  target: string;
  surface: 'cli' | 'mcp';
  scope: 'local-only';
  routePathTemplate: string;
  httpMethod: string;
  accessContextFamily: string;
  localCapabilityTier: string;
  localCapabilityRiskTier: string;
  requiredContext: string[];
  missingContext: string[];
  runnable: boolean;
  blockedBy: string | null;
  hints: string[];
};

function createExecutionContext(overrides: Partial<BidviaClientContext> = {}): BidviaClientContext {
  return {
    tenantId: 'tenant-a',
    ...overrides,
  };
}

test('runCli heartbeat dry-run emits structured preflight context and risk hints', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['heartbeat', '--dry-run'], {
    now: () => '2026-03-30T10:00:00Z',
    printJson: (value: unknown) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('help output should not be used for heartbeat dry-run');
    },
    createClient: () => {
      throw new Error('dry-run should not create a client');
    },
    resolveExecutionContext: () => createExecutionContext(),
  } as never);

  assert.equal(exitCode, 0);
  assert.deepEqual(printed, [{
    command: 'heartbeat',
    mode: 'dry-run',
    scope: 'local-only',
    preflight: {
      target: 'heartbeat',
      surface: 'cli',
      scope: 'local-only',
      routePathTemplate: '/runtime/agents/:registrationId/heartbeat',
      httpMethod: 'POST',
      accessContextFamily: 'registration',
      localCapabilityTier: 'L2-registration-runtime',
      localCapabilityRiskTier: 'runtime-execution',
      requiredContext: ['tenantId', 'registrationId', 'principalId'],
      missingContext: ['registrationId', 'principalId'],
      runnable: true,
      blockedBy: null,
      hints: [
        'Dry-run stays local and does not execute the remote registration-bound route.',
        'Set BIDVIA_REGISTRATION_ID and BIDVIA_PRINCIPAL_ID before running the real execution command.',
        'Risk tier runtime-execution means the non-dry-run command writes to the remote runtime route.',
      ],
    },
    input: {
      now: '2026-03-30T10:00:00Z',
      expiresAt: '2026-03-30T10:05:00.000Z',
    },
  }]);
});

test('runCli heartbeat fails fast with structured missing-context guidance before real execution', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['heartbeat'], {
    now: () => '2026-03-30T10:00:00Z',
    printJson: (value: unknown) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('help output should not be used for heartbeat execution');
    },
    createClient: () => new BidviaClient({
      baseUrl: 'http://127.0.0.1:8787',
      context: createExecutionContext(),
    }),
    resolveExecutionContext: () => createExecutionContext(),
  } as never);

  assert.equal(exitCode, 1);
  assert.deepEqual(printed, [{
    error: {
      code: 'missing-context',
      command: 'heartbeat',
      message: 'The heartbeat command requires local execution context before it can run remotely. Missing: registrationId, principalId.',
      details: ['registrationId', 'principalId'],
      preflight: {
        target: 'heartbeat',
        surface: 'cli',
        scope: 'local-only',
        routePathTemplate: '/runtime/agents/:registrationId/heartbeat',
        httpMethod: 'POST',
        accessContextFamily: 'registration',
        localCapabilityTier: 'L2-registration-runtime',
        localCapabilityRiskTier: 'runtime-execution',
        requiredContext: ['tenantId', 'registrationId', 'principalId'],
        missingContext: ['registrationId', 'principalId'],
        runnable: true,
        blockedBy: null,
        hints: [
          'Set BIDVIA_REGISTRATION_ID and BIDVIA_PRINCIPAL_ID before running the real execution command.',
          'Use --dry-run to inspect the local-only payload preview without remote execution.',
          'Risk tier runtime-execution means the non-dry-run command writes to the remote runtime route.',
        ],
      },
    },
  }]);
});

test('dispatchMcpToolCall adds execution preflight metadata and rejects missing local context clearly', async () => {
  const response = await dispatchMcpToolCallWithExecution(
    {
      toolName: 'heartbeat-execution',
      arguments: {
        now: '2026-03-30T10:00:00Z',
        expiresAt: '2026-03-30T10:05:00Z',
      },
    },
    {
      createExecutionClient: () => ({
        async postHeartbeat(input: { expiresAt: string }) {
          return {
            ok: true,
            route: 'heartbeat',
            expiresAt: input.expiresAt,
          };
        },
      }),
    },
  ) as BidviaMcpToolCallResponse & { preflight: ExecutionPreflight };

  assert.deepEqual(response.preflight, {
    target: 'heartbeat-execution',
    surface: 'mcp',
    scope: 'local-only',
    routePathTemplate: '/runtime/agents/:registrationId/heartbeat',
    httpMethod: 'POST',
    accessContextFamily: 'registration',
    localCapabilityTier: 'L2-registration-runtime',
    localCapabilityRiskTier: 'runtime-execution',
    requiredContext: ['tenantId', 'registrationId', 'principalId'],
    missingContext: [],
    runnable: true,
    blockedBy: null,
    hints: [
      'This MCP execution tool uses the existing local execution client seam.',
      'Risk tier runtime-execution means the tool writes to the remote runtime route when context is present.',
    ],
  });

  await assert.rejects(
    () => dispatchMcpToolCallWithExecution(
      {
        toolName: 'heartbeat-execution',
        arguments: {
          now: '2026-03-30T10:00:00Z',
          expiresAt: '2026-03-30T10:05:00Z',
        },
      },
      {
        createExecutionClient: () => new BidviaClient({
          baseUrl: 'http://127.0.0.1:8787',
          context: createExecutionContext(),
        }),
      },
    ),
    /MCP tool heartbeat-execution is missing required local execution context: registrationId, principalId\./,
  );
});

test('buildMcpMissingContextMessage gives OpenClaw agents the next local remediation step', () => {
  assert.equal(
    buildMcpMissingContextMessage('create-commercial-action-execution', ['companyId', 'principalId']),
    'MCP tool create-commercial-action-execution is missing required local execution context: companyId, principalId. Use bidvia route-context-matrix to confirm the next Bidvia context family, then set BIDVIA_COMPANY_ID and BIDVIA_PRINCIPAL_ID before retrying this local stdio MCP tool.',
  );
});

test('buildExecutionGuidanceEntries surfaces task-write-ready and proof-lane next-step guidance without faking Core truth', () => {
  assert.deepEqual(buildExecutionGuidanceEntries(), [
    {
      guidanceKey: 'task-write-ready',
      lane: 'default-local-docker',
      appliesWhen: 'route-exists-but-subject-not-runnable',
      signal: 'authority_class_not_dispatchable',
      nextStepOwner: 'operator-or-admin',
      nextStepAction: 'Follow the surfaced task-write-ready progression and keep unresolved Core-owned progression visible instead of assuming claim is sufficient.',
    },
    {
      guidanceKey: 'proof-lane',
      lane: 'proof-lane-admin-session',
      appliesWhen: 'deterministic-proof-validation',
      signal: 'admin-session-required',
      nextStepOwner: 'admin',
      nextStepAction: 'Use a real admin session for proof-lane walkthroughs rather than assuming fixed proof ids are runnable on default local docker.',
    },
    {
      guidanceKey: 'runtime-generated-closure',
      lane: 'runtime-generated',
      appliesWhen: 'business-universe-closure',
      signal: 'fixed-fixture-not-required',
      nextStepOwner: 'agent',
      nextStepAction: 'Create the required runtime objects yourself and continue with the returned ids instead of depending on fixed fixture identifiers.',
    },
  ]);
});
