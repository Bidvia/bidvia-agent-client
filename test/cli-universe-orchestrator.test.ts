import test from 'node:test';
import assert from 'node:assert/strict';

import { runCli } from '../src/cli.ts';

test('runCli universe inspect prints machine-readable orchestrator state', async () => {
  const printed: unknown[] = [];
  const exitCode = await runCli([
    'universe',
    'inspect',
    '--input',
    JSON.stringify({ claimant: {} }),
  ], {
    createClient: () => ({
      getAccountMe: async () => ({
        account: { tenant_id: 'tenant-public' },
        active_org_context: { org_id: 'company-public' },
        memberships: [{ org_id: 'company-public' }],
      }),
    }) as never,
    readLocalOnboardingState: async () => null,
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.equal((printed[0] as { role: string }).role, 'claimant');
  assert.equal((printed[0] as { nextStep: { stage: string } }).nextStep.stage, 'readiness');
});

test('runCli universe run prints machine-readable orchestrator execution history', async () => {
  const printed: unknown[] = [];
  const exitCode = await runCli([
    'universe',
    'run',
    '--input',
    JSON.stringify({
      resumeFrom: {
        role: 'claimant',
        stageSnapshot: {
          roleWorkspace: {
            role: 'claimant',
            sessionPresent: true,
            adminSessionPresent: false,
            canonicality: 'canonical',
          },
          stage: 'handoff',
          state: 'handoff-required',
          executability: 'executable-handoff',
          action: { kind: 'handoff', owner: 'operator', executability: 'executable-handoff' },
          handoff: { owner: 'operator', route: '/operator/matches', mode: 'executable', canonicality: 'canonical' },
        },
        nextStep: { role: 'operator', stage: 'handoff', kind: 'handoff', executability: 'executable-handoff' },
      },
      operator: {
        matching: {
          sourceListingId: 'source-1',
          candidateListing: {
            listingId: 'candidate-1',
            listingType: 'demand',
            companyId: 'company-public',
            actorId: 'operator-system',
            category: 'basic inorganic industrial chemical',
            sku: 'sku-1',
            quantityValue: '15',
            quantityUnit: 'tons',
            regionSummary: 'China -> Vietnam',
            verificationStatus: 'verified',
            freshnessTs: '2026-05-11T14:00:00.000Z',
            traceId: 'trace-1',
            idempotencyKey: 'idem-1',
            now: '2026-05-11T14:00:00.000Z',
          },
          candidateActivation: {
            companyId: 'company-public',
            actorId: 'operator-system',
            verificationStatus: 'verified',
            now: '2026-05-11T14:00:01.000Z',
          },
          matchCandidates: {
            workflowRunId: 'wf-1',
            triggerEventId: 'evt-1',
            upstreamDecision: 'READY_FOR_ROUTING',
            detectedEvidenceLevel: 2,
            requiredEvidenceLevel: 2,
            missingFields: [],
            freshnessTs: '2026-05-11T14:00:02.000Z',
            traceId: 'trace-1',
            idempotencyKey: 'idem-match-1',
            now: '2026-05-11T14:00:02.000Z',
          },
        },
      },
    }),
  ], {
    createClient: () => ({
      createOperatorExecutionListing: async () => ({ listing: { listing_id: 'candidate-1' } }),
      activateOperatorExecutionListing: async () => ({ listing: { listing_id: 'candidate-1' } }),
      generateOperatorMatchCandidates: async () => ({ upserts: [{ matchId: 'match-1' }] }),
      listOperatorMatches: async () => ({ items: [{ match_id: 'match-1' }] }),
    }) as never,
    readLocalOnboardingState: async () => null,
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.equal((printed[0] as { history: Array<{ step: string }> }).history[0].step, 'operator.matching');
  assert.equal((printed[0] as { current: { role: string } }).current.role, 'operator');
});

test('runCli universe explain prints machine-readable orchestrator explanation', async () => {
  const printed: unknown[] = [];
  const exitCode = await runCli([
    'universe',
    'explain',
    '--input',
    JSON.stringify({ claimant: {} }),
  ], {
    createClient: () => ({
      getAccountMe: async () => ({
        account: { tenant_id: 'tenant-public' },
        active_org_context: { org_id: 'company-public' },
        memberships: [{ org_id: 'company-public' }],
      }),
    }) as never,
    readLocalOnboardingState: async () => null,
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.match((printed[0] as { summary: string }).summary, /claimant/i);
});
