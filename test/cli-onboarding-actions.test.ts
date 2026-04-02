import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { BidviaClientTransportError } from '../src/client.ts';
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

test('runCli routes create-provisional-agent through the existing client helper with an explicit provisional ref', async () => {
  const printed: unknown[] = [];
  const createCalls: Array<{ provisionalAgentRef: string; now: string }> = [];

  const exitCode = await runCli(['create-provisional-agent', '--provisional-agent-ref', 'prov-agent-1'], {
    createClient: () => ({
      createProvisionalAgent: async (input: { provisionalAgentRef: string; now: string }) => {
        createCalls.push(input);
        return {
          provisionalAgentRef: input.provisionalAgentRef,
          created: true,
        };
      },
    }) as never,
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-a',
    }),
    readLocalOnboardingState: async () => null,
    now: () => '2026-04-02T12:00:00.000Z',
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('help output should not be used for create-provisional-agent');
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(createCalls, [{
    provisionalAgentRef: 'prov-agent-1',
    now: '2026-04-02T12:00:00.000Z',
  }]);
  assert.deepEqual(printed, [{
    provisionalAgentRef: 'prov-agent-1',
    created: true,
  }]);
});

test('runCli create-provisional-agent executes with tenant context sourced from local onboarding state when env is absent', async () => {
  const printed: unknown[] = [];
  const createClientContexts: unknown[] = [];

  const exitCode = await runCli(['create-provisional-agent', '--provisional-agent-ref', 'prov-agent-local-state'], {
    createClient: ((_env?: unknown, contextOverride?: unknown) => {
      createClientContexts.push(contextOverride);
      return {
        createProvisionalAgent: async () => ({
          provisionalAgentRef: 'prov-agent-local-state',
          created: true,
        }),
      } as never;
    }) as never,
    resolveProcessEnv: () => ({}),
    readLocalOnboardingState: async () => ({
      tenantId: 'tenant-local',
      companyId: 'company-local',
      principalId: 'principal-local',
      registrationId: 'areg-local',
      lastCompletedStep: 'claim-provisional-agent',
    }),
    now: () => '2026-04-02T12:01:00.000Z',
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('help output should not be used for create-provisional-agent');
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(createClientContexts, [{
    tenantId: 'tenant-local',
    principalId: undefined,
    companyId: undefined,
    registrationId: undefined,
    sessionId: undefined,
  }]);
  assert.deepEqual(printed, [{
    provisionalAgentRef: 'prov-agent-local-state',
    created: true,
  }]);
});

test('runCli default onboarding-action client wiring honors injected env baseUrl and local-state execution context together', async () => {
  const printed: unknown[] = [];
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const restoreEnv = [
    setEnvVar('BIDVIA_BASE_URL', 'http://127.0.0.1:9999'),
    setEnvVar('BIDVIA_TENANT_ID', undefined),
  ];
  const previousFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });

    return new Response(JSON.stringify({
      provisional_agent_ref: 'prov-agent-default-wiring',
      created: true,
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const exitCode = await runCli(['create-provisional-agent', '--provisional-agent-ref', 'prov-agent-default-wiring'], {
      resolveProcessEnv: () => ({
        BIDVIA_BASE_URL: 'http://127.0.0.1:8787',
      }),
      readLocalOnboardingState: async () => ({
        tenantId: 'tenant-local-default-wiring',
      }),
      now: () => '2026-04-02T12:00:30.000Z',
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('create-provisional-agent should not print help lines');
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
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/agents/provisional');
  assert.deepEqual(printed, [{
    provisional_agent_ref: 'prov-agent-default-wiring',
    created: true,
  }]);
});

test('runCli create/query strip stale claimed principal/company/registration context from provisional execution', async () => {
  const createClientContexts: unknown[] = [];

  const createExitCode = await runCli(['create-provisional-agent', '--provisional-agent-ref', 'prov-agent-strip-create'], {
    createClient: ((_env?: unknown, contextOverride?: unknown) => {
      createClientContexts.push(contextOverride);
      return {
        createProvisionalAgent: async () => ({
          provisionalAgentRef: 'prov-agent-strip-create',
          created: true,
        }),
      } as never;
    }) as never,
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-strip',
    }),
    readLocalOnboardingState: async () => ({
      tenantId: 'tenant-strip',
      principalId: 'principal-stale',
      companyId: 'company-stale',
      registrationId: 'areg-stale',
      lastCompletedStep: 'claim-provisional-agent',
    }),
    now: () => '2026-04-02T12:01:30.000Z',
    printJson: () => {},
    printLine: () => {
      throw new Error('create-provisional-agent should not print help lines');
    },
  });

  const queryExitCode = await runCli(['query-provisional-agent', '--provisional-agent-ref', 'prov-agent-strip-query'], {
    createClient: ((_env?: unknown, contextOverride?: unknown) => {
      createClientContexts.push(contextOverride);
      return {
        queryProvisionalAgent: async () => ({
          provisionalAgentRef: 'prov-agent-strip-query',
          status: 'pending-claim',
        }),
      } as never;
    }) as never,
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-strip',
    }),
    readLocalOnboardingState: async () => ({
      tenantId: 'tenant-strip',
      principalId: 'principal-stale',
      companyId: 'company-stale',
      registrationId: 'areg-stale',
      lastCompletedStep: 'claim-provisional-agent',
    }),
    now: () => '2026-04-02T12:01:45.000Z',
    printJson: () => {},
    printLine: () => {
      throw new Error('query-provisional-agent should not print help lines');
    },
  });

  assert.equal(createExitCode, 0);
  assert.equal(queryExitCode, 0);
  assert.deepEqual(createClientContexts, [{
    tenantId: 'tenant-strip',
    principalId: undefined,
    companyId: undefined,
    registrationId: undefined,
    sessionId: undefined,
  }, {
    tenantId: 'tenant-strip',
    principalId: undefined,
    companyId: undefined,
    registrationId: undefined,
    sessionId: undefined,
  }]);
});

test('runCli routes query-provisional-agent through the existing client helper with an explicit provisional ref', async () => {
  const printed: unknown[] = [];
  const queryCalls: Array<{ provisionalAgentRef: string }> = [];

  const exitCode = await runCli(['query-provisional-agent', '--provisional-agent-ref', 'prov-agent-2'], {
    createClient: () => ({
      queryProvisionalAgent: async (input: { provisionalAgentRef: string }) => {
        queryCalls.push(input);
        return {
          provisionalAgentRef: input.provisionalAgentRef,
          status: 'pending-claim',
        };
      },
    }) as never,
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-a',
    }),
    readLocalOnboardingState: async () => null,
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('help output should not be used for query-provisional-agent');
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(queryCalls, [{
    provisionalAgentRef: 'prov-agent-2',
  }]);
  assert.deepEqual(printed, [{
    provisionalAgentRef: 'prov-agent-2',
    status: 'pending-claim',
  }]);
});

test('runCli writes only non-secret local onboarding state after a successful claim-provisional-agent command', async () => {
  const printed: unknown[] = [];
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-cli-onboarding-actions-'));
  const statePath = path.join(tempDirectory, 'onboarding-state.json');
  const restoreStatePath = setEnvVar('BIDVIA_STATE_PATH', statePath);
  const claimCalls: Array<{ provisionalAgentRef: string; claimToken: string; now: string }> = [];

  try {
    const exitCode = await runCli([
      'claim-provisional-agent',
      '--provisional-agent-ref',
      'prov-agent-3',
      '--claim-token',
      'claim-token-3',
    ], {
      createClient: () => ({
        claimProvisionalAgent: async (input: {
          provisionalAgentRef: string;
          claimToken: string;
          now: string;
        }) => {
          claimCalls.push(input);
          return {
            provisionalAgentRef: input.provisionalAgentRef,
            registrationId: 'areg-3',
            principalId: 'principal-claimed',
            companyId: 'company-claimed',
            sessionId: 'session-secret-should-not-persist',
            adminSessionId: 'admin-session-secret-should-not-persist',
          };
        },
      }) as never,
      resolveExecutionContext: () => ({
        tenantId: 'tenant-a',
        principalId: 'principal-context',
        companyId: 'company-context',
        sessionId: 'session-1',
      }),
      resolveProcessEnv: () => ({
        BIDVIA_TENANT_ID: 'tenant-a',
        BIDVIA_SESSION_ID: 'session-1',
        BIDVIA_STATE_PATH: statePath,
      }),
      readLocalOnboardingState: async () => null,
      now: () => '2026-04-02T12:05:00.000Z',
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('help output should not be used for claim-provisional-agent');
      },
    });

    assert.equal(exitCode, 0);
    assert.deepEqual(claimCalls, [{
      provisionalAgentRef: 'prov-agent-3',
      claimToken: 'claim-token-3',
      now: '2026-04-02T12:05:00.000Z',
    }]);
    assert.deepEqual(printed, [{
      provisionalAgentRef: 'prov-agent-3',
      registrationId: 'areg-3',
      principalId: 'principal-claimed',
      companyId: 'company-claimed',
      sessionId: 'session-secret-should-not-persist',
      adminSessionId: 'admin-session-secret-should-not-persist',
    }]);
    assert.deepEqual(JSON.parse(readFileSync(statePath, 'utf8')), {
      tenantId: 'tenant-a',
      principalId: 'principal-claimed',
      companyId: 'company-claimed',
      registrationId: 'areg-3',
      lastCompletedStep: 'claim-provisional-agent',
      createdAt: '2026-04-02T12:05:00.000Z',
      updatedAt: '2026-04-02T12:05:00.000Z',
    });
  } finally {
    restoreStatePath();
  }
});

