import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

test('connection-approval-plan prints review safe scenario json', () => {
  const tsxCliPath = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const result = spawnSync(process.execPath, [tsxCliPath, 'src/cli.ts', 'connection-approval-plan'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.scenarioPlan.envelope.scenarioFamily, 'connection-approval');
  assert.equal(output.verificationBundle.verificationMode, 'review-safe');
  assert.deepEqual(
    output.scenarioPlan.envelope.expectedRouteChain.map((step: { routeKey: string }) => step.routeKey),
    ['createConnectionRequest', 'approveConnectionRequest'],
  );
});

test('opportunity-package-handoff-plan prints review safe scenario json', () => {
  const tsxCliPath = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const result = spawnSync(process.execPath, [tsxCliPath, 'src/cli.ts', 'opportunity-package-handoff-plan'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.scenarioPlan.envelope.scenarioFamily, 'opportunity-package-handoff');
  assert.equal(output.verificationBundle.verificationMode, 'review-safe');
  assert.deepEqual(
    output.scenarioPlan.envelope.expectedRouteChain.map((step: { routeKey: string }) => step.routeKey),
    ['exportOpportunityPackage'],
  );
});
