import test from 'node:test';
import assert from 'node:assert/strict';

import { runCli } from '../src/cli.ts';

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

test('runCli help lists governance deep-read commands under the visibility group', async () => {
  const lines: string[] = [];

  const exitCode = await runCli(['--help'], {
    printLine: (value) => {
      lines.push(value);
    },
    printJson: () => {
      throw new Error('help should not print json');
    },
  });

  assert.equal(exitCode, 0);
  assert(lines.includes('  agent-readiness --registration-id ...'));
  assert(lines.includes('  agent-summary --registration-id ...'));
  assert(lines.includes('  agent-registrations'));
  assert(lines.includes('  agent-registration --registration-id ...'));
  assert(lines.includes('  authority-profiles'));
  assert(lines.includes('  agent-authority-profile --registration-id ...'));
  assert(lines.includes('  agent-authority-ladder --registration-id ...'));
  assert(lines.includes('  capability-profiles'));
  assert(lines.includes('  agent-capability-profile --registration-id ...'));
  assert(lines.includes('  participation-states --registration-id ...'));
  assert(lines.includes('  participation-state --registration-id ... --participation-state-id ...'));
  assert(lines.includes('  task-dispatches --registration-id ...'));
  assert(lines.includes('  task-dispatch --registration-id ... --task-dispatch-id ...'));
  assert(!lines.includes('  agent-capability-profiles --registration-id ...'));
});

test('runCli returns structured missing required-id failures for governance deep-read detail commands', async () => {
  const cases = [
    ['agent-readiness', ['--registration-id']],
    ['agent-summary', ['--registration-id']],
    ['agent-registration', ['--registration-id']],
    ['authority-profiles', []],
    ['agent-authority-profile', ['--registration-id']],
    ['agent-authority-ladder', ['--registration-id']],
    ['capability-profiles', []],
    ['agent-capability-profile', ['--registration-id']],
    ['participation-states', ['--registration-id']],
    ['participation-state', ['--registration-id']],
    ['participation-state', ['--participation-state-id']],
    ['task-dispatches', ['--registration-id']],
    ['task-dispatch', ['--registration-id']],
    ['task-dispatch', ['--task-dispatch-id']],
  ] as const;

  for (const [command, details] of cases) {
    if (details.length === 0) {
      continue;
    }

    const printed: unknown[] = [];
    const argv =
      command === 'participation-state' && details[0] === '--participation-state-id'
        ? [command, '--registration-id', 'areg-1']
        : command === 'task-dispatch' && details[0] === '--task-dispatch-id'
          ? [command, '--registration-id', 'areg-1']
          : [command];

    const exitCode = await runCli(argv, {
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('missing required-id failures should not print help');
      },
    });

    assert.equal(exitCode, 1);
    assert.deepEqual(printed, [{
      error: {
        code: 'invalid-input',
        command,
        message: `Missing required ${details[0]} for ${command}.`,
        details,
      },
    }]);
  }
});

test('runCli returns a structured missing value failure when a governance deep-read id flag has no value', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['participation-state', '--registration-id', 'areg-1', '--participation-state-id'], {
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('missing value failures should not print help');
    },
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(printed, [{
    error: {
      code: 'invalid-input',
      command: 'participation-state',
      message: 'Missing value for --participation-state-id on participation-state.',
      details: ['--participation-state-id'],
    },
  }]);
});

test('runCli rejects the stale plural capability-profile alias as an unknown command', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['agent-capability-profiles'], {
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('unknown command failures should not print help');
    },
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(printed, [{
    error: {
      code: 'unknown-command',
      command: 'agent-capability-profiles',
      message: 'Unknown command "agent-capability-profiles". Run --help to review the grouped local-only command surface.',
    },
  }]);
});