test('runCli claim-provisional-agent persists nested registration identity fields from the SIM claim response shape', async () => {
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-cli-onboarding-actions-claim-nested-'));
  const statePath = path.join(tempDirectory, 'onboarding-state.json');

  const exitCode = await runCli([
    'claim-provisional-agent',
    '--provisional-agent-ref',
    'prov-agent-claim-nested',
    '--claim-token',
    'claim-token-nested',
  ], {
    createClient: () => ({
      claimProvisionalAgent: async () => ({
        provisionalAgentRef: 'prov-agent-claim-nested',
        registration: {
          agent_registration_id: 'areg-nested',
          principal_id: 'principal-nested',
          tenant_id: 'company-nested',
        },
        sessionId: 'session-secret-should-not-persist',
      }),
    }) as never,
    resolveExecutionContext: () => ({
      tenantId: 'tenant-nested',
      sessionId: 'session-nested',
    }),
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-nested',
      BIDVIA_SESSION_ID: 'session-nested',
      BIDVIA_STATE_PATH: statePath,
    }),
    readLocalOnboardingState: async () => null,
    now: () => '2026-04-02T12:05:15.000Z',
    printJson: () => {},
    printLine: () => {
      throw new Error('claim-provisional-agent should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(JSON.parse(readFileSync(statePath, 'utf8')), {
    tenantId: 'tenant-nested',
    principalId: 'principal-nested',
    companyId: 'company-nested',
    registrationId: 'areg-nested',
    lastCompletedStep: 'claim-provisional-agent',
    createdAt: '2026-04-02T12:05:15.000Z',
    updatedAt: '2026-04-02T12:05:15.000Z',
  });
});

