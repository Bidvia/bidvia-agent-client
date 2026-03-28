#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BidviaClient, BidviaClientTransportError } from './client.js';
import type {
  BidviaEvidenceSubmissionInput,
  BidviaHeartbeatInput,
  BidviaProposalSubmissionInput,
  BidviaServerCapabilityPayload,
  BidviaSyncUploadInput,
} from './contracts.js';
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
  registeredAgentExecutionAdapters,
  type BidviaExecutionAdapter,
  type BidviaRegisteredAgentExecutionCommand,
} from './adapters.js';
import { buildCommercialActionScenarioPlan } from './commercial-action.js';
import { buildMultiBusinessChainCoordinatorPlan } from './coordinator.js';
import { normalizeServerCapabilityPayload } from './server-capabilities.js';
import { buildLocalRuntimeCapabilitySnapshot } from './runtime-capabilities.js';
import {
  buildReviewPacket,
  buildScenarioVerificationBundle,
  exportScenarioVerificationBundle,
} from './verification.js';
import { buildRegistrationLifecycleScenarioPlan } from './registration-lifecycle.js';
import { buildRegisteredAgentOperationsScenarioPlan } from './registered-agent-operations.js';

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

export function shouldRunCliMain(argvEntry: string | undefined, moduleUrl: string): boolean {
  if (!argvEntry) {
    return false;
  }

  return path.resolve(argvEntry) === fileURLToPath(moduleUrl);
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

type BidviaCliExecutionCommandDefinition = {
  buildInput: (now: string) => unknown;
  run: (client: BidviaClient, now: string) => Promise<unknown>;
};

function createExecutionCommandDefinition<Input>(
  adapter: BidviaExecutionAdapter<Input, unknown>,
  buildInput: (now: string) => Input,
): BidviaCliExecutionCommandDefinition {
  return {
    buildInput(now) {
      return buildInput(now);
    },
    run(client, now) {
      return adapter.run(client, buildInput(now));
    },
  };
}

type BidviaCliParsedArgs = {
  command: string;
  dryRun: boolean;
  input?: string;
  unknownFlags: string[];
  extraPositionals: string[];
  missingInputValue: boolean;
};

type BidviaCliStructuredFailure = {
  error: {
    code: string;
    command: string;
    message: string;
    validInputs?: string[];
    details?: string[];
  };
};

const verificationBundleInputValues = [
  'registration-lifecycle',
  'registered-agent-operations',
] as const;

type BidviaVerificationBundleInput = typeof verificationBundleInputValues[number];

function parseCliArgs(argv: string[]): BidviaCliParsedArgs {
  if (argv.length === 0) {
    return {
      command: 'help',
      dryRun: false,
      unknownFlags: [],
      extraPositionals: [],
      missingInputValue: false,
    };
  }

  const firstToken = argv[0];
  if (firstToken === '--help' || firstToken === '-h') {
    return {
      command: 'help',
      dryRun: false,
      unknownFlags: [],
      extraPositionals: [],
      missingInputValue: false,
    };
  }

  const command = firstToken ?? 'help';
  let dryRun = false;
  let input: string | undefined;
  let missingInputValue = false;
  const unknownFlags: string[] = [];
  const extraPositionals: string[] = [];

  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index]!;

    if (token === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (token === '--input') {
      const nextToken = argv[index + 1];
      if (!nextToken || nextToken.startsWith('--')) {
        missingInputValue = true;
        continue;
      }

      input = nextToken;
      index += 1;
      continue;
    }

    if (token === '--help' || token === '-h') {
      continue;
    }

    if (token.startsWith('--')) {
      unknownFlags.push(token);
      continue;
    }

    extraPositionals.push(token);
  }

  return {
    command,
    dryRun,
    input,
    unknownFlags,
    extraPositionals,
    missingInputValue,
  };
}

function buildStructuredFailure(
  command: string,
  code: string,
  message: string,
  extra: Omit<BidviaCliStructuredFailure['error'], 'code' | 'command' | 'message'> = {},
): BidviaCliStructuredFailure {
  return {
    error: {
      code,
      command,
      message,
      ...extra,
    },
  };
}

function printStructuredFailure(
  dependencies: BidviaCliDependencies,
  failure: BidviaCliStructuredFailure,
): number {
  dependencies.printJson(failure);
  return 1;
}

