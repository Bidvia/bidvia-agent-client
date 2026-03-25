import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

test('multi-business-chain-verification-wave-preview prints coordinator preview json with explicit handoff boundary', () => {
  const tsxCliPath = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const result = spawnSync(process.execPath, [tsxCliPath, 'src/cli.ts', 'multi-business-chain-verification-wave-preview'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.coordinatorPlan.coordinatorLabel, 'industry-to-package-with-commercial-action');
  assert.equal(output.coordinatorPlan.industryUniverse.envelope.scenarioFamily, 'industry-universe');
  assert.equal(output.coordinatorPlan.connectionApproval.envelope.scenarioFamily, 'connection-approval');
  assert.equal(output.coordinatorPlan.opportunityPackageHandoff.envelope.scenarioFamily, 'opportunity-package-handoff');
  assert.deepEqual(output.externalHandoffBoundary, {
    boundaryKey: 'approval-to-opportunity',
    status: 'requires-caller-known-ids',
    approvalRequestId: 'approval-cli-1',
    requiredKnownIds: ['opportunityId'],
    suppliedKnownIds: {
      opportunityId: 'opportunity-cli-1',
    },
  });
});

test('commercial-action-verification-wave-preview prints bounded continuation preview json', () => {
  const tsxCliPath = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const result = spawnSync(process.execPath, [tsxCliPath, 'src/cli.ts', 'commercial-action-verification-wave-preview'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.scenarioPlan.envelope.scenarioFamily, 'commercial-action');
  assert.equal(output.scenarioPlan.executeCommercialActionInput.receiptId, 'receipt-cli-1');
  assert.equal(output.reviewPacket.status, 'pending-review');
  assert.ok(Array.isArray(output.reviewPacket.details.routeDetails));
  assert.equal(output.waveType, 'commercial-action-continuation');
});

test('launch-topology-smoke prints read-only launch topology json', () => {
  const tsxCliPath = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const result = spawnSync(process.execPath, [tsxCliPath, 'src/cli.ts', 'launch-topology-smoke'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.baseUrl, 'http://127.0.0.1:8787');
  assert.equal(output.environmentMode, 'local');
  assert.equal(output.canonicalGlobalApiDomain, 'https://api.bidvia.ai');
  assert.equal(output.canonicalChinaApiDomain, 'https://api.bidvia.cn');
  assert.deepEqual(output.compatibilityProfileMappings, {
    global: 'https://bidvia.ai',
    china: 'https://bidvia.cn',
  });
});
