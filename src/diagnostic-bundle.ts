import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  buildDiagnosticBundleReport,
  type BidviaDiagnosticBundleReport,
} from './contracts.js';
import {
  buildValidationSmokeSnapshot,
  type BidviaValidationSmokeSnapshotOptions,
} from './validation-smoke.js';

function buildDiagnosticSummaryMarkdown(report: BidviaDiagnosticBundleReport['smokeReport']): string {
  return [
    '# Bidvia Diagnostic Bundle',
    '',
    '- command: diagnostic-bundle-export',
    '- scope: local-only',
    '- source report: validation-smoke',
    `- passed checks: ${report.summary.passedCount}`,
    `- blocked checks: ${report.summary.blockedCount}`,
    `- failed checks: ${report.summary.failedCount}`,
    '',
    '## Checks',
    ...report.checks.map((check) => `- ${check.checkKey}: ${check.status} — ${check.summary}`),
    '',
  ].join('\n');
}

export async function exportDiagnosticBundle(
  outputPath: string,
  options: BidviaValidationSmokeSnapshotOptions = {},
): Promise<BidviaDiagnosticBundleReport> {
  const smokeReport = buildValidationSmokeSnapshot(options);
  const report = buildDiagnosticBundleReport({
    command: 'diagnostic-bundle-export',
    scope: 'local-only',
    outputPath,
    writtenFiles: ['diagnostic-bundle.json', 'diagnostic-summary.md'],
    summaryFormat: 'markdown',
    smokeReport,
  });

  await mkdir(outputPath, { recursive: true });
  await writeFile(
    path.join(outputPath, 'diagnostic-bundle.json'),
    JSON.stringify(report, null, 2),
    'utf8',
  );
  await writeFile(
    path.join(outputPath, 'diagnostic-summary.md'),
    buildDiagnosticSummaryMarkdown(smokeReport),
    'utf8',
  );

  return report;
}
