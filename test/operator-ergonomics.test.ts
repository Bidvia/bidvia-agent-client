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

function withRuntimeResultCommit<T>(client: T): T & {
  commitRuntimeResult: () => Promise<{ outcomeRef: string }>;
} {
  return {
    ...(client as object),
    async commitRuntimeResult() {
      return {
        outcomeRef: 'outcome://test/runtime-commit',
      };
    },
  } as T & {
    commitRuntimeResult: () => Promise<{ outcomeRef: string }>;
  };
}

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
        createExecutionClient: () => withRuntimeResultCommit({
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
      checkpoints: [
        {
          stepKey: 'self-service-patch',
          actor: 'external-claimed-agent',
          lane: 'default-local-docker',
          surfacedAction: 'Patch claimed-agent self-service state first so task-dispatch acceptance and related readiness inputs are explicit before requesting operator intervention.',
          verificationCheckpoint: {
            helperKeys: ['getAgentReadiness'],
            truthFields: ['taskWriteReady', 'dispatchEligibility'],
            guidance: 'Re-read readiness after the self-service patch and stay blocked if Core truth still does not show task-write-ready or dispatch-eligible state.',
          },
          failClosedState: 'A successful self-service patch does not itself make the claimed agent task-write-ready or dispatch-eligible.',
        },
        {
          stepKey: 'dispatch-authority-request',
          actor: 'external-claimed-agent',
          lane: 'default-local-docker',
          surfacedAction: 'If readiness is still blocked, submit the bounded dispatch-authority request rather than assuming claim already granted runnable authority.',
          verificationCheckpoint: {
            helperKeys: ['getAccountAgentDispatchAuthority', 'getAgentReadiness'],
            truthFields: ['taskWriteReady', 'dispatchEligibility'],
            guidance: 'Re-read dispatch-authority and readiness after the request; treat the request as pending until Core-owned truth changes.',
          },
          failClosedState: 'Submitting the request alone does not make the subject dispatchable and does not close operator/admin review.',
        },
        {
          stepKey: 'operator-review-closure',
          actor: 'operator-or-admin',
          lane: 'default-local-docker',
          surfacedAction: 'Wait for the real operator/admin review closure on the requested authority path instead of inventing a client-side approval outcome.',
          verificationCheckpoint: {
            helperKeys: ['getAccountAgentDispatchAuthority', 'getAgentReadiness'],
            truthFields: ['taskWriteReady', 'dispatchEligibility'],
            guidance: 'After review closes, re-read the surfaced truth helpers to confirm whether Core now reports runnable authority.',
          },
          failClosedState: 'If operator/admin closure is absent or unresolved, keep the subject non-dispatchable.',
        },
        {
          stepKey: 'external-binding-completion-unresolved',
          actor: 'operator-or-admin',
          lane: 'default-local-docker',
          surfacedAction: 'Inspect the shipped account-agent binding read surface to see whether an external binding already exists. Current repo truth does not prove a binding-completion write or closure helper, so keep this step unresolved and fail-closed instead of inventing completion.',
          verificationCheckpoint: {
            helperKeys: ['listAccountAgentBindings'],
            truthFields: [],
            guidance: 'Use the account-agent binding read surface only for visibility. Current repo truth does not expose a packet-grounded completion helper or completion truth field for external binding closure.',
          },
          failClosedState: 'Until Core exposes a concrete binding-completion path and the returned reads confirm runnable truth, keep the subject non-dispatchable.',
        },
        {
          stepKey: 'post-step-truth-check',
          actor: 'external-claimed-agent',
          lane: 'default-local-docker',
          surfacedAction: 'Use the shipped read helpers to verify the final task-write-ready and dispatch-eligibility truth before attempting task execution.',
          verificationCheckpoint: {
            helperKeys: ['getAgentReadiness', 'getAccountAgentDispatchAuthority'],
            truthFields: ['taskWriteReady', 'dispatchEligibility'],
            guidance: 'Only treat the progression as complete when the returned truth confirms task-write-ready and dispatch-eligibility state.',
          },
          failClosedState: 'If the post-step reads do not confirm both truth fields, remain fail-closed and do not treat the subject as runnable.',
        },
      ],
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
