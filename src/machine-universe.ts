import type { BidviaClientRequestPolicy } from './contracts.js';

/** Credential identity is transport context, never business-payload authority. */
export interface BidviaMachineIdentity {
  tenantId: string;
  machinePrincipalId: string;
  agentRegistrationId: string;
  credentialVersion: number;
}

export interface BidviaUniverseEvidence {
  evidenceRefs: readonly string[];
  evidenceDigests: readonly string[];
  idempotencyKey: string;
}

export interface BidviaUniverseConsumptionInput {
  retrievalResultSetRef: string;
  consumptionPurpose: string;
  idempotencyKey: string;
}

export interface BidviaUniverseOutcomeInput extends BidviaUniverseEvidence {
  dispatchId: string;
  outcomeState: 'COMPLETED' | 'FAILED';
  outcomeRef: string | null;
  reason: string;
  reportedOutcomeId: string;
  taskRef: string;
  retrievalConsumptionRef: string;
  assetPublicationVersionId: string;
  professionalScenarioRef: string;
  lineageRefs: readonly string[];
}

export interface BidviaUniverseConfirmationInput extends BidviaUniverseEvidence {
  reportedOutcomeId: string;
  decision: 'CONFIRM' | 'REJECT';
}

export interface BidviaUniverseContributionInput extends BidviaUniverseEvidence {
  reportedOutcomeRef: string;
  contributionFamily: 'UNIVERSE_CONSTRUCTION';
}

export interface BidviaUniverseSuccessorProposalInput {
  universeEvolutionRunId: string;
  contributionAdmissionId: string;
  continuationId: string;
  assetPublicationVersionId: string;
  professionalScenarioRef: string;
  targetTemplateFamily: 'CHEMICAL_MATCH_RULE_TEMPLATE';
  expectedRetrievalPolicyEvaluationId: string;
  expectedRetrievalPolicyRevision: number;
  assignmentAcceptanceIdempotencyKey: string;
  governanceQualityEvidenceRefs: readonly string[];
  governanceQualityEvidenceDigests: readonly string[];
  title: string;
  summary: string;
  body: string;
  idempotencyKey: string;
}

export interface BidviaUniverseConsumptionReceipt {
  retrieval_consumption_id: string;
  retrieval_result_set_ref: string;
  selected_asset_publication_version_id: string;
  task_ref: string;
  idempotency_key: string;
}

export interface BidviaUniverseSuccessorProposalReceipt {
  proposal: {
    asset_proposal_id: string;
    template_proposal_id: string;
    governed_asset_id: string;
    evidence_refs: string[];
    submitted_at: string;
  };
}

/** The server remains the authority for admission and gateway delivery.
 * A successful request (including HTTP 202) does not imply delivery/confirmation.
 */
export interface BidviaUniverseOutcomeReceipt {
  submission: Record<string, unknown>;
  admission: Record<string, unknown>;
  canonical_record: Record<string, unknown> | null;
  replayed: boolean;
}

export interface BidviaUniverseConfirmationRecord extends Record<string, unknown> {
  outcome_confirmation_id: string;
  reported_outcome_ref: string;
  decision: 'CONFIRM' | 'REJECT';
}

export interface BidviaUniverseConfirmedOutcome extends Record<string, unknown> {
  reported_outcome_id: string;
  status: 'CONFIRMED' | 'REJECTED';
}

export interface BidviaUniverseContributionRecord extends Record<string, unknown> {
  contribution_admission_id: string;
  reported_outcome_ref: string;
  credited_reporter_principal_ref: string;
  decision: 'ADMITTED';
}

export interface BidviaUniverseConfirmationReceipt {
  confirmation: BidviaUniverseConfirmationRecord;
  reported_outcome: BidviaUniverseConfirmedOutcome;
}

export interface BidviaUniverseContributionReceipt {
  contribution_admission: BidviaUniverseContributionRecord;
}

export interface BidviaMachineUniverseRequest {
  /** Suffix under the credential's own /machine/agents/:registration route. */
  suffix: string;
  body?: Record<string, unknown>;
  method?: 'GET' | 'POST';
}

export interface BidviaUniverseStartInput extends BidviaUniverseEvidence {
  dispatchId: string;
  title: string;
  summary: string;
  body: string;
}

