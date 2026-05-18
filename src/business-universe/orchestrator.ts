import type { BidviaClient } from '../client.js';
import type {
  BidviaApproveConnectionRequestInput,
  BidviaCommercialActionCreateInput,
  BidviaCommercialActionExecuteInput,
  BidviaCommercialActionPolicyCheckInput,
  BidviaCommercialActionRequestApprovalInput,
  BidviaCreateConnectionRequestInput,
  BidviaCreateListingInput,
  BidviaExportOpportunityPackageInput,
  BidviaOperatorExecutionListingActivateInput,
  BidviaOperatorExecutionListingCreateInput,
  BidviaOperatorExecutionMatchCandidatesInput,
  BidviaTaskDispatchWriteInput,
} from '../contracts.js';
import {
  establishClaimantCanonicalCompanyPublicPrecondition,
  inspectClaimantHandoff,
  inspectClaimantPrecondition,
  inspectClaimantReadiness,
  repairClaimantReadiness,
  runClaimantHandoffPreparation,
  type BidviaClaimantCanonicalPreconditionInput,
  type BidviaClaimantReadinessRepairInput,
} from './claimant.js';
import type { BidviaExecutabilityClass, BidviaRoleWorkspaceRole, BidviaStageKey, BidviaStageSnapshot } from './contracts.js';
import {
  consumeOperatorHandoff,
  inspectOperatorCommercialAction,
  runOperatorApprovalContinuation,
  runOperatorCommercialAction,
  runOperatorConnectionContinuation,
  runOperatorMatching,
  runOperatorPackageExport,
} from './operator.js';

export type BidviaUniverseNextStepKind = 'continue' | 'handoff' | 'stop';

export interface BidviaUniverseNextStep {
  role: BidviaRoleWorkspaceRole;
  stage: BidviaStageKey;
  kind: BidviaUniverseNextStepKind;
  executability: BidviaExecutabilityClass;
  route?: string;
  reason?: string;
}

export interface BidviaUniverseCurrentState {
  role: BidviaRoleWorkspaceRole;
  stageSnapshot: BidviaStageSnapshot;
  nextStep: BidviaUniverseNextStep;
  evidence?: unknown;
}

export interface BidviaUniverseResumeArtifact extends BidviaUniverseCurrentState {}

export interface BidviaUniverseInspectInput {
  claimant?: {
    agentId?: string;
    listingId?: string;
  };
  operator?: {
    sourceListingId?: string;
    commercialActionRequestId?: string;
  };
}

export interface BidviaUniverseRunInput extends BidviaUniverseInspectInput {
  resumeFrom?: BidviaUniverseResumeArtifact;
  claimant?: BidviaUniverseInspectInput['claimant'] & {
    precondition?: BidviaClaimantCanonicalPreconditionInput;
    readinessRepair?: Omit<BidviaClaimantReadinessRepairInput, 'agentId'>;
    taskEntry?: BidviaTaskDispatchWriteInput;
    handoffPreparation?: {
      listing: BidviaCreateListingInput;
      activation: { verificationStatus?: string; now: string };
    };
  };
  operator?: BidviaUniverseInspectInput['operator'] & {
    matching?: {
      sourceListingId: string;
      candidateListing: BidviaOperatorExecutionListingCreateInput;
      candidateActivation: BidviaOperatorExecutionListingActivateInput;
      matchCandidates: BidviaOperatorExecutionMatchCandidatesInput;
    };
    connection?: BidviaCreateConnectionRequestInput & { companyId: string };
    approval?: BidviaApproveConnectionRequestInput;
    packageExport?: BidviaExportOpportunityPackageInput;
    commercialAction?: {
      create: BidviaCommercialActionCreateInput;
      policyCheck: BidviaCommercialActionPolicyCheckInput;
      requestApproval: BidviaCommercialActionRequestApprovalInput;
      execute: BidviaCommercialActionExecuteInput;
    };
  };
}

