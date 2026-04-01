import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bidviaGovernedAgentStateKinds,
  bidviaAgentRegistrationStatuses,
  bidviaAgentBindingStatuses,
  bidviaLocalParticipationStatuses,
  bidviaPresenceStatuses,
  bidviaReadinessStatuses,
  bidviaAuthorityStatuses,
} from '../src/contracts.ts';
import type {
  BidviaCanonicalInput,
  BidviaNormalizedWorkingView,
  BidviaCachedWorkingView,
  BidviaAgentRegistrationState,
  BidviaAgentIdentityState,
  BidviaAgentBindingState,
  BidviaLocalParticipationState,
  BidviaAgentPresenceState,
  BidviaAgentReadinessState,
  BidviaAgentAuthorityState,
} from '../src/contracts.ts';

function expectRegistrationState(value: BidviaAgentRegistrationState): BidviaAgentRegistrationState {
  return value;
}

function expectPresenceState(value: BidviaAgentPresenceState): BidviaAgentPresenceState {
  return value;
}

function expectAuthorityState(value: BidviaAgentAuthorityState): BidviaAgentAuthorityState {
  return value;
}

test('agent-state contracts declare governed state dimensions as separate concepts', () => {
  assert.deepEqual(bidviaGovernedAgentStateKinds, [
    'registration',
    'identity',
    'binding',
    'local-participation-state',
    'presence',
    'readiness',
    'authority',
  ]);
  assert.deepEqual(bidviaAgentRegistrationStatuses, [
    'unregistered',
    'provisional',
    'claimed',
    'registered',
    'revoked',
  ]);
  assert.deepEqual(bidviaAgentBindingStatuses, [
    'unbound',
    'tenant-bound',
    'registration-bound',
  ]);
  assert.deepEqual(bidviaLocalParticipationStatuses, [
    'not-participating',
    'eligible',
    'invited',
    'accepted',
    'leased',
    'timed-out',
    'completed',
  ]);
  assert.deepEqual(bidviaPresenceStatuses, ['unknown', 'online', 'offline']);
  assert.deepEqual(bidviaReadinessStatuses, ['unknown', 'ready', 'not-ready']);
  assert.deepEqual(bidviaAuthorityStatuses, [
    'unknown',
    'none',
    'self-asserted',
    'delegated',
    'governed',
  ]);
});