test('runCli claim-provisional-agent does not persist stale claimed identity fields when current claim omits them', async () => {
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-cli-onboarding-actions-claim-fresh-'));
  const statePath = path.join(tempDirectory, 'onboarding-state.json');

  writeFileSync(statePath, JSON.stringify({
    tenantId: 'tenant-stale',
    principalId: 'principal-stale',
    companyId: 'company-stale',
    registrationId: 'areg-stale',
    lastCompletedStep: 'claim-provisional-agent',
    createdAt: '2026-04-02T11:00:00.000Z',
    updatedAt: '2026-04-02T11:05:00.000Z',
  }, null, 2), 'utf8');

  const exitCode = await runCli([
    'claim-provisional-agent',
    '--provisional-agent-ref',
    'prov-agent-claim-fresh',
    '--claim-token',
    'claim-token-fresh',
  ], {
    createClient: () => ({
      claimProvisionalAgent: async () => ({
        provisionalAgentRef: 'prov-agent-claim-fresh',
        sessionId: 'session-secret-should-not-persist',
      }),
    }) as never,
    resolveExecutionContext: () => ({
      tenantId: 'tenant-current',
      sessionId: 'session-current',
    }),
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-current',
      BIDVIA_SESSION_ID: 'session-current',
      BIDVIA_STATE_PATH: statePath,
    }),
    now: () => '2026-04-02T12:05:30.000Z',
    printJson: () => {},
    printLine: () => {
      throw new Error('claim-provisional-agent should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(JSON.parse(readFileSync(statePath, 'utf8')), {
    tenantId: 'tenant-current',
    lastCompletedStep: 'claim-provisional-agent',
    createdAt: '2026-04-02T11:00:00.000Z',
    updatedAt: '2026-04-02T12:05:30.000Z',
  });
});

