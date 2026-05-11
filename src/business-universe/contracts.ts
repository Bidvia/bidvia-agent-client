export const bidviaRoleWorkspaceRoles = ['claimant', 'operator', 'platform-managed'] as const;
export type BidviaRoleWorkspaceRole = (typeof bidviaRoleWorkspaceRoles)[number];

export const bidviaStageKeys = ['entry', 'readiness', 'task-entry', 'handoff', 'progression', 'closure'] as const;
export type BidviaStageKey = (typeof bidviaStageKeys)[number];

export const bidviaStageStates = [
  'blocked',
  'repairable',
  'handoff-required',
  'ready',
  'continuing',
  'completed',
  'later-wave-stop',
] as const;
export type BidviaStageState = (typeof bidviaStageStates)[number];

export const bidviaExecutabilityClasses = [
  'canonical',
  'metadata-only-handoff',
  'executable-handoff',
  'non-canonical-fail-close',
  'bounded-stop',
  'later-wave-stop',
] as const;
export type BidviaExecutabilityClass = (typeof bidviaExecutabilityClasses)[number];

export const bidviaActionKinds = ['continue', 'read', 'diagnose', 'handoff', 'exact-seam'] as const;
export type BidviaActionKind = (typeof bidviaActionKinds)[number];

export const bidviaBoundaryClasses = [
  'repairable',
  'handoff-required',
  'bounded-stop',
  'later-wave-stop',
  'fail-closed',
  'defect-or-drift',
] as const;
export type BidviaBoundaryClass = (typeof bidviaBoundaryClasses)[number];

export interface BidviaRoleWorkspace {
  role: BidviaRoleWorkspaceRole;
  sessionPresent: boolean;
  adminSessionPresent: boolean;
  tenantId?: string;
  activeOrgId?: string;
  principalId?: string;
  authorizedCompanyId?: string;
  canonicality: 'canonical' | 'non-canonical' | 'bounded' | 'later-wave';
}

export interface BidviaActionDescriptor {
  kind: BidviaActionKind;
  owner: BidviaRoleWorkspaceRole;
  executability: BidviaExecutabilityClass;
  route?: string;
}

export interface BidviaHandoffDescriptor {
  owner: BidviaRoleWorkspaceRole;
  route?: string;
  mode: 'metadata-only' | 'executable';
  canonicality: 'canonical' | 'non-canonical';
}

export interface BidviaBoundaryDescriptor {
  boundaryClass: BidviaBoundaryClass;
  reasonCodes: string[];
  message?: string;
}

export interface BidviaEvidencePacket {
  route: string;
  payload: unknown;
  expected: unknown;
  actual: unknown;
  interpretation_gap: string;
  issue_class: string;
}

export interface BidviaStageSnapshot {
  roleWorkspace: BidviaRoleWorkspace;
  stage: BidviaStageKey;
  state: BidviaStageState;
  executability: BidviaExecutabilityClass;
  recommendedNextStep?: string;
  nextStepKind?: string;
  nextStepRoute?: string;
  nextActionOwner?: string;
  action: BidviaActionDescriptor;
  handoff?: BidviaHandoffDescriptor;
  boundary?: BidviaBoundaryDescriptor;
}
