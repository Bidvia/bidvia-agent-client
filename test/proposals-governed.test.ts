import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTaskAckShell,
  buildTaskLeaseShell,
  buildTaskOfferShell,
} from '../src/task-participation.ts';
import type {
  BidviaGovernedAuthorizedUseReceipt,
  BidviaGovernedProposalRecommendation,
  BidviaGovernedProposalReviewAssessment,
  BidviaGovernedProposalReviewUsePlan,
} from '../src/contracts.ts';
import {
  bidviaGovernedParticipationAuthorities,
  bidviaGovernedProposalSurfaceKinds,
  buildGovernedProposalReviewUsePlan,
  buildGovernedProposalReviewUseResult,
} from '../src/proposals-governed.ts';

test('governed proposal/review/use surfaces stay bounded to recommendation assessment and authorized-use only', () => {
  assert.deepEqual(bidviaGovernedProposalSurfaceKinds, [
    'proposal-recommendation',
    'review-assessment',
    'authorized-use',
  ]);
  assert.deepEqual(bidviaGovernedParticipationAuthorities, [
    'recommendation',
    'assessment',
    'authorized-use',
  ]);
});

test('buildGovernedProposalReviewUsePlan builds bounded participation artifacts and route coverage', () => {
  const taskOffer = buildTaskOfferShell({
    taskId: 'task-governed-1',
    offerId: 'offer-governed-1',
    observedAt: '2026-03-27T09:00:00Z',
    offerSummary: 'review recommendation request',
  });
  const taskAck = buildTaskAckShell({
    taskId: 'task-governed-1',
    claimId: 'claim-governed-1',
    ackId: 'ack-governed-1',
    acknowledgedAt: '2026-03-27T09:02:00Z',
    ackSummary: 'review acknowledged for bounded assessment',
  });
  const taskLease = buildTaskLeaseShell({
    taskId: 'task-governed-1',
    leaseId: 'lease-governed-1',
    leasedAt: '2026-03-27T09:03:00Z',
    leaseExpiresAt: '2026-03-27T09:13:00Z',
    leaseSummary: 'authorized local use window',
  });

  const plan: BidviaGovernedProposalReviewUsePlan = buildGovernedProposalReviewUsePlan({
    scenarioId: 'scenario-governed-proposal-review-use-1',
    scenarioLabel: 'governed-proposal-review-use-soda-ash-light',
    sourceRefs: ['source://proposal/proposal-1'],
    evidenceRefs: ['evidence://proposal/evidence-1'],
    traceIds: ['trace-governed-1'],
    workflowIds: ['wf-governed-1'],
    proposalRecommendation: {
      authorityScope: 'recommendation',
      proposalType: 'template-change',
      proposalRef: 'proposal://governed/1',
      recommendationRef: 'recommendation://governed/1',
      summary: 'candidate recommendation for governed review',
      now: '2026-03-27T09:01:00Z',
      taskOffer,
    },
    reviewAssessment: {
      authorityScope: 'assessment',
      proposalRef: 'proposal://governed/1',
      reviewRef: 'review://governed/1',
      assessment: 'recommended-with-conditions',
      summary: 'bounded local assessment only',
      now: '2026-03-27T09:02:30Z',
      taskAck,
    },
    authorizedUse: {
      authorityScope: 'authorized-use',
      proposalRef: 'proposal://governed/1',
      authorizationRef: 'authorization://governed/1',
      receiptId: 'receipt-governed-1',
      usageSummary: 'consumer uses the reviewed recommendation under lease',
      now: '2026-03-27T09:04:00Z',
      taskLease,
    },
  });

  const recommendation: BidviaGovernedProposalRecommendation = plan.proposalRecommendation;
  const assessment: BidviaGovernedProposalReviewAssessment = plan.reviewAssessment;
  const authorizedUse: BidviaGovernedAuthorizedUseReceipt = plan.authorizedUse;

  assert.equal(plan.envelope.scenarioFamily, 'governed-proposal-review-use');
  assert.deepEqual(
    plan.envelope.expectedRouteChain.map((step) => step.routeKey),
    ['submitProposalRecommendation', 'recordReviewAssessment', 'recordAuthorizedUseReceipt'],
  );
  assert.deepEqual(plan.envelope.recordIds, {
    proposals: ['proposal://governed/1'],
    reviews: ['review://governed/1'],
    approvals: ['authorization://governed/1'],
    receipts: ['receipt-governed-1'],
  });
  assert.equal(recommendation.kind, 'proposal-recommendation');
  assert.equal(recommendation.authorityScope, 'recommendation');
  assert.equal(recommendation.taskOffer.offerId, 'offer-governed-1');
  assert.equal(assessment.kind, 'review-assessment');
  assert.equal(assessment.authorityScope, 'assessment');
  assert.equal(assessment.taskAck.ackId, 'ack-governed-1');
  assert.equal(authorizedUse.kind, 'authorized-use');
  assert.equal(authorizedUse.authorityScope, 'authorized-use');
  assert.equal(authorizedUse.taskLease.leaseId, 'lease-governed-1');
});