test('runCli routes governance deep-read commands through the matching SDK method and prints JSON results', async () => {
  const clientCreateCalls: unknown[] = [];
  const governanceClient = {
    async getAgentReadiness(registrationId: string) {
      return { method: 'getAgentReadiness', registrationId };
    },
    async getAgentSummary(registrationId: string) {
      return { method: 'getAgentSummary', registrationId };
    },
    async listAgentRegistrations() {
      return { method: 'listAgentRegistrations' };
    },
    async getAgentRegistration(registrationId: string) {
      return { method: 'getAgentRegistration', registrationId };
    },
    async listAuthorityProfiles() {
      return { method: 'listAuthorityProfiles' };
    },
    async getAgentAuthorityProfile(registrationId: string) {
      return { method: 'getAgentAuthorityProfile', registrationId };
    },
    async getAgentAuthorityLadder(registrationId: string) {
      return { method: 'getAgentAuthorityLadder', registrationId };
    },
    async listCapabilityProfiles() {
      return { method: 'listCapabilityProfiles' };
    },
    async getAgentCapabilityProfile(registrationId: string) {
      return { method: 'getAgentCapabilityProfile', registrationId };
    },
    async listParticipationStates(registrationId: string) {
      return { method: 'listParticipationStates', registrationId };
    },
    async getParticipationState(registrationId: string, participationStateId: string) {
      return { method: 'getParticipationState', registrationId, participationStateId };
    },
    async listTaskDispatches(registrationId: string) {
      return { method: 'listTaskDispatches', registrationId };
    },
    async getTaskDispatch(registrationId: string, taskDispatchId: string) {
      return { method: 'getTaskDispatch', registrationId, taskDispatchId };
    },
  };

  const cases = [
    {
      argv: ['agent-readiness', '--registration-id', 'areg-1'],
      expected: { method: 'getAgentReadiness', registrationId: 'areg-1' },
    },
    {
      argv: ['agent-summary', '--registration-id', 'areg-2'],
      expected: { method: 'getAgentSummary', registrationId: 'areg-2' },
    },
    {
      argv: ['agent-registrations'],
      expected: { method: 'listAgentRegistrations' },
    },
    {
      argv: ['agent-registration', '--registration-id', 'areg-2b'],
      expected: { method: 'getAgentRegistration', registrationId: 'areg-2b' },
    },
    {
      argv: ['authority-profiles'],
      expected: { method: 'listAuthorityProfiles' },
    },
    {
      argv: ['agent-authority-profile', '--registration-id', 'areg-3'],
      expected: { method: 'getAgentAuthorityProfile', registrationId: 'areg-3' },
    },
    {
      argv: ['agent-authority-ladder', '--registration-id', 'areg-4'],
      expected: { method: 'getAgentAuthorityLadder', registrationId: 'areg-4' },
    },
    {
      argv: ['capability-profiles'],
      expected: { method: 'listCapabilityProfiles' },
    },
    {
      argv: ['agent-capability-profile', '--registration-id', 'areg-6'],
      expected: {
        method: 'getAgentCapabilityProfile',
        registrationId: 'areg-6',
      },
    },
    {
      argv: ['participation-states', '--registration-id', 'areg-7'],
      expected: { method: 'listParticipationStates', registrationId: 'areg-7' },
    },
    {
      argv: ['participation-state', '--registration-id', 'areg-8', '--participation-state-id', 'pst-1'],
      expected: {
        method: 'getParticipationState',
        registrationId: 'areg-8',
        participationStateId: 'pst-1',
      },
    },
    {
      argv: ['task-dispatches', '--registration-id', 'areg-9'],
      expected: { method: 'listTaskDispatches', registrationId: 'areg-9' },
    },
    {
      argv: ['task-dispatch', '--registration-id', 'areg-10', '--task-dispatch-id', 'td-1'],
      expected: {
        method: 'getTaskDispatch',
        registrationId: 'areg-10',
        taskDispatchId: 'td-1',
      },
    },
  ] as const;

  for (const { argv, expected } of cases) {
    const printed: unknown[] = [];

    const exitCode = await runCli([...argv], {
      createClient: () => {
        clientCreateCalls.push(argv);
        return governanceClient as never;
      },
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('governance deep-read dispatch should not print help');
      },
    });

    assert.equal(exitCode, 0);
    assert.deepEqual(printed, [expected]);
  }

  assert.equal(clientCreateCalls.length, cases.length);
});