test('runCli writes provisional create/query progress into local onboarding state without persisting secrets', async () => {
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-cli-onboarding-actions-progress-'));
  const statePath = path.join(tempDirectory, 'onboarding-state.json');
  const restoreStatePath = setEnvVar('BIDVIA_STATE_PATH', statePath);

  try {
    const createExitCode = await runCli([
      'create-provisional-agent',
      '--provisional-agent-ref',
      'prov-agent-progress',
    ], {
      createClient: () => ({
        createProvisionalAgent: async () => ({
          provisionalAgentRef: 'prov-agent-progress',
          created: true,
          sessionId: 'should-not-persist',
        }),
      }) as never,
      resolveProcessEnv: () => ({
        BIDVIA_TENANT_ID: 'tenant-progress',
        BIDVIA_STATE_PATH: statePath,
      }),
      readLocalOnboardingState: async () => null,
      now: () => '2026-04-02T12:02:00.000Z',
      printJson: () => {},
      printLine: () => {
        throw new Error('create-provisional-agent should not print help lines');
      },
    });

    assert.equal(createExitCode, 0);
    assert.deepEqual(JSON.parse(readFileSync(statePath, 'utf8')), {
      tenantId: 'tenant-progress',
      lastCompletedStep: 'create-provisional-agent',
      createdAt: '2026-04-02T12:02:00.000Z',
      updatedAt: '2026-04-02T12:02:00.000Z',
    });

    const queryExitCode = await runCli([
      'query-provisional-agent',
      '--provisional-agent-ref',
      'prov-agent-progress',
    ], {
      createClient: () => ({
        queryProvisionalAgent: async () => ({
          provisionalAgentRef: 'prov-agent-progress',
          status: 'pending-claim',
          adminSessionId: 'should-not-persist',
        }),
      }) as never,
      resolveProcessEnv: () => ({
        BIDVIA_TENANT_ID: 'tenant-progress',
        BIDVIA_STATE_PATH: statePath,
      }),
      readLocalOnboardingState: async () => JSON.parse(readFileSync(statePath, 'utf8')) as Record<string, unknown>,
      now: () => '2026-04-02T12:03:00.000Z',
      printJson: () => {},
      printLine: () => {
        throw new Error('query-provisional-agent should not print help lines');
      },
    });

    assert.equal(queryExitCode, 0);
    assert.deepEqual(JSON.parse(readFileSync(statePath, 'utf8')), {
      tenantId: 'tenant-progress',
      lastCompletedStep: 'query-provisional-agent',
      createdAt: '2026-04-02T12:02:00.000Z',
      updatedAt: '2026-04-02T12:03:00.000Z',
    });
  } finally {
    restoreStatePath();
  }
});

test('runCli onboarding action writes honor injected BIDVIA_STATE_PATH instead of process env drift', async () => {
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-cli-onboarding-actions-injected-path-'));
  const injectedStatePath = path.join(tempDirectory, 'injected-onboarding-state.json');
  const processStatePath = path.join(tempDirectory, 'process-onboarding-state.json');
  const restoreStatePath = setEnvVar('BIDVIA_STATE_PATH', processStatePath);

  try {
    const exitCode = await runCli([
      'create-provisional-agent',
      '--provisional-agent-ref',
      'prov-agent-injected-path',
    ], {
      createClient: () => ({
        createProvisionalAgent: async () => ({
          provisionalAgentRef: 'prov-agent-injected-path',
          created: true,
        }),
      }) as never,
      resolveProcessEnv: () => ({
        BIDVIA_TENANT_ID: 'tenant-injected',
        BIDVIA_STATE_PATH: injectedStatePath,
      }),
      readLocalOnboardingState: async () => null,
      now: () => '2026-04-02T12:04:00.000Z',
      printJson: () => {},
      printLine: () => {
        throw new Error('create-provisional-agent should not print help lines');
      },
    });

    assert.equal(exitCode, 0);
    assert.equal(existsSync(injectedStatePath), true);
    assert.equal(existsSync(processStatePath), false);
    assert.deepEqual(JSON.parse(readFileSync(injectedStatePath, 'utf8')), {
      tenantId: 'tenant-injected',
      lastCompletedStep: 'create-provisional-agent',
      createdAt: '2026-04-02T12:04:00.000Z',
      updatedAt: '2026-04-02T12:04:00.000Z',
    });
  } finally {
    restoreStatePath();
  }
});

