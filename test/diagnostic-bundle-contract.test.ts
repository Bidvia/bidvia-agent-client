import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDiagnosticBundleReport,
  buildInstallIntegrityReport,
  buildValidationSmokeReport,
} from '../src/contracts.ts';
import type {
  BidviaDiagnosticBundleReport,
  BidviaInstallIntegrityReport,
  BidviaValidationSmokeReport,
} from '../src/contracts.ts';

test('diagnostic bundle contract freezes artifact paths and user-shareable summary format', () => {
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

  const smokeReport: BidviaValidationSmokeReport = buildValidationSmokeReport({
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
    checks: [],
    summary: {
      passedCount: 0,
      blockedCount: 0,
      failedCount: 0,
    },
  });

  const report: BidviaDiagnosticBundleReport = buildDiagnosticBundleReport({
    command: 'diagnostic-bundle-export',
    scope: 'local-only',
    outputPath: '/tmp/bidvia-diagnostic-bundle',
    writtenFiles: [
      'diagnostic-bundle.json',
      'diagnostic-summary.md',
    ],
    summaryFormat: 'markdown',
    smokeReport,
  });

  assert.deepEqual(report, {
    command: 'diagnostic-bundle-export',
    scope: 'local-only',
    outputPath: '/tmp/bidvia-diagnostic-bundle',
    writtenFiles: [
      'diagnostic-bundle.json',
      'diagnostic-summary.md',
    ],
    summaryFormat: 'markdown',
    smokeReport,
  });
});