export interface BidviaUniverseEntryReceipt {
  entry: {
    universe_evolution_run_id: string;
    asset_proposal_id: string;
    template_proposal_id: string;
    governed_asset_id: string;
    task_ref: string;
    dispatch_id: string;
    created_at: string;
  };
}

export interface BidviaUniverseRunStatus {
  universe_evolution_run_id: string;
  run_state: string;
  run_version: number;
  current_checkpoint: string;
  target_asset_publication_version_id: string | null;
  failure_code: string | null;
  updated_at: string;
}

export type BidviaMachineUniverseTransport = (
  request: BidviaMachineUniverseRequest, policy?: BidviaClientRequestPolicy,
) => Promise<unknown>;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Invalid machine universe receipt');
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError('Invalid machine universe receipt field');
  return value;
}

function evidence(input: BidviaUniverseEvidence): Record<string, unknown> {
  return { evidence_refs: [...input.evidenceRefs], evidence_digests: [...input.evidenceDigests], idempotency_key: input.idempotencyKey };
}

/** One instance per independently authenticated role; no auto-confirm or credential escalation. */
export function createBidviaMachineUniverseFacade(transport: BidviaMachineUniverseTransport) {
  return {
    async startRun(input: BidviaUniverseStartInput, policy?: BidviaClientRequestPolicy): Promise<BidviaUniverseEntryReceipt> {
      const receipt = record(await transport({ suffix: '/universe/runs', body: { schema_version: 1,
        dispatch_id: input.dispatchId, title: input.title, summary: input.summary, body: input.body, ...evidence(input) } }, policy));
      const entry = record(receipt.entry);
      for (const key of ['universe_evolution_run_id', 'asset_proposal_id', 'template_proposal_id', 'governed_asset_id', 'task_ref', 'dispatch_id', 'created_at']) text(entry[key]);
      if (entry.dispatch_id !== input.dispatchId) throw new TypeError('Initial run receipt does not match dispatch');
      return receipt as unknown as BidviaUniverseEntryReceipt;
    },
    async getRun(runId: string, policy?: BidviaClientRequestPolicy): Promise<BidviaUniverseRunStatus> {
      const result = record(await transport({ suffix: `/universe/runs/${encodeURIComponent(text(runId))}`, method: 'GET' }, policy));
      if (result.universe_evolution_run_id !== runId || !Number.isSafeInteger(result.run_version) || Number(result.run_version) < 0) {
        throw new TypeError('Invalid universe run status');
      }
      for (const key of ['run_state', 'current_checkpoint', 'updated_at']) text(result[key]);
      for (const key of ['failure_code', 'target_asset_publication_version_id']) if (result[key] !== null) text(result[key]);
      return result as unknown as BidviaUniverseRunStatus;
    },
    async consume(input: BidviaUniverseConsumptionInput, policy?: BidviaClientRequestPolicy): Promise<BidviaUniverseConsumptionReceipt> {
      const receipt = record(await transport({ suffix: '/universe/retrieval/consumptions', body: {
        schema_version: 1, retrieval_result_set_ref: input.retrievalResultSetRef,
        consumption_purpose: input.consumptionPurpose, idempotency_key: input.idempotencyKey,
      } }, policy));
      // Return the public receipt, not a synthetic local consumption.
      text(receipt.retrieval_consumption_id); text(receipt.retrieval_result_set_ref);
      text(receipt.selected_asset_publication_version_id); text(receipt.task_ref); text(receipt.idempotency_key);
      if (receipt.retrieval_result_set_ref !== input.retrievalResultSetRef || receipt.idempotency_key !== input.idempotencyKey) {
        throw new TypeError('Consumption receipt does not match the request');
      }
      return receipt as unknown as BidviaUniverseConsumptionReceipt;
    },
    async reportOutcome(input: BidviaUniverseOutcomeInput, policy?: BidviaClientRequestPolicy): Promise<BidviaUniverseOutcomeReceipt> {
      const receipt = record(await transport({ suffix: `/dispatches/${encodeURIComponent(input.dispatchId)}/outcome`, body: {
        schema_version: 1, outcome_state: input.outcomeState, outcome_ref: input.outcomeRef, reason: input.reason,
        reported_outcome_id: input.reportedOutcomeId, task_ref: input.taskRef,
        retrieval_consumption_ref: input.retrievalConsumptionRef, asset_publication_version_id: input.assetPublicationVersionId,
        professional_scenario_ref: input.professionalScenarioRef, lineage_refs: [...input.lineageRefs], ...evidence(input),
      } }, policy));
      record(receipt.submission); record(receipt.admission);
      if (receipt.canonical_record !== null) record(receipt.canonical_record);
      if (typeof receipt.replayed !== 'boolean') throw new TypeError('Invalid outcome replay status');
      return receipt as unknown as BidviaUniverseOutcomeReceipt;
    },
    async confirmOutcome(input: BidviaUniverseConfirmationInput, policy?: BidviaClientRequestPolicy): Promise<BidviaUniverseConfirmationReceipt> {
      const receipt = record(await transport({ suffix: `/universe/outcomes/${encodeURIComponent(input.reportedOutcomeId)}/confirmation`,
        body: { schema_version: 1, decision: input.decision, ...evidence(input) } }, policy));
      const confirmation = record(receipt.confirmation);
      const outcome = record(receipt.reported_outcome);
      text(confirmation.outcome_confirmation_id);
      if (confirmation.reported_outcome_ref !== input.reportedOutcomeId || confirmation.decision !== input.decision
        || outcome.reported_outcome_id !== input.reportedOutcomeId
        || outcome.status !== (input.decision === 'CONFIRM' ? 'CONFIRMED' : 'REJECTED')) {
        throw new TypeError('Confirmation receipt does not match the request');
      }
      return receipt as unknown as BidviaUniverseConfirmationReceipt;
    },
    async approveContribution(input: BidviaUniverseContributionInput, policy?: BidviaClientRequestPolicy): Promise<BidviaUniverseContributionReceipt> {
      const receipt = record(await transport({ suffix: '/universe/contributions/approvals', body: {
        schema_version: 1, reported_outcome_ref: input.reportedOutcomeRef,
        contribution_family: input.contributionFamily, ...evidence(input),
      } }, policy));
      const admission = record(receipt.contribution_admission);
      text(admission.contribution_admission_id); text(admission.credited_reporter_principal_ref);
      if (admission.reported_outcome_ref !== input.reportedOutcomeRef || admission.decision !== 'ADMITTED') {
        throw new TypeError('Contribution receipt does not match the request');
      }
      return receipt as unknown as BidviaUniverseContributionReceipt;
    },
    async submitSuccessorProposal(input: BidviaUniverseSuccessorProposalInput, policy?: BidviaClientRequestPolicy): Promise<BidviaUniverseSuccessorProposalReceipt> {
      const receipt = record(await transport({ suffix: '/universe/proposals/successor', body: {
        schema_version: 1, universe_evolution_run_id: input.universeEvolutionRunId,
        contribution_admission_id: input.contributionAdmissionId, continuation_id: input.continuationId,
        asset_publication_version_id: input.assetPublicationVersionId, professional_scenario_ref: input.professionalScenarioRef,
        target_template_family: input.targetTemplateFamily,
        expected_retrieval_policy_evaluation_id: input.expectedRetrievalPolicyEvaluationId,
        expected_retrieval_policy_revision: input.expectedRetrievalPolicyRevision,
        assignment_acceptance_idempotency_key: input.assignmentAcceptanceIdempotencyKey,
        governance_quality_evidence_refs: [...input.governanceQualityEvidenceRefs],
        governance_quality_evidence_digests: [...input.governanceQualityEvidenceDigests],
        title: input.title, summary: input.summary, body: input.body, idempotency_key: input.idempotencyKey,
      } }, policy));
      const proposal = record(receipt.proposal);
      for (const key of ['asset_proposal_id', 'template_proposal_id', 'governed_asset_id', 'submitted_at']) text(proposal[key]);
      if (!Array.isArray(proposal.evidence_refs) || !proposal.evidence_refs.every((ref: unknown) => typeof ref === 'string')) {
        throw new TypeError('Invalid proposal evidence references');
      }
      return receipt as unknown as BidviaUniverseSuccessorProposalReceipt;
    },
  };
}