export interface BidviaUniverseRunResult {
  history: Array<{ step: string; result: unknown }>;
  current: BidviaUniverseCurrentState;
}

export interface BidviaUniverseExplanation {
  current: BidviaUniverseCurrentState;
  summary: string;
}

function buildNextStep(stageSnapshot: BidviaStageSnapshot): BidviaUniverseNextStep {
  if (stageSnapshot.executability === 'non-canonical-fail-close' || stageSnapshot.executability === 'bounded-stop' || stageSnapshot.executability === 'later-wave-stop') {
    return {
      role: stageSnapshot.roleWorkspace.role,
      stage: stageSnapshot.stage,
      kind: 'stop',
      executability: stageSnapshot.executability,
      route: stageSnapshot.action.route,
      reason: stageSnapshot.boundary?.reasonCodes[0],
    };
  }

  if (stageSnapshot.handoff?.mode === 'executable' || stageSnapshot.executability === 'executable-handoff') {
    return {
      role: 'operator',
      stage: 'handoff',
      kind: 'handoff',
      executability: stageSnapshot.executability,
      route: stageSnapshot.handoff?.route ?? stageSnapshot.nextStepRoute ?? stageSnapshot.action.route,
    };
  }

  if (stageSnapshot.roleWorkspace.role === 'claimant' && stageSnapshot.stage === 'entry') {
    return {
      role: 'claimant',
      stage: 'readiness',
      kind: 'continue',
      executability: stageSnapshot.executability,
      route: stageSnapshot.nextStepRoute ?? stageSnapshot.action.route,
    };
  }

  if (stageSnapshot.roleWorkspace.role === 'claimant' && stageSnapshot.stage === 'readiness') {
    return {
      role: 'claimant',
      stage: 'task-entry',
      kind: 'continue',
      executability: stageSnapshot.executability,
      route: stageSnapshot.nextStepRoute ?? stageSnapshot.action.route,
    };
  }

  if (stageSnapshot.roleWorkspace.role === 'operator' && stageSnapshot.stage === 'handoff') {
    return {
      role: 'operator',
      stage: 'progression',
      kind: 'continue',
      executability: stageSnapshot.executability,
      route: stageSnapshot.nextStepRoute ?? stageSnapshot.action.route,
    };
  }

  if (stageSnapshot.roleWorkspace.role === 'operator' && stageSnapshot.stage === 'progression') {
    return {
      role: 'operator',
      stage: 'closure',
      kind: 'continue',
      executability: stageSnapshot.executability,
      route: stageSnapshot.nextStepRoute ?? stageSnapshot.action.route,
    };
  }

  return {
    role: stageSnapshot.roleWorkspace.role,
    stage: stageSnapshot.stage,
    kind: 'continue',
    executability: stageSnapshot.executability,
    route: stageSnapshot.nextStepRoute ?? stageSnapshot.action.route,
  };
}

function toCurrentState(stageSnapshot: BidviaStageSnapshot, evidence?: unknown): BidviaUniverseCurrentState {
  return {
    role: stageSnapshot.roleWorkspace.role,
    stageSnapshot,
    nextStep: buildNextStep(stageSnapshot),
    evidence,
  };
}

function buildOperatorStageSnapshot(stage: BidviaStageKey, state: BidviaStageSnapshot['state']): BidviaStageSnapshot {
  return {
    roleWorkspace: {
      role: 'operator',
      sessionPresent: false,
      adminSessionPresent: true,
      canonicality: 'canonical',
    },
    stage,
    state,
    executability: 'canonical',
    action: {
      kind: 'continue',
      owner: 'operator',
      executability: 'canonical',
    },
  };
}

function isStopArtifact(artifact: BidviaUniverseResumeArtifact): boolean {
  return artifact.nextStep.kind === 'stop'
    || artifact.stageSnapshot.executability === 'non-canonical-fail-close'
    || artifact.stageSnapshot.executability === 'bounded-stop'
    || artifact.stageSnapshot.executability === 'later-wave-stop';
}

