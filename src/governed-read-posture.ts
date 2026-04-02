export interface BidviaGovernedReadPosture {
  accessContextFamily: 'principal-governed-read';
  requiredContext: ['tenantId', 'principalId'];
  adminSessionOptional: true;
  operatorGuidance: string;
}

export function buildGovernedReadPosture(): BidviaGovernedReadPosture {
  return {
    accessContextFamily: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    adminSessionOptional: true,
    operatorGuidance: 'On local docker host, authority and presence require a valid admin session plus operator context. Authority-ladder is an operator-governed write and not a workspace admin-session route.',
  };
}
