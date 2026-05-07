import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildInstallIntegrityReport,
  buildValidationSmokeReport,
} from '../src/contracts.ts';
import type {
  BidviaClientToolingBlockerKind,
  BidviaInstallIntegrityReport,
  BidviaValidationSmokeCheck,
  BidviaValidationSmokeReport,
} from '../src/contracts.ts';

test('validation smoke contract freezes the top-level report and check ordering', () => {
  const installIntegrity: BidviaInstallIntegrityReport = buildInstallIntegrityReport({
    command: 'install-integrity',
    scope: 'local-only',
    activeExecutablePath: '/usr/local/bin/bidvia',
    resolvedPackageRoot: '/usr/local/lib/node_modules/@bidvia/client',
    resolvedDistRoot: '/usr/local/lib/node_modules/@bidvia/client/dist',
    packageName: '@bidvia/client',
    packageVersion: '1.0.0',
    pathDriftDetected: false,
    driftSignals: [],
    blockerKind: null,
    recommendedNextStep: null,
  });

  const checks: BidviaValidationSmokeCheck[] = [
    {
      checkKey: 'install-integrity',
      status: 'passed',
      blockerKind: null,
      summary: 'Active bidvia binary matches the expected package root.',
    },
    {
      checkKey: 'environment-mode',
      status: 'blocked',
      blockerKind: 'missing-context',
      summary: 'Environment mode could not resolve because base URL context is absent.',
    },
  ];

  const report: BidviaValidationSmokeReport = buildValidationSmokeReport({
    command: 'validation-smoke',
    scope: 'local-only',
    installIntegrity,
    environment: {
      baseUrl: 'https://api.bidvia.cn',
      environmentMode: 'production',
    },
    contextAvailability: {
      tenantIdPresent: false,
      sessionIdPresent: false,
      principalIdPresent: false,
      adminSessionIdPresent: false,
    },
    checks,
    summary: {
      passedCount: 1,
      blockedCount: 1,
      failedCount: 0,
    },
  });

  assert.equal(report.command, 'validation-smoke');
  assert.equal(report.scope, 'local-only');
  assert.deepEqual(report.checks.map((check) => check.checkKey), [
    'install-integrity',
    'environment-mode',
  ]);

  const blockerKind: BidviaClientToolingBlockerKind = 'missing-context';
  assert.equal(blockerKind, 'missing-context');
});
