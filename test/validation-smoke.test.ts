import test from 'node:test';
import assert from 'node:assert/strict';

import { runCli } from '../src/cli.ts';
import { buildValidationSmokeSnapshot } from '../src/validation-smoke.ts';

test('buildValidationSmokeSnapshot orchestrates existing local diagnostics in a stable external-user-facing order', () => {
  const report = buildValidationSmokeSnapshot({
    installIntegrity: {
      activeExecutablePath: '/usr/local/lib/node_modules/@bidvia/client/dist/cli.js',
      packageRoot: '/usr/local/lib/node_modules/@bidvia/client',
      packageVersion: '1.0.0',
    },
    env: {
      BIDVIA_BASE_URL: 'https://api.bidvia.cn',
      BIDVIA_TENANT_ID: 'tenant-a',
      BIDVIA_SESSION_ID: 'sess-1',
      BIDVIA_PRINCIPAL_ID: 'principal-a',
    },
    localOnboardingState: null,
  });

  assert.equal(report.command, 'validation-smoke');
  assert.equal(report.scope, 'local-only');
  assert.deepEqual(report.checks.map((check) => check.checkKey), [
    'install-integrity',
    'environment-mode',
    'launch-topology-smoke',
    'runtime-capabilities',
    'server-capabilities',
    'context-availability',
  ]);
  assert.deepEqual(report.summary, {
    passedCount: 5,
    blockedCount: 1,
    failedCount: 0,
  });
  assert.deepEqual(report.contextAvailability, {
    tenantIdPresent: true,
    sessionIdPresent: true,
    principalIdPresent: true,
    adminSessionIdPresent: false,
  });
  assert.equal(report.environment.baseUrl, 'https://api.bidvia.cn');
  assert.equal(report.environment.environmentMode, 'production');
  assert.equal(report.installIntegrity.command, 'install-integrity');
  assert.equal(report.installIntegrity.scope, 'local-only');
  assert.equal(report.checks[0]?.status, 'passed');
  assert.equal(report.checks[4]?.status, 'blocked');
  assert.equal(report.checks[4]?.blockerKind, 'unsupported-or-deferred-surface');
  assert.equal(report.checks[5]?.status, 'passed');
});

test('buildValidationSmokeSnapshot reports blocked local context explicitly without inventing operator-only execution', () => {
  const report = buildValidationSmokeSnapshot({
    installIntegrity: {
      activeExecutablePath: '/usr/local/lib/node_modules/@bidvia/client/dist/cli.js',
      packageRoot: '/usr/local/lib/node_modules/@bidvia/client',
      packageVersion: '1.0.0',
    },
    env: {
      BIDVIA_BASE_URL: 'http://127.0.0.1:8787',
    },
    localOnboardingState: null,
  });

  assert.deepEqual(report.contextAvailability, {
    tenantIdPresent: false,
    sessionIdPresent: false,
    principalIdPresent: false,
    adminSessionIdPresent: false,
  });
  assert.equal(report.checks[5]?.checkKey, 'context-availability');
  assert.equal(report.checks[5]?.status, 'blocked');
  assert.equal(report.checks[5]?.blockerKind, 'missing-context');
  assert.equal(report.checks[4]?.status, 'blocked');
  assert.equal(report.checks[4]?.blockerKind, 'unsupported-or-deferred-surface');
  assert.equal(report.summary.blockedCount, 2);
});

test('runCli validation-smoke prints the bounded smoke report', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['validation-smoke'], {
    printJson: (value: unknown) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('validation-smoke should not print help lines');
    },
    resolveProcessEnv: () => ({
      BIDVIA_BASE_URL: 'https://api.bidvia.cn',
      BIDVIA_TENANT_ID: 'tenant-a',
      BIDVIA_SESSION_ID: 'sess-1',
      BIDVIA_PRINCIPAL_ID: 'principal-a',
    }),
    readLocalOnboardingState: async () => null,
    createClient: () => {
      throw new Error('validation-smoke should stay local/report-only');
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(printed.length, 1);
  const report = printed[0] as { command: string; scope: string; checks: Array<{ checkKey: string }> };
  assert.equal(report.command, 'validation-smoke');
  assert.equal(report.scope, 'local-only');
  assert.deepEqual(report.checks.map((check) => check.checkKey), [
    'install-integrity',
    'environment-mode',
    'launch-topology-smoke',
    'runtime-capabilities',
    'server-capabilities',
    'context-availability',
  ]);
});
