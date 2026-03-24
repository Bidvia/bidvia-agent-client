#!/usr/bin/env node

import { BidviaClient } from './client.js';
import { resolveBidviaBaseUrlFromEnv } from './config.js';
import { buildHeartbeatInput } from './heartbeat.js';
import { buildSyncUploadInput } from './sync.js';
import { buildEvidenceSubmissionInput } from './evidence.js';
import { buildProposalSubmissionInput } from './proposals.js';
import {
  connectionApprovalScenarioAdapter,
  industryUniverseScenarioAdapter,
  opportunityPackageHandoffAdapter,
} from './adapters.js';

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

  if (command === 'connection-approval-plan') {
    const result = await connectionApprovalScenarioAdapter.run(client, {
      scenarioId: 'scenario-connection-approval-cli-1',
      scenarioLabel: 'connection-approval-cli-preview',
      sourceRefs: ['source://market/soda-ash-light'],
      evidenceRefs: ['evidence://cli/soda-ash-light'],
      traceIds: ['trace-cli-1'],
      workflowIds: ['wf-cli-1'],
      createConnectionRequest: {
        sourceMatchId: 'match-cli-1',
        requesterActorId: 'actor-cli-1',
        requesterCompanyId: 'company-cli-1',
        riskTier: 'medium',
        policyVersion: 'policy-cli-v1',
        approvalMatrixVersion: 'matrix-cli-v1',
        actionType: 'buyer_contact_request',
        now,
      },
      approveConnectionRequest: {
        approvalRequestId: 'approval-cli-1',
        actorId: 'actor-cli-1',
        decision: 'approve',
        now,
      },
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'opportunity-package-handoff-plan') {
    const result = await opportunityPackageHandoffAdapter.run(client, {
      scenarioId: 'scenario-opportunity-package-handoff-cli-1',
      scenarioLabel: 'opportunity-package-handoff-cli-preview',
      sourceRefs: ['source://market/soda-ash-light'],
      evidenceRefs: ['evidence://cli/soda-ash-light'],
      traceIds: ['trace-cli-1'],
      workflowIds: ['wf-cli-1'],
      exportOpportunityPackage: {
        opportunityId: 'opportunity-cli-1',
        renderTemplateId: 'template-cli-1',
        contentRef: 'content://packages/opportunity-cli-1',
        redactionProfile: 'review-safe',
        targetSystem: 'downstream-dataroom',
        operationType: 'export',
        nodeId: 'node-cli-1',
        runtimeId: 'runtime-cli-1',
        agentId: 'agent-cli-1',
        boundAccountId: 'account-cli-1',
        now,
      },
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log('bidvia-agent-client');
  console.log('Available commands: heartbeat, sync-upload, evidence, proposal, industry-universe-plan, connection-approval-plan, opportunity-package-handoff-plan');
}

void main();
