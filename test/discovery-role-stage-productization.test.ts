import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLocalDiscoveryCatalog } from '../src/discovery-catalog.ts';
import { buildRouteContextMatrix } from '../src/route-context-matrix.ts';

test('discovery catalog exposes aligned role-stage semantics for productized claimant and operator entries', () => {
  const catalog = buildLocalDiscoveryCatalog();
  const claimantReadinessRepair = catalog.find((entry) => entry.helperKey === 'repairClaimantReadiness');
  const operatorHandoffConsume = catalog.find((entry) => entry.helperKey === 'consumeOperatorHandoff');

  assert.ok(claimantReadinessRepair);
  assert.ok(operatorHandoffConsume);

  assert.deepEqual({
    role: claimantReadinessRepair.role,
    stage: claimantReadinessRepair.stage,
    executability: claimantReadinessRepair.executability,
    ownershipClass: claimantReadinessRepair.ownershipClass,
    handoffClass: claimantReadinessRepair.handoffClass,
    canonicality: claimantReadinessRepair.canonicality,
    mayContinueHere: claimantReadinessRepair.mayContinueHere,
    mayReadHere: claimantReadinessRepair.mayReadHere,
    mayNotDecideHere: claimantReadinessRepair.mayNotDecideHere,
  }, {
    role: 'claimant',
    stage: 'readiness',
    executability: 'canonical',
    ownershipClass: 'claimant-self-repair',
    handoffClass: 'none',
    canonicality: 'canonical',
    mayContinueHere: true,
    mayReadHere: false,
    mayNotDecideHere: false,
  });

  assert.deepEqual({
    role: operatorHandoffConsume.role,
    stage: operatorHandoffConsume.stage,
    executability: operatorHandoffConsume.executability,
    ownershipClass: operatorHandoffConsume.ownershipClass,
    handoffClass: operatorHandoffConsume.handoffClass,
    canonicality: operatorHandoffConsume.canonicality,
    mayContinueHere: operatorHandoffConsume.mayContinueHere,
    mayReadHere: operatorHandoffConsume.mayReadHere,
    mayNotDecideHere: operatorHandoffConsume.mayNotDecideHere,
  }, {
    role: 'operator',
    stage: 'handoff',
    executability: 'executable-handoff',
    ownershipClass: 'operator-owned-progression',
    handoffClass: 'canonical-bridge',
    canonicality: 'canonical',
    mayContinueHere: false,
    mayReadHere: true,
    mayNotDecideHere: true,
  });
});

test('route-context matrix exposes additive role-stage guidance aligned to the same semantic fields', () => {
  const matrix = buildRouteContextMatrix();

  const claimantReadinessRepair = matrix.roleStageGuidance.find((entry) => entry.helperKey === 'repairClaimantReadiness');
  const operatorHandoffConsume = matrix.roleStageGuidance.find((entry) => entry.helperKey === 'consumeOperatorHandoff');

  assert.ok(claimantReadinessRepair);
  assert.ok(operatorHandoffConsume);

  assert.deepEqual(claimantReadinessRepair, {
    helperKey: 'repairClaimantReadiness',
    role: 'claimant',
    stage: 'readiness',
    executability: 'canonical',
    ownershipClass: 'claimant-self-repair',
    handoffClass: 'none',
    canonicality: 'canonical',
    mayContinueHere: true,
    mayReadHere: false,
    mayNotDecideHere: false,
    cliCommands: ['claimant-readiness-repair'],
    mcpTools: [{ toolName: 'claimant-readiness-repair-execution', outputMode: 'execution-result' }],
    recommendedOutputMode: 'execution-result',
  });

  assert.deepEqual(operatorHandoffConsume, {
    helperKey: 'consumeOperatorHandoff',
    role: 'operator',
    stage: 'handoff',
    executability: 'executable-handoff',
    ownershipClass: 'operator-owned-progression',
    handoffClass: 'canonical-bridge',
    canonicality: 'canonical',
    mayContinueHere: false,
    mayReadHere: true,
    mayNotDecideHere: true,
    cliCommands: ['operator-handoff-consume'],
    mcpTools: [{ toolName: 'operator-handoff-consume-read', outputMode: 'truth-fetch-result' }],
    recommendedOutputMode: 'truth-fetch-result',
  });
});
