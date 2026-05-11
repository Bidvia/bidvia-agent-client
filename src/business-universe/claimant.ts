import type { BidviaClient } from '../client.js';
import type {
  BidviaAgentCapabilityProfileWriteInput,
  BidviaCreateListingInput,
  BidviaParticipationStateWriteInput,
  BidviaTaskDispatchWriteInput,
} from '../contracts.js';
import type { BidviaStageSnapshot } from './contracts.js';
import {
  normalizeClaimantClosureStatus,
  normalizeMaterializationStatus,
} from './normalize.js';

export const CANONICAL_COMPANY_PUBLIC_ORG_ID = 'company-public';

export interface BidviaClaimantPreconditionInspectResult {
  stageSnapshot: BidviaStageSnapshot;
  accountMe: any;
}

export interface BidviaClaimantCanonicalPreconditionInput {
  invitationToken?: string;
  canonicalOrgId?: string;
  now: string;
}

export interface BidviaClaimantCanonicalPreconditionResult {
  acceptedInvitation: unknown | null;
  selectedOrg: unknown | null;
  accountMe: unknown;
  stageSnapshot: BidviaStageSnapshot;
}

export interface BidviaClaimantReadinessInspectResult {
  detail: unknown;
  closureStatus: unknown;
  stageSnapshot: BidviaStageSnapshot;
}

export interface BidviaClaimantReadinessRepairInput {
  agentId: string;
  now: string;
  capabilityProfile?: BidviaAgentCapabilityProfileWriteInput;
  participationState?: BidviaParticipationStateWriteInput;
  taskDispatchAcceptance?: {
    acceptsTaskDispatches?: boolean;
    acceptedTaskDispatchScopes?: string[];
  };
  externalBinding?: {
    systemType: string;
    systemName: string;
    externalAccountRef: string;
  };
}

export interface BidviaClaimantReadinessRepairResult {
  before: BidviaClaimantReadinessInspectResult;
  actionTaken: string;
  actionResult: unknown;
}

function readActiveOrgId(accountMe: any): string | undefined {
  return accountMe?.active_org_context?.org_id
    ?? accountMe?.session?.active_org_context?.org_id;
}

function isClaimantSelfRepairNextStep(value: string | undefined): boolean {
  return value === 'complete_claimed_agent_self_service'
    || value === 'complete_task_dispatch_opt_in';
}

function buildPreconditionSnapshot(accountMe: any, canonicalOrgId: string): BidviaStageSnapshot {
  const activeOrgId = readActiveOrgId(accountMe);
  const memberships = Array.isArray(accountMe?.memberships) ? accountMe.memberships : [];
  const hasCanonicalMembership = memberships.some((entry: any) => entry?.org_id === canonicalOrgId);
  const canonical = activeOrgId === canonicalOrgId;
  return {
    roleWorkspace: {
      role: 'claimant',
      sessionPresent: true,
      adminSessionPresent: false,
      tenantId: accountMe?.account?.tenant_id ?? accountMe?.session?.tenant_id,
      activeOrgId,
      canonicality: canonical ? 'canonical' : hasCanonicalMembership ? 'bounded' : 'non-canonical',
    },
    stage: 'entry',
    state: canonical ? 'ready' : 'repairable',
    executability: canonical ? 'canonical' : 'bounded-stop',
    recommendedNextStep: canonical ? 'continue_claimant_entry' : 'select_active_org',
    nextStepKind: canonical ? 'entry_ready' : 'org_selection',
    action: {
      kind: canonical ? 'continue' : 'continue',
      owner: 'claimant',
      executability: canonical ? 'canonical' : 'bounded-stop',
      route: canonical ? undefined : '/runtime/account/select-org',
    },
    boundary: canonical
      ? undefined
      : {
          boundaryClass: 'repairable',
          reasonCodes: hasCanonicalMembership ? ['active_org_selection_required'] : ['canonical_membership_missing'],
        },
  };
}

export async function inspectClaimantPrecondition(
  client: Pick<BidviaClient, 'getAccountMe'>,
  canonicalOrgId = CANONICAL_COMPANY_PUBLIC_ORG_ID,
): Promise<BidviaClaimantPreconditionInspectResult> {
  const accountMe = await client.getAccountMe();
  return {
    accountMe,
    stageSnapshot: buildPreconditionSnapshot(accountMe, canonicalOrgId),
  };
}

