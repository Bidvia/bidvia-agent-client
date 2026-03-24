#!/usr/bin/env node

import { BidviaClient } from './client.js';
import { resolveBidviaBaseUrlFromEnv } from './config.js';
import { buildHeartbeatInput } from './heartbeat.js';
import { buildSyncUploadInput } from './sync.js';
import { buildEvidenceSubmissionInput } from './evidence.js';
import { buildProposalSubmissionInput } from './proposals.js';
import { industryUniverseScenarioAdapter } from './adapters.js';

const [, , command = 'help'] = process.argv;

function createClient() {
  return new BidviaClient({
    baseUrl: resolveBidviaBaseUrlFromEnv(),
    context: {
      tenantId: process.env.BIDVIA_TENANT_ID ?? 'tenant-a',
      principalId: process.env.BIDVIA_PRINCIPAL_ID,
      registrationId: process.env.BIDVIA_REGISTRATION_ID,
      sessionId: process.env.BIDVIA_SESSION_ID,
    },
  });
}

async function main() {
  const client = createClient();
  const now = new Date().toISOString();

  if (command === 'heartbeat') {
    const result = await client.postHeartbeat(buildHeartbeatInput(now, new Date(Date.now() + 5 * 60 * 1000).toISOString()));
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'sync-upload') {
    const result = await client.uploadSync(buildSyncUploadInput('sync-cursor-cli', 1, now));
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'evidence') {
    const result = await client.submitEvidence(buildEvidenceSubmissionInput('evidence://cli/example', 'provider_receipt', 'CLI evidence submission', now));
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'proposal') {
    const result = await client.submitProposal(buildProposalSubmissionInput('template_change', 'proposal://cli/example', 'CLI proposal submission', now));
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'industry-universe-plan') {
    const result = await industryUniverseScenarioAdapter.run(client, {
      scenarioId: 'scenario-industry-universe-cli-1',
      scenarioLabel: 'industry-universe-cli-preview',
      sourceRefs: ['source://market/soda-ash-light'],
      evidenceRefs: ['evidence://cli/soda-ash-light'],
      traceIds: ['trace-cli-1'],
      workflowIds: ['wf-cli-1'],
      createListing: {
        listingId: 'listing-cli-1',
        listingType: 'supply',
        category: 'basic inorganic industrial chemical',
        sku: 'sodium-carbonate-soda-ash-light',
        quantityValue: '15',
        quantityUnit: 'tons',
        regionSummary: 'China -> Vietnam',
        verificationStatus: 'verified',
        freshnessTs: now,
        traceId: 'trace-cli-1',
        idempotencyKey: 'listing-cli-1',
        now,
      },
      activateListing: {
        now,
      },
      generateMatchCandidates: {
        upstreamDecision: 'READY_FOR_ROUTING',
        requiredEvidenceLevel: 1,
        detectedEvidenceLevel: 1,
        workflowRunId: 'wf-cli-1',
        triggerEventId: 'evt-cli-1',
        topN: 10,
        now,
      },
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log('bidvia-agent-client');
  console.log('Available commands: heartbeat, sync-upload, evidence, proposal, industry-universe-plan');
}

void main();
