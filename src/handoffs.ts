import { BidviaClient } from './client.js';
import type {
  BidviaClosureGuidance,
  BidviaEnterpriseIntegrationPlaneHelperGroup,
  BidviaExportOpportunityPackageInput,
  BidviaScenarioEnvelope,
  BidviaScenarioVerificationBundle,
} from './contracts.js';
import { getEnterpriseIntegrationPlaneHelperGroup } from './enterprise-integration-plane.js';

import {
  buildScenarioEnvelope,
  buildScenarioRouteStep,
} from './scenarios.js';
import {
  appendCompletedRouteStep,
  buildScenarioVerificationBundle,
} from './verification.js';
import { buildWorkflowStageReference } from './workflow-stage-plane.js';

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
  closureGuidance: BidviaClosureGuidance;
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
      workflowStage: buildWorkflowStageReference(input.workflowIds, 'governed-run-execution'),
      expectedRouteChain: [
        buildScenarioRouteStep('exportOpportunityPackage', ['tenantId', 'principalId', 'companyId'], {
          stepName: 'operator-export-opportunity-package',
          actorRole: 'operator',
          progressionCheckpoint: {
            checkpointName: 'verify-package-export-record-before-commercial-action',
            verifyRecordGroups: ['opportunities'],
            guidance: 'confirm the caller-supplied opportunity id is the record exported before moving into downstream commercial action steps',
          },
        }),
      ],
      recordIds: {
        opportunities: [opportunityId],
      },
      closureGuidance: {
        lane: 'runtime-generated',
        fixedFixtureAssumptions: false,
        prerequisites: [
          'use a real opportunity id returned by surfaced upstream steps',
          'do not assume proof fixture ids are available on the default business lane',
        ],
      },
    }),
    exportOpportunityPackageInput: {
      ...input.exportOpportunityPackage,
      opportunityId,
    },
    closureGuidance: {
      lane: 'runtime-generated',
      fixedFixtureAssumptions: false,
      prerequisites: [
        'use a real opportunity id returned by surfaced upstream steps',
        'do not assume proof fixture ids are available on the default business lane',
      ],
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

export function buildOpportunityPackageHandoffEnterpriseBoundary(): BidviaEnterpriseIntegrationPlaneHelperGroup {
  return getEnterpriseIntegrationPlaneHelperGroup('opportunity-handoffs');
}
