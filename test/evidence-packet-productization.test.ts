import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCli } from '../src/cli.ts';
import { dispatchMcpToolCall } from '../src/mcp.ts';
import {
  buildProductEvidenceEnvelope,
  buildProductResultTaxonomy,
} from '../src/business-universe/evidence.ts';
import {
  buildAgentFirstBusinessUniverseValidationReport,
} from '../scripts/validate-agent-first-business-universe.ts';

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

test('product evidence helpers derive stable result taxonomy and evidence packet from role-stage outputs', () => {
  const envelope = buildProductEvidenceEnvelope({
    command: 'platform-managed entry inspect',
    input: {},
    result: {
      stageSnapshot: {
        roleWorkspace: {
          role: 'platform-managed',
          sessionPresent: false,
          adminSessionPresent: false,
          canonicality: 'later-wave',
        },
        stage: 'entry',
        state: 'later-wave-stop',
        executability: 'later-wave-stop',
        recommendedNextStep: 'stop_platform_managed_entry',
        nextStepKind: 'later_wave_stop',
        action: {
          kind: 'read',
          owner: 'platform-managed',
          executability: 'later-wave-stop',
        },
        boundary: {
          boundaryClass: 'later-wave-stop',
          reasonCodes: ['platform_managed_role_bounded_pending_core_truth'],
        },
      },
    },
  });

  assert.deepEqual(buildProductResultTaxonomy(envelope.stageSnapshot), {
    role: 'platform-managed',
    stage: 'entry',
    state: 'later-wave-stop',
    executability: 'later-wave-stop',
    issueClass: 'future-wave-deferred',
    blockerCodes: ['platform_managed_role_bounded_pending_core_truth'],
  });
  assert.equal(envelope.evidencePacket.issue_class, 'future-wave-deferred');
  assert.equal(envelope.evidencePacket.route, 'platform-managed entry inspect');
});

test('runCli product commands support evidence output mode for machine-consumable evidence packets', async () => {
  const printed: unknown[] = [];
  const exitCode = await runCli(['platform-managed', 'entry', 'inspect', '--output', 'evidence'], {
    createClient: () => ({}) as never,
    readLocalOnboardingState: async () => null,
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.equal((printed[0] as { resultTaxonomy: { issueClass: string } }).resultTaxonomy.issueClass, 'future-wave-deferred');
  assert.equal((printed[0] as { evidencePacket: { route: string } }).evidencePacket.route, 'platform-managed entry inspect');
});

test('dispatchMcpToolCall returns evidence packets for productized role-stage tools', async () => {
  const response = await dispatchMcpToolCall({
    toolName: 'platform-managed-entry-inspect-read',
    arguments: {},
  }, {
    createExecutionClient: () => ({}) as never,
  });

  assert.equal((response.result?.resultTaxonomy as { issueClass: string }).issueClass, 'future-wave-deferred');
  assert.equal((response.result?.evidencePacket as { route: string }).route, 'platform-managed-entry-inspect-read');
});

test('validate-agent-first-business-universe script reports completed waves and next-wave readiness', () => {
  const report = buildAgentFirstBusinessUniverseValidationReport('/Users/liujiao/develop/Bidvia-agent-client');

  assert.equal(report.status, 'ok');
  assert.equal(report.completedWaves.includes('wave-7-platform-managed-formal-entry'), true);
  assert.equal(report.nextExpectedWave, 'wave-8-diagnostics-and-evidence-layer');
});

test('validate-agent-first-business-universe script prints the validation report when executed directly', () => {
  const output = execFileSync('npx', ['tsx', 'scripts/validate-agent-first-business-universe.ts'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
  });

  const report = JSON.parse(output) as {
    status: string;
    completedWaves: string[];
    nextExpectedWave: string;
  };

  assert.equal(report.status, 'ok');
  assert.equal(report.completedWaves.includes('wave-7-platform-managed-formal-entry'), true);
  assert.equal(report.nextExpectedWave, 'wave-8-diagnostics-and-evidence-layer');
});
