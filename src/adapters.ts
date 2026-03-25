import { BidviaClient } from './client.js';
import type {
  BidviaReviewPacket,
  BidviaScenarioVerificationBundle,
} from './contracts.js';
import {
  buildConnectionApprovalScenarioPlan,
} from './connection.js';
import type {
  BidviaConnectionApprovalScenarioPlan,
  BidviaConnectionApprovalScenarioPlanInput,
} from './contracts.js';
import {
  buildOpportunityPackageHandoffPlan,
} from './handoffs.js';
import type {
  BidviaOpportunityPackageHandoffPlan,
  BidviaOpportunityPackageHandoffPlanInput,
} from './handoffs.js';
import {
  buildIndustryUniverseScenarioPlan,
} from './universe.js';
import type {
  BidviaIndustryUniverseScenarioPlan,
  BidviaIndustryUniverseScenarioPlanInput,
} from './universe.js';
import {
  buildReviewPacket,
  buildScenarioVerificationBundle,
  exportReviewPacket,
} from './verification.js';

export interface BidviaScenarioAdapter<Input, Output> {
  name: string;
  describe(): string;
  run(client: BidviaClient, input: Input): Promise<Output> | Output;
}

export interface BidviaIndustryUniverseAdapterResult {
  scenarioPlan: BidviaIndustryUniverseScenarioPlan;
  verificationBundle: BidviaScenarioVerificationBundle;
  reviewPacket: BidviaReviewPacket;
  exportedReviewPacket: BidviaReviewPacket;
}

export interface BidviaConnectionApprovalAdapterResult {
  scenarioPlan: BidviaConnectionApprovalScenarioPlan;
  verificationBundle: BidviaScenarioVerificationBundle;
  reviewPacket: BidviaReviewPacket;
  exportedReviewPacket: BidviaReviewPacket;
}

export interface BidviaOpportunityPackageHandoffAdapterResult {
  scenarioPlan: BidviaOpportunityPackageHandoffPlan;
  verificationBundle: BidviaScenarioVerificationBundle;
  reviewPacket: BidviaReviewPacket;
  exportedReviewPacket: BidviaReviewPacket;
}

export const industryUniverseScenarioAdapter: BidviaScenarioAdapter<
  BidviaIndustryUniverseScenarioPlanInput,
  BidviaIndustryUniverseAdapterResult
> = {
  name: 'industry-universe-plan',
  describe() {
    return 'Builds a review-safe industry universe scenario plan payload.';
  },
  run(_client, input) {
    const scenarioPlan = buildIndustryUniverseScenarioPlan(input);
    const verificationBundle = buildScenarioVerificationBundle({
      scenario: scenarioPlan.envelope,
      verificationMode: 'review-safe',
    });
    const reviewPacket = buildReviewPacket({
      scenario: scenarioPlan.envelope,
      bundle: verificationBundle,
    });

    return {
      scenarioPlan,
      verificationBundle,
      reviewPacket,
      exportedReviewPacket: exportReviewPacket(reviewPacket),
    };
  },
};

export const connectionApprovalScenarioAdapter: BidviaScenarioAdapter<
  BidviaConnectionApprovalScenarioPlanInput,
  BidviaConnectionApprovalAdapterResult
> = {
  name: 'connection-approval-plan',
  describe() {
    return 'Builds a review-safe connection approval scenario plan payload.';
  },
  run(_client, input) {
    const scenarioPlan = buildConnectionApprovalScenarioPlan(input);
    const verificationBundle = buildScenarioVerificationBundle({
      scenario: scenarioPlan.envelope,
      verificationMode: 'review-safe',
    });
    const reviewPacket = buildReviewPacket({
      scenario: scenarioPlan.envelope,
      bundle: verificationBundle,
    });

    return {
      scenarioPlan,
      verificationBundle,
      reviewPacket,
      exportedReviewPacket: exportReviewPacket(reviewPacket),
    };
  },
};

export const opportunityPackageHandoffAdapter: BidviaScenarioAdapter<
  BidviaOpportunityPackageHandoffPlanInput,
  BidviaOpportunityPackageHandoffAdapterResult
> = {
  name: 'opportunity-package-handoff-plan',
  describe() {
    return 'Builds a review-safe opportunity package handoff plan payload.';
  },
  run(_client, input) {
    const scenarioPlan = buildOpportunityPackageHandoffPlan(input);
    const verificationBundle = buildScenarioVerificationBundle({
      scenario: scenarioPlan.envelope,
      verificationMode: 'review-safe',
    });
    const reviewPacket = buildReviewPacket({
      scenario: scenarioPlan.envelope,
      bundle: verificationBundle,
    });

    return {
      scenarioPlan,
      verificationBundle,
      reviewPacket,
      exportedReviewPacket: exportReviewPacket(reviewPacket),
    };
  },
};
