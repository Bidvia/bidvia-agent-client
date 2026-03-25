#!/usr/bin/env node

import { BidviaClient } from './client.js';
import type { BidviaServerCapabilityPayload } from './contracts.js';
import {
  resolveBidviaBaseUrlFromEnv,
  resolveBidviaEnvironmentModeFromEnv,
} from './config.js';
import { buildHeartbeatInput } from './heartbeat.js';
import { buildSyncUploadInput } from './sync.js';
import { buildEvidenceSubmissionInput } from './evidence.js';
import { buildProposalSubmissionInput } from './proposals.js';
import {
  connectionApprovalScenarioAdapter,
  industryUniverseScenarioAdapter,
  opportunityPackageHandoffAdapter,
} from './adapters.js';
import { buildCommercialActionScenarioPlan } from './commercial-action.js';
import { buildMultiBusinessChainCoordinatorPlan } from './coordinator.js';
import { normalizeServerCapabilityPayload } from './server-capabilities.js';
import { buildLocalRuntimeCapabilitySnapshot } from './runtime-capabilities.js';
import {
  buildReviewPacket,
  buildScenarioVerificationBundle,
} from './verification.js';

const [, , command = 'help'] = process.argv;

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function buildSampleServerCapabilityPayload(): BidviaServerCapabilityPayload {
  return {
    environment_mode: 'production' as const,
    route_capabilities: [
      {
        helper_key: 'postHeartbeat',
        route_path_template: '/runtime/agents/:registrationId/heartbeat',
        http_method: 'POST' as const,
        access_context_family: 'registration' as const,
        required_context: ['tenantId', 'registrationId', 'principalId'],
        scope: 'write' as const,
        level: 'atomic-route' as const,
      },
    ],
    mcp_tools: [
      {
        tool_name: 'industry-universe-plan-preview',
        description: 'Previews the bounded industry universe scenario plan payload.',
        input_schema_ref: {
          schema_key: 'BidviaIndustryUniverseScenarioPlanInput',
        },
        output_mode: 'plan-preview' as const,
        helper_ref: {
          helper_key: 'buildIndustryUniverseScenarioPlan',
          capability_key: 'buildIndustryUniverseScenarioPlan',
        },
      },
    ],
    mcp_server: {
      available: true,
      transport: 'stdio' as const,
      supported_methods: ['initialize', 'tools/list', 'tools/call'] as const,
    },
  };
}

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
  if (command === 'environment-mode') {
    printJson({
      baseUrl: resolveBidviaBaseUrlFromEnv(),
      environmentMode: resolveBidviaEnvironmentModeFromEnv(),
    });
    return;
  }

  if (command === 'runtime-capabilities') {
    printJson(buildLocalRuntimeCapabilitySnapshot({
      explicitBaseUrl: resolveBidviaBaseUrlFromEnv(),
    }));
    return;
  }

  if (command === 'launch-topology-smoke') {
    printJson({
      baseUrl: resolveBidviaBaseUrlFromEnv(),
      environmentMode: resolveBidviaEnvironmentModeFromEnv(),
      canonicalGlobalApiDomain: 'https://api.bidvia.ai',
      canonicalChinaApiDomain: 'https://api.bidvia.cn',
      compatibilityProfileMappings: {
        global: 'https://bidvia.ai',
        china: 'https://bidvia.cn',
      },
    });
    return;
  }

  if (command === 'server-capabilities') {
    printJson(normalizeServerCapabilityPayload(buildSampleServerCapabilityPayload()));
    return;
  }

  const client = createClient();
  const now = new Date().toISOString();

  if (command === 'heartbeat') {
    const result = await client.postHeartbeat(buildHeartbeatInput(now, new Date(Date.now() + 5 * 60 * 1000).toISOString()));
    printJson(result);
    return;
  }

  if (command === 'sync-upload') {
    const result = await client.uploadSync(buildSyncUploadInput('sync-cursor-cli', 1, now));
    printJson(result);
    return;
  }

  if (command === 'evidence') {
    const result = await client.submitEvidence(buildEvidenceSubmissionInput('evidence://cli/example', 'provider_receipt', 'CLI evidence submission', now));
    printJson(result);
    return;
  }

  if (command === 'proposal') {
    const result = await client.submitProposal(buildProposalSubmissionInput('template_change', 'proposal://cli/example', 'CLI proposal submission', now));
    printJson(result);
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
    printJson(result);
    return;
  }

  if (command === 'industry-universe-review-packet-preview') {
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
    printJson(result.reviewPacket);
    return;
  }

  if (command === 'industry-universe-review-packet-export') {
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
    printJson(result.exportedReviewPacket);
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
    printJson(result);
    return;
  }

  if (command === 'connection-approval-review-packet-preview') {
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
    printJson(result.reviewPacket);
    return;
  }

  if (command === 'connection-approval-review-packet-export') {
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
    printJson(result.exportedReviewPacket);
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
    printJson(result);
    return;
  }

  if (command === 'opportunity-package-handoff-review-packet-preview') {
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
    printJson(result.reviewPacket);
    return;
  }

  if (command === 'opportunity-package-handoff-review-packet-export') {
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
    printJson(result.exportedReviewPacket);
    return;
  }

  if (command === 'multi-business-chain-verification-wave-preview') {
    const coordinatorPlan = buildMultiBusinessChainCoordinatorPlan({
      coordinatorId: 'coordinator-cli-1',
      coordinatorLabel: 'industry-to-package-with-commercial-action',
      industryUniverse: {
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
      },
      connectionApproval: {
        scenarioId: 'scenario-connection-approval-cli-1',
        scenarioLabel: 'connection-approval-cli-preview',
        sourceRefs: ['source://market/soda-ash-light'],
        evidenceRefs: ['evidence://cli/soda-ash-light'],
        traceIds: ['trace-cli-2'],
        workflowIds: ['wf-cli-2'],
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
      },
      opportunityPackageHandoff: {
        scenarioId: 'scenario-opportunity-package-handoff-cli-1',
        scenarioLabel: 'opportunity-package-handoff-cli-preview',
        sourceRefs: ['source://market/soda-ash-light'],
        evidenceRefs: ['evidence://cli/soda-ash-light'],
        traceIds: ['trace-cli-3'],
        workflowIds: ['wf-cli-3'],
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
      },
    });

    printJson({
      coordinatorPlan,
      externalHandoffBoundary: coordinatorPlan.externalHandoffBoundary,
    });
    return;
  }

  if (command === 'commercial-action-verification-wave-preview') {
    const scenarioPlan = buildCommercialActionScenarioPlan({
      scenarioId: 'scenario-commercial-action-cli-1',
      scenarioLabel: 'commercial-action-cli-preview',
      sourceRefs: ['source://package/pkg-cli-1'],
      evidenceRefs: ['evidence://cli/approval-cli-1'],
      traceIds: ['trace-commercial-cli-1'],
      workflowIds: ['wf-commercial-cli-1'],
      createCommercialAction: {
        governedAction: 'OPPORTUNITY_PACKAGE_SEND',
        subjectType: 'OPPORTUNITY_PACKAGE',
        subjectId: 'pkg-cli-1',
        traceId: 'trace-commercial-cli-1',
        workflowId: 'wf-commercial-cli-1',
        now,
      },
      policyCheckCommercialAction: {
        commercialActionRequestId: 'commercial-action-cli-1',
        policyVersion: 'policy-cli-v1',
        outcome: 'PASS',
        now,
      },
      requestCommercialActionApproval: {
        commercialActionRequestId: 'commercial-action-cli-1',
        approvalRequestId: 'approval-cli-1',
        now,
      },
      executeCommercialAction: {
        commercialActionRequestId: 'commercial-action-cli-1',
        approvalRequestId: 'approval-cli-1',
        receiptId: 'receipt-cli-1',
        approvalResult: 'APPROVED',
        resultStatus: 'SUCCEEDED',
        auditId: 'audit-cli-1',
        now,
      },
    });
    const verificationBundle = buildScenarioVerificationBundle({
      scenario: scenarioPlan.envelope,
      verificationMode: 'review-safe',
    });
    const reviewPacket = buildReviewPacket({
      scenario: scenarioPlan.envelope,
      bundle: verificationBundle,
    });

    printJson({
      waveType: 'commercial-action-continuation',
      scenarioPlan,
      reviewPacket,
    });
    return;
  }

  console.log('bidvia-agent-client');
  console.log('Available commands: environment-mode, runtime-capabilities, launch-topology-smoke, server-capabilities, heartbeat, sync-upload, evidence, proposal, industry-universe-plan, industry-universe-review-packet-preview, industry-universe-review-packet-export, connection-approval-plan, connection-approval-review-packet-preview, connection-approval-review-packet-export, opportunity-package-handoff-plan, opportunity-package-handoff-review-packet-preview, opportunity-package-handoff-review-packet-export, multi-business-chain-verification-wave-preview, commercial-action-verification-wave-preview');
}

void main();