test('runCli reports local onboarding state write failures separately from transport failures', async () => {
  const printed: unknown[] = [];
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-cli-onboarding-actions-write-failure-'));
  const restoreStatePath = setEnvVar('BIDVIA_STATE_PATH', tempDirectory);

  try {
    const exitCode = await runCli([
      'create-provisional-agent',
      '--provisional-agent-ref',
      'prov-agent-write-failure',
    ], {
      createClient: () => ({
        createProvisionalAgent: async () => ({
          provisionalAgentRef: 'prov-agent-write-failure',
          created: true,
        }),
      }) as never,
      resolveProcessEnv: () => ({
        BIDVIA_TENANT_ID: 'tenant-write-failure',
        BIDVIA_STATE_PATH: tempDirectory,
      }),
      readLocalOnboardingState: async () => null,
      now: () => '2026-04-02T12:04:30.000Z',
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('create-provisional-agent should not print help lines');
      },
    });

    assert.equal(exitCode, 1);
    assert.deepEqual(printed, [{
      error: {
        code: 'local-onboarding-state-error',
        command: 'create-provisional-agent',
        message: `Failed to persist local onboarding state at ${tempDirectory}.`,
        details: ['local-onboarding-state'],
        localState: {
          path: tempDirectory,
          operation: 'write',
          name: 'Error',
          message: `EISDIR: illegal operation on a directory, open '${tempDirectory}'`,
          code: 'EISDIR',
        },
      },
    }]);
  } finally {
    restoreStatePath();
  }
});

test('runCli create/query rerun after a prior claim preserves governed-run identity fields while returning the user to provisional progress', async () => {
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-cli-onboarding-actions-reset-'));
  const statePath = path.join(tempDirectory, 'onboarding-state.json');
  const restoreStatePath = setEnvVar('BIDVIA_STATE_PATH', statePath);
  const printed: unknown[] = [];

  try {
    const claimedState = {
      tenantId: 'tenant-reset',
      principalId: 'principal-claimed',
      companyId: 'company-claimed',
      registrationId: 'areg-claimed',
      lastCompletedStep: 'claim-provisional-agent',
      createdAt: '2026-04-02T12:00:00.000Z',
      updatedAt: '2026-04-02T12:05:00.000Z',
    };
    const stateDirectory = path.dirname(statePath);
    if (!existsSync(stateDirectory)) {
      throw new Error('expected temp directory to exist');
    }
    writeFileSync(statePath, JSON.stringify(claimedState, null, 2), 'utf8');

    const createExitCode = await runCli([
      'create-provisional-agent',
      '--provisional-agent-ref',
      'prov-agent-reset',
    ], {
      createClient: () => ({
        createProvisionalAgent: async () => ({
          provisionalAgentRef: 'prov-agent-reset',
          created: true,
        }),
      }) as never,
      resolveProcessEnv: () => ({
        BIDVIA_TENANT_ID: 'tenant-reset',
        BIDVIA_STATE_PATH: statePath,
      }),
      now: () => '2026-04-02T12:06:00.000Z',
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('create-provisional-agent should not print help lines');
      },
    });

    assert.equal(createExitCode, 0);
    assert.deepEqual(JSON.parse(readFileSync(statePath, 'utf8')), {
      tenantId: 'tenant-reset',
      principalId: 'principal-claimed',
      companyId: 'company-claimed',
      registrationId: 'areg-claimed',
      lastCompletedStep: 'create-provisional-agent',
      createdAt: '2026-04-02T12:00:00.000Z',
      updatedAt: '2026-04-02T12:06:00.000Z',
    });

    const onboardExitCode = await runCli(['onboard'], {
      createClient: () => {
        throw new Error('onboard should not create a client');
      },
      resolveProcessEnv: () => ({
        BIDVIA_TENANT_ID: 'tenant-reset',
        BIDVIA_STATE_PATH: statePath,
      }),
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('onboard should not print help lines');
      },
    });

    assert.equal(onboardExitCode, 0);
    assert.equal((printed[1] as { onboarding: { currentStage: { key: string } } }).onboarding.currentStage.key, 'provisional-claim-pending');
    assert.equal((printed[1] as { effectiveContext: { registrationId: { value: string | null }, principalId: { value: string | null }, companyId: { value: string | null } } }).effectiveContext.registrationId.value, 'areg-claimed');
    assert.equal((printed[1] as { effectiveContext: { registrationId: { value: string | null }, principalId: { value: string | null }, companyId: { value: string | null } } }).effectiveContext.principalId.value, 'principal-claimed');
    assert.equal((printed[1] as { effectiveContext: { registrationId: { value: string | null }, principalId: { value: string | null }, companyId: { value: string | null } } }).effectiveContext.companyId.value, 'company-claimed');
  } finally {
    restoreStatePath();
  }
});

