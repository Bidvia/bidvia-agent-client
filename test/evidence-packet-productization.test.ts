import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
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
  resolveAgentFirstBusinessUniverseWorkspaceRoot,
} from '../scripts/validate-agent-first-business-universe.ts';

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const completedWaveNames = [
  'wave-0-baseline-freeze',
  'wave-1-semantic-kernel',
  'wave-2-claimant-package',
  'wave-3-operator-package',
  'wave-4-universe-orchestrator',
  'wave-5-sdk-product-facade',
  'wave-6-mcp-discovery-route-context-alignment',
  'wave-7-platform-managed-formal-entry',
] as const;

function createCompletedWaveFixtureWorkspace(
  waveNames: readonly string[] = completedWaveNames,
) {
  const tempWorkspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), 'bidvia-agent-first-business-universe-'),
  );
  try {
    const statusDir = path.join(
      tempWorkspaceRoot,
      '.sisyphus/status/agent-first-business-universe',
    );

    mkdirSync(statusDir, { recursive: true });

    for (const [index, wave] of waveNames.entries()) {
      writeFileSync(
        path.join(statusDir, `wave-${index}.json`),
        JSON.stringify({ wave, status: 'completed' }, null, 2),
      );
    }
  } catch (error) {
    rmSync(tempWorkspaceRoot, { recursive: true, force: true });
    throw error;
  }

  return {
    workspaceRoot: tempWorkspaceRoot,
    cleanup: () => {
      rmSync(tempWorkspaceRoot, { recursive: true, force: true });
    },
  };
}

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
  const fixtureWorkspace = createCompletedWaveFixtureWorkspace();

  try {
    const report = buildAgentFirstBusinessUniverseValidationReport(fixtureWorkspace.workspaceRoot);

    assert.equal(report.status, 'ok');
    assert.deepEqual(report.completedWaves, [...completedWaveNames]);
    assert.equal(report.nextExpectedWave, 'wave-8-diagnostics-and-evidence-layer');
  } finally {
    fixtureWorkspace.cleanup();
  }
});

test('validate-agent-first-business-universe workspace root resolver prefers a trimmed explicit override', () => {
  const fallbackRoot = '/fallback/workspace-root';

  assert.equal(
    resolveAgentFirstBusinessUniverseWorkspaceRoot(
      {
        BIDVIA_AGENT_FIRST_WORKSPACE_ROOT: '  /explicit/workspace-root  ',
      },
      fallbackRoot,
    ),
    '/explicit/workspace-root',
  );
});

test('validate-agent-first-business-universe workspace root resolver falls back when override is blank', () => {
  const fallbackRoot = '/fallback/workspace-root';

  assert.equal(
    resolveAgentFirstBusinessUniverseWorkspaceRoot(
      {
        BIDVIA_AGENT_FIRST_WORKSPACE_ROOT: '   ',
      },
      fallbackRoot,
    ),
    fallbackRoot,
  );
});

test('validate-agent-first-business-universe workspace root resolver falls back when override is absent', () => {
  const fallbackRoot = '/fallback/workspace-root';

  assert.equal(
    resolveAgentFirstBusinessUniverseWorkspaceRoot({}, fallbackRoot),
    fallbackRoot,
  );
});

test('validate-agent-first-business-universe script prints the validation report when executed directly', () => {
  const fixtureWaveNames = [
    'fixture-wave-0-explicit-workspace-root',
    ...completedWaveNames.slice(1),
  ];
  const fixtureWorkspace = createCompletedWaveFixtureWorkspace(fixtureWaveNames);

  try {
    const output = execFileSync('npx', ['tsx', 'scripts/validate-agent-first-business-universe.ts'], {
      cwd: workspaceRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        BIDVIA_AGENT_FIRST_WORKSPACE_ROOT: fixtureWorkspace.workspaceRoot,
      },
    });

    const report = JSON.parse(output) as {
      status: string;
      completedWaves: string[];
      nextExpectedWave: string;
    };

    assert.equal(report.status, 'ok');
    assert.equal(report.completedWaves.includes('fixture-wave-0-explicit-workspace-root'), true);
    assert.equal(report.completedWaves.includes('wave-7-platform-managed-formal-entry'), true);
    assert.equal(report.nextExpectedWave, 'wave-8-diagnostics-and-evidence-layer');
  } finally {
    fixtureWorkspace.cleanup();
  }
});
