import { BidviaClient } from './client.js';
import type {
  BidviaEvidenceSubmissionInput,
  BidviaHeartbeatInput,
  BidviaProposalSubmissionInput,
  BidviaReviewPacket,
  BidviaScenarioVerificationBundle,
  BidviaSyncUploadInput,
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

export interface BidviaExecutionAdapter<Input, Output> {
  name: string;
  capabilityKey: string;
  describe(): string;
  run(client: BidviaClient, input: Input): Promise<Output>;
}

export type BidviaRegisteredAgentExecutionCommand =
  | 'heartbeat'
  | 'sync-upload'
  | 'evidence'
  | 'proposal';

type BidviaRegisteredAgentExecutionClient = Pick<BidviaClient,
  'postHeartbeat'
  | 'uploadSync'
  | 'submitEvidence'
  | 'submitProposal'>;

function createRegisteredAgentExecutionAdapter<Input, Output>(params: {
  name: string;
  capabilityKey: string;
  description: string;
  run: (client: BidviaRegisteredAgentExecutionClient, input: Input) => Promise<Output>;
}): BidviaExecutionAdapter<Input, Output> {
  return {
    name: params.name,
    capabilityKey: params.capabilityKey,
    describe() {
      return params.description;
    },
    async run(client, input) {
      return params.run(client, input);
    },
  };
}

export const registeredAgentExecutionAdapters = {
  heartbeat: createRegisteredAgentExecutionAdapter<BidviaHeartbeatInput, unknown>({
    name: 'heartbeat-execution',
    capabilityKey: 'postHeartbeat',
    description: 'Executes the real remote execution heartbeat over the registration-bound BidviaClient helper.',
    run(client, input) {
      return client.postHeartbeat(input);
    },
  }),
  'sync-upload': createRegisteredAgentExecutionAdapter<BidviaSyncUploadInput, unknown>({
    name: 'sync-upload-execution',
    capabilityKey: 'uploadSync',
    description: 'Executes the real remote execution sync upload over the registration-bound BidviaClient helper.',
    run(client, input) {
      return client.uploadSync(input);
    },
  }),
  evidence: createRegisteredAgentExecutionAdapter<BidviaEvidenceSubmissionInput, unknown>({
    name: 'evidence-execution',
    capabilityKey: 'submitEvidence',
    description: 'Executes the real remote execution evidence submission over the registration-bound BidviaClient helper.',
    run(client, input) {
      return client.submitEvidence(input);
    },
  }),
  proposal: createRegisteredAgentExecutionAdapter<BidviaProposalSubmissionInput, unknown>({
    name: 'proposal-execution',
    capabilityKey: 'submitProposal',
    description: 'Executes the real remote execution proposal submission over the registration-bound BidviaClient helper.',
    run(client, input) {
      return client.submitProposal(input);
    },
  }),
} satisfies Record<BidviaRegisteredAgentExecutionCommand, BidviaExecutionAdapter<unknown, unknown>>;

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

function assembleScenarioReviewPacket<ScenarioPlan extends { envelope: import('./contracts.js').BidviaScenarioEnvelope }>(
  scenarioPlan: ScenarioPlan,
): {
  verificationBundle: BidviaScenarioVerificationBundle;
  reviewPacket: BidviaReviewPacket;
  exportedReviewPacket: BidviaReviewPacket;
} {
  const verificationBundle = buildScenarioVerificationBundle({
    scenario: scenarioPlan.envelope,
    verificationMode: 'review-safe',
  });
  const reviewPacket = buildReviewPacket({
    scenario: scenarioPlan.envelope,
    bundle: verificationBundle,
  });

  return {
    verificationBundle,
    reviewPacket,
    exportedReviewPacket: exportReviewPacket(reviewPacket),
  };
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
    const { verificationBundle, reviewPacket, exportedReviewPacket } = assembleScenarioReviewPacket(scenarioPlan);

    return {
      scenarioPlan,
      verificationBundle,
      reviewPacket,
      exportedReviewPacket,
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
    const { verificationBundle, reviewPacket, exportedReviewPacket } = assembleScenarioReviewPacket(scenarioPlan);

    return {
      scenarioPlan,
      verificationBundle,
      reviewPacket,
      exportedReviewPacket,
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
    const { verificationBundle, reviewPacket, exportedReviewPacket } = assembleScenarioReviewPacket(scenarioPlan);

    return {
      scenarioPlan,
      verificationBundle,
      reviewPacket,
      exportedReviewPacket,
    };
  },
};
