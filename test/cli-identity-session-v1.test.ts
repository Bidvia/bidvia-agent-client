import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

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

test('runCli help keeps the agent-first learn journey ahead of bounded identity/session prerequisite support', async () => {
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

  const signUpPersonalIndex = lines.indexOf('  sign-up-personal --input ...');
  const signUpEnterpriseIndex = lines.indexOf('  sign-up-enterprise --input ...');
  const signInIndex = lines.indexOf('  sign-in --input ...');
  const onboardIndex = lines.indexOf('  onboard');
  const whoamiIndex = lines.indexOf('  whoami');
  const contextShowIndex = lines.indexOf('  context show');
  const doctorIndex = lines.indexOf('  doctor');
  const createIndex = lines.indexOf('  create-provisional-agent --provisional-agent-ref ...');
  const queryIndex = lines.indexOf('  query-provisional-agent --provisional-agent-ref ...');
  const claimIndex = lines.indexOf('  claim-provisional-agent --provisional-agent-ref ... --claim-token ...');
  const registrationLifecycleIndex = lines.indexOf('  registration-lifecycle-plan');

  assert(onboardIndex >= 0);
  assert(whoamiIndex > onboardIndex);
  assert(contextShowIndex > whoamiIndex);
  assert(doctorIndex > contextShowIndex);
  assert(signInIndex > doctorIndex);
  assert(signUpPersonalIndex > signInIndex);
  assert(signUpEnterpriseIndex > signUpPersonalIndex);
  assert(createIndex > signUpEnterpriseIndex);
  assert(queryIndex > createIndex);
  assert(claimIndex > queryIndex);
  assert(registrationLifecycleIndex > claimIndex);
});

test('runCli sign-in persists minimal local continuation state without writing token material', async () => {
  const printed: unknown[] = [];
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-cli-sign-in-state-'));
  const statePath = path.join(tempDirectory, 'onboarding-state.json');
  const restoreStatePath = setEnvVar('BIDVIA_STATE_PATH', statePath);

  try {
    const exitCode = await runCli([
      'sign-in',
      '--input',
      '{"email":"person@example.com","password":"secret-1","now":"2026-04-10T10:02:00Z"}',
    ], {
      createClient: () => ({
        signIn: async () => ({
          tenantId: 'tenant-a',
          principalId: 'principal-a',
          companyId: 'company-a',
          sessionId: 'sess-1',
          adminSessionId: 'admin-secret-should-not-persist',
          accessToken: 'access-secret-should-not-persist',
          refreshToken: 'refresh-secret-should-not-persist',
        }),
      }) as never,
      resolveProcessEnv: () => ({
        BIDVIA_STATE_PATH: statePath,
      }),
      now: () => '2026-04-10T10:02:30Z',
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('sign-in should not print help lines');
      },
    });

    assert.equal(exitCode, 0);
    assert.deepEqual(printed, [{
      tenantId: 'tenant-a',
      principalId: 'principal-a',
      companyId: 'company-a',
      sessionId: 'sess-1',
      adminSessionId: 'admin-secret-should-not-persist',
      accessToken: 'access-secret-should-not-persist',
      refreshToken: 'refresh-secret-should-not-persist',
    }]);
    assert.deepEqual(JSON.parse(readFileSync(statePath, 'utf8')), {
      tenantId: 'tenant-a',
      principalId: 'principal-a',
      companyId: 'company-a',
      sessionId: 'sess-1',
      lastCompletedStep: 'sign-in',
      createdAt: '2026-04-10T10:02:30Z',
      updatedAt: '2026-04-10T10:02:30Z',
    });
  } finally {
    restoreStatePath();
  }
});

