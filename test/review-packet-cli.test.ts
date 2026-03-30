import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { shouldRunCliMain } from '../src/cli.ts';

test('shouldRunCliMain matches relative built cli argv entries', () => {
  assert.equal(
    shouldRunCliMain('dist/cli.js', pathToFileURL(path.join(process.cwd(), 'dist', 'cli.js')).href),
    true,
  );
});

test('industry-universe-review-packet-preview prints review packet json', () => {
  const tsxCliPath = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const result = spawnSync(process.execPath, [tsxCliPath, 'src/cli.ts', 'industry-universe-review-packet-preview'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.scenarioFamily, 'industry-universe');
  assert.equal(output.verificationMode, 'review-safe');
  assert.equal(output.status, 'pending-review');
  assert.equal(output.details.boundary.serverTruthClaimed, false);
  assert.equal(output.details.boundary.adjudicationOutcomeIncluded, false);
  assert.equal(output.details.boundary.localDerivedExplanationIncluded, true);
  assert.equal(output.details.boundary.serverOwnedFactsIncluded, true);
  assert.equal(output.details.boundary.dependencyGatedSeamsIncluded, true);
  assert.deepEqual(output.details.verification.localDerivedExplanation, [
    'review-packet-status',
    'next-pending-route',
    'route-coverage-note',
  ]);
  assert.deepEqual(output.details.verification.serverOwnedFacts, [
    'scenario-source-refs',
    'scenario-evidence-refs',
    'traceability-refs',
    'recorded-ids',
  ]);
  assert.deepEqual(output.details.verification.dependencyGatedSeams, [
    'server-truth-claimed:false',
    'adjudication-outcome-included:false',
    'core-truth-closure:deferred',
  ]);
  assert.equal(output.summary.pendingRouteCount, 3);
  assert.equal(
    output.sections[3]?.entries[0],
    'pending-review:1/3:createListing:requires=tenantId|principalId|companyId',
  );
  assert.equal(output.sections[4]?.entries.includes('next-pending-route:createListing'), true);
  assert.equal(output.sections[4]?.entries.includes('local-derived-explanation:review-packet-status:pending-review'), true);
  assert.equal(output.sections[4]?.entries.includes('server-owned-facts:scenario-source-refs:1'), true);
  assert.equal(output.sections[4]?.entries.includes('dependency-gated-seams:core-truth-closure:deferred'), true);
  assert.deepEqual(
    output.sections.map((section: { sectionKey: string }) => section.sectionKey),
    ['scenario', 'evidence', 'traceability', 'routes', 'verification', 'records'],
  );
});

test('root cli wrapper forwards review packet preview commands', () => {
  const tsxCliPath = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const result = spawnSync(process.execPath, [tsxCliPath, 'cli.ts', 'industry-universe-review-packet-preview'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.scenarioFamily, 'industry-universe');
  assert.equal(output.details.boundary.serverTruthClaimed, false);
});

test('industry-universe-review-packet-export prints exported review packet json', () => {
  const tsxCliPath = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const result = spawnSync(process.execPath, [tsxCliPath, 'src/cli.ts', 'industry-universe-review-packet-export'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.scenarioFamily, 'industry-universe');
  assert.equal(output.verificationMode, 'review-safe');
  assert.equal(output.status, 'pending-review');
  assert.equal(output.details.boundary.serverTruthClaimed, false);
  assert.equal(output.details.boundary.adjudicationOutcomeIncluded, false);
  assert.equal(output.details.boundary.localDerivedExplanationIncluded, true);
  assert.equal(output.details.boundary.serverOwnedFactsIncluded, true);
  assert.equal(output.details.boundary.dependencyGatedSeamsIncluded, true);
  assert.deepEqual(output.details.verification.localDerivedExplanation, [
    'review-packet-status',
    'next-pending-route',
    'route-coverage-note',
  ]);
  assert.deepEqual(output.details.verification.serverOwnedFacts, [
    'scenario-source-refs',
    'scenario-evidence-refs',
    'traceability-refs',
    'recorded-ids',
  ]);
  assert.deepEqual(output.details.verification.dependencyGatedSeams, [
    'server-truth-claimed:false',
    'adjudication-outcome-included:false',
    'core-truth-closure:deferred',
  ]);
  assert.equal(output.summary.pendingRouteCount, 3);
  assert.equal(
    output.sections[3]?.entries[0],
    'pending-review:1/3:createListing:requires=tenantId|principalId|companyId',
  );
  assert.equal(output.sections[4]?.entries.includes('next-pending-route:createListing'), true);
  assert.equal(output.sections[4]?.entries.includes('local-derived-explanation:review-packet-status:pending-review'), true);
  assert.equal(output.sections[4]?.entries.includes('server-owned-facts:scenario-source-refs:1'), true);
  assert.equal(output.sections[4]?.entries.includes('dependency-gated-seams:core-truth-closure:deferred'), true);
  assert.deepEqual(
    output.sections.map((section: { sectionKey: string }) => section.sectionKey),
    ['scenario', 'evidence', 'traceability', 'routes', 'verification', 'records'],
  );
});