function buildRegistrationLifecycleCliPlan(now: string) {
  return buildRegistrationLifecycleScenarioPlan({
    scenarioId: 'scenario-registration-lifecycle-cli-1',
    scenarioLabel: 'registration-lifecycle-cli-preview',
    sourceRefs: ['source://registration/bootstrap'],
    evidenceRefs: ['evidence://registration/receipt-cli-1'],
    traceIds: ['trace-registration-cli-1'],
    workflowIds: ['wf-registration-cli-1'],
    createProvisionalAgent: {
      provisionalAgentRef: 'prov-agent-cli-1',
      now,
    },
    queryProvisionalAgent: {
      provisionalAgentRef: 'prov-agent-cli-1',
    },
    claimProvisionalAgent: {
      provisionalAgentRef: 'prov-agent-cli-1',
      claimToken: 'claim-token-cli-1',
      now,
    },
    postHeartbeat: buildHeartbeatInput(
      now,
      new Date(new Date(now).getTime() + 5 * 60 * 1000).toISOString(),
    ),
    uploadSync: buildSyncUploadInput('sync-cursor-cli', 1, now),
    submitEvidence: buildEvidenceSubmissionInput(
      'evidence://cli/registration-lifecycle',
      'provider_receipt',
      'CLI registration lifecycle evidence submission',
      now,
    ),
    submitProposal: buildProposalSubmissionInput(
      'template_change',
      'proposal://cli/registration-lifecycle',
      'CLI registration lifecycle proposal submission',
      now,
    ),
    registrationId: 'areg-cli-1',
  });
}

function buildRegisteredAgentOperationsCliPlan(now: string) {
  return buildRegisteredAgentOperationsScenarioPlan({
    scenarioId: 'scenario-registered-agent-operations-cli-1',
    scenarioLabel: 'registered-agent-operations-cli-preview',
    sourceRefs: ['source://registered-agent/runtime'],
    evidenceRefs: ['evidence://registered-agent/receipt-cli-1'],
    traceIds: ['trace-registered-agent-cli-1'],
    workflowIds: ['wf-registered-agent-cli-1'],
    postHeartbeat: buildHeartbeatInput(
      now,
      new Date(new Date(now).getTime() + 5 * 60 * 1000).toISOString(),
    ),
    uploadSync: buildSyncUploadInput('sync-cursor-cli', 1, now),
    submitEvidence: buildEvidenceSubmissionInput(
      'evidence://cli/registered-agent-operations',
      'provider_receipt',
      'CLI registered agent operations evidence submission',
      now,
    ),
    submitProposal: buildProposalSubmissionInput(
      'template_change',
      'proposal://cli/registered-agent-operations',
      'CLI registered agent operations proposal submission',
      now,
    ),
    registrationId: 'areg-cli-1',
  });
}

function resolveVerificationBundleInput(input: string | undefined): BidviaVerificationBundleInput | undefined {
  if (!input) {
    return 'registration-lifecycle';
  }

  if ((verificationBundleInputValues as readonly string[]).includes(input)) {
    return input as BidviaVerificationBundleInput;
  }

  return undefined;
}

function buildVerificationBundlePreview(input: BidviaVerificationBundleInput, now: string) {
  const scenarioPlan = input === 'registration-lifecycle'
    ? buildRegistrationLifecycleCliPlan(now)
    : buildRegisteredAgentOperationsCliPlan(now);

  return {
    input,
    scenarioPlan,
    verificationBundle: buildScenarioVerificationBundle({
      scenario: scenarioPlan.envelope,
      verificationMode: 'review-safe',
    }),
  };
}

export interface BidviaCliDependencies {
  createClient: () => BidviaClient;
  resolveBaseUrl: () => string;
  resolveEnvironmentMode: () => ReturnType<typeof resolveBidviaEnvironmentModeFromEnv>;
  now: () => string;
  printJson: (value: unknown) => void;
  printLine: (value: string) => void;
  printError: (value: string) => void;
  executionCommands: Partial<Record<BidviaRegisteredAgentExecutionCommand, BidviaCliExecutionCommandDefinition>>;
}

const defaultExecutionCommands: Record<BidviaRegisteredAgentExecutionCommand, BidviaCliExecutionCommandDefinition> = {
  heartbeat: createExecutionCommandDefinition<BidviaHeartbeatInput>(
    registeredAgentExecutionAdapters.heartbeat,
    (now) => buildHeartbeatInput(
      now,
      new Date(new Date(now).getTime() + 5 * 60 * 1000).toISOString(),
    ),
  ),
  'sync-upload': createExecutionCommandDefinition<BidviaSyncUploadInput>(
    registeredAgentExecutionAdapters['sync-upload'],
    (now) => buildSyncUploadInput('sync-cursor-cli', 1, now),
  ),
  evidence: createExecutionCommandDefinition<BidviaEvidenceSubmissionInput>(
    registeredAgentExecutionAdapters.evidence,
    (now) => buildEvidenceSubmissionInput(
      'evidence://cli/example',
      'provider_receipt',
      'CLI evidence submission',
      now,
    ),
  ),
  proposal: createExecutionCommandDefinition<BidviaProposalSubmissionInput>(
    registeredAgentExecutionAdapters.proposal,
    (now) => buildProposalSubmissionInput(
      'template_change',
      'proposal://cli/example',
      'CLI proposal submission',
      now,
    ),
  ),
};

