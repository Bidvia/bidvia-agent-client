import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyCoreProducerPrivateRootCandidate,
  createInMemoryDiagnosticPersistence,
  probeCoreProducerPrivateRootContract,
} from '../scripts/task10/core-producer-adapter.ts';

test('frozen Core private root probe proves internal roots fail non-overlap while external roots fail repo-relative conversion', () => {
  const coreRoot = '/work/core';

  assert.deepEqual(
    classifyCoreProducerPrivateRootCandidate(coreRoot, '/work/core/private-output'),
    {
      candidatePath: '/work/core/private-output',
      coreRejectsOverlap: true,
      repoRelativeAccepted: true,
      result: 'core-overlap-rejected',
    },
  );

  assert.deepEqual(
    classifyCoreProducerPrivateRootCandidate(coreRoot, '/work/private-output'),
    {
      candidatePath: '/work/private-output',
      coreRejectsOverlap: false,
      repoRelativeAccepted: false,
      result: 'repo-relative-rejected',
    },
  );
});

test('probeCoreProducerPrivateRootContract returns the exact frozen blocked result with sanitized public diagnostics only', async () => {
  const result = await probeCoreProducerPrivateRootContract({
    coreRuntimeRoot: '/work/core',
    privateInputRoot: '/work/private-input',
    privateOutputRoot: '/work/private-output',
    now: '2026-07-19T14:00:00.000Z',
    sourceClass: 'producer-contract-probe',
  }, {
    persistAndVerifyDiagnostic: createInMemoryDiagnosticPersistence('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
  });

  assert.equal(result.status, 'reportable-blocked');
  assert.deepEqual(result.reasonCodes, ['core-producer-private-root-contract-unsatisfied']);
  assert.deepEqual(result.affectedModes, ['producer-contract-probe']);
  assert.deepEqual(result.affectedFamilies, ['dispatch', 'replay-recovery', 'result-submission']);
  assert.ok(result.publicDiagnostic);
  assert.equal(result.publicDiagnostic.sourceClass, 'producer-contract-probe');
  assert.equal(result.publicDiagnostic.reason, 'core-producer-private-root-contract-unsatisfied');
  assert.equal(result.publicDiagnostic.timestamp, '2026-07-19T14:00:00.000Z');
  assert.deepEqual(result.evidence.groups, [{
    sourceClass: 'producer-contract-probe',
    handles: ['sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
    attestations: [{
      handle: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      sourceClass: 'producer-contract-probe',
      verified: true,
      verifiedAt: '2026-07-19T14:00:00.000Z',
    }],
  }]);
  assert.equal(result.publicDiagnostic.attestation.handle, 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');

  const serialized = JSON.stringify(result.publicDiagnostic);
  assert.doesNotMatch(serialized, /private-input/);
  assert.doesNotMatch(serialized, /private-output/);
  assert.doesNotMatch(serialized, /\/work\/core/);
  assert.doesNotMatch(serialized, /internalCandidates|externalCandidates|toRepoRelative|overlap/);
});
