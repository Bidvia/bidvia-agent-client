import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeClaimantClosureStatus,
  normalizeLaterWaveStop,
  normalizeMaterializationStatus,
  normalizeOperatorHandoffFailure,
} from '../src/business-universe/normalize.js';

test('normalizeClaimantClosureStatus maps claimant self-repair into a canonical repairable readiness state', () => {
  const snapshot = normalizeClaimantClosureStatus({
    recommended_next_step: 'complete_claimed_agent_self_service',
    next_step_kind: 'self_service_patch',
    next_step_route: '/runtime/account/agents/:agentId/self-service',
    next_action_owner: 'claimant',
    dispatch_eligibility: {
      allowed: false,
      reason_codes: ['capability_profile_missing', 'participation_state_missing'],
    },
  }, {
    tenantId: 'tenant-public',
    activeOrgId: 'company-public',
    principalId: 'claimed:agent-1',
    authorizedCompanyId: 'company-public',
    sessionPresent: true,
    canonicality: 'canonical',
  });

  assert.equal(snapshot.stage, 'readiness');
  assert.equal(snapshot.state, 'repairable');
  assert.equal(snapshot.executability, 'canonical');
  assert.equal(snapshot.recommendedNextStep, 'complete_claimed_agent_self_service');
  assert.deepEqual(snapshot.boundary?.reasonCodes, ['capability_profile_missing', 'participation_state_missing']);
});

test('normalizeClaimantClosureStatus maps complete_task_dispatch_opt_in into the same canonical repairable readiness lane', () => {
  const snapshot = normalizeClaimantClosureStatus({
    recommended_next_step: 'complete_task_dispatch_opt_in',
    next_step_kind: 'task_dispatch_opt_in',
    next_step_route: '/runtime/account/agents/:agentId/self-service',
    next_action_owner: 'claimant',
    dispatch_eligibility: {
      allowed: false,
      reason_codes: ['task_dispatch_acceptance_missing'],
    },
  }, {
    tenantId: 'tenant-public',
    activeOrgId: 'company-public',
    principalId: 'claimed:agent-1b',
    authorizedCompanyId: 'company-public',
    sessionPresent: true,
    canonicality: 'canonical',
  });

  assert.equal(snapshot.stage, 'readiness');
  assert.equal(snapshot.state, 'repairable');
  assert.equal(snapshot.executability, 'canonical');
  assert.equal(snapshot.recommendedNextStep, 'complete_task_dispatch_opt_in');
  assert.deepEqual(snapshot.boundary?.reasonCodes, ['task_dispatch_acceptance_missing']);
});

test('normalizeMaterializationStatus marks canonical operator handoff as executable', () => {
  const snapshot = normalizeMaterializationStatus({
    materialization_stage: 'match_prerequisites_ready',
    recommended_next_step: 'handoff_to_operator_for_matching',
    next_step_kind: 'handoff_to_operator',
    operator_handoff: {
      owner: 'operator',
      route: '/operator/matches?tenant_id=tenant-public&source_listing_id=listing-1',
    },
  }, {
    sourceCompanyId: 'company-public',
    canonicalCompanyId: 'company-public',
    tenantId: 'tenant-public',
    activeOrgId: 'company-public',
    principalId: 'claimed:agent-1',
  });

  assert.equal(snapshot.stage, 'handoff');
  assert.equal(snapshot.state, 'handoff-required');
  assert.equal(snapshot.executability, 'executable-handoff');
  assert.equal(snapshot.handoff?.mode, 'executable');
});

test('normalizeMaterializationStatus marks non-canonical handoff as metadata-only', () => {
  const snapshot = normalizeMaterializationStatus({
    materialization_stage: 'match_prerequisites_ready',
    recommended_next_step: 'handoff_to_operator_for_matching',
    next_step_kind: 'handoff_to_operator',
    operator_handoff: {
      owner: 'operator',
      route: '/operator/matches?tenant_id=tenant-public&source_listing_id=listing-2',
    },
  }, {
    sourceCompanyId: 'acct-owned-org',
    canonicalCompanyId: 'company-public',
    tenantId: 'tenant-public',
    activeOrgId: 'acct-owned-org',
    principalId: 'claimed:agent-2',
  });

  assert.equal(snapshot.executability, 'metadata-only-handoff');
  assert.equal(snapshot.handoff?.canonicality, 'non-canonical');
});

test('normalizeOperatorHandoffFailure maps source-scope fail-close to non-canonical fail-close', () => {
  const snapshot = normalizeOperatorHandoffFailure({
    status: 404,
    body: {
      error: {
        code: 'source_listing_not_found',
        message: 'source listing not found within authorized tenant/company scope',
      },
    },
    tenantId: 'tenant-public',
    principalId: 'operator-system',
    authorizedCompanyId: 'company-public',
  });

  assert.equal(snapshot.executability, 'non-canonical-fail-close');
  assert.equal(snapshot.boundary?.reasonCodes[0], 'source_listing_not_found');
});

test('normalizeLaterWaveStop preserves later-wave bounded stop semantics', () => {
  const snapshot = normalizeLaterWaveStop({
    recommended_next_step: 'stop_claimant_execution',
    next_step_kind: 'later_wave_stop',
    blocked_by: ['later_wave_scope_not_productized'],
  }, {
    tenantId: 'tenant-public',
    activeOrgId: 'company-public',
    principalId: 'claimed:agent-3',
    authorizedCompanyId: 'company-public',
    sessionPresent: true,
    canonicality: 'bounded',
  });

  assert.equal(snapshot.stage, 'progression');
  assert.equal(snapshot.state, 'later-wave-stop');
  assert.equal(snapshot.executability, 'later-wave-stop');
  assert.deepEqual(snapshot.boundary?.reasonCodes, ['later_wave_scope_not_productized']);
});
