import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  BidviaEvidenceSubmissionInput,
  BidviaHeartbeatInput,
  BidviaProposalSubmissionInput,
  BidviaSyncUploadInput,
} from '../src/contracts.ts';

import {
  registeredAgentExecutionAdapters,
} from '../src/adapters.ts';

test('registered agent execution adapters stay explicitly bounded to shipped runtime commands', () => {
  assert.deepEqual(
    Object.keys(registeredAgentExecutionAdapters).sort(),
    ['evidence', 'heartbeat', 'proposal', 'sync-upload'],
  );
  assert.match(registeredAgentExecutionAdapters.heartbeat.describe(), /real remote execution/i);
  assert.match(registeredAgentExecutionAdapters.evidence.describe(), /registration-bound/i);
});

test('registered agent execution adapters call the existing BidviaClient runtime helpers', async (t) => {
  await t.test('heartbeat uses postHeartbeat', async () => {
    const calls: string[] = [];
    const client = {
      async postHeartbeat(input: BidviaHeartbeatInput) {
        calls.push(`postHeartbeat:${input.expiresAt}`);
        return { ok: true, route: 'heartbeat' };
      },
    };

    const result = await registeredAgentExecutionAdapters.heartbeat.run(client as never, {
      now: '2026-03-29T10:00:00Z',
      expiresAt: '2026-03-29T10:05:00Z',
    });

    assert.deepEqual(result, { ok: true, route: 'heartbeat' });
    assert.deepEqual(calls, ['postHeartbeat:2026-03-29T10:05:00Z']);
  });

  await t.test('sync-upload uses uploadSync', async () => {
    const calls: string[] = [];
    const client = {
      async uploadSync(input: BidviaSyncUploadInput) {
        calls.push(`uploadSync:${input.cursorRef}`);
        return { ok: true, route: 'sync-upload' };
      },
    };

    const result = await registeredAgentExecutionAdapters['sync-upload'].run(client as never, {
      cursorRef: 'cursor-registered-1',
      objectCount: 2,
      now: '2026-03-29T10:01:00Z',
    });

    assert.deepEqual(result, { ok: true, route: 'sync-upload' });
    assert.deepEqual(calls, ['uploadSync:cursor-registered-1']);
  });

  await t.test('evidence uses submitEvidence', async () => {
    const calls: string[] = [];
    const client = {
      async submitEvidence(input: BidviaEvidenceSubmissionInput) {
        calls.push(`submitEvidence:${input.evidenceRef}`);
        return { ok: true, route: 'evidence' };
      },
    };

    const result = await registeredAgentExecutionAdapters.evidence.run(client as never, {
      evidenceRef: 'evidence://registered-agent/1',
      evidenceKind: 'provider_receipt',
      summary: 'registered agent evidence',
      now: '2026-03-29T10:02:00Z',
    });

    assert.deepEqual(result, { ok: true, route: 'evidence' });
    assert.deepEqual(calls, ['submitEvidence:evidence://registered-agent/1']);
  });

  await t.test('proposal uses submitProposal', async () => {
    const calls: string[] = [];
    const client = {
      async submitProposal(input: BidviaProposalSubmissionInput) {
        calls.push(`submitProposal:${input.proposalRef}`);
        return { ok: true, route: 'proposal' };
      },
    };

    const result = await registeredAgentExecutionAdapters.proposal.run(client as never, {
      proposalType: 'template_change',
      proposalRef: 'proposal://registered-agent/1',
      summary: 'registered agent proposal',
      now: '2026-03-29T10:03:00Z',
    });

    assert.deepEqual(result, { ok: true, route: 'proposal' });
    assert.deepEqual(calls, ['submitProposal:proposal://registered-agent/1']);
  });
});
