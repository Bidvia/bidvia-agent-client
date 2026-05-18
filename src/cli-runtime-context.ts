import type { BidviaLocalOnboardingState } from './local-onboarding-state.js';

export type BidviaCliContextValueSource = 'env' | 'local-state' | 'missing';

export type BidviaCliOnboardingActionCommand =
  | 'create-provisional-agent'
  | 'query-provisional-agent'
  | 'claim-provisional-agent';

interface BidviaCliContextValueSnapshot {
  value: string | null;
  source: BidviaCliContextValueSource;
}

interface BidviaCliSecretPresenceSnapshot {
  present: boolean;
  source: BidviaCliContextValueSource;
}

export interface BidviaCliEffectiveContextSnapshot {
  tenantId: BidviaCliContextValueSnapshot;
  agentId: BidviaCliContextValueSnapshot;
  principalId: BidviaCliContextValueSnapshot;
  companyId: BidviaCliContextValueSnapshot;
  registrationId: BidviaCliContextValueSnapshot;
  lastCompletedStep: BidviaCliContextValueSnapshot;
  sessionId: BidviaCliSecretPresenceSnapshot;
  adminSessionId: BidviaCliSecretPresenceSnapshot;
}

export interface BidviaCliOnboardingActionExecutionContext {
  tenantId?: string;
  agentId?: string;
  principalId?: string;
  companyId?: string;
  registrationId?: string;
  sessionId?: string;
}

function readOnboardingResultString(
  value: unknown,
  camelKey: 'tenantId' | 'agentId' | 'principalId' | 'companyId' | 'registrationId',
  snakeKey: 'tenant_id' | 'agent_id' | 'principal_id' | 'company_id' | 'registration_id',
): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const candidate = record[camelKey] ?? record[snakeKey];

  return typeof candidate === 'string' ? candidate : undefined;
}

function readOnboardingRegistrationResultString(
  value: unknown,
  camelKey: 'agentId' | 'principalId' | 'companyId' | 'registrationId',
  snakeKeys: readonly string[],
): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const registration = (value as Record<string, unknown>).registration;

  if (!registration || typeof registration !== 'object') {
    return undefined;
  }

  const record = registration as Record<string, unknown>;
  const candidate = record[camelKey] ?? snakeKeys
    .map((key) => record[key])
    .find((nestedValue) => typeof nestedValue === 'string');

  return typeof candidate === 'string' ? candidate : undefined;
}

function readNonEmptyEnvValue(
  env: NodeJS.ProcessEnv,
  key: 'BIDVIA_TENANT_ID' | 'BIDVIA_AGENT_ID' | 'BIDVIA_PRINCIPAL_ID' | 'BIDVIA_COMPANY_ID' | 'BIDVIA_REGISTRATION_ID' | 'BIDVIA_SESSION_ID' | 'BIDVIA_ADMIN_SESSION_ID',
): string | undefined {
  const candidate = env[key];

  if (typeof candidate !== 'string' || candidate.length === 0) {
    return undefined;
  }

  return candidate;
}

function buildContextValueWithSource(
  envValue: string | undefined,
  localStateValue: string | undefined,
): BidviaCliContextValueSnapshot {
  if (envValue !== undefined) {
    return {
      value: envValue,
      source: 'env',
    };
  }

  if (localStateValue !== undefined) {
    return {
      value: localStateValue,
      source: 'local-state',
    };
  }

  return {
    value: null,
    source: 'missing',
  };
}

function buildSecretPresenceWithSource(envValue: string | undefined): BidviaCliSecretPresenceSnapshot {
  if (envValue !== undefined) {
    return {
      present: true,
      source: 'env',
    };
  }

  return {
    present: false,
    source: 'missing',
  };
}

function buildSecretPresenceWithLocalFallback(
  envValue: string | undefined,
  localStateValue?: string,
): BidviaCliSecretPresenceSnapshot {
  if (envValue !== undefined) {
    return {
      present: true,
      source: 'env',
    };
  }

  if (localStateValue !== undefined) {
    return {
      present: true,
      source: 'local-state',
    };
  }

  return {
    present: false,
    source: 'missing',
  };
}

function readEffectiveSessionId(
  env: NodeJS.ProcessEnv,
  localState: BidviaLocalOnboardingState | null,
): string | undefined {
  return readNonEmptyEnvValue(env, 'BIDVIA_SESSION_ID') ?? localState?.sessionId;
}

export function buildCliEffectiveContextSnapshot(
  env: NodeJS.ProcessEnv,
  localState: BidviaLocalOnboardingState | null,
): BidviaCliEffectiveContextSnapshot {
  return {
    tenantId: buildContextValueWithSource(readNonEmptyEnvValue(env, 'BIDVIA_TENANT_ID'), localState?.tenantId),
    agentId: buildContextValueWithSource(readNonEmptyEnvValue(env, 'BIDVIA_AGENT_ID'), localState?.agentId),
    principalId: buildContextValueWithSource(readNonEmptyEnvValue(env, 'BIDVIA_PRINCIPAL_ID'), localState?.principalId),
    companyId: buildContextValueWithSource(readNonEmptyEnvValue(env, 'BIDVIA_COMPANY_ID'), localState?.companyId),
    registrationId: buildContextValueWithSource(readNonEmptyEnvValue(env, 'BIDVIA_REGISTRATION_ID'), localState?.registrationId),
    lastCompletedStep: buildContextValueWithSource(undefined, localState?.lastCompletedStep),
    sessionId: buildSecretPresenceWithLocalFallback(readNonEmptyEnvValue(env, 'BIDVIA_SESSION_ID'), localState?.sessionId),
    adminSessionId: buildSecretPresenceWithSource(readNonEmptyEnvValue(env, 'BIDVIA_ADMIN_SESSION_ID')),
  };
}