export async function establishClaimantCanonicalCompanyPublicPrecondition(
  client: Pick<BidviaClient, 'acceptAccountMembershipInvitation' | 'selectOrg' | 'getAccountMe'>,
  input: BidviaClaimantCanonicalPreconditionInput,
): Promise<BidviaClaimantCanonicalPreconditionResult> {
  const canonicalOrgId = input.canonicalOrgId ?? CANONICAL_COMPANY_PUBLIC_ORG_ID;
  let acceptedInvitation: unknown | null = null;
  if (input.invitationToken) {
    acceptedInvitation = await client.acceptAccountMembershipInvitation({
      invitationToken: input.invitationToken,
      now: input.now,
    });
  }
  let accountMe = await client.getAccountMe();
  let selectedOrg: unknown | null = null;
  if (readActiveOrgId(accountMe) !== canonicalOrgId) {
    selectedOrg = await client.selectOrg({ orgId: canonicalOrgId });
    accountMe = await client.getAccountMe();
  }
  return {
    acceptedInvitation,
    selectedOrg,
    accountMe,
    stageSnapshot: buildPreconditionSnapshot(accountMe, canonicalOrgId),
  };
}

export async function inspectClaimantReadiness(
  client: Pick<BidviaClient, 'getAccountAgent' | 'getAccountAgentClosureStatus'>,
  agentId: string,
): Promise<BidviaClaimantReadinessInspectResult> {
  const detail = await client.getAccountAgent(agentId);
  const closureStatus = await client.getAccountAgentClosureStatus(agentId);
  return {
    detail,
    closureStatus,
    stageSnapshot: normalizeClaimantClosureStatus(closureStatus as any, {
      tenantId: (detail as any)?.registration?.tenant_id,
      activeOrgId: undefined,
      principalId: (detail as any)?.registration?.principal_id,
      authorizedCompanyId: (detail as any)?.registration?.owner_account_id,
      sessionPresent: true,
      canonicality: 'canonical',
    }),
  };
}

export async function repairClaimantReadiness(
  client: Pick<BidviaClient,
    'getAccountAgent'
    | 'getAccountAgentClosureStatus'
    | 'patchAgentSelfService'
    | 'createAccountAgentExternalBinding'
    | 'createAccountAgentDispatchAuthorityRequest'
  >,
  input: BidviaClaimantReadinessRepairInput,
): Promise<BidviaClaimantReadinessRepairResult> {
  const before = await inspectClaimantReadiness(client, input.agentId);
  const nextStep = before.stageSnapshot.recommendedNextStep;
  if (isClaimantSelfRepairNextStep(nextStep)) {
    const actionResult = await client.patchAgentSelfService(input.agentId, {
      now: input.now,
      capabilityProfile: input.capabilityProfile,
      participationState: input.participationState,
      ...(nextStep === 'complete_task_dispatch_opt_in'
        ? {
            taskDispatchAcceptance: input.taskDispatchAcceptance,
          }
        : {}),
    } as any);
    const actionTaken = nextStep === 'complete_task_dispatch_opt_in'
      ? 'complete_task_dispatch_opt_in'
      : 'complete_claimed_agent_self_service';
    return { before, actionTaken, actionResult };
  }
  if (nextStep === 'complete_external_binding') {
    if (!input.externalBinding) {
      throw new Error('externalBinding is required for complete_external_binding');
    }
    const actionResult = await client.createAccountAgentExternalBinding(input.agentId, {
      systemType: input.externalBinding.systemType,
      systemName: input.externalBinding.systemName,
      externalAccountRef: input.externalBinding.externalAccountRef,
      now: input.now,
    });
    return { before, actionTaken: 'complete_external_binding', actionResult };
  }
  if (nextStep === 'request_dispatch_authority_review') {
    const actionResult = await client.createAccountAgentDispatchAuthorityRequest(input.agentId, {
      now: input.now,
    });
    return { before, actionTaken: 'request_dispatch_authority_review', actionResult };
  }
  return { before, actionTaken: 'none', actionResult: before };
}

