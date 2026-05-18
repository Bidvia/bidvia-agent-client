import type { BidviaClient } from './client.js';
import type {
  BidviaApprovalOpportunityExternalHandoffBoundary,
  BidviaCommercialActionScenarioPlan,
  BidviaMultiBusinessChainCoordinatorPlan,
  BidviaMultiBusinessChainCoordinatorPlanInput,
  BidviaScenarioExecutionResult,
  BidviaScenarioVerificationBundle,
} from './contracts.js';
import type { BidviaCommercialActionScenarioResult } from './commercial-action.js';
import {
  buildCommercialActionScenarioPlan,
  executeCommercialActionScenario,
  runCommercialActionScenario,
} from './commercial-action.js';
import {
  buildConnectionApprovalScenarioPlan,
  runConnectionApprovalScenario,
} from './connection.js';
import {
  buildOpportunityPackageHandoffPlan,
  executeOpportunityPackageHandoff,
  runOpportunityPackageHandoff,
} from './handoffs.js';
import {
  buildIndustryUniverseScenarioPlan,
  executeIndustryUniverseScenario,
  runIndustryUniverseScenario,
} from './universe.js';
import { buildScenarioExecutionResult } from './verification.js';

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

export interface BidviaMultiBusinessChainCoordinatorResult {
  preHandoff: BidviaMultiBusinessChainCoordinatorPreHandoffResult;
  postHandoff: BidviaMultiBusinessChainCoordinatorPostHandoffResult;
}

export interface BidviaMultiBusinessChainCoordinatorExecutionResult extends BidviaMultiBusinessChainCoordinatorResult {
  executionResult: BidviaScenarioExecutionResult;
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
    handoffStepName: 'operator-confirm-opportunity-handoff',
    handoffOwnerRole: 'operator',
    checkpointGuidance: 'verify the approvalRequestId and caller-supplied opportunityId before exporting the review-safe package',
  };
}

function requireNonEmptyBoundaryId(value: string | undefined, fieldName: string): string {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    throw new Error(`${fieldName} is required at the approval-to-opportunity handoff boundary`);
  }

  return normalizedValue;
}

function requireFirstRecordId(
  bundle: BidviaScenarioVerificationBundle,
  recordGroup: keyof BidviaScenarioVerificationBundle['recordIds'],
  fieldName: string,
): string {
  const recordIds = bundle.recordIds[recordGroup];
  const firstRecordId = Array.isArray(recordIds) ? recordIds[0] : undefined;
  return requireNonEmptyBoundaryId(firstRecordId, fieldName);
}

function requireMatchingExplicitApprovalOpportunityBoundary(
  externalHandoffBoundary: BidviaApprovalOpportunityExternalHandoffBoundary,
  plan: BidviaMultiBusinessChainCoordinatorPlan,
): BidviaApprovalOpportunityExternalHandoffBoundary {
  const approvalRequestId = requireNonEmptyBoundaryId(
    externalHandoffBoundary.approvalRequestId,
    'approvalRequestId',
  );
  const opportunityId = requireNonEmptyBoundaryId(
    externalHandoffBoundary.suppliedKnownIds?.opportunityId,
    'opportunityId',
  );

  if (externalHandoffBoundary.boundaryKey !== plan.externalHandoffBoundary.boundaryKey
    || externalHandoffBoundary.status !== plan.externalHandoffBoundary.status
    || approvalRequestId !== plan.externalHandoffBoundary.approvalRequestId
    || opportunityId !== plan.externalHandoffBoundary.suppliedKnownIds.opportunityId) {
    throw new Error('explicit approval-to-opportunity handoff boundary must match the coordinator plan');
  }

  return {
    ...externalHandoffBoundary,
    approvalRequestId,
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
  const approvalRequestId = requireFirstRecordId(
    connectionApproval,
    'approvals',
    'approvalRequestId',
  );

  return {
    industryUniverse,
    connectionApproval,
    externalHandoffBoundary: {
      ...plan.externalHandoffBoundary,
      approvalRequestId,
    },
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

type BidviaFullCoordinatorClient =
  & BidviaPreHandoffCoordinatorClient
  & BidviaPostHandoffCoordinatorClient;

export async function runMultiBusinessChainCoordinatorWithExplicitHandoff(
  client: BidviaFullCoordinatorClient,
  plan: BidviaMultiBusinessChainCoordinatorPlan,
  externalHandoffBoundary: BidviaApprovalOpportunityExternalHandoffBoundary,
): Promise<BidviaMultiBusinessChainCoordinatorResult> {
  const validatedExternalHandoffBoundary = requireMatchingExplicitApprovalOpportunityBoundary(
    externalHandoffBoundary,
    plan,
  );
  const preHandoff = await runMultiBusinessChainCoordinatorPreHandoff(client, plan);
  const postHandoff = await runMultiBusinessChainCoordinatorPostHandoff(
    client,
    plan,
    {
      ...validatedExternalHandoffBoundary,
      approvalRequestId: preHandoff.externalHandoffBoundary.approvalRequestId,
    },
  );

  return {
    preHandoff,
    postHandoff,
  };
}

export async function executeMultiBusinessChainCoordinatorWithExplicitHandoff(
  client: BidviaFullCoordinatorClient,
  plan: BidviaMultiBusinessChainCoordinatorPlan,
  externalHandoffBoundary: BidviaApprovalOpportunityExternalHandoffBoundary,
): Promise<BidviaMultiBusinessChainCoordinatorExecutionResult> {
  const result = await runMultiBusinessChainCoordinatorWithExplicitHandoff(
    client,
    plan,
    externalHandoffBoundary,
  );

  return {
    ...result,
    executionResult: buildScenarioExecutionResult({
      scenarioId: plan.coordinatorId,
      scenarioFamily: 'multi-business-chain',
      verificationMode: 'review-safe',
      status: 'succeeded',
      closureStage: 'business-closure-deferred',
      ownership: 'core-runtime',
      resumable: true,
      evidence: {
        helperKey: 'runMultiBusinessChainCoordinatorWithExplicitHandoff',
        routePathTemplate: 'coordinator://industry-to-package-with-commercial-action',
        actorRole: 'operator',
        contextSummary: {
          tenantIdPresent: true,
          principalIdPresent: true,
          companyIdPresent: true,
        },
        requestSummary: {
          method: 'SCENARIO',
        },
        responseSummary: {
          status: 200,
        },
      },
    }),
  };
}