test('runCli default client uses principal-governed env context for governance deep reads', async () => {
  const printed: unknown[] = [];
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const restoreEnv = [
    setEnvVar('BIDVIA_BASE_URL', 'http://127.0.0.1:8787'),
    setEnvVar('BIDVIA_TENANT_ID', 'tenant-a'),
    setEnvVar('BIDVIA_PRINCIPAL_ID', 'principal-1'),
    setEnvVar('BIDVIA_ADMIN_SESSION_ID', 'admin-sess-1'),
  ];
  const previousFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });

    return new Response(JSON.stringify({ ok: true, path: String(input) }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const readinessExitCode = await runCli(['agent-readiness', '--registration-id', 'areg-1'], {
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('governance deep reads should not print help');
      },
    });

    const registrationsExitCode = await runCli(['agent-registrations'], {
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('governance deep reads should not print help');
      },
    });

    const capabilityProfilesExitCode = await runCli(['capability-profiles'], {
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('governance deep reads should not print help');
      },
    });

    assert.equal(readinessExitCode, 0);
    assert.equal(registrationsExitCode, 0);
    assert.equal(capabilityProfilesExitCode, 0);
  } finally {
    globalThis.fetch = previousFetch;
    for (const restore of restoreEnv.reverse()) {
      restore();
    }
  }

  assert.equal(calls.length, 3);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/readiness?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/agents/registrations?tenant_id=tenant-a');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/capability-profiles?tenant_id=tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-tenant-id'], 'tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-principal-id'], 'principal-1');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-principal-id'], 'principal-1');
  assert.equal((calls[2]?.init?.headers as Record<string, string>)['x-bidvia-principal-id'], 'principal-1');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], 'admin-sess-1');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], 'admin-sess-1');
  assert.equal((calls[2]?.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], 'admin-sess-1');
  assert.deepEqual(printed, [
    { ok: true, path: 'http://127.0.0.1:8787/runtime/agents/areg-1/readiness?tenant_id=tenant-a' },
    { ok: true, path: 'http://127.0.0.1:8787/runtime/agents/registrations?tenant_id=tenant-a' },
    { ok: true, path: 'http://127.0.0.1:8787/runtime/capability-profiles?tenant_id=tenant-a' },
  ]);
});

test('runCli governance deep reads fall back to local onboarding state for effective tenant and principal context', async () => {
  const printed: unknown[] = [];
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const restoreEnv = [
    setEnvVar('BIDVIA_BASE_URL', 'http://127.0.0.1:8787'),
    setEnvVar('BIDVIA_TENANT_ID', undefined),
    setEnvVar('BIDVIA_PRINCIPAL_ID', undefined),
    setEnvVar('BIDVIA_REGISTRATION_ID', undefined),
  ];
  const previousFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });

    return new Response(JSON.stringify({ ok: true, path: String(input) }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const exitCode = await runCli(['agent-readiness', '--registration-id', 'areg-1'], {
      readLocalOnboardingState: async () => ({
        tenantId: 'tenant-local',
        principalId: 'principal-local',
        registrationId: 'areg-local',
        createdAt: '2026-04-01T12:00:00.000Z',
        updatedAt: '2026-04-01T12:00:00.000Z',
      }),
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('governance deep reads should not print help');
      },
    });

    assert.equal(exitCode, 0);
  } finally {
    globalThis.fetch = previousFetch;
    for (const restore of restoreEnv.reverse()) {
      restore();
    }
  }

  assert.equal(calls.length, 1);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/readiness?tenant_id=tenant-local');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-tenant-id'], 'tenant-local');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-principal-id'], 'principal-local');
  assert.deepEqual(printed, [
    { ok: true, path: 'http://127.0.0.1:8787/runtime/agents/areg-1/readiness?tenant_id=tenant-local' },
  ]);
});