test('buildGovernedProposalReviewUsePlan rejects local publish or adopt authority', () => {
  const taskOffer = buildTaskOfferShell({
    taskId: 'task-governed-1',
    offerId: 'offer-governed-1',
    observedAt: '2026-03-27T09:00:00Z',
    offerSummary: 'review recommendation request',
  });
  const taskAck = buildTaskAckShell({
    taskId: 'task-governed-1',
    claimId: 'claim-governed-1',
    ackId: 'ack-governed-1',
    acknowledgedAt: '2026-03-27T09:02:00Z',
    ackSummary: 'review acknowledged for bounded assessment',
  });
  const taskLease = buildTaskLeaseShell({
    taskId: 'task-governed-1',
    leaseId: 'lease-governed-1',
    leasedAt: '2026-03-27T09:03:00Z',
    leaseExpiresAt: '2026-03-27T09:13:00Z',
    leaseSummary: 'authorized local use window',
  });

  assert.throws(
    () => buildGovernedProposalReviewUsePlan({
      scenarioId: 'scenario-governed-proposal-review-use-1',
      scenarioLabel: 'governed-proposal-review-use-soda-ash-light',
      sourceRefs: ['source://proposal/proposal-1'],
      evidenceRefs: ['evidence://proposal/evidence-1'],
      traceIds: ['trace-governed-1'],
      workflowIds: ['wf-governed-1'],
      proposalRecommendation: {
        authorityScope: 'publish' as never,
        proposalType: 'template-change',
        proposalRef: 'proposal://governed/1',
        recommendationRef: 'recommendation://governed/1',
        summary: 'candidate recommendation for governed review',
        now: '2026-03-27T09:01:00Z',
        taskOffer,
      },
      reviewAssessment: {
        authorityScope: 'assessment',
        proposalRef: 'proposal://governed/1',
        reviewRef: 'review://governed/1',
        assessment: 'recommended-with-conditions',
        summary: 'bounded local assessment only',
        now: '2026-03-27T09:02:30Z',
        taskAck,
      },
      authorizedUse: {
        authorityScope: 'authorized-use',
        proposalRef: 'proposal://governed/1',
        authorizationRef: 'authorization://governed/1',
        receiptId: 'receipt-governed-1',
        usageSummary: 'consumer uses the reviewed recommendation under lease',
        now: '2026-03-27T09:04:00Z',
        taskLease,
      },
    }),
    /local authority must stay bounded to recommendation, assessment, or authorized-use only/,
  );
});

test('buildGovernedProposalReviewUseResult returns review-safe recommendation assessment and authorized-use outputs', () => {
  const plan = buildGovernedProposalReviewUsePlan({
    scenarioId: 'scenario-governed-proposal-review-use-1',
    scenarioLabel: 'governed-proposal-review-use-soda-ash-light',
    sourceRefs: ['source://proposal/proposal-1'],
    evidenceRefs: ['evidence://proposal/evidence-1'],
    traceIds: ['trace-governed-1'],
    workflowIds: ['wf-governed-1'],
    proposalRecommendation: {
      authorityScope: 'recommendation',
      proposalType: 'template-change',
      proposalRef: 'proposal://governed/1',
      recommendationRef: 'recommendation://governed/1',
      summary: 'candidate recommendation for governed review',
      now: '2026-03-27T09:01:00Z',
      taskOffer: buildTaskOfferShell({
        taskId: 'task-governed-1',
        offerId: 'offer-governed-1',
        observedAt: '2026-03-27T09:00:00Z',
        offerSummary: 'review recommendation request',
      }),
    },
    reviewAssessment: {
      authorityScope: 'assessment',
      proposalRef: 'proposal://governed/1',
      reviewRef: 'review://governed/1',
      assessment: 'recommended-with-conditions',
      summary: 'bounded local assessment only',
      now: '2026-03-27T09:02:30Z',
      taskAck: buildTaskAckShell({
        taskId: 'task-governed-1',
        claimId: 'claim-governed-1',
        ackId: 'ack-governed-1',
        acknowledgedAt: '2026-03-27T09:02:00Z',
        ackSummary: 'review acknowledged for bounded assessment',
      }),
    },
    authorizedUse: {
      authorityScope: 'authorized-use',
      proposalRef: 'proposal://governed/1',
      authorizationRef: 'authorization://governed/1',
      receiptId: 'receipt-governed-1',
      usageSummary: 'consumer uses the reviewed recommendation under lease',
      now: '2026-03-27T09:04:00Z',
      taskLease: buildTaskLeaseShell({
        taskId: 'task-governed-1',
        leaseId: 'lease-governed-1',
        leasedAt: '2026-03-27T09:03:00Z',
        leaseExpiresAt: '2026-03-27T09:13:00Z',
        leaseSummary: 'authorized local use window',
      }),
    },
  });

  const result = buildGovernedProposalReviewUseResult(plan);

  assert.equal(result.verificationBundle.verificationMode, 'review-safe');
  assert.equal(result.verificationBundle.completedRouteChain.length, 3);
  assert.equal(result.reviewPacket.status, 'complete');
  assert.deepEqual(
    result.reviewPacket.details.recordDetails.map((detail) => detail.recordGroupKey),
    ['proposals', 'reviews', 'approvals', 'receipts'],
  );
  assert.deepEqual(
    result.reviewPacket.sections.map((section) => section.sectionKey),
    ['scenario', 'evidence', 'traceability', 'routes', 'verification', 'records'],
  );
  assert.deepEqual(result.reviewPacket.sections[5]?.entries, [
    'record-group:proposals:count=1',
    'proposals:proposal://governed/1',
    'record-group:reviews:count=1',
    'reviews:review://governed/1',
    'record-group:approvals:count=1',
    'approvals:authorization://governed/1',
    'record-group:receipts:count=1',
    'receipts:receipt-governed-1',
  ]);
  assert.equal(result.proposalRecommendation.kind, 'proposal-recommendation');
  assert.equal(result.reviewAssessment.kind, 'review-assessment');
  assert.equal(result.authorizedUse.kind, 'authorized-use');
});
