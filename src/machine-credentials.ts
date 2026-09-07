import type { BidviaClientRequestPolicy } from './contracts.js';
import type { BidviaMachineIdentity, BidviaMachineUniverseTransport, BidviaUniverseEvidence } from './machine-universe.js';

export interface BidviaMachineEnrollmentInput extends BidviaUniverseEvidence {
  tenantId: string;
  machinePrincipalId: string;
  agentRegistrationId: string;
  enrollmentToken: string;
}

export interface BidviaMachineCredentialRecord {
  tenant_id: string;
  machine_principal_id: string;
  agent_registration_id: string;
  machine_credential_id: string;
  credential_version: number;
  status: string;
  allowed_scopes: string[];
  expires_at: string;
}

export interface BidviaMachineIssuedCredential {
  raw_credential: string;
  credential: BidviaMachineCredentialRecord;
}

export interface BidviaOperatorMachineEnrollmentInput extends BidviaUniverseEvidence {
  agentRegistrationId: string;
  requestedScopes: readonly string[];
}

export interface BidviaOperatorMachineEnrollmentReceipt {
  tenant_id: string;
  machine_principal_id: string;
  agent_registration_id: string;
  enrollment_token: string;
  expires_at: string;
  allowed_scopes: string[];
}

export function parseMachineIssuedCredential(value: unknown, identity: Omit<BidviaMachineIdentity, 'credentialVersion'>): BidviaMachineIssuedCredential {
  if (typeof value !== 'object' || value === null) throw new TypeError('Invalid machine credential receipt');
  const raw = Reflect.get(value, 'raw_credential');
  const credential: unknown = Reflect.get(value, 'credential');
  if (typeof raw !== 'string' || !/^[A-Za-z0-9_-]{32,}$/u.test(raw) || !credential || typeof credential !== 'object') {
    throw new TypeError('Invalid machine credential receipt');
  }
  const field = (name: string): unknown => Reflect.get(credential, name);
  if (field('tenant_id') !== identity.tenantId || field('machine_principal_id') !== identity.machinePrincipalId
    || field('agent_registration_id') !== identity.agentRegistrationId || field('status') !== 'ACTIVE'
    || !Number.isSafeInteger(field('credential_version')) || Number(field('credential_version')) < 1
    || typeof field('machine_credential_id') !== 'string' || !field('machine_credential_id')
    || !Array.isArray(field('allowed_scopes')) || !(field('allowed_scopes') as unknown[]).length
    || !(field('allowed_scopes') as unknown[]).every(scope => typeof scope === 'string' && scope.trim())
    || typeof field('expires_at') !== 'string' || !Number.isFinite(Date.parse(String(field('expires_at'))))) {
    throw new TypeError('Machine credential receipt does not match enrollment identity');
  }
  return value as BidviaMachineIssuedCredential;
}

export function createBidviaMachineCredentialFacade(transport: BidviaMachineUniverseTransport,
  identity: () => BidviaMachineIdentity | undefined,
  exchange: (input: BidviaMachineEnrollmentInput, policy?: BidviaClientRequestPolicy) => Promise<unknown>) {
  return {
    async exchangeEnrollment(input: BidviaMachineEnrollmentInput, policy?: BidviaClientRequestPolicy) {
      return parseMachineIssuedCredential(await exchange(input, policy), input);
    },
    async credentialStatus(policy?: BidviaClientRequestPolicy): Promise<unknown> {
      return transport({ suffix: '/credential', method: 'GET' }, policy);
    },
    async rotateCredential(input: BidviaUniverseEvidence, policy?: BidviaClientRequestPolicy) {
      const current = identity();
      if (!current) throw new Error('machineIdentity is required');
      const result = parseMachineIssuedCredential(await transport({ suffix: '/credential/rotate', body: {
        evidence_refs: [...input.evidenceRefs], evidence_digests: [...input.evidenceDigests], idempotency_key: input.idempotencyKey,
      } }, policy), current);
      if (result.credential.credential_version !== current.credentialVersion + 1) throw new TypeError('Credential rotation version is invalid');
      return result;
    },
    async listDispatches(now = new Date().toISOString(), policy?: BidviaClientRequestPolicy): Promise<unknown> {
      return transport({ suffix: '/dispatches?now=' + encodeURIComponent(now), method: 'GET' }, policy);
    },
  };
}