export async function runClaimantHandoffPreparation(
  client: Pick<
    BidviaClient,
    'createAccountAgentExecutionListing'
    | 'activateAccountAgentExecutionListing'
    | 'getAccountMe'
    | 'getAccountAgentExecutionListingMaterializationStatus'
  >,
  agentId: string,
  listing: BidviaCreateListingInput,
  activation: { verificationStatus?: string; now: string },
  canonicalOrgId = CANONICAL_COMPANY_PUBLIC_ORG_ID,
) {
  const createListing = await client.createAccountAgentExecutionListing(agentId, listing);
  const activateListing = await client.activateAccountAgentExecutionListing(agentId, listing.listingId, activation);
  const handoff = await inspectClaimantHandoff(client, agentId, listing.listingId, canonicalOrgId);
  return { createListing, activateListing, handoff };
}

export async function runClaimantTaskEntry(
  client: Pick<BidviaClient, 'createTaskDispatch'>,
  agentId: string,
  input: BidviaTaskDispatchWriteInput,
) {
  return client.createTaskDispatch(agentId, input);
}

export async function inspectClaimantHandoff(
  client: Pick<BidviaClient, 'getAccountMe' | 'getAccountAgentExecutionListingMaterializationStatus'>,
  agentId: string,
  listingId: string,
  canonicalOrgId = CANONICAL_COMPANY_PUBLIC_ORG_ID,
): Promise<{ accountMe: unknown; materialization: unknown; stageSnapshot: BidviaStageSnapshot }> {
  const accountMe = await client.getAccountMe();
  const materialization = await client.getAccountAgentExecutionListingMaterializationStatus(agentId, listingId);
  const activeOrgId = readActiveOrgId(accountMe) ?? '';
  return {
    accountMe,
    materialization,
    stageSnapshot: normalizeMaterializationStatus(materialization as any, {
      sourceCompanyId: activeOrgId,
      canonicalCompanyId: canonicalOrgId,
      tenantId: (accountMe as any)?.account?.tenant_id ?? (accountMe as any)?.session?.tenant_id,
      activeOrgId,
    }),
  };
}


export interface BidviaClaimantFacade {
  precondition: {
    inspect: (canonicalOrgId?: string) => Promise<BidviaClaimantPreconditionInspectResult>;
    establish: (input: BidviaClaimantCanonicalPreconditionInput) => Promise<BidviaClaimantCanonicalPreconditionResult>;
  };
  readiness: {
    inspect: (agentId: string) => Promise<BidviaClaimantReadinessInspectResult>;
    repair: (input: BidviaClaimantReadinessRepairInput) => Promise<BidviaClaimantReadinessRepairResult>;
  };
  taskEntry: {
    run: (agentId: string, input: BidviaTaskDispatchWriteInput) => Promise<unknown>;
  };
  handoff: {
    inspect: (agentId: string, listingId: string, canonicalOrgId?: string) => Promise<{
      accountMe: unknown;
      materialization: unknown;
      stageSnapshot: BidviaStageSnapshot;
    }>;
    prepare: (
      agentId: string,
      listing: BidviaCreateListingInput,
      activation: { verificationStatus?: string; now: string },
      canonicalOrgId?: string,
    ) => Promise<{
      createListing: unknown;
      activateListing: unknown;
      handoff: {
        accountMe: unknown;
        materialization: unknown;
        stageSnapshot: BidviaStageSnapshot;
      };
    }>;
  };
}

export function createBidviaClaimantFacade(client: BidviaClient): BidviaClaimantFacade {
  return {
    precondition: {
      inspect: (canonicalOrgId?: string) => inspectClaimantPrecondition(client, canonicalOrgId),
      establish: (input: BidviaClaimantCanonicalPreconditionInput) => establishClaimantCanonicalCompanyPublicPrecondition(client, input),
    },
    readiness: {
      inspect: (agentId: string) => inspectClaimantReadiness(client, agentId),
      repair: (input: BidviaClaimantReadinessRepairInput) => repairClaimantReadiness(client, input),
    },
    taskEntry: {
      run: (agentId: string, input: BidviaTaskDispatchWriteInput) => runClaimantTaskEntry(client, agentId, input),
    },
    handoff: {
      inspect: (agentId: string, listingId: string, canonicalOrgId?: string) => inspectClaimantHandoff(client, agentId, listingId, canonicalOrgId),
      prepare: (
        agentId: string,
        listing: BidviaCreateListingInput,
        activation: { verificationStatus?: string; now: string },
        canonicalOrgId?: string,
      ) => runClaimantHandoffPreparation(client, agentId, listing, activation, canonicalOrgId),
    },
  };
}