test('runCli returns structured invalid-input failures when provisional onboarding commands are missing required flags', async () => {
  const cases = [
    {
      argv: ['create-provisional-agent'],
      expected: {
        error: {
          code: 'invalid-input',
          command: 'create-provisional-agent',
          message: 'Missing required --provisional-agent-ref for create-provisional-agent.',
          details: ['--provisional-agent-ref'],
        },
      },
    },
    {
      argv: ['query-provisional-agent'],
      expected: {
        error: {
          code: 'invalid-input',
          command: 'query-provisional-agent',
          message: 'Missing required --provisional-agent-ref for query-provisional-agent.',
          details: ['--provisional-agent-ref'],
        },
      },
    },
    {
      argv: ['claim-provisional-agent', '--provisional-agent-ref', 'prov-agent-4'],
      expected: {
        error: {
          code: 'invalid-input',
          command: 'claim-provisional-agent',
          message: 'Missing required --claim-token for claim-provisional-agent.',
          details: ['--claim-token'],
        },
      },
    },
  ] as const;

  for (const testCase of cases) {
    const printed: unknown[] = [];

    const exitCode = await runCli([...testCase.argv], {
      createClient: () => {
        throw new Error('invalid-input should not create a client');
      },
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('help output should not be used for invalid-input cases');
      },
    });

    assert.equal(exitCode, 1);
    assert.deepEqual(printed, [testCase.expected]);
  }
});

test('runCli returns structured missing-context failures when provisional onboarding commands are missing required local context', async () => {
  const cases = [
    {
      argv: ['create-provisional-agent', '--provisional-agent-ref', 'prov-agent-missing-tenant'],
      env: {},
      expected: {
        error: {
          code: 'missing-context',
          command: 'create-provisional-agent',
          message: 'The create-provisional-agent command can start the public provisional flow, but this local CLI still needs tenantId to execute deterministically against the configured API. Missing: tenantId.',
          details: ['tenantId'],
        },
      },
    },
    {
      argv: ['query-provisional-agent', '--provisional-agent-ref', 'prov-agent-missing-tenant'],
      env: {},
      expected: {
        error: {
          code: 'missing-context',
          command: 'query-provisional-agent',
          message: 'The query-provisional-agent command stays in the public provisional flow, but this local CLI still needs tenantId to execute deterministically against the configured API. Missing: tenantId.',
          details: ['tenantId'],
        },
      },
    },
    {
      argv: ['claim-provisional-agent', '--provisional-agent-ref', 'prov-agent-missing-context', '--claim-token', 'claim-token-missing-context'],
      env: {},
      expected: {
        error: {
          code: 'missing-context',
          command: 'claim-provisional-agent',
          message: 'The claim-provisional-agent command is session-bound and needs tenantId plus sessionId before it can complete the provisional claim against the configured API. Missing: tenantId, sessionId.',
          details: ['tenantId', 'sessionId'],
        },
      },
    },
  ] as const;

  for (const testCase of cases) {
    const printed: unknown[] = [];

    const exitCode = await runCli([...testCase.argv], {
      createClient: () => {
        throw new Error('missing-context should not create a client');
      },
      resolveProcessEnv: () => testCase.env,
      readLocalOnboardingState: async () => null,
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('help output should not be used for missing-context cases');
      },
    });

    assert.equal(exitCode, 1);
    assert.deepEqual(printed, [testCase.expected]);
  }
});

test('runCli returns structured transport failures and does not write local onboarding state when claim-provisional-agent fails', async () => {
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-cli-onboarding-actions-failure-'));
  const statePath = path.join(tempDirectory, 'onboarding-state.json');
  const restoreStatePath = setEnvVar('BIDVIA_STATE_PATH', statePath);
  const printed: unknown[] = [];

  try {
    const exitCode = await runCli([
        'claim-provisional-agent',
        '--provisional-agent-ref',
        'prov-agent-5',
        '--claim-token',
        'claim-token-5',
      ], {
        createClient: () => ({
          claimProvisionalAgent: async () => {
            throw new BidviaClientTransportError(
              'claim failed',
              'conflict',
              409,
              {
                responseBody: { code: 'already-claimed' },
              },
            );
          },
        }) as never,
        resolveExecutionContext: () => ({
          tenantId: 'tenant-a',
          sessionId: 'session-1',
        }),
        resolveProcessEnv: () => ({
          BIDVIA_TENANT_ID: 'tenant-a',
          BIDVIA_SESSION_ID: 'session-1',
        }),
        readLocalOnboardingState: async () => null,
        now: () => '2026-04-02T12:10:00.000Z',
        printJson: (value) => {
          printed.push(value);
        },
        printLine: () => {
          throw new Error('help output should not be used for failed claim');
        },
      });

    assert.equal(exitCode, 1);
    assert.deepEqual(printed, [{
      error: {
        code: 'transport-error',
        command: 'claim-provisional-agent',
        message: 'claim failed',
        details: ['BidviaClientTransportError'],
        transport: {
          name: 'BidviaClientTransportError',
          code: 'conflict',
          status: 409,
          responseBody: {
            code: 'already-claimed',
          },
        },
      },
    }]);
    assert.equal(existsSync(statePath), false);
  } finally {
    restoreStatePath();
  }
});

