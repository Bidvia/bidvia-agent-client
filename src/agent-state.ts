import type {
  BidviaAgentAuthorityState,
  BidviaAgentBindingState,
  BidviaAgentIdentityRecord,
  BidviaAgentIdentityState,
  BidviaAgentParticipationState,
  BidviaAgentPresenceState,
  BidviaAgentReadinessState,
  BidviaAgentRegistrationState,
  BidviaAuthorityStatus,
  BidviaCacheMetadata,
  BidviaFreshnessMetadata,
  BidviaNormalizationSnapshotSource,
} from './contracts.js';

export interface BuildAgentRegistrationStateOptions {
  status: BidviaAgentRegistrationState['status'];
  registrationId?: string;
}

export interface BuildAgentBindingStateOptions {
  status: BidviaAgentBindingState['status'];
  tenantId?: string;
  registrationId?: string;
}

export interface BuildAgentParticipationStateOptions {
  status: BidviaAgentParticipationState['status'];
  taskId?: string;
}

export interface BuildAgentPresenceStateOptions {
  status: BidviaAgentPresenceState['status'];
  observedAt: string;
}

export interface BuildAgentReadinessStateOptions {
  status: BidviaAgentReadinessState['status'];
  observedAt: string;
  rationale?: string;
}

export interface BuildAgentAuthorityStateOptions {
  status?: BidviaAuthorityStatus;
  observedAt: string;
  grantedBy?: string;
}

export interface BuildAgentIdentityStateOptions<
  CanonicalIdentity = BidviaAgentIdentityRecord,
  NormalizedIdentity = CanonicalIdentity,
> {
  canonical: CanonicalIdentity;
  normalized: NormalizedIdentity;
  snapshot: {
    source: BidviaNormalizationSnapshotSource;
    schemaVersion: string;
    capturedAt: string;
  };
  cache: {
    cacheKey: string;
    cachedAt: string;
  };
  freshness: {
    observedAt: string;
    stale: boolean;
    expiresAt?: string;
  };
}

export function buildAgentRegistrationState({
  status,
  registrationId,
}: BuildAgentRegistrationStateOptions): BidviaAgentRegistrationState {
  return {
    kind: 'registration',
    status,
    registrationId,
  };
}

export function buildAgentBindingState({
  status,
  tenantId,
  registrationId,
}: BuildAgentBindingStateOptions): BidviaAgentBindingState {
  return {
    kind: 'binding',
    status,
    tenantId,
    registrationId,
  };
}

export function buildAgentParticipationState({
  status,
  taskId,
}: BuildAgentParticipationStateOptions): BidviaAgentParticipationState {
  return {
    kind: 'participation-state',
    status,
    taskId,
  };
}

export function buildAgentPresenceState({
  status,
  observedAt,
}: BuildAgentPresenceStateOptions): BidviaAgentPresenceState {
  return {
    kind: 'presence',
    status,
    observedAt,
  };
}

export function buildAgentReadinessState({
  status,
  observedAt,
  rationale,
}: BuildAgentReadinessStateOptions): BidviaAgentReadinessState {
  return {
    kind: 'readiness',
    status,
    observedAt,
    rationale,
  };
}

export function buildAgentAuthorityState({
  status = 'unknown',
  observedAt,
  grantedBy,
}: BuildAgentAuthorityStateOptions): BidviaAgentAuthorityState {
  return {
    kind: 'authority',
    status,
    observedAt,
    ...(grantedBy === undefined ? {} : { grantedBy }),
  };
}

export function buildAgentIdentityState<
  CanonicalIdentity = BidviaAgentIdentityRecord,
  NormalizedIdentity = CanonicalIdentity,
>({
  canonical,
  normalized,
  snapshot,
  cache,
  freshness,
}: BuildAgentIdentityStateOptions<CanonicalIdentity, NormalizedIdentity>): BidviaAgentIdentityState<
  CanonicalIdentity,
  NormalizedIdentity
> {
  const snapshotMetadata = {
    layer: 'local-snapshot-metadata' as const,
    source: snapshot.source,
    schemaVersion: snapshot.schemaVersion,
    capturedAt: snapshot.capturedAt,
  };

  const cacheMetadata: BidviaCacheMetadata = {
    layer: 'cache-metadata',
    cacheKey: cache.cacheKey,
    cachedAt: cache.cachedAt,
  };

  const freshnessMetadata: BidviaFreshnessMetadata = {
    layer: 'freshness-metadata',
    observedAt: freshness.observedAt,
    stale: freshness.stale,
    expiresAt: freshness.expiresAt,
  };

  return {
    kind: 'identity',
    identity: {
      layer: 'cached-working-view',
      canonical: {
        layer: 'canonical-input',
        value: canonical,
      },
      normalized: {
        layer: 'normalized-working-view',
        canonical: {
          layer: 'canonical-input',
          value: canonical,
        },
        value: normalized,
      },
      snapshot: snapshotMetadata,
      cache: cacheMetadata,
      freshness: freshnessMetadata,
    },
  };
}