export function buildCliOnboardingActionExecutionContext(
  command: BidviaCliOnboardingActionCommand,
  env: NodeJS.ProcessEnv,
  localState: BidviaLocalOnboardingState | null,
  effectiveContext: Pick<
    BidviaCliEffectiveContextSnapshot,
    'tenantId' | 'agentId' | 'principalId' | 'companyId' | 'registrationId' | 'sessionId'
  >,
): BidviaCliOnboardingActionExecutionContext {
  if (command === 'create-provisional-agent' || command === 'query-provisional-agent') {
    return {
      tenantId: effectiveContext.tenantId.value ?? undefined,
      agentId: undefined,
      principalId: undefined,
      companyId: undefined,
      registrationId: undefined,
      sessionId: undefined,
    };
  }

  return {
    tenantId: effectiveContext.tenantId.value ?? undefined,
    agentId: effectiveContext.agentId.value ?? undefined,
    principalId: effectiveContext.principalId.value ?? undefined,
    companyId: effectiveContext.companyId.value ?? undefined,
    registrationId: effectiveContext.registrationId.value ?? undefined,
    sessionId: readEffectiveSessionId(env, localState),
  } satisfies BidviaCliOnboardingActionExecutionContext;
}

export function buildCliPersistedOnboardingActionState(
  command: BidviaCliOnboardingActionCommand,
  result: unknown,
  existingState: BidviaLocalOnboardingState | null,
  effectiveContext: Pick<
    BidviaCliEffectiveContextSnapshot,
    'tenantId' | 'agentId' | 'principalId' | 'companyId' | 'registrationId'
  >,
  executionContext: BidviaCliOnboardingActionExecutionContext,
  now: string,
): BidviaLocalOnboardingState {
  if (command === 'create-provisional-agent' || command === 'query-provisional-agent') {
    return {
      tenantId: readOnboardingResultString(result, 'tenantId', 'tenant_id')
        ?? executionContext.tenantId
        ?? existingState?.tenantId,
      ...(existingState?.agentId === undefined ? {} : { agentId: existingState.agentId }),
      ...(existingState?.principalId === undefined ? {} : { principalId: existingState.principalId }),
      ...(existingState?.companyId === undefined ? {} : { companyId: existingState.companyId }),
      ...(existingState?.registrationId === undefined ? {} : { registrationId: existingState.registrationId }),
      ...(existingState?.sessionId === undefined ? {} : { sessionId: existingState.sessionId }),
      lastCompletedStep: command,
      createdAt: existingState?.createdAt ?? now,
      updatedAt: now,
    };
  }

  const claimedAgentId = readOnboardingResultString(result, 'agentId', 'agent_id')
    ?? readOnboardingRegistrationResultString(result, 'agentId', ['agent_id'])
    ?? (effectiveContext.agentId.source === 'env' ? effectiveContext.agentId.value ?? undefined : undefined);
  const claimedPrincipalId = readOnboardingResultString(result, 'principalId', 'principal_id')
    ?? readOnboardingRegistrationResultString(result, 'principalId', ['principal_id'])
    ?? (effectiveContext.principalId.source === 'env' ? effectiveContext.principalId.value ?? undefined : undefined);
  const claimedCompanyId = readOnboardingResultString(result, 'companyId', 'company_id')
    ?? readOnboardingRegistrationResultString(result, 'companyId', ['company_id', 'tenant_id'])
    ?? (effectiveContext.companyId.source === 'env' ? effectiveContext.companyId.value ?? undefined : undefined);
  const claimedRegistrationId = readOnboardingResultString(result, 'registrationId', 'registration_id')
    ?? readOnboardingRegistrationResultString(result, 'registrationId', ['agent_registration_id', 'registration_id'])
    ?? (effectiveContext.registrationId.source === 'env'
      ? effectiveContext.registrationId.value ?? undefined
      : undefined);

  return {
    tenantId: readOnboardingResultString(result, 'tenantId', 'tenant_id')
      ?? executionContext.tenantId
      ?? existingState?.tenantId,
    ...(claimedAgentId === undefined ? {} : { agentId: claimedAgentId }),
    ...(claimedPrincipalId === undefined ? {} : { principalId: claimedPrincipalId }),
    ...(claimedCompanyId === undefined ? {} : { companyId: claimedCompanyId }),
    ...(claimedRegistrationId === undefined ? {} : { registrationId: claimedRegistrationId }),
    ...(existingState?.sessionId === undefined ? {} : { sessionId: existingState.sessionId }),
    lastCompletedStep: command,
    createdAt: existingState?.createdAt ?? now,
    updatedAt: now,
  } satisfies BidviaLocalOnboardingState;
}
