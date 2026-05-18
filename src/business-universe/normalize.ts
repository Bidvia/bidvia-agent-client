import type {
  BidviaActionDescriptor,
  BidviaBoundaryDescriptor,
  BidviaHandoffDescriptor,
  BidviaRoleWorkspace,
  BidviaRoleWorkspaceRole,
  BidviaStageSnapshot,
} from './contracts.js';

function buildRoleWorkspace(input: {
  role: BidviaRoleWorkspaceRole;
  tenantId?: string;
  activeOrgId?: string;
  principalId?: string;
  authorizedCompanyId?: string;
  sessionPresent?: boolean;
  adminSessionPresent?: boolean;
  canonicality?: BidviaRoleWorkspace['canonicality'];
}): BidviaRoleWorkspace {
  return {
    role: input.role,
    tenantId: input.tenantId,
    activeOrgId: input.activeOrgId,
    principalId: input.principalId,
    authorizedCompanyId: input.authorizedCompanyId,
    sessionPresent: input.sessionPresent ?? false,
    adminSessionPresent: input.adminSessionPresent ?? false,
    canonicality: input.canonicality ?? 'bounded',
  };
}

function buildActionDescriptor(input: BidviaActionDescriptor): BidviaActionDescriptor {
  return input;
}

function buildBoundaryDescriptor(input: BidviaBoundaryDescriptor | undefined): BidviaBoundaryDescriptor | undefined {
  return input;
}

function buildHandoffDescriptor(input: BidviaHandoffDescriptor | undefined): BidviaHandoffDescriptor | undefined {
  return input;
}

function isClaimantSelfRepairNextStep(value: string | undefined): boolean {
  return value === 'complete_claimed_agent_self_service'
    || value === 'complete_task_dispatch_opt_in';
}

export function normalizeClaimantClosureStatus(
  response: {
    recommended_next_step?: string;
    next_step_kind?: string;
    next_step_route?: string;
    next_action_owner?: string;
    reason_codes?: string[];
    dispatch_eligibility?: {
      allowed?: boolean;
      recommended_next_step?: string;
      next_step_kind?: string;
      reason_codes?: string[];
    };
  },
  workspaceInput: Omit<Parameters<typeof buildRoleWorkspace>[0], 'role'>,
): BidviaStageSnapshot {
  const allowed = response.dispatch_eligibility?.allowed === true;
  const reasonCodes = response.dispatch_eligibility?.reason_codes ?? response.reason_codes ?? [];
  const recommendedNextStep = response.dispatch_eligibility?.recommended_next_step
    ?? response.recommended_next_step;
  const nextStepKind = response.dispatch_eligibility?.next_step_kind
    ?? response.next_step_kind;

  const repairable = isClaimantSelfRepairNextStep(recommendedNextStep);

  if (allowed) {
    return {
      roleWorkspace: buildRoleWorkspace({ role: 'claimant', ...workspaceInput }),
      stage: 'task-entry',
      state: 'ready',
      executability: 'canonical',
      recommendedNextStep,
      nextStepKind,
      nextStepRoute: response.next_step_route,
      nextActionOwner: response.next_action_owner,
      action: buildActionDescriptor({
        kind: 'continue',
        owner: 'claimant',
        executability: 'canonical',
        route: response.next_step_route,
      }),
    };
  }

  return {
    roleWorkspace: buildRoleWorkspace({ role: 'claimant', ...workspaceInput }),
    stage: 'readiness',
    state: repairable ? 'repairable' : 'blocked',
    executability: repairable ? 'canonical' : 'bounded-stop',
    recommendedNextStep,
    nextStepKind,
    nextStepRoute: response.next_step_route,
    nextActionOwner: response.next_action_owner,
    action: buildActionDescriptor({
      kind: repairable ? 'continue' : 'read',
      owner: 'claimant',
      executability: repairable ? 'canonical' : 'bounded-stop',
      route: response.next_step_route,
    }),
    boundary: buildBoundaryDescriptor({
      boundaryClass: repairable ? 'repairable' : 'bounded-stop',
      reasonCodes,
    }),
  };
}

