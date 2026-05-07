import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { runCli } from '../src/cli.ts';
import { exportDiagnosticBundle } from '../src/diagnostic-bundle.ts';

test('exportDiagnosticBundle writes a machine-readable bundle and markdown summary from the bounded smoke report', async () => {
  const outputPath = await mkdtemp(path.join(os.tmpdir(), 'bidvia-diagnostic-bundle-'));

  const report = await exportDiagnosticBundle(outputPath, {
    env: {
      BIDVIA_BASE_URL: 'https://api.bidvia.cn',
      BIDVIA_TENANT_ID: 'tenant-a',
      BIDVIA_SESSION_ID: 'sess-1',
      BIDVIA_PRINCIPAL_ID: 'principal-a',
    },
    localOnboardingState: null,
    installIntegrity: {
      activeExecutablePath: '/usr/local/lib/node_modules/@bidvia/client/dist/cli.js',
      packageRoot: '/usr/local/lib/node_modules/@bidvia/client',
      packageVersion: '1.0.0',
    },
  });

  assert.deepEqual(report, {
    command: 'diagnostic-bundle-export',
    scope: 'local-only',
    outputPath,
    writtenFiles: ['diagnostic-bundle.json', 'diagnostic-summary.md'],
    summaryFormat: 'markdown',
    smokeReport: report.smokeReport,
  });

  const bundleJson = JSON.parse(await readFile(path.join(outputPath, 'diagnostic-bundle.json'), 'utf8')) as { command: string; scope: string };
  const summaryMarkdown = await readFile(path.join(outputPath, 'diagnostic-summary.md'), 'utf8');

  assert.equal(bundleJson.command, 'diagnostic-bundle-export');
  assert.equal(bundleJson.scope, 'local-only');
  assert.match(summaryMarkdown, /^# Bidvia Diagnostic Bundle/m);
  assert.match(summaryMarkdown, /validation-smoke/m);
});

test('runCli diagnostic-bundle-export writes the bounded export report', async () => {
  const printed: unknown[] = [];
  const outputPath = await mkdtemp(path.join(os.tmpdir(), 'bidvia-diagnostic-bundle-cli-'));

  const exitCode = await runCli(['diagnostic-bundle-export', '--output', outputPath], {
    printJson: (value: unknown) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('diagnostic-bundle-export should not print help lines');
    },
    resolveProcessEnv: () => ({
      BIDVIA_BASE_URL: 'https://api.bidvia.cn',
      BIDVIA_TENANT_ID: 'tenant-a',
      BIDVIA_SESSION_ID: 'sess-1',
      BIDVIA_PRINCIPAL_ID: 'principal-a',
    }),
    readLocalOnboardingState: async () => null,
    createClient: () => {
      throw new Error('diagnostic-bundle-export should stay local/report-only');
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(printed.length, 1);
  const report = printed[0] as { command: string; outputPath: string; writtenFiles: string[] };
  assert.equal(report.command, 'diagnostic-bundle-export');
  assert.equal(report.outputPath, outputPath);
  assert.deepEqual(report.writtenFiles, ['diagnostic-bundle.json', 'diagnostic-summary.md']);
});