function createDefaultCliDependencies(): BidviaCliDependencies {
  return {
    createClient,
    resolveBaseUrl: resolveBidviaBaseUrlFromEnv,
    resolveEnvironmentMode: resolveBidviaEnvironmentModeFromEnv,
    now: () => new Date().toISOString(),
    printJson,
    printLine: (value) => {
      console.log(value);
    },
    printError: (value) => {
      console.error(value);
    },
    executionCommands: defaultExecutionCommands,
  };
}

function printHelp(printLine: (value: string) => void): void {
  printLine('bidvia-agent-client');
  printLine('Visibility commands:');
  printLine('  environment-mode');
  printLine('  runtime-capabilities');
  printLine('  launch-topology-smoke');
  printLine('  server-capabilities');
  printLine('Execution commands:');
  printLine('  heartbeat [--dry-run]');
  printLine('  sync-upload [--dry-run]');
  printLine('  evidence [--dry-run]');
  printLine('  proposal [--dry-run]');
  printLine('Review-safe commands:');
  printLine('  industry-universe-plan');
  printLine('  industry-universe-review-packet-preview');
  printLine('  industry-universe-review-packet-export');
  printLine('  connection-approval-plan');
  printLine('  connection-approval-review-packet-preview');
  printLine('  connection-approval-review-packet-export');
  printLine('  opportunity-package-handoff-plan');
  printLine('  opportunity-package-handoff-review-packet-preview');
  printLine('  opportunity-package-handoff-review-packet-export');
  printLine('  registration-lifecycle-plan');
  printLine('  registered-agent-operations-plan');
  printLine('Verification commands:');
  printLine('  multi-business-chain-verification-wave-preview');
  printLine('  commercial-action-verification-wave-preview');
  printLine('  verification-bundle-preview [--input registration-lifecycle|registered-agent-operations]');
  printLine('  verification-bundle-export [--input registration-lifecycle|registered-agent-operations]');
}

