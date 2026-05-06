import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  parseVerifyClientBoundedMatrixArgs,
  runClientBoundedMatrix,
  writeClientBoundedMatrixEvidence,
} from '../scripts/verify-client-bounded-matrix.ts';

test('parseVerifyClientBoundedMatrixArgs requires base-url and output', () => {
  assert.deepEqual(
    parseVerifyClientBoundedMatrixArgs([
      '--base-url',
      'http://127.0.0.1:8787',
      '--output',
      '.sisyphus/evidence/client-bounded-matrix.json',
    ]),
    {
      baseUrl: 'http://127.0.0.1:8787',
      outputPath: '.sisyphus/evidence/client-bounded-matrix.json',
    },
  );

  assert.throws(
    () => parseVerifyClientBoundedMatrixArgs(['--base-url', 'http://127.0.0.1:8787']),
    /--output is required/,
  );
  assert.throws(
    () => parseVerifyClientBoundedMatrixArgs(['--output', 'out.json']),
    /--base-url is required/,
  );
});

test('runClientBoundedMatrix records baseline health and machine-readable blocked scenarios when actor context is absent', async () => {
  const responses = [
    {
      status: 'ok',
      service: 'runtime',
    },
    {
      status: 'ready',
      service: 'runtime',
    },
  ];
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    calls.push(String(input));
    return new Response(JSON.stringify(responses[calls.length - 1] ?? { ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const evidence = await runClientBoundedMatrix(
    {
      baseUrl: 'http://127.0.0.1:8787',
    },
    {
      fetchImpl,
      env: {},
      now: () => '2026-05-06T12:00:00.000Z',
    },
  );

  assert.deepEqual(calls, [
    'http://127.0.0.1:8787/healthz',
    'http://127.0.0.1:8787/readyz',
  ]);
  assert.equal(evidence.baseUrl, 'http://127.0.0.1:8787');
  assert.equal(evidence.generatedAt, '2026-05-06T12:00:00.000Z');
  assert.equal(evidence.runtime.healthz.httpStatus, 200);
  assert.equal(evidence.runtime.readyz.httpStatus, 200);
  assert.deepEqual(
    evidence.scenarios.map((scenario) => [scenario.scenarioKey, scenario.status]),
    [
      ['runtime-baseline', 'passed'],
      ['platform-managed-onboarding', 'blocked'],
      ['dispatch-ready-progression', 'blocked'],
      ['role-collaboration-handoff', 'blocked'],
      ['continuous-task-governed-work-closure', 'blocked'],
      ['commercial-and-integration-readback', 'blocked'],
    ],
  );
  assert.match(evidence.summary.blockedScenarioKeys.join(','), /platform-managed-onboarding/);
  assert.match(
    JSON.stringify(evidence.scenarios.find((scenario) => scenario.scenarioKey === 'dispatch-ready-progression')),
    /BIDVIA_TENANT_ID/,
  );
  assert.match(
    JSON.stringify(evidence.scenarios.find((scenario) => scenario.scenarioKey === 'platform-managed-onboarding')),
    /valid_invitation_or_bootstrap_input/,
  );
});

test('writeClientBoundedMatrixEvidence persists pretty-printed machine-readable evidence', async () => {
  const outputDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-bounded-matrix-'));
  const outputPath = path.join(outputDirectory, 'client-bounded-matrix.json');

  const result = await writeClientBoundedMatrixEvidence(outputPath, {
    schemaVersion: '2026-05-06',
    generatedAt: '2026-05-06T12:00:00.000Z',
    baseUrl: 'http://127.0.0.1:8787',
    runtime: {
      healthz: { httpStatus: 200, body: { status: 'ok' } },
      readyz: { httpStatus: 200, body: { status: 'ready' } },
    },
    actorContext: {
      claimant: { availableFields: [], missingFields: ['BIDVIA_TENANT_ID'] },
      admin: { availableFields: [], missingFields: ['BIDVIA_ADMIN_SESSION_ID'] },
    },
    scenarios: [],
    summary: {
      passedCount: 0,
      blockedCount: 0,
      failedCount: 0,
      blockedScenarioKeys: [],
      failedScenarioKeys: [],
    },
  });

  assert.equal(result.outputPath, outputPath);
  assert.deepEqual(JSON.parse(readFileSync(outputPath, 'utf8')), {
    schemaVersion: '2026-05-06',
    generatedAt: '2026-05-06T12:00:00.000Z',
    baseUrl: 'http://127.0.0.1:8787',
    runtime: {
      healthz: { httpStatus: 200, body: { status: 'ok' } },
      readyz: { httpStatus: 200, body: { status: 'ready' } },
    },
    actorContext: {
      claimant: { availableFields: [], missingFields: ['BIDVIA_TENANT_ID'] },
      admin: { availableFields: [], missingFields: ['BIDVIA_ADMIN_SESSION_ID'] },
    },
    scenarios: [],
    summary: {
      passedCount: 0,
      blockedCount: 0,
      failedCount: 0,
      blockedScenarioKeys: [],
      failedScenarioKeys: [],
    },
  });
});
