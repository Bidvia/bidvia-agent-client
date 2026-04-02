import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { BidviaClientTransportError } from '../src/client.ts';
import { runCli } from '../src/cli.ts';

type FirstAccessSnapshot = {
  command: string;
  scope: string;
  localChecks?: {
    cliVersion: string;
    baseUrl: string;
    environmentMode: string;
    localOnboardingState: { present: boolean };
    effectiveContext: {
      tenantId: { value: string | null; source: string };
      principalId: { value: string | null; source: string };
      companyId: { value: string | null; source: string };
      registrationId: { value: string | null; source: string };
      lastCompletedStep: { value: string | null; source: string };
    };
    completeness: {
      readinessLiveCheckEligible: boolean;
      missingForReadinessLiveCheck: string[];
    };
  };
  localOnboardingState?: { present: boolean };
  effectiveContext?: {
    tenantId: { value: string | null; source: string };
    principalId: { value: string | null; source: string };
    companyId: { value: string | null; source: string };
    registrationId: { value: string | null; source: string };
    lastCompletedStep: { value: string | null; source: string };
  };
  reachability?: {
    attempted: boolean;
    reachable: boolean;
    statusCode: number | null;
    guidance: string;
  };
  readinessLiveCheck?: {
    attempted: boolean;
    status: string;
    eligibility: { eligible: boolean; missingContext: string[] };
    guidance: string;
    result: unknown;
    error?: {
      name: string;
      message: string;
      code?: string;
      status?: number;
      responseBody?: unknown;
    };
  };
  onboarding: {
    journeyKey: string;
    journeyLabel: string;
    currentStage: {
      key: string;
      blocked: boolean;
      blockedOn: string | null;
      lastCompletedStep: string | null;
    };
    nextCommands: Array<{ command: string; rationale: string }>;
    firstSuccessNextStep: {
      command: string;
      rationale: string;
      journeyStage: string;
    };
  };
};

function getSinglePrintedSnapshot<T>(printed: unknown[]): T {
  assert.equal(printed.length, 1);
  return printed[0] as T;
}

function assertFirstSuccessNextStep(snapshot: FirstAccessSnapshot) {
  assert.deepEqual(snapshot.onboarding.firstSuccessNextStep, {
    command: 'registration-lifecycle-plan',
    rationale: 'Use the lifecycle plan next so the first successful onboarding path stays aligned with the shipped provisional-to-registration chain.',
    journeyStage: 'governed-run-execution',
  });
}

test('runCli help lists doctor alongside other first-access visibility commands', async () => {
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
  assert(lines.includes('  doctor'));
});