test('agent-state contracts keep registration, identity, binding, participation, presence, readiness, and authority distinct', () => {
  const canonicalIdentity: BidviaCanonicalInput<{
    agentId: string;
    principalId: string;
    tenantId: string;
  }> = {
    layer: 'canonical-input',
    value: {
      agentId: 'agent-1',
      principalId: 'principal-1',
      tenantId: 'tenant-1',
    },
  };

  const normalizedIdentity: BidviaNormalizedWorkingView<
    { agentId: string; principalId: string; tenantId: string },
    { agentId: string; principalId: string; tenantId: string }
  > = {
    layer: 'normalized-working-view',
    canonical: canonicalIdentity,
    value: {
      agentId: 'agent-1',
      principalId: 'principal-1',
      tenantId: 'tenant-1',
    },
  };

  const cachedIdentity: BidviaCachedWorkingView<
    { agentId: string; principalId: string; tenantId: string },
    { agentId: string; principalId: string; tenantId: string }
  > = {
    layer: 'cached-working-view',
    canonical: canonicalIdentity,
    normalized: normalizedIdentity,
    snapshot: {
      layer: 'local-snapshot-metadata',
      source: 'server-derived',
      schemaVersion: '2026-03-27',
      capturedAt: '2026-03-27T00:00:00.000Z',
    },
    cache: {
      layer: 'cache-metadata',
      cacheKey: 'agent-state:identity:agent-1',
      cachedAt: '2026-03-27T00:00:01.000Z',
    },
    freshness: {
      layer: 'freshness-metadata',
      observedAt: '2026-03-27T00:00:01.000Z',
      stale: false,
    },
  };

  const registration: BidviaAgentRegistrationState = {
    kind: 'registration',
    registrationId: 'areg-1',
    status: 'registered',
  };

  const identity: BidviaAgentIdentityState = {
    kind: 'identity',
    identity: cachedIdentity,
  };

  const binding: BidviaAgentBindingState = {
    kind: 'binding',
    status: 'registration-bound',
    tenantId: 'tenant-1',
    registrationId: 'areg-1',
  };

  const participation: BidviaLocalParticipationState = {
    kind: 'local-participation-state',
    localStatus: 'accepted',
    localTaskRef: 'task-1',
    status: 'accepted',
    taskId: 'task-1',
  };

  const presence: BidviaAgentPresenceState = {
    kind: 'presence',
    status: 'online',
    observedAt: '2026-03-27T00:00:02.000Z',
  };

  const readiness: BidviaAgentReadinessState = {
    kind: 'readiness',
    status: 'ready',
    observedAt: '2026-03-27T00:00:03.000Z',
    rationale: 'local preflight checks passed',
  };

  const authority: BidviaAgentAuthorityState = {
    kind: 'authority',
    status: 'delegated',
    grantedBy: 'policy://tenant-1/registration/areg-1',
    observedAt: '2026-03-27T00:00:04.000Z',
  };

  assert.equal(expectRegistrationState(registration).status, 'registered');
  assert.equal(identity.identity.normalized.value.agentId, 'agent-1');
  assert.equal(binding.registrationId, 'areg-1');
  assert.equal(participation.localTaskRef, 'task-1');
  assert.equal(expectPresenceState(presence).status, 'online');
  assert.equal(readiness.rationale, 'local preflight checks passed');
  assert.equal(expectAuthorityState(authority).grantedBy, 'policy://tenant-1/registration/areg-1');

  // @ts-expect-error presence remains separate from authority
  expectAuthorityState(presence);

  // @ts-expect-error registration remains separate from identity
  const invalidIdentity: BidviaAgentIdentityState = registration;

  void invalidIdentity;
});

test('agent-state contracts do not infer authority from presence or readiness signals', () => {
  const presence: BidviaAgentPresenceState = {
    kind: 'presence',
    status: 'online',
    observedAt: '2026-03-27T00:00:02.000Z',
  };

  const readiness: BidviaAgentReadinessState = {
    kind: 'readiness',
    status: 'ready',
    observedAt: '2026-03-27T00:00:03.000Z',
  };

  const authority: BidviaAgentAuthorityState = {
    kind: 'authority',
    status: 'none',
    observedAt: '2026-03-27T00:00:04.000Z',
  };

  assert.equal('authority' in presence, false);
  assert.equal('authority' in readiness, false);
  assert.equal(authority.status, 'none');
  assert.notEqual(authority.status, 'ready');
  assert.notEqual(authority.status, 'online');
});

test('agent-state helpers keep authority explicit instead of inferring it from online or ready signals', async () => {
  const agentStateModule = await import('../src/index.ts');

  assert.equal(typeof agentStateModule.buildAgentPresenceState, 'function');
  assert.equal(typeof agentStateModule.buildAgentReadinessState, 'function');
  assert.equal(typeof agentStateModule.buildAgentAuthorityState, 'function');

  const presence = agentStateModule.buildAgentPresenceState({
    status: 'online',
    observedAt: '2026-03-27T00:00:02.000Z',
  });

  const readiness = agentStateModule.buildAgentReadinessState({
    status: 'ready',
    observedAt: '2026-03-27T00:00:03.000Z',
    rationale: 'local checks passed',
  });

  const authority = agentStateModule.buildAgentAuthorityState({
    observedAt: '2026-03-27T00:00:04.000Z',
  });

  assert.deepEqual(presence, {
    kind: 'presence',
    status: 'online',
    observedAt: '2026-03-27T00:00:02.000Z',
  });
  assert.deepEqual(readiness, {
    kind: 'readiness',
    status: 'ready',
    observedAt: '2026-03-27T00:00:03.000Z',
    rationale: 'local checks passed',
  });
  assert.deepEqual(authority, {
    kind: 'authority',
    status: 'unknown',
    observedAt: '2026-03-27T00:00:04.000Z',
  });
  assert.notEqual(authority.status, presence.status);
  assert.notEqual(authority.status, readiness.status);
});

