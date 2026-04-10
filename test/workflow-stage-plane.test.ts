import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';

test('workflow-stage plane adapter keeps local journey labels separate from blocked Core stage semantics', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.buildWorkflowStagePlaneView, 'function');

  const plane = (exports.buildWorkflowStagePlaneView as () => {
    adoptionStatus: {
      plane: string;
      payloadPacketStatus: string;
      blockedBy: string | null;
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

  assert.equal(plane.adoptionStatus.plane, 'workflow-stage');
  assert.equal(plane.adoptionStatus.payloadPacketStatus, 'blocked-pending-packet');
  assert.equal(plane.adoptionStatus.blockedBy, 'core-plane-payload-packet-not-yet-frozen');
  assert.equal(plane.localJourneyStages.descriptiveOnly, true);
  assert.deepEqual(plane.localJourneyStages.labels, [
    'public-provisional',
    'governed-run-support',
    'governed-run-execution',
  ]);
  assert.equal(plane.workflowIdentifiers.transportableScenarioMetadata, true);
  assert.equal(plane.coreStageSemantics.payloadPacketStatus, 'blocked-pending-packet');
  assert.equal(plane.coreStageSemantics.blockedBy, 'core-plane-payload-packet-not-yet-frozen');
  assert.deepEqual(plane.coreStageSemantics.packetGroundedStageIdentifiers, []);
  assert.deepEqual(plane.coreStageSemantics.transitionRules, []);
  assert.equal(plane.coreStageSemantics.inventedIdentifiersBlocked, true);
});
