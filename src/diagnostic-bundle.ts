import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  buildDiagnosticBundleReport,
  type BidviaDiagnosticProbeRun,
  type BidviaDiagnosticRerunSafetySummary,
  type BidviaDiagnosticBundleReport,
} from './contracts.js';
import {
  buildValidationSmokeSnapshot,
  type BidviaValidationSmokeSnapshotOptions,
} from './validation-smoke.js';

export interface ExportDiagnosticBundleOptions extends BidviaValidationSmokeSnapshotOptions {
  probeRuns?: BidviaDiagnosticProbeRun[];
}

function buildRerunSafetySummary(probeRuns: BidviaDiagnosticProbeRun[]): BidviaDiagnosticRerunSafetySummary {
  const statePaths = probeRuns.map((probeRun) => probeRun.statePath);
  const outputPaths = probeRuns.map((probeRun) => probeRun.outputPath);
  const generatedIds = probeRuns.flatMap((probeRun) => probeRun.generatedIds);
  const duplicateGeneratedIds = [...new Set(generatedIds.filter((generatedId, index) => generatedIds.indexOf(generatedId) !== index))];

  return {
    uniqueStatePaths: new Set(statePaths).size === statePaths.length,
    uniqueOutputPaths: new Set(outputPaths).size === outputPaths.length,
    duplicateGeneratedIds,
    partialFailureCount: probeRuns.filter((probeRun) => probeRun.phases.some((phase) => phase.status !== 'passed')).length,
  };
}

function buildDiagnosticSummaryMarkdown(bundleReport: BidviaDiagnosticBundleReport): string {
  const report = bundleReport.smokeReport;

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
    ...(bundleReport.rerunSafety === undefined
      ? []
      : [
          '',
          '## Probe rerun safety',
          `- unique state paths: ${bundleReport.rerunSafety.uniqueStatePaths ? 'yes' : 'no'}`,
          `- unique output paths: ${bundleReport.rerunSafety.uniqueOutputPaths ? 'yes' : 'no'}`,
          `- duplicate generated ids: ${bundleReport.rerunSafety.duplicateGeneratedIds.length === 0 ? 'none' : bundleReport.rerunSafety.duplicateGeneratedIds.join(', ')}`,
          `- partial failures: ${bundleReport.rerunSafety.partialFailureCount}`,
        ]),
    ...(bundleReport.probeRuns === undefined
      ? []
      : [
          '',
          '## Probe phases',
          ...bundleReport.probeRuns.flatMap((probeRun) => [
            `- ${probeRun.probeKey}: state=${probeRun.statePath} output=${probeRun.outputPath}`,
            ...probeRun.phases.map((phase) => `  - ${phase.phaseKey}: ${phase.status} (${phase.classification}) — ${phase.detail}`),
          ]),
        ]),
    '',
  ].join('\n');
}

export async function exportDiagnosticBundle(
  outputPath: string,
  options: ExportDiagnosticBundleOptions = {},
): Promise<BidviaDiagnosticBundleReport> {
  const smokeReport = buildValidationSmokeSnapshot(options);
  const probeRuns = options.probeRuns?.map((probeRun) => ({
    ...probeRun,
    generatedIds: [...probeRun.generatedIds],
    phases: probeRun.phases.map((phase) => ({ ...phase })),
  }));
  const rerunSafety = probeRuns === undefined ? undefined : buildRerunSafetySummary(probeRuns);
  const report = buildDiagnosticBundleReport({
    command: 'diagnostic-bundle-export',
    scope: 'local-only',
    outputPath,
    writtenFiles: ['diagnostic-bundle.json', 'diagnostic-summary.md'],
    summaryFormat: 'markdown',
    smokeReport,
    ...(probeRuns === undefined ? {} : { probeRuns }),
    ...(rerunSafety === undefined ? {} : { rerunSafety }),
  });

  await mkdir(outputPath, { recursive: true });
  await writeFile(
    path.join(outputPath, 'diagnostic-bundle.json'),
    JSON.stringify(report, null, 2),
    'utf8',
  );
  await writeFile(
    path.join(outputPath, 'diagnostic-summary.md'),
    buildDiagnosticSummaryMarkdown(report),
    'utf8',
  );

  return report;
}