test('agent-state helpers keep identity cache snapshots separate from authority decisions', async () => {
  const agentStateModule = await import('../src/index.ts');

  assert.equal(typeof agentStateModule.buildAgentIdentityState, 'function');
  assert.equal(typeof agentStateModule.buildAgentAuthorityState, 'function');

  const identity = agentStateModule.buildAgentIdentityState({
    canonical: {
      agentId: 'agent-1',
      principalId: 'principal-1',
      tenantId: 'tenant-1',
      registrationId: 'areg-1',
    },
    normalized: {
      agentId: 'agent-1',
      principalId: 'principal-1',
      tenantId: 'tenant-1',
      registrationId: 'areg-1',
    },
    snapshot: {
      source: 'server-derived',
      schemaVersion: '2026-03-27',
      capturedAt: '2026-03-27T00:00:00.000Z',
    },
    cache: {
      cacheKey: 'agent-state:identity:agent-1',
      cachedAt: '2026-03-27T00:00:01.000Z',
    },
    freshness: {
      observedAt: '2026-03-27T00:00:01.000Z',
      stale: false,
    },
  });

  const authority = agentStateModule.buildAgentAuthorityState({
    status: 'none',
    observedAt: '2026-03-27T00:00:04.000Z',
  });

  assert.equal(identity.kind, 'identity');
  assert.equal(identity.identity.snapshot.source, 'server-derived');
  assert.equal(identity.identity.cache.cacheKey, 'agent-state:identity:agent-1');
  assert.equal(identity.identity.freshness.stale, false);
  assert.deepEqual(authority, {
    kind: 'authority',
    status: 'none',
    observedAt: '2026-03-27T00:00:04.000Z',
  });
  assert.notEqual(authority.status, identity.identity.snapshot.source);
  assert.equal('cache' in authority, false);
  assert.equal('freshness' in authority, false);
});

test('agent-state helpers build each local governed state without collapsing the dimensions together', async () => {
  const agentStateModule = await import('../src/index.ts');

  assert.equal(typeof agentStateModule.buildAgentRegistrationState, 'function');
  assert.equal(typeof agentStateModule.buildAgentBindingState, 'function');
  assert.equal(typeof agentStateModule.buildLocalParticipationState, 'function');
  assert.equal(typeof agentStateModule.buildAgentParticipationState, 'function');

  const registration = agentStateModule.buildAgentRegistrationState({
    status: 'registered',
    registrationId: 'areg-1',
  });
  const binding = agentStateModule.buildAgentBindingState({
    status: 'registration-bound',
    tenantId: 'tenant-1',
    registrationId: 'areg-1',
  });
  const participation = agentStateModule.buildLocalParticipationState({
    localStatus: 'accepted',
    localTaskRef: 'task-1',
  });
  const legacyParticipation = agentStateModule.buildAgentParticipationState({
    status: 'accepted',
    taskId: 'task-1',
  });

  assert.deepEqual(registration, {
    kind: 'registration',
    status: 'registered',
    registrationId: 'areg-1',
  });
  assert.deepEqual(binding, {
    kind: 'binding',
    status: 'registration-bound',
    tenantId: 'tenant-1',
    registrationId: 'areg-1',
  });
  assert.deepEqual(participation, {
    kind: 'local-participation-state',
    localStatus: 'accepted',
    localTaskRef: 'task-1',
    status: 'accepted',
    taskId: 'task-1',
  });
  assert.deepEqual(legacyParticipation, participation);
  assert.equal('taskId' in registration, false);
  assert.equal('tenantId' in participation, false);
});
