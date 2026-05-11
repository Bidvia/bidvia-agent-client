import test from 'node:test';
import assert from 'node:assert/strict';

import { getMcpToolDescriptor } from '../src/mcp.ts';

test('productized MCP descriptors expose aligned role-stage semantics for claimant and operator tools', () => {
  const claimantReadinessRepair = getMcpToolDescriptor('claimant-readiness-repair-execution') as Record<string, unknown>;
  const operatorHandoffConsume = getMcpToolDescriptor('operator-handoff-consume-read') as Record<string, unknown>;

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