test('runCli doctor fresh machine reports local blockers, reachability, and skips readiness live check', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['doctor'], {
    createClient: () => {
      throw new Error('doctor should not create a generic client');
    },
    resolveProcessEnv: () => ({}),
    resolveBaseUrl: () => 'https://api.bidvia.ai',
    resolveEnvironmentMode: () => 'production',
    readLocalOnboardingState: async () => null,
    probeReachability: async () => ({
      reachable: true,
      statusCode: 204,
      error: null,
    }),
    runDoctorReadinessCheck: async () => {
      throw new Error('fresh machine should not attempt readiness live check');
    },
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('doctor should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  const snapshot = getSinglePrintedSnapshot<FirstAccessSnapshot>(printed);
  assert.equal(snapshot.command, 'doctor');
  assert.equal(snapshot.scope, 'local-first-read-only');
  assert.equal(snapshot.localChecks?.baseUrl, 'https://api.bidvia.ai');
  assert.equal(snapshot.localChecks?.environmentMode, 'production');
  assert.equal(snapshot.localChecks?.localOnboardingState.present, false);
  assert.deepEqual(snapshot.localChecks?.completeness, {
    readinessLiveCheckEligible: false,
    missingForReadinessLiveCheck: ['tenantId', 'principalId', 'registrationId'],
  });
  assert.equal(snapshot.reachability?.attempted, true);
  assert.equal(snapshot.reachability?.reachable, true);
  assert.equal(snapshot.reachability?.statusCode, 204);
  assert.equal(
    snapshot.reachability?.guidance,
    'Reachability only confirms that the configured endpoint answered. It does not prove login, governed auth, or route readiness.',
  );
  assert.deepEqual(snapshot.readinessLiveCheck, {
    attempted: false,
    status: 'not-attempted',
    eligibility: {
      eligible: false,
      missingContext: ['tenantId', 'principalId', 'registrationId'],
    },
    guidance: 'Readiness live check only runs when tenantId, principalId, and registrationId are all available from env or local onboarding state.',
    result: null,
  });
  assert.equal(snapshot.onboarding.currentStage.key, 'missing-tenant-context');
  assert.deepEqual(snapshot.onboarding.nextCommands.map((entry) => entry.command), [
    'bidvia context show',
    'bidvia create-provisional-agent --provisional-agent-ref ...',
    'bidvia query-provisional-agent --provisional-agent-ref ...',
    'bidvia claim-provisional-agent --provisional-agent-ref ... --claim-token ...',
  ]);
  assertFirstSuccessNextStep(snapshot);
});

test('runCli doctor with partial local state reports blocked readiness context and ordered next commands', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['doctor'], {
    createClient: () => {
      throw new Error('partial-state doctor should not create a generic client');
    },
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-env',
    }),
    resolveBaseUrl: () => 'https://api.bidvia.ai',
    resolveEnvironmentMode: () => 'production',
    readLocalOnboardingState: async () => ({
      tenantId: 'tenant-local',
      companyId: 'company-local',
      registrationId: 'areg-local',
      lastCompletedStep: 'claim-provisional-agent',
    }),
    probeReachability: async () => ({
      reachable: true,
      statusCode: 200,
      error: null,
    }),
    runDoctorReadinessCheck: async () => {
      throw new Error('partial-state doctor should not attempt readiness live check');
    },
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('doctor should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  const snapshot = getSinglePrintedSnapshot<FirstAccessSnapshot>(printed);
  assert.equal(snapshot.command, 'doctor');
  assert.equal(snapshot.localChecks?.localOnboardingState.present, true);
  assert.deepEqual(snapshot.localChecks?.effectiveContext.tenantId, { value: 'tenant-env', source: 'env' });
  assert.deepEqual(snapshot.localChecks?.effectiveContext.companyId, { value: 'company-local', source: 'local-state' });
  assert.deepEqual(snapshot.localChecks?.effectiveContext.registrationId, { value: 'areg-local', source: 'local-state' });
  assert.deepEqual(snapshot.localChecks?.completeness, {
    readinessLiveCheckEligible: false,
    missingForReadinessLiveCheck: ['principalId'],
  });
  assert.equal(snapshot.onboarding.currentStage.key, 'claimed-awaiting-readiness-context');
  assert.deepEqual(snapshot.onboarding.nextCommands.map((entry) => entry.command), [
    'bidvia whoami',
    'bidvia route-context-matrix',
    'bidvia doctor',
  ]);
  assertFirstSuccessNextStep(snapshot);
});

test('runCli doctor with tenant-only pre-claim context stays on public provisional guidance', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['doctor'], {
    createClient: () => {
      throw new Error('tenant-only doctor should not create a generic client');
    },
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-env',
    }),
    resolveBaseUrl: () => 'https://api.bidvia.ai',
    resolveEnvironmentMode: () => 'production',
    readLocalOnboardingState: async () => ({
      tenantId: 'tenant-local',
      companyId: 'company-local',
    }),
    probeReachability: async () => ({
      reachable: true,
      statusCode: 200,
      error: null,
    }),
    runDoctorReadinessCheck: async () => {
      throw new Error('tenant-only doctor should not attempt readiness live check');
    },
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('doctor should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.equal((printed[0] as { onboarding: { currentStage: { key: string } } }).onboarding.currentStage.key, 'provisional-claim-pending');
  assert.deepEqual((printed[0] as {
    onboarding: { nextCommands: Array<{ command: string }> };
  }).onboarding.nextCommands.map((entry) => entry.command), [
    'bidvia create-provisional-agent --provisional-agent-ref ...',
    'bidvia query-provisional-agent --provisional-agent-ref ...',
    'bidvia claim-provisional-agent --provisional-agent-ref ... --claim-token ...',
    'bidvia whoami',
    'bidvia doctor',
  ]);
});

