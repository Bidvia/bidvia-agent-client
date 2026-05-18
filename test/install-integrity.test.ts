import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCli } from '../src/cli.ts';
import { buildInstallIntegritySnapshot } from '../src/install-integrity.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');

test('buildInstallIntegritySnapshot reports the active binary, package roots, and local package version when the current executable matches the local dist entrypoint', () => {
  const activeExecutablePath = path.join(workspaceRoot, 'dist', 'cli.js');

  const report = buildInstallIntegritySnapshot({
    activeExecutablePath,
    packageRoot: workspaceRoot,
    npmGlobalPrefix: null,
  });

  assert.deepEqual(report, {
    command: 'install-integrity',
    scope: 'local-only',
    activeExecutablePath,
    resolvedPackageRoot: workspaceRoot,
    resolvedDistRoot: path.join(workspaceRoot, 'dist'),
    packageName: '@bidvia/client',
    packageVersion: '1.0.0',
    pathDriftDetected: false,
    driftSignals: [],
    blockerKind: null,
    recommendedNextStep: null,
  });
});

test('buildInstallIntegritySnapshot flags install-path mismatch and points to a safe next step when the active binary falls outside the intended package root', () => {
  const report = buildInstallIntegritySnapshot({
    activeExecutablePath: '/usr/local/bin/bidvia',
    packageRoot: '/opt/homebrew/lib/node_modules/@bidvia/client',
    packageVersion: '1.0.0',
    npmGlobalPrefix: '/opt/homebrew',
  });

  assert.deepEqual(report, {
    command: 'install-integrity',
    scope: 'local-only',
    activeExecutablePath: '/usr/local/bin/bidvia',
    resolvedPackageRoot: '/opt/homebrew/lib/node_modules/@bidvia/client',
    resolvedDistRoot: '/opt/homebrew/lib/node_modules/@bidvia/client/dist',
    packageName: '@bidvia/client',
    packageVersion: '1.0.0',
    pathDriftDetected: true,
    driftSignals: ['active-binary-outside-package-root', 'active-binary-outside-npm-prefix'],
    blockerKind: 'install-path-mismatch',
    recommendedNextStep: 'Reinstall or relink the active bidvia binary so it points at the intended package root before rerunning runtime validation.',
  });
});

test('buildInstallIntegritySnapshot resolves npm bin symlink wrappers to the real dist cli target before checking path drift', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'bidvia-install-integrity-'));
  const packageRoot = path.join(tempRoot, 'node_modules', '@bidvia', 'client');
  const distRoot = path.join(packageRoot, 'dist');
  const realCliPath = path.join(distRoot, 'cli.js');
  const binRoot = path.join(tempRoot, 'node_modules', '.bin');
  const shimPath = path.join(binRoot, 'bidvia');

  mkdirSync(distRoot, { recursive: true });
  mkdirSync(binRoot, { recursive: true });
  writeFileSync(realCliPath, '#!/usr/bin/env node\n');
  symlinkSync('../@bidvia/client/dist/cli.js', shimPath);

  const resolvedPackageRoot = realpathSync(packageRoot);
  const resolvedDistRoot = realpathSync(distRoot);
  const resolvedCliPath = realpathSync(realCliPath);

  const report = buildInstallIntegritySnapshot({
    activeExecutablePath: shimPath,
    packageRoot,
    packageVersion: '1.0.0',
    npmGlobalPrefix: null,
  });

  assert.deepEqual(report, {
    command: 'install-integrity',
    scope: 'local-only',
    activeExecutablePath: resolvedCliPath,
    resolvedPackageRoot: resolvedPackageRoot,
    resolvedDistRoot: resolvedDistRoot,
    packageName: '@bidvia/client',
    packageVersion: '1.0.0',
    pathDriftDetected: false,
    driftSignals: [],
    blockerKind: null,
    recommendedNextStep: null,
  });
});

test('buildInstallIntegritySnapshot resolves the default argvEntry symlink wrapper before checking path drift', () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'bidvia-install-integrity-argv-'));
  const packageRoot = path.join(tempRoot, 'node_modules', '@bidvia', 'client');
  const distRoot = path.join(packageRoot, 'dist');
  const realCliPath = path.join(distRoot, 'cli.js');
  const binRoot = path.join(tempRoot, 'node_modules', '.bin');
  const shimPath = path.join(binRoot, 'bidvia');
  const previousArgvEntry = process.argv[1];

  mkdirSync(distRoot, { recursive: true });
  mkdirSync(binRoot, { recursive: true });
  writeFileSync(realCliPath, '#!/usr/bin/env node\n');
  symlinkSync('../@bidvia/client/dist/cli.js', shimPath);

  const resolvedPackageRoot = realpathSync(packageRoot);
  const resolvedDistRoot = realpathSync(distRoot);
  const resolvedCliPath = realpathSync(realCliPath);

  process.argv[1] = shimPath;

  try {
    const report = buildInstallIntegritySnapshot({
      packageRoot,
      packageVersion: '1.0.0',
      npmGlobalPrefix: null,
    });

    assert.deepEqual(report, {
      command: 'install-integrity',
      scope: 'local-only',
      activeExecutablePath: resolvedCliPath,
      resolvedPackageRoot: resolvedPackageRoot,
      resolvedDistRoot: resolvedDistRoot,
      packageName: '@bidvia/client',
      packageVersion: '1.0.0',
      pathDriftDetected: false,
      driftSignals: [],
      blockerKind: null,
      recommendedNextStep: null,
    });
  } finally {
    process.argv[1] = previousArgvEntry;
  }
});

test('runCli install-integrity prints the local-only install report', async () => {
  const printed: unknown[] = [];
  const activeExecutablePath = path.join(workspaceRoot, 'dist', 'cli.js');
  const previousArgvEntry = process.argv[1];

  process.argv[1] = activeExecutablePath;

  try {
    const overrides: Parameters<typeof runCli>[1] = {
      printJson: (value: unknown) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('install-integrity should not print help lines');
      },
      resolveProcessEnv: () => process.env,
      createClient: () => {
        throw new Error('install-integrity should stay local-only');
      },
      resolveBaseUrl: () => 'https://api.bidvia.cn',
      resolveEnvironmentMode: () => 'production',
    };

    const exitCode = await runCli(['install-integrity'], overrides);

    assert.equal(exitCode, 0);
    assert.deepEqual(printed, [
      {
        command: 'install-integrity',
        scope: 'local-only',
        activeExecutablePath,
        resolvedPackageRoot: workspaceRoot,
        resolvedDistRoot: path.join(workspaceRoot, 'dist'),
        packageName: '@bidvia/client',
        packageVersion: '1.0.0',
        pathDriftDetected: false,
        driftSignals: [],
        blockerKind: null,
        recommendedNextStep: null,
      },
    ]);
  } finally {
    process.argv[1] = previousArgvEntry;
  }
});
