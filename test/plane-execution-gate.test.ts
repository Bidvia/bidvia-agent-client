import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';

test('shared plane execution gate distinguishes runnable helper exceptions from descriptive-only visibility', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.listPlaneExecutionGates, 'function');
  assert.equal(typeof exports.getPlaneExecutionGate, 'function');

  const gates = (exports.listPlaneExecutionGates as () => Array<{
    plane: string;
    helperKey: string;
    executionTruth: string;
    blockedBy: string | null;
    notes: string[];
  }>)();

  const gateByHelperKey = new Map(gates.map((gate) => [gate.helperKey, {
    plane: gate.plane,
    helperKey: gate.helperKey,
    executionTruth: gate.executionTruth,
    blockedBy: gate.blockedBy,
  }]));

  assert.deepEqual(gateByHelperKey.get('createProvisionalAgent'), {
    plane: 'identity-session',
    helperKey: 'createProvisionalAgent',
    executionTruth: 'packet-grounded-execution',
    blockedBy: null,
  });
  assert.deepEqual(gateByHelperKey.get('postHeartbeat'), {
    plane: 'task',
    helperKey: 'postHeartbeat',
    executionTruth: 'blocked-pending-packet',
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
  });
  assert.deepEqual(gateByHelperKey.get('getNotification'), {
    plane: 'event-notification',
    helperKey: 'getNotification',
    executionTruth: 'packet-grounded-execution',
    blockedBy: null,
  });
  assert.deepEqual(gateByHelperKey.get('createNotificationDelivery'), {
    plane: 'event-notification',
    helperKey: 'createNotificationDelivery',
    executionTruth: 'blocked-pending-packet',
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
  });

  assert.deepEqual(
    (exports.getPlaneExecutionGate as (helperKey: string) => unknown)('acknowledgeNotification'),
    {
      plane: 'event-notification',
      helperKey: 'acknowledgeNotification',
      executionTruth: 'blocked-pending-packet',
      blockedBy: 'core-plane-payload-packet-not-yet-frozen',
      notes: ['Acknowledgement payload fields are not packet-complete yet, so execution stays blocked.'],
    },
  );
});

test('shared plane execution gate covers bounded task and enterprise helper surfaces that remain packet-gated', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.listPlaneExecutionGates, 'function');

  const gateByHelperKey = new Map(
    (exports.listPlaneExecutionGates as () => Array<{
      plane: string;
      helperKey: string;
      executionTruth: string;
      blockedBy: string | null;
    }>)().map((gate) => [gate.helperKey, gate]),
  );

  assert.deepEqual(
    [
      'createParticipationState',
      'createLease',
      'createTaskDispatch',
      'assignTaskDispatch',
      'suspendTaskDispatch',
      'resumeTaskDispatch',
      'completeTaskDispatch',
      'failTaskDispatch',
      'createClaim',
      'acceptClaim',
      'rejectClaim',
    ].map((helperKey) => {
      const gate = gateByHelperKey.get(helperKey);
      return gate && {
        plane: gate.plane,
        helperKey: gate.helperKey,
        executionTruth: gate.executionTruth,
        blockedBy: gate.blockedBy,
      };
    }),
    [
      'createParticipationState',
      'createLease',
      'createTaskDispatch',
      'assignTaskDispatch',
      'suspendTaskDispatch',
      'resumeTaskDispatch',
      'completeTaskDispatch',
      'failTaskDispatch',
      'createClaim',
      'acceptClaim',
      'rejectClaim',
    ].map((helperKey) => ({
      plane: 'task',
      helperKey,
      executionTruth: 'blocked-pending-packet',
      blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    })),
  );

  assert.deepEqual(
    [
      'buildEvidenceSubmissionInput',
      'buildCommercialActionScenarioPlan',
      'runCommercialActionScenario',
      'readCommercialActionScenarioReview',
      'buildGovernedProposalReviewUsePlan',
      'buildGovernedProposalReviewUseResult',
      'buildOpportunityPackageHandoffPlan',
      'runOpportunityPackageHandoff',
    ].map((helperKey) => {
      const gate = gateByHelperKey.get(helperKey);
      return gate && {
        plane: gate.plane,
        helperKey: gate.helperKey,
        executionTruth: gate.executionTruth,
        blockedBy: gate.blockedBy,
      };
    }),
    [
      'buildEvidenceSubmissionInput',
      'buildCommercialActionScenarioPlan',
      'runCommercialActionScenario',
      'readCommercialActionScenarioReview',
      'buildGovernedProposalReviewUsePlan',
      'buildGovernedProposalReviewUseResult',
      'buildOpportunityPackageHandoffPlan',
      'runOpportunityPackageHandoff',
    ].map((helperKey) => ({
      plane: 'enterprise-integration',
      helperKey,
      executionTruth: 'blocked-pending-packet',
      blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    })),
  );

  assert.deepEqual(
    [
      'createCommercialAction',
      'policyCheckCommercialAction',
      'requestCommercialActionApproval',
      'executeCommercialAction',
    ].map((helperKey) => {
      const gate = gateByHelperKey.get(helperKey);
      return gate && {
        plane: gate.plane,
        helperKey: gate.helperKey,
        executionTruth: gate.executionTruth,
        blockedBy: gate.blockedBy,
      };
    }),
    [
      'createCommercialAction',
      'policyCheckCommercialAction',
      'requestCommercialActionApproval',
      'executeCommercialAction',
    ].map((helperKey) => ({
      plane: 'enterprise-integration',
      helperKey,
      executionTruth: 'blocked-pending-packet',
      blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    })),
  );

  assert.deepEqual(
    [
      'getCommercialActionStatus',
      'getCommercialActionReceipt',
      'getCommercialActionAudit',
    ].map((helperKey) => {
      const gate = gateByHelperKey.get(helperKey);
      return gate && {
        plane: gate.plane,
        helperKey: gate.helperKey,
        executionTruth: gate.executionTruth,
        blockedBy: gate.blockedBy,
      };
    }),
    [
      'getCommercialActionStatus',
      'getCommercialActionReceipt',
      'getCommercialActionAudit',
    ].map((helperKey) => ({
      plane: 'enterprise-integration',
      helperKey,
      executionTruth: 'packet-grounded-execution',
      blockedBy: null,
    })),
  );
});