export async function inspectUniverse(
  client: Pick<BidviaClient,
    'getAccountMe'
    | 'getAccountAgent'
    | 'getAccountAgentClosureStatus'
    | 'getAccountAgentExecutionListingMaterializationStatus'
    | 'createAccountAgentExecutionListing'
    | 'activateAccountAgentExecutionListing'
    | 'listOperatorMatches'
    | 'getOperatorCommercialActionStatus'
    | 'getOperatorCommercialActionReceipt'
    | 'getOperatorCommercialActionAudit'
  >,
  input: BidviaUniverseInspectInput,
): Promise<BidviaUniverseCurrentState> {
  if (input.operator?.commercialActionRequestId) {
    const evidence = await inspectOperatorCommercialAction(client, {
      commercialActionRequestId: input.operator.commercialActionRequestId,
    });
    return toCurrentState(buildOperatorStageSnapshot('closure', 'completed'), evidence);
  }

  if (input.operator?.sourceListingId) {
    const evidence = await consumeOperatorHandoff(client, {
      sourceListingId: input.operator.sourceListingId,
    });
    return toCurrentState(buildOperatorStageSnapshot('handoff', 'ready'), evidence);
  }

  if (input.claimant?.agentId && input.claimant.listingId) {
    const evidence = await inspectClaimantHandoff(client, input.claimant.agentId, input.claimant.listingId);
    return toCurrentState(evidence.stageSnapshot, evidence);
  }

  if (input.claimant?.agentId) {
    const evidence = await inspectClaimantReadiness(client, input.claimant.agentId);
    return toCurrentState(evidence.stageSnapshot, evidence);
  }

  const evidence = await inspectClaimantPrecondition(client);
  return toCurrentState(evidence.stageSnapshot, evidence);
}

