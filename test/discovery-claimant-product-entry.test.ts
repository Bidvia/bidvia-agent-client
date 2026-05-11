import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLocalDiscoveryCatalog } from '../src/discovery-catalog.ts';

test('local discovery catalog exposes claimant product entry commands through role-stage helper bindings', () => {
  const catalog = buildLocalDiscoveryCatalog();
  const byHelperKey = new Map(catalog.map((entry) => [entry.helperKey, entry]));

  assert.deepEqual(byHelperKey.get('inspectClaimantPrecondition')?.cliCommands, [
    'claimant-precondition-inspect',
  ]);
  assert.deepEqual(byHelperKey.get('establishClaimantCanonicalCompanyPublicPrecondition')?.cliCommands, [
    'claimant-precondition-establish-canonical-company-public',
  ]);
  assert.deepEqual(byHelperKey.get('inspectClaimantReadiness')?.cliCommands, [
    'claimant-readiness-inspect',
    'claimant-task-entry-inspect',
  ]);
  assert.deepEqual(byHelperKey.get('repairClaimantReadiness')?.cliCommands, [
    'claimant-readiness-repair',
  ]);
  assert.deepEqual(byHelperKey.get('runClaimantTaskEntry')?.cliCommands, [
    'claimant-task-entry-run',
  ]);
  assert.deepEqual(byHelperKey.get('inspectClaimantHandoff')?.cliCommands, [
    'claimant-handoff-inspect',
  ]);
});