test('runCli routes the V1 sign-up and sign-in commands through the existing client helpers with --input json bodies', async () => {
  const printed: unknown[] = [];
  const calls: Array<{ command: string; input: unknown }> = [];

  const createClient = () => ({
    signUpPersonalAccount: async (input: unknown) => {
      calls.push({ command: 'sign-up-personal', input });
      return { ok: true, command: 'sign-up-personal' };
    },
    signUpEnterpriseAccount: async (input: unknown) => {
      calls.push({ command: 'sign-up-enterprise', input });
      return { ok: true, command: 'sign-up-enterprise' };
    },
    signIn: async (input: unknown) => {
      calls.push({ command: 'sign-in', input });
      return { ok: true, command: 'sign-in' };
    },
  }) as never;

  const signUpPersonalExitCode = await runCli([
    'sign-up-personal',
    '--input',
    '{"email":"person@example.com","password":"secret-1","displayName":"Ada Lovelace","now":"2026-04-10T10:00:00Z"}',
  ], {
    createClient,
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('sign-up-personal should not print help lines');
    },
  });
  const signUpEnterpriseExitCode = await runCli([
    'sign-up-enterprise',
    '--input',
    '{"email":"ops@example.com","password":"secret-2","companyName":"Bidvia Labs","now":"2026-04-10T10:01:00Z"}',
  ], {
    createClient,
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('sign-up-enterprise should not print help lines');
    },
  });
  const signInExitCode = await runCli([
    'sign-in',
    '--input',
    '{"email":"person@example.com","password":"secret-1","now":"2026-04-10T10:02:00Z"}',
  ], {
    createClient,
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('sign-in should not print help lines');
    },
  });

  assert.equal(signUpPersonalExitCode, 0);
  assert.equal(signUpEnterpriseExitCode, 0);
  assert.equal(signInExitCode, 0);
  assert.deepEqual(calls, [
    {
      command: 'sign-up-personal',
      input: {
        email: 'person@example.com',
        password: 'secret-1',
        displayName: 'Ada Lovelace',
        now: '2026-04-10T10:00:00Z',
      },
    },
    {
      command: 'sign-up-enterprise',
      input: {
        email: 'ops@example.com',
        password: 'secret-2',
        companyName: 'Bidvia Labs',
        now: '2026-04-10T10:01:00Z',
      },
    },
    {
      command: 'sign-in',
      input: {
        email: 'person@example.com',
        password: 'secret-1',
        now: '2026-04-10T10:02:00Z',
      },
    },
  ]);
  assert.deepEqual(printed, [
    { ok: true, command: 'sign-up-personal' },
    { ok: true, command: 'sign-up-enterprise' },
    { ok: true, command: 'sign-in' },
  ]);
});

test('runCli routes account/session continuity commands through the existing client helpers', async () => {
  const printed: unknown[] = [];
  const createClientContexts: unknown[] = [];
  const calls: Array<{ command: string; input?: unknown }> = [];

  const createClient = ((_env?: unknown, contextOverride?: unknown) => {
    createClientContexts.push(contextOverride);
    return {
      getAccountMe: async () => {
        calls.push({ command: 'account-me' });
        return { ok: true, command: 'account-me' };
      },
      selectOrg: async (input: unknown) => {
        calls.push({ command: 'select-org', input });
        return { ok: true, command: 'select-org' };
      },
      refreshSession: async () => {
        calls.push({ command: 'session-refresh' });
        return { ok: true, command: 'session-refresh' };
      },
      revokeSession: async () => {
        calls.push({ command: 'session-revoke' });
        return { ok: true, command: 'session-revoke' };
      },
    } as never;
  }) as never;

  const accountMeExitCode = await runCli(['account-me'], {
    createClient,
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-a',
      BIDVIA_SESSION_ID: 'sess-1',
    }),
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('account-me should not print help lines');
    },
  });
  const selectOrgExitCode = await runCli([
    'select-org',
    '--input',
    '{"orgId":"org-2"}',
  ], {
    createClient,
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-a',
      BIDVIA_SESSION_ID: 'sess-1',
    }),
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('select-org should not print help lines');
    },
  });
  const refreshExitCode = await runCli(['session-refresh'], {
    createClient,
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-a',
      BIDVIA_SESSION_ID: 'sess-1',
    }),
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('session-refresh should not print help lines');
    },
  });
  const revokeExitCode = await runCli(['session-revoke'], {
    createClient,
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-a',
      BIDVIA_SESSION_ID: 'sess-1',
    }),
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('session-revoke should not print help lines');
    },
  });

  assert.equal(accountMeExitCode, 0);
  assert.equal(selectOrgExitCode, 0);
  assert.equal(refreshExitCode, 0);
  assert.equal(revokeExitCode, 0);
  assert.deepEqual(createClientContexts, [
    { tenantId: 'tenant-a', principalId: undefined, companyId: undefined, registrationId: undefined, sessionId: 'sess-1' },
    { tenantId: 'tenant-a', principalId: undefined, companyId: undefined, registrationId: undefined, sessionId: 'sess-1' },
    { tenantId: 'tenant-a', principalId: undefined, companyId: undefined, registrationId: undefined, sessionId: 'sess-1' },
    { tenantId: 'tenant-a', principalId: undefined, companyId: undefined, registrationId: undefined, sessionId: 'sess-1' },
  ]);
  assert.deepEqual(calls, [
    { command: 'account-me' },
    { command: 'select-org', input: { orgId: 'org-2' } },
    { command: 'session-refresh' },
    { command: 'session-revoke' },
  ]);
  assert.deepEqual(printed, [
    { ok: true, command: 'account-me' },
    { ok: true, command: 'select-org' },
    { ok: true, command: 'session-refresh' },
    { ok: true, command: 'session-revoke' },
  ]);
});

