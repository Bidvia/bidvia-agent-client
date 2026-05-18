import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BIDVIA_AGENT_FIRST_STATUS_DIRECTORY,
  bidviaAgentFirstMainlineWaves,
  bidviaAgentFirstSupportWaves,
  bidviaBusinessUniverseAcceptanceClasses,
  bidviaBusinessUniverseExplicitNonGoals,
  bidviaBusinessUniverseValidatedCanonicalCapabilities,
  buildAgentFirstWaveArtifactPath,
} from '../src/business-universe/baseline.js';

test('baseline freeze keeps the validated canonical capability set explicit', () => {
  assert.deepEqual(bidviaBusinessUniverseValidatedCanonicalCapabilities, [
    'claimant-prerequisite-repair',
    'mixed-missing-priority-ordering',
    'canonical-tenant-public-company-public-handoff-executable-bridge',
    'operator-only-deeper-continuation',
    'noncanonical-mixed-family-fail-close',
  ]);
});

test('baseline freeze keeps explicit non-goals visible', () => {
  assert.deepEqual(bidviaBusinessUniverseExplicitNonGoals, [
    'mixed-family-universality',
    'universal-acct-to-company-public-scope-translation',
    'generalized-executable-handoff',
    'provider-proof-or-reconciliation-universality',
    'program-4-universality-claim',
  ]);
});

test('baseline acceptance classes distinguish canonical and bounded outcomes', () => {
  assert.deepEqual(bidviaBusinessUniverseAcceptanceClasses, [
    'canonical-validated',
    'noncanonical-fail-closed',
    'bounded-stop',
    'later-wave',
    'future-wave-deferred',
  ]);
});

test('mainline and support waves stay explicitly separated', () => {
  assert.deepEqual(bidviaAgentFirstMainlineWaves, [0, 1, 2, 3, 4]);
  assert.deepEqual(bidviaAgentFirstSupportWaves, [5, 6, 7, 8, 9]);
});

test('wave artifact path builder stays anchored under the frozen status directory', () => {
  assert.equal(BIDVIA_AGENT_FIRST_STATUS_DIRECTORY, '.sisyphus/status/agent-first-business-universe');
  assert.equal(buildAgentFirstWaveArtifactPath(0), '.sisyphus/status/agent-first-business-universe/wave-0.json');
  assert.equal(buildAgentFirstWaveArtifactPath('claimant'), '.sisyphus/status/agent-first-business-universe/wave-claimant.json');
});
