import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface BidviaAgentFirstBusinessUniverseValidationReport {
  status: 'ok' | 'blocked';
  completedWaves: string[];
  missingArtifacts: string[];
  nextExpectedWave: string;
}

const expectedWaveFiles = [
  'wave-0.json',
  'wave-1.json',
  'wave-2.json',
  'wave-3.json',
  'wave-4.json',
  'wave-5.json',
  'wave-6.json',
  'wave-7.json',
] as const;

export function buildAgentFirstBusinessUniverseValidationReport(
  workspaceRoot: string,
): BidviaAgentFirstBusinessUniverseValidationReport {
  const statusDir = path.join(
    workspaceRoot,
    '.sisyphus/status/agent-first-business-universe',
  );
  const completedWaves: string[] = [];
  const missingArtifacts: string[] = [];

  for (const fileName of expectedWaveFiles) {
    const filePath = path.join(statusDir, fileName);
    if (!existsSync(filePath)) {
      missingArtifacts.push(fileName);
      continue;
    }
    const content = JSON.parse(readFileSync(filePath, 'utf-8')) as { wave?: string; status?: string };
    if (content.status !== 'completed' || typeof content.wave !== 'string') {
      missingArtifacts.push(fileName);
      continue;
    }
    completedWaves.push(content.wave);
  }

  return {
    status: missingArtifacts.length === 0 ? 'ok' : 'blocked',
    completedWaves,
    missingArtifacts,
    nextExpectedWave: 'wave-8-diagnostics-and-evidence-layer',
  };
}

function main(): void {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const workspaceRoot = path.resolve(scriptDir, '..');
  const report = buildAgentFirstBusinessUniverseValidationReport(workspaceRoot);

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