export function normalizeMaterializationStatus(
  response: {
    materialization_stage?: string;
    recommended_next_step?: string;
    next_step_kind?: string;
    operator_handoff?: {
      owner?: string;
      route?: string;
    };
  },
  input: {
    sourceCompanyId: string;
    canonicalCompanyId: string;
    tenantId?: string;
    activeOrgId?: string;
    principalId?: string;
  },
): BidviaStageSnapshot {
  const isCanonical = input.sourceCompanyId === input.canonicalCompanyId;
  const handoff = response.operator_handoff?.route
    ? buildHandoffDescriptor({
        owner: 'operator',
        route: response.operator_handoff.route,
        mode: isCanonical ? 'executable' : 'metadata-only',
        canonicality: isCanonical ? 'canonical' : 'non-canonical',
      })
    : undefined;

  return {
    roleWorkspace: buildRoleWorkspace({
      role: 'claimant',
      tenantId: input.tenantId,
      activeOrgId: input.activeOrgId,
      principalId: input.principalId,
      authorizedCompanyId: input.sourceCompanyId,
      canonicality: isCanonical ? 'canonical' : 'non-canonical',
      sessionPresent: true,
    }),
    stage: 'handoff',
    state: 'handoff-required',
    executability: handoff?.mode === 'executable' ? 'executable-handoff' : 'metadata-only-handoff',
    recommendedNextStep: response.recommended_next_step,
    nextStepKind: response.next_step_kind,
    nextStepRoute: response.operator_handoff?.route,
    nextActionOwner: response.operator_handoff?.owner,
    action: buildActionDescriptor({
      kind: 'handoff',
      owner: 'operator',
      executability: handoff?.mode === 'executable' ? 'executable-handoff' : 'metadata-only-handoff',
      route: response.operator_handoff?.route,
    }),
    handoff,
  };
}

export function normalizeOperatorHandoffFailure(
  input: {
    status: number;
    body: { error?: { code?: string; message?: string } };
    tenantId?: string;
    principalId?: string;
    authorizedCompanyId?: string;
  },
): BidviaStageSnapshot {
  const reasonCode = input.body.error?.code ?? 'unknown_operator_handoff_failure';
  return {
    roleWorkspace: buildRoleWorkspace({
      role: 'operator',
      tenantId: input.tenantId,
      principalId: input.principalId,
      authorizedCompanyId: input.authorizedCompanyId,
      canonicality: reasonCode === 'source_listing_not_found' ? 'non-canonical' : 'bounded',
      adminSessionPresent: true,
    }),
    stage: 'handoff',
    state: 'blocked',
    executability: reasonCode === 'source_listing_not_found' ? 'non-canonical-fail-close' : 'bounded-stop',
    action: buildActionDescriptor({
      kind: 'read',
      owner: 'operator',
      executability: reasonCode === 'source_listing_not_found' ? 'non-canonical-fail-close' : 'bounded-stop',
    }),
    boundary: buildBoundaryDescriptor({
      boundaryClass: 'fail-closed',
      reasonCodes: [reasonCode],
      message: input.body.error?.message,
    }),
  };
}

export function normalizeLaterWaveStop(
  response: {
    recommended_next_step?: string;
    next_step_kind?: string;
    blocked_by?: string[];
  },
  workspaceInput: Omit<Parameters<typeof buildRoleWorkspace>[0], 'role'>,
): BidviaStageSnapshot {
  return {
    roleWorkspace: buildRoleWorkspace({ role: 'claimant', ...workspaceInput }),
    stage: 'progression',
    state: 'later-wave-stop',
    executability: 'later-wave-stop',
    recommendedNextStep: response.recommended_next_step,
    nextStepKind: response.next_step_kind,
    action: buildActionDescriptor({
      kind: 'read',
      owner: 'claimant',
      executability: 'later-wave-stop',
    }),
    boundary: buildBoundaryDescriptor({
      boundaryClass: 'later-wave-stop',
      reasonCodes: response.blocked_by ?? [],
    }),
  };
}

export { buildRoleWorkspace };