test('runCli identity/session continuation commands can resume from locally persisted sign-in state when env is absent', async () => {
  const printed: unknown[] = [];
  const createClientContexts: unknown[] = [];
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-cli-session-continuation-'));
  const statePath = path.join(tempDirectory, 'onboarding-state.json');
  const restoreStatePath = setEnvVar('BIDVIA_STATE_PATH', statePath);

  try {
    const createClient = ((_env?: unknown, contextOverride?: unknown) => {
      createClientContexts.push(contextOverride);
      return {
        signIn: async () => ({
          tenantId: 'tenant-a',
          principalId: 'principal-a',
          sessionId: 'sess-1',
        }),
        selectOrg: async (input: unknown) => ({
          ok: true,
          command: 'select-org',
          ...((input as { orgId: string })),
          companyId: 'company-b',
        }),
        accountMe: async () => ({
          ok: true,
        }),
        getAccountMe: async () => ({
          ok: true,
          command: 'account-me',
        }),
      } as never;
    }) as never;

    const signInExitCode = await runCli([
      'sign-in',
      '--input',
      '{"email":"person@example.com","password":"secret-1","now":"2026-04-10T10:02:00Z"}',
    ], {
      createClient,
      resolveProcessEnv: () => ({
        BIDVIA_STATE_PATH: statePath,
      }),
      now: () => '2026-04-10T10:02:30Z',
      printJson: () => {},
      printLine: () => {
        throw new Error('sign-in should not print help lines');
      },
    });
    const selectOrgExitCode = await runCli([
      'select-org',
      '--input',
      '{"orgId":"org-2"}',
    ], {
      createClient,
      resolveProcessEnv: () => ({
        BIDVIA_STATE_PATH: statePath,
      }),
      now: () => '2026-04-10T10:03:00Z',
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('select-org should not print help lines');
      },
    });
    const accountMeExitCode = await runCli(['account-me'], {
      createClient,
      resolveProcessEnv: () => ({
        BIDVIA_STATE_PATH: statePath,
      }),
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('account-me should not print help lines');
      },
    });

    assert.equal(signInExitCode, 0);
    assert.equal(selectOrgExitCode, 0);
    assert.equal(accountMeExitCode, 0);
    assert.deepEqual(createClientContexts, [
      { tenantId: undefined, principalId: undefined, companyId: undefined, registrationId: undefined, sessionId: undefined },
      { tenantId: 'tenant-a', principalId: undefined, companyId: undefined, registrationId: undefined, sessionId: 'sess-1' },
      { tenantId: 'tenant-a', principalId: undefined, companyId: 'company-b', registrationId: undefined, sessionId: 'sess-1' },
    ]);
    assert.deepEqual(printed, [
      { ok: true, command: 'select-org', orgId: 'org-2', companyId: 'company-b' },
      { ok: true, command: 'account-me' },
    ]);
  } finally {
    restoreStatePath();
  }
});