test('runCli doctor with readiness live check separates local diagnostics from the governed readiness result', async () => {
  const printed: unknown[] = [];
  const readinessCalls: Array<{ tenantId: string; principalId: string; registrationId: string; baseUrl: string }> = [];

  const exitCode = await runCli(['doctor'], {
    createClient: () => {
      throw new Error('doctor should use the dedicated readiness check dependency');
    },
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-env',
      BIDVIA_PRINCIPAL_ID: 'principal-env',
    }),
    resolveBaseUrl: () => 'https://api.bidvia.ai',
    resolveEnvironmentMode: () => 'production',
    readLocalOnboardingState: async () => ({
      tenantId: 'tenant-local',
      principalId: 'principal-local',
      companyId: 'company-local',
      registrationId: 'areg-local',
      lastCompletedStep: 'claim-provisional-agent',
    }),
    probeReachability: async () => ({
      reachable: true,
      statusCode: 200,
      error: null,
    }),
    runDoctorReadinessCheck: async (context, baseUrl) => {
      readinessCalls.push({
        tenantId: context.tenantId!,
        principalId: context.principalId!,
        registrationId: context.registrationId!,
        baseUrl,
      });

      return {
        readiness: 'ready',
        authority: 'governed',
      };
    },
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('doctor should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(readinessCalls, [{
    tenantId: 'tenant-env',
    principalId: 'principal-env',
    registrationId: 'areg-local',
    baseUrl: 'https://api.bidvia.ai',
  }]);
  const snapshot = getSinglePrintedSnapshot<FirstAccessSnapshot>(printed);
  assert.equal(snapshot.localChecks?.completeness.readinessLiveCheckEligible, true);
  assert.deepEqual(snapshot.readinessLiveCheck, {
    attempted: true,
    status: 'ok',
    eligibility: {
      eligible: true,
      missingContext: [],
    },
    guidance: 'Readiness live check only runs when tenantId, principalId, and registrationId are all available from env or local onboarding state.',
    result: {
      readiness: 'ready',
      authority: 'governed',
    },
  });
  assert.equal(snapshot.onboarding.currentStage.key, 'ready-for-registration-lifecycle');
  assert.deepEqual(snapshot.onboarding.nextCommands.map((entry) => entry.command), ['bidvia registration-lifecycle-plan']);
  assertFirstSuccessNextStep(snapshot);
});

test('runCli doctor captures readiness live-check transport failures inside structured diagnostic output', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['doctor'], {
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-env',
      BIDVIA_PRINCIPAL_ID: 'principal-env',
    }),
    resolveBaseUrl: () => 'https://api.bidvia.ai',
    resolveEnvironmentMode: () => 'production',
    readLocalOnboardingState: async () => ({
      companyId: 'company-local',
      registrationId: 'areg-local',
      lastCompletedStep: 'claim-provisional-agent',
    }),
    probeReachability: async () => ({
      reachable: true,
      statusCode: 200,
      error: null,
    }),
    runDoctorReadinessCheck: async () => {
      throw new BidviaClientTransportError(
        'governed readiness denied',
        'permission',
        403,
        {
          responseBody: {
            code: 'active_role_binding_required',
          },
        },
      );
    },
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('doctor should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  const snapshot = getSinglePrintedSnapshot<FirstAccessSnapshot>(printed);
  assert.equal(snapshot.readinessLiveCheck?.status, 'failed');
  assert.deepEqual(snapshot.readinessLiveCheck?.error, {
    name: 'BidviaClientTransportError',
    message: 'governed readiness denied',
    code: 'permission',
    status: 403,
    responseBody: {
      code: 'active_role_binding_required',
    },
  });
  assert.equal(snapshot.onboarding.currentStage.key, 'ready-for-registration-lifecycle');
  assert.deepEqual(snapshot.onboarding.nextCommands.map((entry) => entry.command), ['bidvia registration-lifecycle-plan']);
  assertFirstSuccessNextStep(snapshot);
});

test('runCli onboard fresh machine reports the first ordered create-claim-run commands', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['onboard'], {
    createClient: () => {
      throw new Error('onboard should not create a client');
    },
    resolveProcessEnv: () => ({}),
    readLocalOnboardingState: async () => null,
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('onboard should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  const snapshot = getSinglePrintedSnapshot<FirstAccessSnapshot>(printed);
  assert.equal(snapshot.command, 'onboard');
  assert.equal(snapshot.scope, 'local-first-guided');
  assert.equal(snapshot.localOnboardingState?.present, false);
  assert.deepEqual(snapshot.effectiveContext?.tenantId, { value: null, source: 'missing' });
  assert.deepEqual(snapshot.effectiveContext?.registrationId, { value: null, source: 'missing' });
  assert.equal(snapshot.onboarding.currentStage.key, 'missing-tenant-context');
  assert.deepEqual(snapshot.onboarding.nextCommands.map((entry) => entry.command), [
    'bidvia context show',
    'bidvia create-provisional-agent --provisional-agent-ref ...',
    'bidvia query-provisional-agent --provisional-agent-ref ...',
    'bidvia claim-provisional-agent --provisional-agent-ref ... --claim-token ...',
  ]);
  assertFirstSuccessNextStep(snapshot);
});

test('runCli onboard with provisional progress keeps users on explicit create-claim commands before runtime guidance', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['onboard'], {
    createClient: () => {
      throw new Error('onboard should not create a client');
    },
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-env',
    }),
    readLocalOnboardingState: async () => ({
      tenantId: 'tenant-local',
      lastCompletedStep: 'query-provisional-agent',
    }),
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('onboard should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  const snapshot = getSinglePrintedSnapshot<FirstAccessSnapshot>(printed);
  assert.equal(snapshot.localOnboardingState?.present, true);
  assert.deepEqual(snapshot.effectiveContext?.tenantId, { value: 'tenant-env', source: 'env' });
  assert.deepEqual(snapshot.effectiveContext?.lastCompletedStep, { value: 'query-provisional-agent', source: 'local-state' });
  assert.equal(snapshot.onboarding.currentStage.key, 'provisional-claim-pending');
  assert.deepEqual(snapshot.onboarding.nextCommands.map((entry) => entry.command), [
    'bidvia query-provisional-agent --provisional-agent-ref ...',
    'bidvia claim-provisional-agent --provisional-agent-ref ... --claim-token ...',
    'bidvia whoami',
    'bidvia doctor',
  ]);
  assertFirstSuccessNextStep(snapshot);
});