test('runCli prints missing effective context with missing source attribution on a fresh machine', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['context', 'show'], {
    createClient: () => {
      throw new Error('context show should not create a client');
    },
    resolveProcessEnv: () => ({}),
    readLocalOnboardingState: async () => null,
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('context show should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(printed, [{
    command: 'context show',
    scope: 'local-only',
    journeyBoundary: {
      publicProvisional: {
        label: 'Public Provisional',
        chain: 'create -> query -> claim',
        status: 'available',
        claimIsSessionBound: true,
      },
      governedRun: {
        label: 'Governed Run',
        startsAfter: 'successful claim',
        status: 'not-ready',
      },
    },
    context: {
      tenantId: {
        value: null,
        source: 'missing',
      },
      principalId: {
        value: null,
        source: 'missing',
      },
      companyId: {
        value: null,
        source: 'missing',
      },
      registrationId: {
        value: null,
        source: 'missing',
      },
      lastCompletedStep: {
        value: null,
        source: 'missing',
      },
      sessionId: {
        present: false,
        source: 'missing',
      },
      adminSessionId: {
        present: false,
        source: 'missing',
      },
    },
  }]);
});

test('runCli prints effective context with env precedence and local onboarding state fallback while keeping sessions secret-safe', async () => {
  const printed: unknown[] = [];
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-cli-context-show-'));
  const statePath = path.join(tempDirectory, 'onboarding-state.json');
  const restoreStatePath = setEnvVar('BIDVIA_STATE_PATH', statePath);
  const restoreTenantId = setEnvVar('BIDVIA_TENANT_ID', 'tenant-env');
  const restorePrincipalId = setEnvVar('BIDVIA_PRINCIPAL_ID', 'principal-env');
  const restoreSessionId = setEnvVar('BIDVIA_SESSION_ID', 'session-secret-env');

  try {
    await runCli([
      'claim-provisional-agent',
      '--provisional-agent-ref',
      'prov-agent-context-show',
      '--claim-token',
      'claim-token-context-show',
    ], {
      createClient: () => ({
        claimProvisionalAgent: async () => ({
          registrationId: 'areg-local',
          principalId: 'principal-local',
          companyId: 'company-local',
          sessionId: 'session-secret-should-not-persist',
          adminSessionId: 'admin-secret-should-not-persist',
        }),
      }) as never,
      resolveExecutionContext: () => ({
        tenantId: 'tenant-context',
      }),
      now: () => '2026-04-02T13:00:00.000Z',
      printJson: () => {},
      printLine: () => {
        throw new Error('claim-provisional-agent should not print help lines');
      },
    });

    const exitCode = await runCli(['context', 'show'], {
      createClient: () => {
        throw new Error('context show should not create a client');
      },
      resolveProcessEnv: () => ({
        BIDVIA_TENANT_ID: 'tenant-env',
        BIDVIA_PRINCIPAL_ID: 'principal-env',
        BIDVIA_SESSION_ID: 'session-secret-env',
        BIDVIA_STATE_PATH: statePath,
      }),
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('context show should not print help lines');
      },
    });

    assert.equal(exitCode, 0);
    assert.deepEqual(printed, [{
      command: 'context show',
      scope: 'local-only',
      journeyBoundary: {
        publicProvisional: {
          label: 'Public Provisional',
          chain: 'create -> query -> claim',
          status: 'claimed',
          claimIsSessionBound: true,
        },
        governedRun: {
          label: 'Governed Run',
          startsAfter: 'successful claim',
          status: 'ready',
        },
      },
      context: {
        tenantId: {
          value: 'tenant-env',
          source: 'env',
        },
        principalId: {
          value: 'principal-env',
          source: 'env',
        },
        companyId: {
          value: 'company-local',
          source: 'local-state',
        },
        registrationId: {
          value: 'areg-local',
          source: 'local-state',
        },
        lastCompletedStep: {
          value: 'claim-provisional-agent',
          source: 'local-state',
        },
        sessionId: {
          present: true,
          source: 'env',
        },
        adminSessionId: {
          present: false,
          source: 'missing',
        },
      },
    }]);
  } finally {
    restoreSessionId();
    restorePrincipalId();
    restoreTenantId();
    restoreStatePath();
  }
});

