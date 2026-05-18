import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bidviaClientToolingBlockerKinds,
  buildInstallIntegrityReport,
} from '../src/contracts.ts';
import type {
  BidviaClientToolingBlockerKind,
  BidviaInstallIntegrityReport,
} from '../src/contracts.ts';

test('install integrity contract freezes the top-level local-only diagnostic envelope', () => {
  const report: BidviaInstallIntegrityReport = buildInstallIntegrityReport({
    command: 'install-integrity',
    scope: 'local-only',
    activeExecutablePath: '/usr/local/bin/bidvia',
    resolvedPackageRoot: '/usr/local/lib/node_modules/@bidvia/client',
    resolvedDistRoot: '/usr/local/lib/node_modules/@bidvia/client/dist',
    packageName: '@bidvia/client',
    packageVersion: '1.0.0',
    pathDriftDetected: true,
    driftSignals: ['path-prefix-diverged'],
    blockerKind: 'install-path-mismatch',
    recommendedNextStep: 'Reinstall the active bidvia binary from the intended package root.',
  });

  assert.deepEqual(report, {
    command: 'install-integrity',
    scope: 'local-only',
    activeExecutablePath: '/usr/local/bin/bidvia',
    resolvedPackageRoot: '/usr/local/lib/node_modules/@bidvia/client',
    resolvedDistRoot: '/usr/local/lib/node_modules/@bidvia/client/dist',
    packageName: '@bidvia/client',
    packageVersion: '1.0.0',
    pathDriftDetected: true,
    driftSignals: ['path-prefix-diverged'],
    blockerKind: 'install-path-mismatch',
    recommendedNextStep: 'Reinstall the active bidvia binary from the intended package root.',
  });

  const blockerKind: BidviaClientToolingBlockerKind = 'install-path-mismatch';
  assert.equal(blockerKind, 'install-path-mismatch');
  assert.deepEqual(bidviaClientToolingBlockerKinds, [
    'install-path-mismatch',
    'missing-context',
    'transport-failure',
    'returned-bounded-stop',
    'unsupported-or-deferred-surface',
  ]);
});
