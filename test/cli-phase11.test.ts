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
    handoffStepName: 'operator-confirm-opportunity-handoff',
    handoffOwnerRole: 'operator',
    checkpointGuidance: 'verify the approvalRequestId and caller-supplied opportunityId before exporting the review-safe package',
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
  assert.equal(output.baseUrl, 'https://api.bidvia.cn');
  assert.equal(output.environmentMode, 'production');
  assert.equal(output.canonicalGlobalApiDomain, 'https://api.bidvia.ai');
  assert.equal(output.canonicalChinaApiDomain, 'https://api.bidvia.cn');
  assert.deepEqual(output.compatibilityProfileMappings, {
    global: 'https://bidvia.ai',
    china: 'https://bidvia.cn',
  });
});

test('runtime-capabilities prints a blocked Stage 3 release gate summary', () => {
  const tsxCliPath = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const result = spawnSync(process.execPath, [tsxCliPath, 'src/cli.ts', 'runtime-capabilities'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.stage3ReleaseGate.status, 'blocked');
  assert.deepEqual(output.stage3ReleaseGate.blockedBy, ['plane-adoption-incomplete']);
  assert.deepEqual(output.stage3ReleaseGate.waves, [
    {
      wave: 'P0',
      status: 'complete',
      planes: ['identity-session', 'task', 'event-notification'],
    },
    {
      wave: 'P1',
      status: 'blocked',
      planes: ['capability', 'workflow-stage'],
    },
    {
      wave: 'P2',
      status: 'complete',
      planes: ['enterprise-integration'],
    },
  ]);
  assert.deepEqual(output.stage3ReleaseGate.requiredValidatorCommands, [
    'npm test',
    'npm run typecheck',
    'npm run build',
    'npm run validate',
    'npm run validate:release-readiness',
    'npm run validate:release-gate',
  ]);
});

test('registration-lifecycle-plan prints a structured local-only lifecycle plan', () => {
  const tsxCliPath = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const result = spawnSync(process.execPath, [tsxCliPath, 'src/cli.ts', 'registration-lifecycle-plan'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.command, 'registration-lifecycle-plan');
  assert.equal(output.scope, 'local-only');
  assert.equal(output.scenarioPlan.envelope.scenarioFamily, 'registration-lifecycle');
  assert.deepEqual(output.scenarioPlan.envelope.recordIds, {
    registrations: ['areg-cli-1'],
  });
});

test('registered-agent-operations-plan prints a structured local-only post-registration plan', () => {
  const tsxCliPath = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const result = spawnSync(process.execPath, [tsxCliPath, 'src/cli.ts', 'registered-agent-operations-plan'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.command, 'registered-agent-operations-plan');
  assert.equal(output.scope, 'local-only');
  assert.equal(output.scenarioPlan.envelope.scenarioFamily, 'registered-agent-operations');
  assert.deepEqual(output.scenarioPlan.envelope.recordIds, {
    registrations: ['areg-cli-1'],
  });
});

test('verification-bundle-preview prints the default review-safe verification bundle', () => {
  const tsxCliPath = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const result = spawnSync(process.execPath, [tsxCliPath, 'src/cli.ts', 'verification-bundle-preview'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.command, 'verification-bundle-preview');
  assert.equal(output.input, 'registration-lifecycle');
  assert.equal(output.scope, 'review-safe');
  assert.equal(output.verificationBundle.scenarioFamily, 'registration-lifecycle');
  assert.equal(output.verificationBundle.verificationMode, 'review-safe');
});
