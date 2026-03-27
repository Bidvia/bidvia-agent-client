import type {
  BidviaGovernedAuthorizedUseReceipt,
  BidviaGovernedParticipationAuthority,
  BidviaGovernedProposalRecommendation,
  BidviaGovernedProposalReviewAssessment,
  BidviaGovernedProposalReviewUsePlan,
  BidviaGovernedProposalReviewUsePlanInput,
  BidviaReviewPacket,
  BidviaScenarioVerificationBundle,
} from './contracts.js';
import {
  bidviaGovernedParticipationAuthorities,
} from './contracts.js';
import {
  buildScenarioEnvelope,
  buildScenarioRouteStep,
} from './scenarios.js';
import { buildCompletedScenarioReviewResult } from './verification.js';

export {
  bidviaGovernedParticipationAuthorities,
  bidviaGovernedProposalSurfaceKinds,
} from './contracts.js';

export interface BidviaGovernedProposalReviewUseResult {
  proposalRecommendation: BidviaGovernedProposalRecommendation;
  reviewAssessment: BidviaGovernedProposalReviewAssessment;
  authorizedUse: BidviaGovernedAuthorizedUseReceipt;
  verificationBundle: BidviaScenarioVerificationBundle;
  reviewPacket: BidviaReviewPacket;
}

function requireAuthorityScope<ExpectedAuthorityScope extends BidviaGovernedParticipationAuthority>(
  authorityScope: string,
  expectedAuthorityScope: ExpectedAuthorityScope,
): ExpectedAuthorityScope {
  if (!bidviaGovernedParticipationAuthorities.includes(
    authorityScope as BidviaGovernedParticipationAuthority,
  )) {
    throw new Error('local authority must stay bounded to recommendation, assessment, or authorized-use only');
  }

  if (authorityScope !== expectedAuthorityScope) {
    throw new Error('governed proposal/review/use inputs must match their bounded authority surface');
  }

  return expectedAuthorityScope;
}

export function buildGovernedProposalReviewUsePlan(
  input: BidviaGovernedProposalReviewUsePlanInput,
): BidviaGovernedProposalReviewUsePlan {
  const proposalRecommendation: BidviaGovernedProposalRecommendation = {
    kind: 'proposal-recommendation',
    authorityScope: requireAuthorityScope(input.proposalRecommendation.authorityScope, 'recommendation'),
    proposalType: input.proposalRecommendation.proposalType,
    proposalRef: input.proposalRecommendation.proposalRef,
    recommendationRef: input.proposalRecommendation.recommendationRef,
    summary: input.proposalRecommendation.summary,
    now: input.proposalRecommendation.now,
    taskOffer: input.proposalRecommendation.taskOffer,
  };

  const reviewAssessment: BidviaGovernedProposalReviewAssessment = {
    kind: 'review-assessment',
    authorityScope: requireAuthorityScope(input.reviewAssessment.authorityScope, 'assessment'),
    proposalRef: input.reviewAssessment.proposalRef,
    reviewRef: input.reviewAssessment.reviewRef,
    assessment: input.reviewAssessment.assessment,
    summary: input.reviewAssessment.summary,
    now: input.reviewAssessment.now,
    taskAck: input.reviewAssessment.taskAck,
  };

  const authorizedUse: BidviaGovernedAuthorizedUseReceipt = {
    kind: 'authorized-use',
    authorityScope: requireAuthorityScope(input.authorizedUse.authorityScope, 'authorized-use'),
    proposalRef: input.authorizedUse.proposalRef,
    authorizationRef: input.authorizedUse.authorizationRef,
    receiptId: input.authorizedUse.receiptId,
    usageSummary: input.authorizedUse.usageSummary,
    now: input.authorizedUse.now,
    taskLease: input.authorizedUse.taskLease,
  };

  return {
    envelope: buildScenarioEnvelope({
      scenarioId: input.scenarioId,
      scenarioLabel: input.scenarioLabel,
      scenarioFamily: 'governed-proposal-review-use',
      sourceRefs: input.sourceRefs,
      evidenceRefs: input.evidenceRefs,
      traceIds: input.traceIds,
      workflowIds: input.workflowIds,
      expectedRouteChain: [
        buildScenarioRouteStep('submitProposalRecommendation', ['tenantId', 'principalId', 'registrationId']),
        buildScenarioRouteStep('recordReviewAssessment', ['tenantId', 'principalId', 'registrationId']),
        buildScenarioRouteStep('recordAuthorizedUseReceipt', ['tenantId', 'principalId', 'registrationId']),
      ],
      recordIds: {
        proposals: [proposalRecommendation.proposalRef],
        reviews: [reviewAssessment.reviewRef],
        approvals: [authorizedUse.authorizationRef],
        receipts: [authorizedUse.receiptId],
      },
    }),
    proposalRecommendation,
    reviewAssessment,
    authorizedUse,
  };
}

export function buildGovernedProposalReviewUseResult(
  plan: BidviaGovernedProposalReviewUsePlan,
): BidviaGovernedProposalReviewUseResult {
  const { verificationBundle, reviewPacket } = buildCompletedScenarioReviewResult(plan.envelope);

  return {
    proposalRecommendation: plan.proposalRecommendation,
    reviewAssessment: plan.reviewAssessment,
    authorizedUse: plan.authorizedUse,
    verificationBundle,
    reviewPacket,
  };
}