test('runCli prints a local-only whoami summary with env precedence, local-state fallback, and explicit non-authoritative login guidance', async () => {
  const printed: unknown[] = [];
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-cli-whoami-'));
  const statePath = path.join(tempDirectory, 'onboarding-state.json');
  const restoreStatePath = setEnvVar('BIDVIA_STATE_PATH', statePath);

  try {
    await runCli([
      'claim-provisional-agent',
      '--provisional-agent-ref',
      'prov-agent-whoami',
      '--claim-token',
      'claim-token-whoami',
    ], {
      createClient: () => ({
        claimProvisionalAgent: async () => ({
          registrationId: 'areg-local',
          principalId: 'principal-local',
          companyId: 'company-local',
          sessionId: 'session-secret-should-not-persist',
          adminSessionId: 'admin-secret-should-not-persist',
        }),
      }) as never,
      resolveExecutionContext: () => ({
        tenantId: 'tenant-context',
      }),
      resolveProcessEnv: () => ({
        BIDVIA_TENANT_ID: 'tenant-env',
        BIDVIA_SESSION_ID: 'session-secret-env',
        BIDVIA_STATE_PATH: statePath,
      }),
      now: () => '2026-04-02T14:00:00.000Z',
      printJson: () => {},
      printLine: () => {
        throw new Error('claim-provisional-agent should not print help lines');
      },
    });

    const exitCode = await runCli(['whoami'], {
      createClient: () => {
        throw new Error('whoami should not create a client');
      },
      resolveProcessEnv: () => ({
        BIDVIA_TENANT_ID: 'tenant-env',
        BIDVIA_PRINCIPAL_ID: 'principal-env',
        BIDVIA_SESSION_ID: 'session-secret-env',
        BIDVIA_STATE_PATH: statePath,
      }),
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('whoami should not print help lines');
      },
    });

    assert.equal(exitCode, 0);
    assert.deepEqual(printed, [{
      command: 'whoami',
      scope: 'local-only',
      identityKind: 'effective-local-context',
      authoritativeRemoteLoginState: false,
      guidance: 'Reports effective local identity/context from env and local onboarding state only. This is not proof of platform login and does not replace /account/me.',
      journeyBoundary: {
        publicProvisional: {
          label: 'Public Provisional',
          chain: 'create -> query -> claim',
          status: 'claimed',
          claimIsSessionBound: true,
        },
        governedRun: {
          label: 'Governed Run',
          startsAfter: 'successful claim',
          status: 'ready',
        },
      },
      identity: {
        tenantId: {
          value: 'tenant-env',
          source: 'env',
        },
        principalId: {
          value: 'principal-env',
          source: 'env',
        },
        companyId: {
          value: 'company-local',
          source: 'local-state',
        },
        registrationId: {
          value: 'areg-local',
          source: 'local-state',
        },
      },
      localOnboardingState: {
        present: true,
        lastCompletedStep: {
          value: 'claim-provisional-agent',
          source: 'local-state',
        },
      },
      secretSafeSignals: {
        sessionId: {
          present: true,
          source: 'env',
        },
        adminSessionId: {
          present: false,
          source: 'missing',
        },
      },
    }]);
  } finally {
    restoreStatePath();
  }
});

test('runCli prints a missing local-only whoami summary when no env or onboarding context is available', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['whoami'], {
    createClient: () => {
      throw new Error('whoami should not create a client');
    },
    resolveProcessEnv: () => ({}),
    readLocalOnboardingState: async () => null,
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('whoami should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(printed, [{
    command: 'whoami',
    scope: 'local-only',
    identityKind: 'effective-local-context',
    authoritativeRemoteLoginState: false,
    guidance: 'Reports effective local identity/context from env and local onboarding state only. This is not proof of platform login and does not replace /account/me.',
    journeyBoundary: {
      publicProvisional: {
        label: 'Public Provisional',
        chain: 'create -> query -> claim',
        status: 'available',
        claimIsSessionBound: true,
      },
      governedRun: {
        label: 'Governed Run',
        startsAfter: 'successful claim',
        status: 'not-ready',
      },
    },
    identity: {
      tenantId: {
        value: null,
        source: 'missing',
      },
      principalId: {
        value: null,
        source: 'missing',
      },
      companyId: {
        value: null,
        source: 'missing',
      },
      registrationId: {
        value: null,
        source: 'missing',
      },
    },
    localOnboardingState: {
      present: false,
      lastCompletedStep: {
        value: null,
        source: 'missing',
      },
    },
    secretSafeSignals: {
      sessionId: {
        present: false,
        source: 'missing',
      },
      adminSessionId: {
        present: false,
        source: 'missing',
      },
    },
  }]);
});
