import type { BidviaClient } from './client.js';
import type {
  BidviaApprovalOpportunityExternalHandoffBoundary,
  BidviaCommercialActionScenarioPlan,
  BidviaMultiBusinessChainCoordinatorPlan,
  BidviaMultiBusinessChainCoordinatorPlanInput,
  BidviaScenarioVerificationBundle,
} from './contracts.js';
import type { BidviaCommercialActionScenarioResult } from './commercial-action.js';
import {
  buildCommercialActionScenarioPlan,
  runCommercialActionScenario,
} from './commercial-action.js';
import {
  buildConnectionApprovalScenarioPlan,
  runConnectionApprovalScenario,
} from './connection.js';
import {
  buildOpportunityPackageHandoffPlan,
  runOpportunityPackageHandoff,
} from './handoffs.js';
import {
  buildIndustryUniverseScenarioPlan,
  runIndustryUniverseScenario,
} from './universe.js';

export interface BidviaMultiBusinessChainCoordinatorPreHandoffResult {
  industryUniverse: BidviaScenarioVerificationBundle;
  connectionApproval: BidviaScenarioVerificationBundle;
  externalHandoffBoundary: BidviaApprovalOpportunityExternalHandoffBoundary;
}

export interface BidviaMultiBusinessChainCoordinatorPostHandoffResult {
  opportunityPackageHandoff: BidviaScenarioVerificationBundle;
  commercialActionContinuation?: BidviaCommercialActionScenarioResult;
  externalHandoffBoundary: BidviaApprovalOpportunityExternalHandoffBoundary;
}

function buildApprovalOpportunityExternalHandoffBoundary(
  approvalRequestId: string,
  opportunityId: string,
): BidviaApprovalOpportunityExternalHandoffBoundary {
  return {
    boundaryKey: 'approval-to-opportunity',
    status: 'requires-caller-known-ids',
    approvalRequestId,
    requiredKnownIds: ['opportunityId'],
    suppliedKnownIds: {
      opportunityId,
    },
  };
}

function requireAlignedCommercialActionContinuation(
  commercialActionContinuation: BidviaCommercialActionScenarioPlan | undefined,
  approvalRequestId: string,
): void {
  if (!commercialActionContinuation) {
    return;
  }

  if (commercialActionContinuation.requestCommercialActionApprovalInput.approvalRequestId !== approvalRequestId) {
    throw new Error('commercial action continuation approvalRequestId must match the explicit connection approval handoff');
  }
}

export function buildMultiBusinessChainCoordinatorPlan(
  input: BidviaMultiBusinessChainCoordinatorPlanInput,
): BidviaMultiBusinessChainCoordinatorPlan {
  const industryUniverse = buildIndustryUniverseScenarioPlan(input.industryUniverse);
  const connectionApproval = buildConnectionApprovalScenarioPlan(input.connectionApproval);
  const opportunityPackageHandoff = buildOpportunityPackageHandoffPlan(input.opportunityPackageHandoff);
  const commercialActionContinuation = input.commercialActionContinuation
    ? buildCommercialActionScenarioPlan(input.commercialActionContinuation)
    : undefined;

  const approvalRequestId = connectionApproval.approveConnectionRequestInput.approvalRequestId;

  requireAlignedCommercialActionContinuation(commercialActionContinuation, approvalRequestId);

  return {
    coordinatorId: input.coordinatorId,
    coordinatorLabel: input.coordinatorLabel,
    industryUniverse,
    connectionApproval,
    externalHandoffBoundary: buildApprovalOpportunityExternalHandoffBoundary(
      approvalRequestId,
      opportunityPackageHandoff.exportOpportunityPackageInput.opportunityId,
    ),
    opportunityPackageHandoff,
    commercialActionContinuation,
  };
}

type BidviaPreHandoffCoordinatorClient = Pick<BidviaClient,
  'createListing'
  | 'activateListing'
  | 'generateMatchCandidates'
  | 'createConnectionRequest'
  | 'approveConnectionRequest'>;

export async function runMultiBusinessChainCoordinatorPreHandoff(
  client: BidviaPreHandoffCoordinatorClient,
  plan: BidviaMultiBusinessChainCoordinatorPlan,
): Promise<BidviaMultiBusinessChainCoordinatorPreHandoffResult> {
  const industryUniverse = await runIndustryUniverseScenario(client as BidviaClient, plan.industryUniverse);
  const connectionApproval = await runConnectionApprovalScenario(client as BidviaClient, plan.connectionApproval);

  return {
    industryUniverse,
    connectionApproval,
    externalHandoffBoundary: plan.externalHandoffBoundary,
  };
}

type BidviaPostHandoffCoordinatorClient = Pick<BidviaClient,
  'exportOpportunityPackage'
  | 'createCommercialAction'
  | 'policyCheckCommercialAction'
  | 'requestCommercialActionApproval'
  | 'executeCommercialAction'>;

export async function runMultiBusinessChainCoordinatorPostHandoff(
  client: BidviaPostHandoffCoordinatorClient,
  plan: BidviaMultiBusinessChainCoordinatorPlan,
  externalHandoffBoundary: BidviaApprovalOpportunityExternalHandoffBoundary,
): Promise<BidviaMultiBusinessChainCoordinatorPostHandoffResult> {
  const opportunityPackageHandoff = await runOpportunityPackageHandoff(
    client as BidviaClient,
    plan.opportunityPackageHandoff,
  );
  const commercialActionContinuation = plan.commercialActionContinuation
    ? await runCommercialActionScenario(client as BidviaClient, plan.commercialActionContinuation)
    : undefined;

  return {
    opportunityPackageHandoff,
    commercialActionContinuation,
    externalHandoffBoundary,
  };
}
