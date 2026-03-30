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
  assert(lines.includes('  agent-authority-profile --registration-id ...'));
  assert(lines.includes('  agent-authority-ladder --registration-id ...'));
  assert(lines.includes('  agent-capability-profiles --registration-id ...'));
  assert(lines.includes('  agent-capability-profile --registration-id ... --capability-profile-id ...'));
});

test('runCli returns structured missing required-id failures for governance deep-read detail commands', async () => {
  const cases = [
    ['agent-readiness', ['--registration-id']],
    ['agent-summary', ['--registration-id']],
    ['agent-authority-profile', ['--registration-id']],
    ['agent-authority-ladder', ['--registration-id']],
    ['agent-capability-profiles', ['--registration-id']],
    ['agent-capability-profile', ['--registration-id']],
    ['agent-capability-profile', ['--capability-profile-id']],
  ] as const;

  for (const [command, details] of cases) {
    const printed: unknown[] = [];
    const argv = command === 'agent-capability-profile' && details[0] === '--capability-profile-id'
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

  const exitCode = await runCli(['agent-capability-profile', '--registration-id', 'areg-1', '--capability-profile-id'], {
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
      command: 'agent-capability-profile',
      message: 'Missing value for --capability-profile-id on agent-capability-profile.',
      details: ['--capability-profile-id'],
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
    async getAgentAuthorityProfile(registrationId: string) {
      return { method: 'getAgentAuthorityProfile', registrationId };
    },
    async getAgentAuthorityLadder(registrationId: string) {
      return { method: 'getAgentAuthorityLadder', registrationId };
    },
    async listAgentCapabilityProfiles(registrationId: string) {
      return { method: 'listAgentCapabilityProfiles', registrationId };
    },
    async getAgentCapabilityProfile(registrationId: string, capabilityProfileId: string) {
      return { method: 'getAgentCapabilityProfile', registrationId, capabilityProfileId };
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
      argv: ['agent-authority-profile', '--registration-id', 'areg-3'],
      expected: { method: 'getAgentAuthorityProfile', registrationId: 'areg-3' },
    },
    {
      argv: ['agent-authority-ladder', '--registration-id', 'areg-4'],
      expected: { method: 'getAgentAuthorityLadder', registrationId: 'areg-4' },
    },
    {
      argv: ['agent-capability-profiles', '--registration-id', 'areg-5'],
      expected: { method: 'listAgentCapabilityProfiles', registrationId: 'areg-5' },
    },
    {
      argv: ['agent-capability-profile', '--registration-id', 'areg-6', '--capability-profile-id', 'cap-prof-1'],
      expected: {
        method: 'getAgentCapabilityProfile',
        registrationId: 'areg-6',
        capabilityProfileId: 'cap-prof-1',
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

test('runCli default client uses admin-session env context for governance deep reads', async () => {
  const printed: unknown[] = [];
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const restoreEnv = [
    setEnvVar('BIDVIA_BASE_URL', 'http://127.0.0.1:8787'),
    setEnvVar('BIDVIA_TENANT_ID', 'tenant-a'),
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

    const capabilityProfilesExitCode = await runCli(['agent-capability-profiles', '--registration-id', 'areg-1'], {
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('governance deep reads should not print help');
      },
    });

    assert.equal(readinessExitCode, 0);
    assert.equal(capabilityProfilesExitCode, 0);
  } finally {
    globalThis.fetch = previousFetch;
    for (const restore of restoreEnv.reverse()) {
      restore();
    }
  }

  assert.equal(calls.length, 2);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/readiness?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/capability-profiles?tenant_id=tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], 'admin-sess-1');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], 'admin-sess-1');
  assert.deepEqual(printed, [
    { ok: true, path: 'http://127.0.0.1:8787/runtime/agents/areg-1/readiness?tenant_id=tenant-a' },
    { ok: true, path: 'http://127.0.0.1:8787/runtime/agents/areg-1/capability-profiles?tenant_id=tenant-a' },
  ]);
});
