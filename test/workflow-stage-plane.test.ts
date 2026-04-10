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
  const sharedAdoptionStatus = (exports.listCorePlaneAdoptionStatuses as () => Array<{
    plane: string;
    payloadPacketStatus: string;
    blockedBy: string | null;
    notes: string[];
  }>)().find((status) => status.plane === 'workflow-stage');

  assert.deepEqual(plane.adoptionStatus, sharedAdoptionStatus);
  assert.equal(plane.localJourneyStages.descriptiveOnly, true);
  assert.deepEqual(plane.localJourneyStages.labels, [
    'public-provisional',
    'governed-run-support',
    'governed-run-execution',
  ]);
  assert.equal(plane.workflowIdentifiers.transportableScenarioMetadata, true);
  assert.equal(plane.coreStageSemantics.payloadPacketStatus, 'packet-grounded');
  assert.equal(plane.coreStageSemantics.blockedBy, null);
  assert.deepEqual(plane.coreStageSemantics.packetGroundedStageIdentifiers, [
    'notification.notification_state',
    'task.task_state',
    'latest_participation_state.context_handoff_state',
  ]);
  assert.deepEqual(plane.coreStageSemantics.transitionRules, [
    'transitions[].transition_kind',
    'transitions[].from_notification_state',
    'transitions[].to_notification_state',
    'transitions[].from_task_state',
    'transitions[].to_task_state',
  ]);
  assert.equal(plane.coreStageSemantics.inventedIdentifiersBlocked, true);
});