test('runCli onboard with tenant-only pre-claim context stays on public provisional guidance', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['onboard'], {
    createClient: () => {
      throw new Error('onboard should not create a client');
    },
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-env',
    }),
    readLocalOnboardingState: async () => ({
      tenantId: 'tenant-local',
      companyId: 'company-local',
    }),
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('onboard should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.equal((printed[0] as { onboarding: { currentStage: { key: string } } }).onboarding.currentStage.key, 'provisional-claim-pending');
  assert.deepEqual((printed[0] as {
    onboarding: { nextCommands: Array<{ command: string }> };
  }).onboarding.nextCommands.map((entry) => entry.command), [
    'bidvia create-provisional-agent --provisional-agent-ref ...',
    'bidvia query-provisional-agent --provisional-agent-ref ...',
    'bidvia claim-provisional-agent --provisional-agent-ref ... --claim-token ...',
    'bidvia whoami',
    'bidvia doctor',
  ]);
});

test('runCli onboard reaches provisional-claim-pending from a real query-provisional-agent CLI run', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['onboard'], {
    createClient: () => {
      throw new Error('onboard should not create a client');
    },
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-env',
    }),
    readLocalOnboardingState: async () => ({
      tenantId: 'tenant-env',
      lastCompletedStep: 'query-provisional-agent',
      createdAt: '2026-04-02T12:02:00.000Z',
      updatedAt: '2026-04-02T12:03:00.000Z',
    }),
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('onboard should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.equal((printed[0] as { onboarding: { currentStage: { key: string; lastCompletedStep: string | null } } }).onboarding.currentStage.key, 'provisional-claim-pending');
  assert.equal((printed[0] as { onboarding: { currentStage: { key: string; lastCompletedStep: string | null } } }).onboarding.currentStage.lastCompletedStep, 'query-provisional-agent');
});

test('runCli doctor degrades malformed local onboarding state into a structured warning instead of crashing', async () => {
  const printed: unknown[] = [];
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-cli-first-access-malformed-'));
  const statePath = path.join(tempDirectory, 'onboarding-state.json');

  writeFileSync(statePath, '{malformed-json', 'utf8');

  const exitCode = await runCli(['doctor'], {
    createClient: () => {
      throw new Error('doctor should not create a generic client');
    },
    resolveProcessEnv: () => ({
      BIDVIA_STATE_PATH: statePath,
    }),
    resolveBaseUrl: () => 'https://api.bidvia.ai',
    resolveEnvironmentMode: () => 'production',
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('doctor should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual((printed[0] as { localStateWarnings: unknown[] }).localStateWarnings, [{
    code: 'invalid-local-onboarding-state',
    path: statePath,
    message: 'Local onboarding state file is malformed JSON. Ignoring cached state for this command.',
  }]);
  assert.equal((printed[0] as { localChecks: { localOnboardingState: { present: boolean } } }).localChecks.localOnboardingState.present, false);
});

test('runCli onboard rerun after claim skips provisional actions and points to readiness-runtime commands', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['onboard'], {
    createClient: () => {
      throw new Error('onboard should not create a client');
    },
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-env',
    }),
    readLocalOnboardingState: async () => ({
      tenantId: 'tenant-local',
      principalId: 'principal-local',
      companyId: 'company-local',
      registrationId: 'areg-local',
      lastCompletedStep: 'claim-provisional-agent',
    }),
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('onboard should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  const snapshot = getSinglePrintedSnapshot<FirstAccessSnapshot>(printed);
  assert.equal(snapshot.localOnboardingState?.present, true);
  assert.deepEqual(snapshot.effectiveContext?.principalId, { value: 'principal-local', source: 'local-state' });
  assert.deepEqual(snapshot.effectiveContext?.registrationId, { value: 'areg-local', source: 'local-state' });
  assert.equal(snapshot.onboarding.currentStage.key, 'ready-for-registration-lifecycle');
  assert.deepEqual(snapshot.onboarding.nextCommands.map((entry) => entry.command), [
    'bidvia doctor',
    'bidvia registration-lifecycle-plan',
  ]);
  assertFirstSuccessNextStep(snapshot);
});