export async function runCli(
  argv: string[] = process.argv.slice(2),
  overrides: Partial<BidviaCliDependencies> = {},
): Promise<number> {
  const dependencies = {
    ...createDefaultCliDependencies(),
    ...overrides,
    executionCommands: {
      ...defaultExecutionCommands,
      ...(overrides.executionCommands ?? {}),
    },
  } satisfies BidviaCliDependencies;
  const parsedArgs = parseCliArgs(argv);
  const command = parsedArgs.command;

  if (parsedArgs.missingInputValue) {
    return printStructuredFailure(
      dependencies,
      buildStructuredFailure(
        command,
        'invalid-input',
        'Missing value for --input. Use one of: registration-lifecycle, registered-agent-operations.',
        {
          validInputs: [...verificationBundleInputValues],
        },
      ),
    );
  }

  if (parsedArgs.unknownFlags.length > 0) {
    return printStructuredFailure(
      dependencies,
      buildStructuredFailure(
        command,
        'invalid-input',
        `Unknown option(s): ${parsedArgs.unknownFlags.join(', ')}. Run --help to review supported commands and flags.`,
        {
          details: parsedArgs.unknownFlags,
        },
      ),
    );
  }

  if (parsedArgs.extraPositionals.length > 0) {
    return printStructuredFailure(
      dependencies,
      buildStructuredFailure(
        command,
        'invalid-input',
        `Unexpected positional argument(s): ${parsedArgs.extraPositionals.join(', ')}. Run --help to review supported commands and flags.`,
        {
          details: parsedArgs.extraPositionals,
        },
      ),
    );
  }

  if (command === 'help') {
    printHelp(dependencies.printLine);
    return 0;
  }

  if (command === 'environment-mode') {
    dependencies.printJson({
      baseUrl: dependencies.resolveBaseUrl(),
      environmentMode: dependencies.resolveEnvironmentMode(),
    });
    return 0;
  }

  if (command === 'runtime-capabilities') {
    dependencies.printJson(buildLocalRuntimeCapabilitySnapshot({
      explicitBaseUrl: dependencies.resolveBaseUrl(),
    }));
    return 0;
  }

  if (command === 'launch-topology-smoke') {
    dependencies.printJson({
      baseUrl: dependencies.resolveBaseUrl(),
      environmentMode: dependencies.resolveEnvironmentMode(),
      canonicalGlobalApiDomain: 'https://api.bidvia.ai',
      canonicalChinaApiDomain: 'https://api.bidvia.cn',
      compatibilityProfileMappings: {
        global: 'https://bidvia.ai',
        china: 'https://bidvia.cn',
      },
    });
    return 0;
  }

  if (command === 'server-capabilities') {
    dependencies.printJson(normalizeServerCapabilityPayload(buildSampleServerCapabilityPayload()));
    return 0;
  }

  const executionCommand = dependencies.executionCommands[command as BidviaRegisteredAgentExecutionCommand];
  if (executionCommand) {
    if (parsedArgs.input) {
      return printStructuredFailure(
        dependencies,
        buildStructuredFailure(
          command,
          'invalid-input',
          `The ${command} command does not accept --input. Use --dry-run to inspect the local-only payload preview.`,
        ),
      );
    }

    if (parsedArgs.dryRun) {
      const now = dependencies.now();
      dependencies.printJson({
        command,
        mode: 'dry-run',
        scope: 'local-only',
        input: executionCommand.buildInput(now),
      });
      return 0;
    }

    const client = dependencies.createClient();
    const now = dependencies.now();
    const result = await executionCommand.run(client, now);
    dependencies.printJson(result);
    return 0;
  }

  const now = dependencies.now();

  if (command === 'registration-lifecycle-plan') {
    dependencies.printJson({
      command,
      scope: 'local-only',
      scenarioPlan: buildRegistrationLifecycleCliPlan(now),
    });
    return 0;
  }

  if (command === 'registered-agent-operations-plan') {
    dependencies.printJson({
      command,
      scope: 'local-only',
      scenarioPlan: buildRegisteredAgentOperationsCliPlan(now),
    });
    return 0;
  }

  if (command === 'verification-bundle-preview' || command === 'verification-bundle-export') {
    const selectedInput = resolveVerificationBundleInput(parsedArgs.input);
    if (!selectedInput) {
      return printStructuredFailure(
        dependencies,
        buildStructuredFailure(
          command,
          'invalid-input',
          `Invalid --input value "${parsedArgs.input}". Use one of: registration-lifecycle, registered-agent-operations.`,
          {
            validInputs: [...verificationBundleInputValues],
          },
        ),
      );
    }

    const preview = buildVerificationBundlePreview(selectedInput, now);
    dependencies.printJson({
      command,
      input: selectedInput,
      scope: 'review-safe',
      scenarioPlan: preview.scenarioPlan,
      verificationBundle: command === 'verification-bundle-export'
        ? exportScenarioVerificationBundle(preview.verificationBundle)
        : preview.verificationBundle,
    });
    return 0;
  }

  const client = dependencies.createClient();

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
    dependencies.printJson(result);
    return 0;
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
    dependencies.printJson(result.reviewPacket);
    return 0;
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
    dependencies.printJson(result.exportedReviewPacket);
    return 0;
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
    dependencies.printJson(result);
    return 0;
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
    dependencies.printJson(result.reviewPacket);
    return 0;
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
    dependencies.printJson(result.exportedReviewPacket);
    return 0;
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
    dependencies.printJson(result);
    return 0;
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
    dependencies.printJson(result.reviewPacket);
    return 0;
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
    dependencies.printJson(result.exportedReviewPacket);
    return 0;
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

    dependencies.printJson({
      coordinatorPlan,
      externalHandoffBoundary: coordinatorPlan.externalHandoffBoundary,
    });
    return 0;
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

    dependencies.printJson({
      waveType: 'commercial-action-continuation',
      scenarioPlan,
      reviewPacket,
    });
    return 0;
  }

  return printStructuredFailure(
    dependencies,
    buildStructuredFailure(
      command,
      'unknown-command',
      `Unknown command "${command}". Run --help to review the grouped local-only command surface.`,
    ),
  );
}

function formatCliError(error: unknown) {
  if (error instanceof BidviaClientTransportError) {
    return JSON.stringify({
      name: error.name,
      message: error.message,
      kind: error.kind,
      status: error.status,
      responseBody: error.responseBody,
    }, null, 2);
  }

  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
}

export async function main() {
  try {
    const exitCode = await runCli();
    if (exitCode !== 0) {
      process.exitCode = exitCode;
    }
  } catch (error) {
    createDefaultCliDependencies().printError(formatCliError(error));
    process.exitCode = 1;
  }
}

if (shouldRunCliMain(process.argv[1], import.meta.url)) {
  void main();
}
