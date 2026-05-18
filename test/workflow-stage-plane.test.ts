import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';

test('workflow-stage plane adapter keeps local journey labels separate from Core-owned stage truth', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.buildWorkflowStagePlaneView, 'function');

  const plane = (exports.buildWorkflowStagePlaneView as () => {
    adoptionStatus: {
      plane: string;
      payloadPacketStatus: string;
      blockedBy: string | null;
      notes: string[];
    };
    localJourneyStages: {
      descriptiveOnly: boolean;
      labels: string[];
      notes: string[];
    };
    workflowIdentifiers: {
      transportableScenarioMetadata: boolean;
      notes: string[];
    };
    coreStageSemantics: {
      payloadPacketStatus: string;
      blockedBy: string | null;
      packetGroundedStageIdentifiers: string[];
      transitionRules: string[];
      inventedIdentifiersBlocked: boolean;
    };
  })();

  assert.equal(plane.localJourneyStages.descriptiveOnly, true);
  assert.deepEqual(plane.localJourneyStages.labels, [
    'public-provisional',
    'governed-run-support',
    'governed-run-execution',
  ]);
  assert.deepEqual(plane.localJourneyStages.notes, [
    'local journey labels remain operator guidance and do not become Core-owned workflow-stage truth',
  ]);
});

test('workflow-stage plane adapter keeps Core stage semantics blocked until write semantics are frozen', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.buildWorkflowStagePlaneView, 'function');

  const plane = (exports.buildWorkflowStagePlaneView as () => {
    adoptionStatus: {
      plane: string;
      payloadPacketStatus: string;
      blockedBy: string | null;
      notes: string[];
    };
    workflowIdentifiers: {
      transportableScenarioMetadata: boolean;
      notes: string[];
    };
    coreStageSemantics: {
      payloadPacketStatus: string;
      blockedBy: string | null;
      packetGroundedStageIdentifiers: string[];
      transitionRules: string[];
      inventedIdentifiersBlocked: boolean;
    };
  })();
  const sharedAdoptionStatus = (exports.listCorePlaneAdoptionStatuses as () => Array<{
    plane: string;
    payloadPacketStatus: string;
    blockedBy: string | null;
    notes: string[];
  }>)().find((status) => status.plane === 'workflow-stage');

  assert.deepEqual(plane.adoptionStatus, sharedAdoptionStatus);
  assert.equal(plane.workflowIdentifiers.transportableScenarioMetadata, true);
  assert.equal(plane.coreStageSemantics.payloadPacketStatus, 'blocked-pending-packet');
  assert.equal(plane.coreStageSemantics.blockedBy, 'core-write-semantics-not-frozen');
  assert.deepEqual(plane.coreStageSemantics.packetGroundedStageIdentifiers, []);
  assert.deepEqual(plane.coreStageSemantics.transitionRules, []);
  assert.equal(plane.coreStageSemantics.inventedIdentifiersBlocked, true);
});
