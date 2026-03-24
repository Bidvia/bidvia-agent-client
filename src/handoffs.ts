import { BidviaClient } from './client.js';
import type {
  BidviaExportOpportunityPackageInput,
  BidviaScenarioEnvelope,
  BidviaScenarioVerificationBundle,
} from './contracts.js';

import {
  buildScenarioEnvelope,
  buildScenarioRouteStep,
} from './scenarios.js';
import {
  appendCompletedRouteStep,
  buildScenarioVerificationBundle,
} from './verification.js';

export interface BidviaOpportunityPackageHandoffPlanInput {
  scenarioId: string;
  scenarioLabel: string;
  sourceRefs: string[];
  evidenceRefs: string[];
  traceIds: string[];
  workflowIds: string[];
  exportOpportunityPackage: BidviaExportOpportunityPackageInput;
}

export interface BidviaOpportunityPackageHandoffPlan {
  envelope: BidviaScenarioEnvelope;
  exportOpportunityPackageInput: BidviaExportOpportunityPackageInput;
}

function requireNonEmptyId(value: string, fieldName: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    throw new Error(`${fieldName} is required for the opportunity package handoff plan`);
  }

  return trimmedValue;
}

export function buildOpportunityPackageHandoffPlan(
  input: BidviaOpportunityPackageHandoffPlanInput,
): BidviaOpportunityPackageHandoffPlan {
  const opportunityId = requireNonEmptyId(
    input.exportOpportunityPackage.opportunityId,
    'opportunityId',
  );

  return {
    envelope: buildScenarioEnvelope({
      scenarioId: input.scenarioId,
      scenarioLabel: input.scenarioLabel,
      scenarioFamily: 'opportunity-package-handoff',
      sourceRefs: input.sourceRefs,
      evidenceRefs: input.evidenceRefs,
      traceIds: input.traceIds,
      workflowIds: input.workflowIds,
      expectedRouteChain: [
        buildScenarioRouteStep('exportOpportunityPackage', ['tenantId', 'principalId', 'companyId']),
      ],
      recordIds: {
        opportunities: [opportunityId],
      },
    }),
    exportOpportunityPackageInput: {
      ...input.exportOpportunityPackage,
      opportunityId,
    },
  };
}

export async function runOpportunityPackageHandoff(
  client: BidviaClient,
  plan: BidviaOpportunityPackageHandoffPlan,
): Promise<BidviaScenarioVerificationBundle> {
  let verificationBundle = buildScenarioVerificationBundle({
    scenario: plan.envelope,
    verificationMode: 'review-safe',
  });

  await client.exportOpportunityPackage(plan.exportOpportunityPackageInput);
  verificationBundle = appendCompletedRouteStep(
    verificationBundle,
    plan.envelope.expectedRouteChain[0]!,
  );

  return verificationBundle;
}