export async function runUniverse(
  client: Pick<BidviaClient,
    'getAccountMe'
    | 'getAccountAgent'
    | 'getAccountAgentClosureStatus'
    | 'getAccountAgentExecutionListingMaterializationStatus'
    | 'createAccountAgentExecutionListing'
    | 'activateAccountAgentExecutionListing'
    | 'acceptAccountMembershipInvitation'
    | 'selectOrg'
    | 'patchAgentSelfService'
    | 'createAccountAgentExternalBinding'
    | 'createAccountAgentDispatchAuthorityRequest'
    | 'createTaskDispatch'
    | 'listOperatorMatches'
    | 'createOperatorExecutionListing'
    | 'activateOperatorExecutionListing'
    | 'generateOperatorMatchCandidates'
    | 'createOperatorConnection'
    | 'approveOperatorConnection'
    | 'exportOperatorOpportunityPackage'
    | 'createCommercialAction'
    | 'policyCheckCommercialAction'
    | 'requestCommercialActionApproval'
    | 'executeCommercialAction'
    | 'getOperatorCommercialActionStatus'
    | 'getOperatorCommercialActionReceipt'
    | 'getOperatorCommercialActionAudit'
  >,
  input: BidviaUniverseRunInput,
): Promise<BidviaUniverseRunResult> {
  if (input.resumeFrom && isStopArtifact(input.resumeFrom)) {
    return { history: [], current: input.resumeFrom };
  }

  const history: Array<{ step: string; result: unknown }> = [];

  if (input.claimant?.precondition) {
    const result = await establishClaimantCanonicalCompanyPublicPrecondition(client, input.claimant.precondition);
    history.push({ step: 'claimant.precondition', result });
  }

  if (input.claimant?.agentId && input.claimant.readinessRepair) {
    const result = await repairClaimantReadiness(client, {
      agentId: input.claimant.agentId,
      ...input.claimant.readinessRepair,
    });
    history.push({ step: 'claimant.readiness-repair', result });
  }

  if (input.claimant?.agentId && input.claimant.taskEntry) {
    const result = await client.createTaskDispatch(input.claimant.agentId, input.claimant.taskEntry);
    history.push({ step: 'claimant.task-entry', result });
  }

  if (input.claimant?.agentId && input.claimant.handoffPreparation) {
    const result = await runClaimantHandoffPreparation(
      client,
      input.claimant.agentId,
      input.claimant.handoffPreparation.listing,
      input.claimant.handoffPreparation.activation,
    );
    history.push({ step: 'claimant.handoff-preparation', result });
    return {
      history,
      current: toCurrentState(result.handoff.stageSnapshot, result),
    };
  }

  if (input.operator?.matching) {
    const result = await runOperatorMatching(client, input.operator.matching);
    history.push({ step: 'operator.matching', result });
    return {
      history,
      current: toCurrentState(buildOperatorStageSnapshot('progression', 'continuing'), result),
    };
  }

  if (input.operator?.connection && input.operator.approval) {
    const result = await runOperatorConnectionContinuation(client, {
      connection: input.operator.connection,
      approval: input.operator.approval,
    });
    history.push({ step: 'operator.connection-continuation', result });
    return {
      history,
      current: toCurrentState(buildOperatorStageSnapshot('progression', 'continuing'), result),
    };
  }

  if (input.operator?.approval) {
    const result = await runOperatorApprovalContinuation(client, input.operator.approval);
    history.push({ step: 'operator.approval', result });
    return {
      history,
      current: toCurrentState(buildOperatorStageSnapshot('progression', 'continuing'), result),
    };
  }

  if (input.operator?.packageExport) {
    const result = await runOperatorPackageExport(client, input.operator.packageExport);
    history.push({ step: 'operator.package-export', result });
    return {
      history,
      current: toCurrentState(buildOperatorStageSnapshot('closure', 'continuing'), result),
    };
  }

  if (input.operator?.commercialAction) {
    const result = await runOperatorCommercialAction(client, input.operator.commercialAction);
    history.push({ step: 'operator.commercial-action', result });
    return {
      history,
      current: toCurrentState(buildOperatorStageSnapshot('closure', 'completed'), result),
    };
  }

  return {
    history,
    current: input.resumeFrom ?? await inspectUniverse(client, input),
  };
}

export async function explainUniverse(
  client: Pick<BidviaClient,
    'getAccountMe'
    | 'getAccountAgent'
    | 'getAccountAgentClosureStatus'
    | 'getAccountAgentExecutionListingMaterializationStatus'
    | 'createAccountAgentExecutionListing'
    | 'activateAccountAgentExecutionListing'
    | 'listOperatorMatches'
    | 'getOperatorCommercialActionStatus'
    | 'getOperatorCommercialActionReceipt'
    | 'getOperatorCommercialActionAudit'
  >,
  input: BidviaUniverseInspectInput,
): Promise<BidviaUniverseExplanation> {
  const current = await inspectUniverse(client, input);
  return {
    current,
    summary: `${current.role} is currently at ${current.stageSnapshot.stage} and the next step is ${current.nextStep.kind} -> ${current.nextStep.stage}.`,
  };
}


export interface BidviaUniverseFacade {
  inspect: (input: BidviaUniverseInspectInput) => Promise<BidviaUniverseCurrentState>;
  run: (input: BidviaUniverseRunInput) => Promise<BidviaUniverseRunResult>;
  explain: (input: BidviaUniverseInspectInput) => Promise<BidviaUniverseExplanation>;
}

export function createBidviaUniverseFacade(client: BidviaClient): BidviaUniverseFacade {
  return {
    inspect: (input: BidviaUniverseInspectInput) => inspectUniverse(client, input),
    run: (input: BidviaUniverseRunInput) => runUniverse(client, input),
    explain: (input: BidviaUniverseInspectInput) => explainUniverse(client, input),
  };
}
