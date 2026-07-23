import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyCoreProducerPrivateRootCandidate,
  createInMemoryDiagnosticPersistence,
  probeCoreProducerPrivateRootContract,
} from '../scripts/task10/core-producer-adapter.ts';

test('classifyCoreProducerPrivateRootCandidate reports accepted external roots and overlap-rejected roots with current semantics', () => {
  assert.deepEqual(
    classifyCoreProducerPrivateRootCandidate('/work/core', '/work/private-output'),
    {
      candidatePath: '/work/private-output',
      result: 'accepted-external-root',
    },
  );

  assert.deepEqual(
    classifyCoreProducerPrivateRootCandidate('/work/core', '/work/core/private-output'),
    {
      candidatePath: '/work/core/private-output',
      result: 'core-overlap-rejected',
    },
  );
});

test('probeCoreProducerPrivateRootContract returns an explicit accepted status for valid external absolute private roots', async () => {
  const result = await probeCoreProducerPrivateRootContract({
    coreRuntimeRoot: '/work/core',
    privateInputRoot: '/work/private-input',
    privateOutputRoot: '/work/private-output',
    now: '2026-07-19T14:00:00.000Z',
    sourceClass: 'producer-contract-probe',
  }, {
    persistAndVerifyDiagnostic: createInMemoryDiagnosticPersistence('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
  });

  assert.deepEqual(result, { status: 'accepted' });
});

test('probeCoreProducerPrivateRootContract returns a sanitized blocked diagnostic for overlapping private roots', async () => {
  const result = await probeCoreProducerPrivateRootContract({
    coreRuntimeRoot: '/work/core',
    privateInputRoot: '/work/core/private-input',
    privateOutputRoot: '/work/private-output',
    now: '2026-07-19T14:00:00.000Z',
    sourceClass: 'producer-contract-probe',
  }, {
    persistAndVerifyDiagnostic: createInMemoryDiagnosticPersistence('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
  });

  assert.equal(result.status, 'reportable-blocked');
  assert.deepEqual(result.reasonCodes, ['core-producer-private-root-contract-unsatisfied']);
  assert.ok(result.publicDiagnostic);
  assert.equal(result.publicDiagnostic.sourceClass, 'producer-contract-probe');
  assert.equal(result.publicDiagnostic.reason, 'core-producer-private-root-contract-unsatisfied');
  assert.deepEqual(result.evidence.groups, [{
    sourceClass: 'producer-contract-probe',
    handles: ['sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
    attestations: [{
      handle: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      sourceClass: 'producer-contract-probe',
      verified: true,
      verifiedAt: '2026-07-19T14:00:00.000Z',
    }],
  }]);

  const serialized = JSON.stringify(result.publicDiagnostic);
  assert.doesNotMatch(serialized, /private-input|private-output|\/work\/core/);
  assert.doesNotMatch(serialized, /repoRelativeAccepted|repo-relative-rejected/);
});
