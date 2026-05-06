#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import packageJson from '../package.json' with { type: 'json' };

import { BidviaClient, BidviaClientTransportError } from './client.js';
import type {
  BidviaClientContext,
  BidviaCorePlaneAdoptionStatus,
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
  bidviaNextStageReadRouteDiscoveryGroups,
} from './capabilities.js';
import {
  buildEnterpriseIntegrationDiscoverySnapshot,
  buildLocalDiscoveryCatalog,
  buildLocalRouteCapabilityCatalog,
  buildLocalMcpProductizationSnapshot,
  getLocalMcpToolDescriptor,
  getRouteCapabilityFromLocalCatalog,
} from './discovery-catalog.js';
import {
  connectionApprovalScenarioAdapter,
  industryUniverseScenarioAdapter,
  opportunityPackageHandoffAdapter,
  registeredAgentExecutionAdapters,
  type BidviaExecutionAdapter,
  type BidviaRegisteredAgentExecutionCommand,
} from './adapters.js';
import {
  buildIndustryUniverseScenarioPlan,
  executeIndustryUniverseScenario,
} from './universe.js';
import { buildCommercialActionScenarioPlan } from './commercial-action.js';
import { buildMultiBusinessChainCoordinatorPlan } from './coordinator.js';
import {
  buildCapabilityPlaneServerSnapshot,
} from './capability-plane.js';
import {
  buildStage3ReleaseGate,
  listCorePlaneAdoptionStatuses,
} from './core-plane-adoption.js';
import {
  buildReviewPacket,
  exportReviewPacket,
  buildScenarioVerificationBundle,
  exportScenarioVerificationBundle,
} from './verification.js';
import {
  buildExecutionGuidanceEntries,
  resolveCoreSuggestedClaimantContinuation,
} from './execution-guidance.js';
import { buildRegistrationLifecycleScenarioPlan } from './registration-lifecycle.js';
import { buildRegisteredAgentOperationsScenarioPlan } from './registered-agent-operations.js';
import {
  buildCliExecutionPreflight,
  buildCliMissingContextMessage,
  type BidviaExecutionOperatorPreflight,
} from './operator-ergonomics.js';
import {
  buildOnboardingReadiness,
} from './onboarding-readiness.js';
import { buildLocalRuntimeCapabilitySnapshot } from './runtime-capabilities.js';
import {
  writeOpenClawCompanionBundle,
} from './openclaw-bundle-export.js';
import {
  buildOpenClawConfig,
  exportOpenClawConfig,
} from './openclaw-config-export.js';
import {
  buildRouteContextMatrix,
  buildRouteContextMatrixNextStepHints,
} from './route-context-matrix.js';
import { listCorePayloadContractMatrixEntries } from './core-payload-contract-matrix.js';
import { listPlaneExecutionGates } from './plane-execution-gate.js';
import {
  listOnboardingJourneyCommandHints,
} from './onboarding-journey.js';
import {
  buildIdentitySessionPlaneCliSnapshot,
  buildIdentitySessionPlaneJourneyBoundaryStatuses,
  buildIdentitySessionPlaneProgress,
  buildIdentitySessionPlaneView,
} from './identity-session-plane.js';
import { buildEnterpriseIntegrationPlaneCliSnapshot } from './enterprise-integration-plane.js';
import { buildTaskPlaneCliSnapshot } from './task-plane.js';
import { buildWorkflowStagePlaneCliSnapshot } from './workflow-stage-plane.js';
import {
  type BidviaLocalOnboardingStateWarning,
  type BidviaLocalOnboardingState,
  readLocalOnboardingState,
  readLocalOnboardingStateWithDiagnostics,
  resolveLocalOnboardingStatePath,
  writeLocalOnboardingState,
} from './local-onboarding-state.js';
import { runLocalMcpServerMain } from './mcp-server.js';
import {
  buildBidviaSurfaceRuntimeIdentityContext,
  runBidviaSurfaceCapability,
} from './runtime/surface-runtime.js';
import {
  buildCliEffectiveContextSnapshot as buildSharedCliEffectiveContextSnapshot,
  buildCliOnboardingActionExecutionContext as buildSharedCliOnboardingActionExecutionContext,
  buildCliPersistedOnboardingActionState as buildSharedCliPersistedOnboardingActionState,
} from './cli-runtime-context.js';

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function printReviewPacketJson(value: unknown): void {
  printJson(exportReviewPacket(value as Parameters<typeof exportReviewPacket>[0]));
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

function createClient(
  env: NodeJS.ProcessEnv = process.env,
  contextOverride: Partial<BidviaClientContext> = {},
) {
  const tenantId = contextOverride.tenantId ?? env.BIDVIA_TENANT_ID;

  return new BidviaClient({
    baseUrl: resolveBidviaBaseUrlFromEnv(env),
    context: {
      ...(tenantId === undefined ? {} : { tenantId }),
      agentId: env.BIDVIA_AGENT_ID,
      principalId: env.BIDVIA_PRINCIPAL_ID,
      principalType: env.BIDVIA_PRINCIPAL_TYPE,
      authorizedRole: env.BIDVIA_AUTHORIZED_ROLE,
      registrationId: env.BIDVIA_REGISTRATION_ID,
      sessionId: env.BIDVIA_SESSION_ID,
      adminSessionId: env.BIDVIA_ADMIN_SESSION_ID,
      companyId: env.BIDVIA_COMPANY_ID,
      ...contextOverride,
    } as BidviaClientContext,
  });
}

type BidviaCliExecutionCommandDefinition = {
  helperKey?: string;
  capabilityKey?: string;
  buildInput: (now: string) => unknown;
  run: (client: BidviaClient, now: string) => Promise<unknown>;
};

function createExecutionCommandDefinition<Input>(
  adapter: BidviaExecutionAdapter<Input, unknown>,
  buildInput: (now: string) => Input,
): BidviaCliExecutionCommandDefinition {
  return {
    helperKey: adapter.capabilityKey,
    capabilityKey: adapter.capabilityKey,
    buildInput(now) {
      return buildInput(now);
    },
    run(client, now) {
      return adapter.run(client, buildInput(now));
    },
  };
}

function resolveExecutionCommandRuntimeKeys(
  command: BidviaRegisteredAgentExecutionCommand,
  executionCommand: BidviaCliExecutionCommandDefinition,
): { helperKey: string; capabilityKey: string } {
  const defaultCommand = defaultExecutionCommands[command];
  const helperKey = executionCommand.helperKey ?? defaultCommand?.helperKey;
  const capabilityKey = executionCommand.capabilityKey ?? defaultCommand?.capabilityKey ?? helperKey;

  if (!helperKey || !capabilityKey) {
    throw new Error(`Missing runtime helper metadata for execution command ${command}`);
  }

  return {
    helperKey,
    capabilityKey,
  };
}

type BidviaCliParsedArgs = {
  command: string;
  dryRun: boolean;
  input?: string;
  flagValues: Partial<Record<BidviaCliSupportedValueFlag, string>>;
  unknownFlags: string[];
  extraPositionals: string[];
  missingValueFlags: BidviaCliSupportedValueFlag[];
};

type BidviaCliStructuredFailure = {
  error: {
    code: string;
    command: string;
    message: string;
    validInputs?: string[];
    details?: string[];
    allowedStates?: string[];
    preflight?: BidviaExecutionOperatorPreflight;
    transport?: {
      name: string;
      code?: string;
      status?: number;
      responseBody?: unknown;
    };
    localState?: {
      path: string;
      operation: 'write';
      name: string;
      message: string;
      code?: string;
    };
  };
};

type BidviaContextValueSource = 'env' | 'local-state' | 'missing';

interface BidviaReachabilityProbeResult {
  reachable: boolean;
  statusCode: number | null;
  error: string | null;
}

interface BidviaDoctorReadinessContext {
  tenantId?: string;
  agentId?: string;
  principalId?: string;
  companyId?: string;
  registrationId?: string;
}

interface BidviaDoctorReadinessFailure {
  name: string;
  message: string;
  code?: string;
  status?: number;
  responseBody?: unknown;
}

type BidviaCliTruthFetchCommand =
  | 'account-agents'
  | 'account-agent'
  | 'account-agent-dispatch-authority'
  | 'account-agent-closure-status'
  | 'account-agent-execution-status'
  | 'account-agent-execution-listing-status'
  | 'account-agent-execution-materialization-status'
  | 'account-integration-capabilities'
  | 'account-agent-integration-eligibility'
  | 'account-agent-bindings'
  | 'account-records'
  | 'agent-presence'
  | 'agent-authority'
  | 'agent-readiness'
  | 'agent-summary'
  | 'agent-registrations'
  | 'agent-registration'
  | 'authority-profiles'
  | 'agent-authority-profile'
  | 'agent-authority-ladder'
  | 'capability-profiles'
  | 'agent-capability-profile'
  | 'participation-states'
  | 'participation-state'
  | 'task-dispatches'
  | 'task-dispatch'
  | 'governed-work-closure'
  | 'canonical-semantic-concepts'
  | 'canonical-semantic-concept'
  | 'canonical-semantic-labels'
  | 'canonical-semantic-label'
  | 'canonical-semantic-mappings'
  | 'canonical-semantic-mapping'
  | 'canonical-semantic-taxonomy-entries'
  | 'canonical-semantic-taxonomy-entry'
  | 'canonical-semantic-lineage-links'
  | 'canonical-semantic-lineage-link'
  | 'pricing-bases'
  | 'pricing-basis'
  | 'pricing-rule-atoms'
  | 'pricing-rule-atom'
  | 'pricing-quotation-method-modules'
  | 'pricing-quotation-method-module'
  | 'pricing-quote-templates'
  | 'pricing-quote-template'
  | 'pricing-quotations'
  | 'pricing-quotation'
  | 'pricing-explanations'
  | 'pricing-explanation'
  | 'document-artifacts'
  | 'document-artifact'
  | 'media-assets'
  | 'media-asset'
  | 'evidence-assets'
  | 'evidence-asset'
  | 'attachment-bindings'
  | 'attachment-binding';

type BidviaCliTruthFetchCommandDefinition = {
  run: (client: BidviaClient, parsedArgs: BidviaCliParsedArgs) => Promise<unknown>;
};

type BidviaCliOnboardingActionCommand =
  | 'create-provisional-agent'
  | 'query-provisional-agent'
  | 'claim-provisional-agent';

type BidviaCliIdentitySessionCommand =
  | 'sign-up-personal'
  | 'sign-up-enterprise'
  | 'sign-in'
  | 'account-me'
  | 'select-org'
  | 'agent-self-service'
  | 'account-agent-authorization-refresh'
  | 'account-agent-external-binding'
  | 'account-agent-dispatch-authority-request'
  | 'operator-dispatch-authority-decision'
  | 'session-refresh'
  | 'session-revoke';

type BidviaCliSupportedValueFlag =
  | '--input'
  | '--provisional-agent-ref'
  | '--claim-token'
  | '--registration-id'
  | '--capability-profile-id'
  | '--participation-state-id'
  | '--task-dispatch-id'
  | '--listing-id'
  | '--integration-code'
  | '--request-id'
  | '--concept-id'
  | '--label-id'
  | '--mapping-id'
  | '--taxonomy-entry-id'
  | '--lineage-link-id'
  | '--pricing-basis-id'
  | '--pricing-rule-atom-id'
  | '--pricing-quotation-method-module-id'
  | '--pricing-quote-template-id'
  | '--pricing-quotation-id'
  | '--pricing-explanation-id'
  | '--document-artifact-id'
  | '--media-asset-id'
  | '--evidence-asset-id'
  | '--attachment-binding-id'
  | '--target-ref'
  | '--agent-id'
  | '--request-id'
  | '--registration-id'
  | '--output';

const bidviaCliSupportedValueFlags = new Set<BidviaCliSupportedValueFlag>([
  '--input',
  '--provisional-agent-ref',
  '--claim-token',
  '--registration-id',
  '--capability-profile-id',
  '--participation-state-id',
  '--task-dispatch-id',
  '--listing-id',
  '--integration-code',
  '--request-id',
  '--concept-id',
  '--label-id',
  '--mapping-id',
  '--taxonomy-entry-id',
  '--lineage-link-id',
  '--pricing-basis-id',
  '--pricing-rule-atom-id',
  '--pricing-quotation-method-module-id',
  '--pricing-quote-template-id',
  '--pricing-quotation-id',
  '--pricing-explanation-id',
  '--document-artifact-id',
  '--media-asset-id',
  '--evidence-asset-id',
  '--attachment-binding-id',
  '--target-ref',
  '--agent-id',
  '--output',
]);

const truthFetchVisibilityHelpLines = [
  '  account-agents',
  '  account-agent --agent-id ...',
  '  account-agent-dispatch-authority --agent-id ...',
  '  account-agent-closure-status --agent-id ...',
  '  account-agent-execution-status --agent-id ...',
  '  account-agent-execution-listing-status --agent-id ... --listing-id ...',
  '  account-agent-execution-materialization-status --agent-id ... --listing-id ...',
  '  account-integration-capabilities',
  '  account-agent-integration-eligibility --agent-id ... --integration-code ...',
  '  account-agent-bindings',
  '  account-records',
  '  agent-presence --registration-id ...',
  '  agent-authority --registration-id ...',
  '  agent-readiness --registration-id ...',
  '  agent-summary --registration-id ...',
  '  agent-registrations',
  '  agent-registration --registration-id ...',
  '  authority-profiles',
  '  agent-authority-profile --registration-id ...',
  '  agent-authority-ladder --registration-id ...',
  '  capability-profiles',
  '  agent-capability-profile --registration-id ...',
  '  participation-states --registration-id ...',
  '  participation-state --registration-id ... --participation-state-id ...',
  '  task-dispatches --agent-id ... [--registration-id compatibility-only]',
  '  task-dispatch --agent-id ... --task-dispatch-id ... [--registration-id compatibility-only]',
  '  governed-work-closure --agent-id ... --task-dispatch-id ... [--registration-id compatibility-only]',
  '  canonical-semantic-concepts',
  '  canonical-semantic-concept --concept-id ...',
  '  canonical-semantic-labels',
  '  canonical-semantic-label --label-id ...',
  '  canonical-semantic-mappings',
  '  canonical-semantic-mapping --mapping-id ...',
  '  pricing-bases',
  '  pricing-basis --pricing-basis-id ...',
  '  pricing-rule-atoms',
  '  pricing-rule-atom --pricing-rule-atom-id ...',
  '  pricing-quotation-method-modules',
  '  pricing-quotation-method-module --pricing-quotation-method-module-id ...',
  '  pricing-quote-templates',
  '  pricing-quote-template --pricing-quote-template-id ...',
  '  pricing-quotations',
  '  pricing-quotation --pricing-quotation-id ...',
  '  pricing-explanations',
  '  pricing-explanation --pricing-explanation-id ...',
  '  document-artifacts',
  '  document-artifact --document-artifact-id ...',
  '  media-assets',
  '  media-asset --media-asset-id ...',
  '  evidence-assets',
  '  evidence-asset --evidence-asset-id ...',
  '  attachment-bindings',
  '  attachment-binding --attachment-binding-id ...',
] as const;

const truthFetchSupportedFlagsByCommand = {
  'account-agent': ['--agent-id', '--registration-id'],
  'account-agent-dispatch-authority': ['--agent-id', '--registration-id'],
  'account-agent-closure-status': ['--agent-id', '--registration-id'],
  'account-agent-execution-status': ['--agent-id', '--registration-id'],
  'account-agent-execution-listing-status': ['--agent-id', '--registration-id', '--listing-id'],
  'account-agent-execution-materialization-status': ['--agent-id', '--registration-id', '--listing-id'],
  'account-integration-capabilities': [],
  'account-agent-integration-eligibility': ['--agent-id', '--registration-id', '--integration-code'],
  'agent-presence': ['--registration-id'],
  'agent-authority': ['--registration-id'],
  'agent-readiness': ['--registration-id'],
  'agent-summary': ['--registration-id'],
  'agent-registration': ['--registration-id'],
  'agent-authority-profile': ['--registration-id'],
  'agent-authority-ladder': ['--registration-id'],
  'capability-profiles': [],
  'agent-capability-profile': ['--registration-id', '--capability-profile-id'],
  'participation-states': ['--registration-id'],
  'participation-state': ['--registration-id', '--participation-state-id'],
  'task-dispatches': ['--agent-id', '--registration-id'],
  'task-dispatch': ['--agent-id', '--registration-id', '--task-dispatch-id'],
  'governed-work-closure': ['--agent-id', '--registration-id', '--task-dispatch-id'],
  'canonical-semantic-concept': ['--concept-id'],
  'canonical-semantic-label': ['--label-id'],
  'canonical-semantic-mapping': ['--mapping-id'],
  'canonical-semantic-taxonomy-entry': ['--taxonomy-entry-id'],
  'canonical-semantic-lineage-link': ['--lineage-link-id'],
  'pricing-basis': ['--pricing-basis-id'],
  'pricing-rule-atom': ['--pricing-rule-atom-id'],
  'pricing-quotation-method-module': ['--pricing-quotation-method-module-id'],
  'pricing-quote-template': ['--pricing-quote-template-id'],
  'pricing-quotation': ['--pricing-quotation-id'],
  'pricing-explanation': ['--pricing-explanation-id'],
  'document-artifact': ['--document-artifact-id'],
  'media-asset': ['--media-asset-id'],
  'evidence-asset': ['--evidence-asset-id'],
  'attachment-binding': ['--attachment-binding-id'],
} as const satisfies Partial<Record<string, readonly BidviaCliSupportedValueFlag[]>>;

const truthFetchRequiredFlagsByCommand = {
  'agent-presence': ['--registration-id'],
  'agent-authority': ['--registration-id'],
  'agent-readiness': ['--registration-id'],
  'agent-summary': ['--registration-id'],
  'agent-registration': ['--registration-id'],
  'agent-authority-profile': ['--registration-id'],
  'agent-authority-ladder': ['--registration-id'],
  'agent-capability-profile': ['--registration-id'],
  'participation-states': ['--registration-id'],
  'participation-state': ['--registration-id', '--participation-state-id'],
  'account-agent-execution-status': ['--agent-id'],
  'account-agent-execution-listing-status': ['--agent-id', '--listing-id'],
  'account-agent-execution-materialization-status': ['--agent-id', '--listing-id'],
  'account-agent-integration-eligibility': ['--agent-id', '--integration-code'],
  'task-dispatches': ['--agent-id'],
  'task-dispatch': ['--agent-id', '--task-dispatch-id'],
  'governed-work-closure': ['--agent-id', '--task-dispatch-id'],
  'canonical-semantic-concept': ['--concept-id'],
  'canonical-semantic-label': ['--label-id'],
  'canonical-semantic-mapping': ['--mapping-id'],
  'canonical-semantic-taxonomy-entry': ['--taxonomy-entry-id'],
  'canonical-semantic-lineage-link': ['--lineage-link-id'],
  'pricing-basis': ['--pricing-basis-id'],
  'pricing-rule-atom': ['--pricing-rule-atom-id'],
  'pricing-quotation-method-module': ['--pricing-quotation-method-module-id'],
  'pricing-quote-template': ['--pricing-quote-template-id'],
  'pricing-quotation': ['--pricing-quotation-id'],
  'pricing-explanation': ['--pricing-explanation-id'],
  'document-artifact': ['--document-artifact-id'],
  'media-asset': ['--media-asset-id'],
  'evidence-asset': ['--evidence-asset-id'],
  'attachment-binding': ['--attachment-binding-id'],
} as const satisfies Partial<Record<string, readonly BidviaCliSupportedValueFlag[]>>;

const truthFetchCollectionCommands = new Set([
  'account-agents',
  'account-agent-bindings',
  'account-records',
  'agent-registrations',
  'authority-profiles',
  'capability-profiles',
  'canonical-semantic-concepts',
  'canonical-semantic-labels',
  'canonical-semantic-mappings',
  'canonical-semantic-taxonomy-entries',
  'canonical-semantic-lineage-links',
  'pricing-bases',
  'pricing-rule-atoms',
  'pricing-quotation-method-modules',
  'pricing-quote-templates',
  'pricing-quotations',
  'pricing-explanations',
  'document-artifacts',
  'media-assets',
  'evidence-assets',
  'attachment-bindings',
]);

const canonicalAccountAgentIdentifierCommands = new Set([
  'account-agent',
  'account-agent-dispatch-authority',
  'account-agent-closure-status',
  'governed-work-closure',
  'account-agent-dispatch-authority-request',
  'account-agent-authorization-refresh',
  'account-agent-external-binding',
  'agent-self-service',
]);

const onboardingActionSupportedFlagsByCommand = {
  'create-provisional-agent': ['--provisional-agent-ref'],
  'query-provisional-agent': ['--provisional-agent-ref'],
  'claim-provisional-agent': ['--provisional-agent-ref', '--claim-token'],
} as const satisfies Record<BidviaCliOnboardingActionCommand, readonly BidviaCliSupportedValueFlag[]>;

const identitySessionSupportedFlagsByCommand = {
  'sign-up-personal': ['--input'],
  'sign-up-enterprise': ['--input'],
  'sign-in': ['--input'],
  'account-me': [],
  'select-org': ['--input'],
  'agent-self-service': ['--registration-id', '--agent-id', '--input'],
  'account-agent-authorization-refresh': ['--agent-id', '--registration-id', '--input'],
  'account-agent-external-binding': ['--agent-id', '--registration-id', '--input'],
  'account-agent-dispatch-authority-request': ['--agent-id', '--registration-id'],
  'operator-dispatch-authority-decision': ['--request-id', '--input'],
  'session-refresh': [],
  'session-revoke': [],
} as const satisfies Record<BidviaCliIdentitySessionCommand, readonly BidviaCliSupportedValueFlag[]>;

const onboardingActionRequiredContextByCommand = {
  'create-provisional-agent': ['tenantId'],
  'query-provisional-agent': ['tenantId'],
  'claim-provisional-agent': ['tenantId', 'sessionId'],
} as const satisfies Record<
  BidviaCliOnboardingActionCommand,
  readonly ('tenantId' | 'sessionId')[]
>;

const identitySessionRequiredContextByCommand = {
  'sign-up-personal': [],
  'sign-up-enterprise': [],
  'sign-in': [],
  'account-me': ['tenantId', 'sessionId'],
  'select-org': ['tenantId', 'sessionId'],
  'agent-self-service': ['tenantId', 'sessionId'],
  'account-agent-authorization-refresh': ['tenantId', 'sessionId'],
  'account-agent-external-binding': ['tenantId', 'sessionId'],
  'account-agent-dispatch-authority-request': ['tenantId', 'sessionId'],
  'operator-dispatch-authority-decision': ['tenantId', 'adminSessionId'],
  'session-refresh': ['tenantId', 'sessionId'],
  'session-revoke': ['tenantId', 'sessionId'],
} as const satisfies Record<
  BidviaCliIdentitySessionCommand,
  readonly ('tenantId' | 'sessionId' | 'adminSessionId')[]
>;

function readOnboardingResultString(
  value: unknown,
  camelKey: 'tenantId' | 'agentId' | 'principalId' | 'companyId' | 'registrationId' | 'sessionId',
  snakeKey: 'tenant_id' | 'agent_id' | 'principal_id' | 'company_id' | 'registration_id' | 'session_id',
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
): {
  value: string | null;
  source: BidviaContextValueSource;
} {
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

function buildSecretPresenceWithSource(
  envValue: string | undefined,
  localStateValue?: string,
): {
  present: boolean;
  source: BidviaContextValueSource;
} {
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

function buildEffectiveContextSnapshot(
  env: NodeJS.ProcessEnv,
  localState: BidviaLocalOnboardingState | null,
) {
  return buildSharedCliEffectiveContextSnapshot(env, localState);
}

function buildDoctorReadinessEligibility(effectiveContext: ReturnType<typeof buildEffectiveContextSnapshot>) {
  return buildIdentitySessionPlaneProgress({
    lastCompletedStep: effectiveContext.lastCompletedStep.value,
    tenantIdPresent: effectiveContext.tenantId.value !== null,
    principalIdPresent: effectiveContext.principalId.value !== null,
    registrationIdPresent: effectiveContext.registrationId.value !== null,
  }).readinessEligibility;
}

function buildDoctorReadinessContext(
  effectiveContext: ReturnType<typeof buildEffectiveContextSnapshot>,
): BidviaDoctorReadinessContext {
  return {
    tenantId: effectiveContext.tenantId.value ?? undefined,
    agentId: effectiveContext.agentId.value ?? undefined,
    principalId: effectiveContext.principalId.value ?? undefined,
    companyId: effectiveContext.companyId.value ?? undefined,
    registrationId: effectiveContext.registrationId.value ?? undefined,
  };
}

function buildOnboardingProgressSnapshot(
  effectiveContext: ReturnType<typeof buildEffectiveContextSnapshot>,
) {
  return buildIdentitySessionPlaneProgress({
    lastCompletedStep: effectiveContext.lastCompletedStep.value,
    tenantIdPresent: effectiveContext.tenantId.value !== null,
    principalIdPresent: effectiveContext.principalId.value !== null,
    registrationIdPresent: effectiveContext.registrationId.value !== null,
  });
}

function buildJourneyBoundarySnapshot(
  effectiveContext: ReturnType<typeof buildEffectiveContextSnapshot>,
) {
  const onboardingProgress = buildOnboardingProgressSnapshot(effectiveContext);

  return buildIdentitySessionPlaneJourneyBoundaryStatuses({
    publicProvisionalStatus: onboardingProgress.publicProvisionalStatus,
    governedRunStatus: onboardingProgress.governedRunStatus,
  });
}

function buildStaticFirstAccessCommandHint(command: string, rationale: string) {
  return { command, rationale };
}

function buildLocalOnboardingStateIoOptions(env: NodeJS.ProcessEnv) {
  return {
    env,
  };
}

function buildLocalOnboardingStateWriteFailure(
  command: string,
  path: string,
  error: unknown,
) {
  const normalizedError = error instanceof Error
    ? error
    : new Error(String(error));
  const errorCode = (error as NodeJS.ErrnoException | undefined)?.code;

  return buildStructuredFailure(
    command,
    'local-onboarding-state-error',
    `Failed to persist local onboarding state at ${path}.`,
    {
      details: ['local-onboarding-state'],
      localState: {
        path,
        operation: 'write',
        name: normalizedError.name,
        message: normalizedError.message,
        ...(errorCode === undefined ? {} : { code: errorCode }),
      },
    },
  );
}

async function readCliLocalOnboardingState(
  dependencies: Pick<BidviaCliDependencies, 'readLocalOnboardingState' | 'readLocalOnboardingStateWithDiagnostics'>,
) {
  if (dependencies.readLocalOnboardingStateWithDiagnostics) {
    return dependencies.readLocalOnboardingStateWithDiagnostics();
  }

  return {
    state: await dependencies.readLocalOnboardingState(),
    warnings: [],
  };
}

function buildOnboardingActionCommandHints(
  helperKeys?: readonly ('createProvisionalAgent' | 'queryProvisionalAgent' | 'claimProvisionalAgent')[],
) {
  const commandHints = listOnboardingJourneyCommandHints('public-first-onboarding');
  const matchedHints = !helperKeys
    ? commandHints
    : helperKeys.flatMap((helperKey) => commandHints.filter((hint) => hint.helperKey === helperKey));

  return matchedHints.map((hint) => ({
    command: hint.command,
    rationale: hint.rationale,
  }));
}

function buildIdentitySessionCommandHints(command: 'doctor' | 'onboard') {
  return [
    buildStaticFirstAccessCommandHint(
      'bidvia sign-in --input ...',
      'Use the bounded session support path when local continuation needs a session before the session-bound claim step.',
    ),
    buildStaticFirstAccessCommandHint(
      'bidvia sign-up-personal --input ...',
      'Create a bounded personal account only when the external user still needs prerequisite account setup before the agent-first journey can continue.',
    ),
    buildStaticFirstAccessCommandHint(
      'bidvia sign-up-enterprise --input ...',
      'Use the bounded enterprise sign-up path only when organization setup is the prerequisite blocker ahead of the primary agent journey.',
    ),
  ];
}

function buildVisibilityCommandHints(command: 'doctor' | 'onboard') {
  const hints = [
    buildStaticFirstAccessCommandHint(
      'bidvia whoami',
      'Summarize the current effective local identity without claiming authoritative platform login state.',
    ),
    buildStaticFirstAccessCommandHint(
      'bidvia context show',
      'Inspect which effective local context fields are available before deterministic CLI calls.',
    ),
    buildStaticFirstAccessCommandHint(
      'bidvia doctor',
      command === 'doctor'
        ? 'Re-run doctor after local context changes so the session-to-agent handoff stays explicit.'
        : 'Use doctor after onboard when you want the local diagnostics and readiness view before the provisional chain.',
    ),
  ];

  return hints;
}

function buildFirstAccessOnboardingSnapshot(
  effectiveContext: ReturnType<typeof buildEffectiveContextSnapshot>,
  command: 'doctor' | 'onboard',
) {
  const journey = buildIdentitySessionPlaneView().canonicalOnboarding;
  const onboardingProgress = buildOnboardingProgressSnapshot(effectiveContext);

  if (effectiveContext.tenantId.value === null) {
    const primaryJourneyHints = command === 'doctor'
      ? [
        buildStaticFirstAccessCommandHint(
          'bidvia onboard',
          'Keep the visible journey agent-first: start or rerun onboard, then use bounded account/session support only if the primary path still lacks prerequisite context.',
        ),
        ...buildVisibilityCommandHints(command),
      ]
      : buildVisibilityCommandHints(command);

    return {
      journeyKey: journey.journeyKey,
      journeyLabel: journey.label,
      currentStage: {
        key: 'missing-tenant-context',
        label: 'Public provisional entry is available, but this local CLI still needs tenant context before create/query can run deterministically against the configured API.',
        blocked: true,
        blockedOn: 'create-provisional-agent',
        lastCompletedStep: onboardingProgress.lastCompletedStep,
      },
      nextCommands: [
        ...primaryJourneyHints,
        ...buildIdentitySessionCommandHints(command),
        ...buildOnboardingActionCommandHints(),
      ],
      firstSuccessNextStep: journey.firstSuccessNextStep,
    };
  }

  if (!onboardingProgress.hasClaimCompleted) {
    return {
      journeyKey: journey.journeyKey,
      journeyLabel: journey.label,
      currentStage: {
        key: 'provisional-claim-pending',
        label: 'You are still in Public Provisional. Query can continue, but claim remains the session-bound step before Governed Run.',
        blocked: true,
        blockedOn: 'claim-provisional-agent',
        lastCompletedStep: onboardingProgress.lastCompletedStep,
      },
      nextCommands: [
        ...buildOnboardingActionCommandHints(
          onboardingProgress.hasExplicitProvisionalProgress
            ? ['queryProvisionalAgent', 'claimProvisionalAgent']
            : ['createProvisionalAgent', 'queryProvisionalAgent', 'claimProvisionalAgent'],
        ),
        buildStaticFirstAccessCommandHint(
          'bidvia whoami',
          'Confirm which effective local identity fields are available before you move from Public Provisional into Governed Run.',
        ),
        buildStaticFirstAccessCommandHint(
          'bidvia doctor',
          'Re-run doctor after claim succeeds so local diagnostics can confirm the Governed Run handoff.',
        ),
      ],
      firstSuccessNextStep: journey.firstSuccessNextStep,
    };
  }

  if (!onboardingProgress.readinessEligibility.eligible) {
    return {
      journeyKey: journey.journeyKey,
      journeyLabel: journey.label,
      currentStage: {
        key: 'claimed-awaiting-readiness-context',
        label: 'Public provisional claim is complete locally, but governed-run context is still incomplete.',
        blocked: true,
        blockedOn: 'readiness-live-check',
        lastCompletedStep: onboardingProgress.lastCompletedStep,
      },
      nextCommands: [
        buildStaticFirstAccessCommandHint(
          'bidvia whoami',
          'Confirm which effective local identity fields are still missing before governed-run reads.',
        ),
        buildStaticFirstAccessCommandHint(
          'bidvia route-context-matrix',
          'Confirm the boundary between public provisional entry and governed-run routes before remote reads.',
        ),
        buildStaticFirstAccessCommandHint(
          'bidvia doctor',
          'Re-run doctor after tenant, principal, and registration context are all available locally for governed-run checks.',
        ),
      ],
      firstSuccessNextStep: journey.firstSuccessNextStep,
    };
  }

  return {
    journeyKey: journey.journeyKey,
    journeyLabel: journey.label,
    currentStage: {
      key: 'ready-for-claimant-execution',
      label: 'Public provisional onboarding is complete locally, and claimant execution can continue from the canonical account-owned surface.',
      blocked: false,
      blockedOn: null,
      lastCompletedStep: onboardingProgress.lastCompletedStep,
    },
    nextCommands: command === 'onboard'
      ? [
        buildStaticFirstAccessCommandHint(
          'bidvia doctor',
          'Confirm local diagnostics and optional readiness checks before moving into runtime work.',
        ),
        buildStaticFirstAccessCommandHint(
          'bidvia account-agent --agent-id ...',
          'Use the canonical account-plane claimed-agent detail readback first so post-claim continuation starts from the current account-owned surface instead of older registration-bound operational packaging.',
        ),
      ]
      : [
        buildStaticFirstAccessCommandHint(
          'bidvia account-agent --agent-id ...',
          'Use the canonical account-plane claimed-agent detail readback first so post-claim continuation starts from the current account-owned surface instead of older registration-bound operational packaging.',
        ),
        buildStaticFirstAccessCommandHint(
          'bidvia doctor',
          'Re-run doctor after claimant execution changes so current account-plane truth and deeper runtime truth stay explicitly separated.',
        ),
        buildStaticFirstAccessCommandHint(
          'bidvia route-context-matrix',
          'Keep claimant execution, operator-owned continuation, and deeper proof/readback boundaries explicit before moving beyond the current account-owned package.',
        ),
      ],
    firstSuccessNextStep: journey.firstSuccessNextStep,
  };
}

function buildDoctorOnboardingSnapshot(
  effectiveContext: ReturnType<typeof buildEffectiveContextSnapshot>,
  readinessLiveCheck: {
    status: string;
    error?: {
      responseBody?: unknown;
    };
  },
) {
  const readinessErrorCode = (() => {
    const responseBody = readinessLiveCheck.error?.responseBody;
    if (!responseBody || typeof responseBody !== 'object') {
      return undefined;
    }

    const body = responseBody as Record<string, unknown>;
    if (typeof body.code === 'string') {
      return body.code;
    }

    if (body.error && typeof body.error === 'object' && body.error !== null) {
      const nestedError = body.error as Record<string, unknown>;
      if (typeof nestedError.code === 'string') {
        return nestedError.code;
      }
    }

    return undefined;
  })();

  const responseBody = readinessLiveCheck.error?.responseBody && typeof readinessLiveCheck.error.responseBody === 'object'
    ? readinessLiveCheck.error.responseBody as Record<string, unknown>
    : null;
  const authoritativePayload = responseBody && responseBody.error && typeof responseBody.error === 'object'
    ? responseBody.error as Record<string, unknown>
    : responseBody;
  const requiredActor = authoritativePayload && typeof authoritativePayload.required_actor === 'string'
    ? authoritativePayload.required_actor
    : undefined;
  const recommendedNextStep = authoritativePayload && typeof authoritativePayload.recommended_next_step === 'string'
    ? authoritativePayload.recommended_next_step
    : undefined;
  const nextStepKind = authoritativePayload && typeof authoritativePayload.next_step_kind === 'string'
    ? authoritativePayload.next_step_kind
    : undefined;
  const canSelfResolve = authoritativePayload && typeof authoritativePayload.can_self_resolve === 'boolean'
    ? authoritativePayload.can_self_resolve
    : undefined;
  const boundaryMessage = authoritativePayload && typeof authoritativePayload.boundary_message === 'string'
    ? authoritativePayload.boundary_message
    : undefined;

  if (readinessLiveCheck.status === 'failed' && readinessErrorCode === 'active_role_binding_required') {
    const resolvedClaimantContinuation = resolveCoreSuggestedClaimantContinuation(
      recommendedNextStep,
      nextStepKind,
      requiredActor,
      canSelfResolve,
    );

    if (resolvedClaimantContinuation.status === 'supported' && resolvedClaimantContinuation.continuation) {
      const continuation = resolvedClaimantContinuation.continuation;
      const nextCommands = continuation.stepKey === 'self-service-patch'
        ? [
            buildStaticFirstAccessCommandHint(
              'bidvia account-agent --agent-id ...',
              'Inspect the canonical claimed-agent account-plane state before applying the next claimant-owned continuation step.',
            ),
            buildStaticFirstAccessCommandHint(
              'bidvia agent-self-service --agent-id ... --input ...',
              'Use the canonical account-plane self-service helper when Core explicitly recommends the claimant-owned self-service continuation.',
            ),
            buildStaticFirstAccessCommandHint(
              'bidvia account-agent-dispatch-authority --agent-id ...',
              'Re-read the bounded dispatch-authority surface after self-service changes so the next review-owned boundary stays explicit.',
            ),
            buildStaticFirstAccessCommandHint(
              'bidvia doctor',
              'Re-run doctor after the claimant continuation so the same claimed handoff can be checked again against governed-read truth.',
            ),
            buildStaticFirstAccessCommandHint(
              'bidvia route-context-matrix',
              'Keep the claimant continuation, later review-owned boundaries, and governed-read verification steps explicit.',
            ),
          ]
        : [
            buildStaticFirstAccessCommandHint(
              'bidvia account-agent --agent-id ...',
              'Inspect the canonical claimed-agent account-plane state before requesting dispatch-authority continuation.',
            ),
            buildStaticFirstAccessCommandHint(
              'bidvia account-agent-dispatch-authority --agent-id ...',
              'Read the current bounded dispatch-authority state before submitting another claimant-owned request.',
            ),
            buildStaticFirstAccessCommandHint(
              'bidvia account-agent-dispatch-authority-request --agent-id ...',
              'Use the canonical claimant-owned dispatch-authority request helper when Core explicitly recommends that continuation.',
            ),
            buildStaticFirstAccessCommandHint(
              'bidvia doctor',
              'Re-run doctor after the claimant continuation so the same claimed handoff can be checked again against governed-read truth.',
            ),
            buildStaticFirstAccessCommandHint(
              'bidvia route-context-matrix',
              'Keep the claimant continuation, later review-owned boundaries, and governed-read verification steps explicit.',
            ),
          ];

      return {
        journeyKey: 'public-first-onboarding',
        journeyLabel: 'Public provisional onboarding',
        currentStage: {
          key: 'claimant-next-step-available',
          label: 'Public provisional onboarding is complete locally, and Core returned a supported claimant-owned continuation on the canonical account plane.',
          blocked: true,
          blockedOn: continuation.stepKey,
          lastCompletedStep: effectiveContext.lastCompletedStep.value,
          ...(requiredActor === undefined ? {} : { requiredActor }),
          ...(recommendedNextStep === undefined ? {} : { recommendedNextStep }),
          ...(nextStepKind === undefined ? {} : { nextStepKind }),
          ...(canSelfResolve === undefined ? {} : { canSelfResolve }),
          ...(boundaryMessage === undefined ? {} : { boundaryMessage }),
        },
        nextCommands,
        firstSuccessNextStep: buildIdentitySessionPlaneView().canonicalOnboarding.firstSuccessNextStep,
      };
    }

    if (resolvedClaimantContinuation.status === 'broken') {
      return {
        journeyKey: 'public-first-onboarding',
        journeyLabel: 'Public provisional onboarding',
        currentStage: {
          key: 'core-suggested-next-step-broken',
          label: 'Public provisional onboarding is complete locally, but the suggested claimant continuation could not be trusted as a runnable downstream path.',
          blocked: true,
          blockedOn: 'post-approval-claimant-progression',
          lastCompletedStep: effectiveContext.lastCompletedStep.value,
          ...(requiredActor === undefined ? {} : { requiredActor }),
          ...(recommendedNextStep === undefined ? {} : { recommendedNextStep }),
          ...(nextStepKind === undefined ? {} : { nextStepKind }),
          ...(canSelfResolve === undefined ? {} : { canSelfResolve }),
          ...(boundaryMessage === undefined ? {} : { boundaryMessage }),
        },
        nextCommands: [
          buildStaticFirstAccessCommandHint(
            'bidvia account-agent --agent-id ...',
            'Inspect the canonical claimed-agent continuation state first so the broken suggested next step stays evidence-backed rather than inferred.',
          ),
          buildStaticFirstAccessCommandHint(
            'bidvia route-context-matrix',
            'Confirm which canonical claimant, review-owned, and unresolved boundaries the current repo truth actually ships.',
          ),
          buildStaticFirstAccessCommandHint(
            'bidvia doctor',
            'Re-run doctor after any legitimate account-plane change so the broken suggested step can be compared against fresh evidence.',
          ),
          buildStaticFirstAccessCommandHint(
            'bidvia context show',
            'Capture the claimed local identity context that the blocked progression evidence currently depends on.',
          ),
        ],
        firstSuccessNextStep: buildIdentitySessionPlaneView().canonicalOnboarding.firstSuccessNextStep,
      };
    }

    return {
      journeyKey: 'public-first-onboarding',
      journeyLabel: 'Public provisional onboarding',
      currentStage: {
        key: 'active-role-binding-required',
        label: 'Public provisional onboarding is complete locally, but governed run is still blocked until the requested tenant has an active role binding for the current principal.',
        blocked: true,
        blockedOn: 'active-role-binding',
        lastCompletedStep: effectiveContext.lastCompletedStep.value,
        ...(requiredActor === undefined ? {} : { requiredActor }),
        ...(recommendedNextStep === undefined ? {} : { recommendedNextStep }),
        ...(nextStepKind === undefined ? {} : { nextStepKind }),
        ...(canSelfResolve === undefined ? {} : { canSelfResolve }),
        ...(boundaryMessage === undefined ? {} : { boundaryMessage }),
      },
      nextCommands: [
        buildStaticFirstAccessCommandHint(
          'bidvia select-org --input ...',
          'If account/me shows multi_org or active_org_resolution_required, select the active org context before governed-run authorization can continue.',
        ),
        buildStaticFirstAccessCommandHint(
          'bidvia account-me',
          'Confirm the current account and active org context before asking Core or Site operators to bind the acting principal to the requested tenant.',
        ),
        buildStaticFirstAccessCommandHint(
          'bidvia doctor',
          'Re-run doctor after account/session/org repair so the governed-runtime gate can be checked again against the same claimed continuation.',
        ),
        buildStaticFirstAccessCommandHint(
          'bidvia context show',
          'Confirm the claimed local identity fields that the runtime commands are about to use.',
        ),
        buildStaticFirstAccessCommandHint(
          'bidvia route-context-matrix',
          'Review which governed-read and governed-run routes stay blocked until role binding is active for this tenant.',
        ),
        buildStaticFirstAccessCommandHint(
          'bidvia account-agent --agent-id ...',
          'Stay on the canonical account-owned plane while inspecting the current claimed-agent continuation state and do not reinterpret this gate as an operator-route handoff.',
        ),
      ],
      firstSuccessNextStep: buildIdentitySessionPlaneView().canonicalOnboarding.firstSuccessNextStep,
    };
  }

  return buildFirstAccessOnboardingSnapshot(effectiveContext, 'doctor');
}

async function probeBidviaBaseUrlReachability(baseUrl: string): Promise<BidviaReachabilityProbeResult> {
  try {
    const response = await fetch(baseUrl, { method: 'HEAD' });
    return {
      reachable: true,
      statusCode: response.status,
      error: null,
    };
  } catch (error) {
    return {
      reachable: false,
      statusCode: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runDefaultDoctorReadinessCheck(
  context: BidviaDoctorReadinessContext,
  baseUrl: string,
): Promise<unknown> {
  const tenantId = context.tenantId;
  const principalId = context.principalId;
  const registrationId = context.registrationId;
  if (!tenantId || !principalId || !registrationId) {
    throw new Error('Missing registrationId for doctor readiness live check.');
  }

  const client = new BidviaClient({
    baseUrl,
    context: {
      tenantId,
      principalId,
      registrationId,
      ...(context.companyId === undefined ? {} : { companyId: context.companyId }),
    },
  });

  return client.getAgentReadiness(registrationId);
}

function normalizeDoctorReadinessFailure(error: unknown): BidviaDoctorReadinessFailure {
  if (error instanceof BidviaClientTransportError) {
    return {
      name: error.name,
      message: error.message,
      code: error.kind,
      ...(error.status === undefined ? {} : { status: error.status }),
      ...(error.responseBody === undefined ? {} : { responseBody: error.responseBody }),
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
}

function normalizeOnboardingActionTransportFailure(error: unknown) {
  if (error instanceof BidviaClientTransportError) {
    return {
      message: error.message,
      transport: {
        name: error.name,
        code: error.kind,
        ...(error.status === undefined ? {} : { status: error.status }),
        ...(error.responseBody === undefined ? {} : { responseBody: error.responseBody }),
      },
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      transport: {
        name: error.name,
      },
    };
  }

  return {
    message: String(error),
    transport: {
      name: 'UnknownError',
    },
  };
}

async function buildDoctorSnapshot(
  dependencies: Pick<
    BidviaCliDependencies,
    | 'cliVersion'
    | 'resolveBaseUrl'
    | 'resolveEnvironmentMode'
    | 'resolveProcessEnv'
    | 'readLocalOnboardingState'
    | 'readLocalOnboardingStateWithDiagnostics'
    | 'probeReachability'
    | 'runDoctorReadinessCheck'
  >,
) {
  const env = dependencies.resolveProcessEnv();
  const localStateResult = await readCliLocalOnboardingState(dependencies);
  const localState = localStateResult.state;
  const effectiveContext = buildEffectiveContextSnapshot(env, localState);
  const readinessEligibility = buildDoctorReadinessEligibility(effectiveContext);
  const baseUrl = dependencies.resolveBaseUrl();
  const reachabilityProbe = await dependencies.probeReachability(baseUrl);

  const readinessLiveCheck = readinessEligibility.eligible
    ? await (async () => {
      try {
        return {
          attempted: true,
          status: 'ok' as const,
          eligibility: readinessEligibility,
          guidance: 'Readiness live check only runs when tenantId, principalId, and registrationId are all available from env or local onboarding state.',
          result: await dependencies.runDoctorReadinessCheck(
            buildDoctorReadinessContext(effectiveContext),
            baseUrl,
          ),
        };
      } catch (error) {
        return {
          attempted: true,
          status: 'failed' as const,
          eligibility: readinessEligibility,
          guidance: 'Readiness live check only runs when tenantId, principalId, and registrationId are all available from env or local onboarding state.',
          result: null,
          error: normalizeDoctorReadinessFailure(error),
        };
      }
    })()
    : {
      attempted: false,
      status: 'not-attempted' as const,
      eligibility: readinessEligibility,
      guidance: 'Readiness live check only runs when tenantId, principalId, and registrationId are all available from env or local onboarding state.',
      result: null,
    };

  return {
    command: 'doctor',
    scope: 'local-first-read-only',
    ...(localStateResult.warnings.length === 0 ? {} : { localStateWarnings: localStateResult.warnings }),
    localChecks: {
      cliVersion: dependencies.cliVersion,
      baseUrl,
      environmentMode: dependencies.resolveEnvironmentMode(),
      localOnboardingState: {
        present: localState !== null,
      },
      effectiveContext,
      completeness: {
        readinessLiveCheckEligible: readinessEligibility.eligible,
        missingForReadinessLiveCheck: readinessEligibility.missingContext,
      },
    },
    reachability: {
      attempted: true,
      kind: 'base-url-probe',
      reachable: reachabilityProbe.reachable,
      statusCode: reachabilityProbe.statusCode,
      error: reachabilityProbe.error,
      guidance: 'Reachability only confirms that the configured endpoint answered. It does not prove login, governed auth, or route readiness.',
    },
    readinessLiveCheck,
    onboarding: buildDoctorOnboardingSnapshot(effectiveContext, readinessLiveCheck),
  };
}

async function buildContextShowSnapshot(
  env: NodeJS.ProcessEnv,
  dependencies: Pick<BidviaCliDependencies, 'readLocalOnboardingState' | 'readLocalOnboardingStateWithDiagnostics'>,
) {
  const localStateResult = await readCliLocalOnboardingState(dependencies);
  const localState = localStateResult.state;
  const effectiveContext = buildEffectiveContextSnapshot(env, localState);

  return {
    command: 'context show',
    scope: 'local-only',
    ...(localStateResult.warnings.length === 0 ? {} : { localStateWarnings: localStateResult.warnings }),
    identitySessionPlane: buildIdentitySessionPlaneCliSnapshot(),
    taskPlane: buildTaskPlaneCliSnapshot(),
    journeyBoundary: buildJourneyBoundarySnapshot(effectiveContext),
    context: effectiveContext,
  };
}

async function buildWhoamiSnapshot(
  env: NodeJS.ProcessEnv,
  dependencies: Pick<BidviaCliDependencies, 'readLocalOnboardingState' | 'readLocalOnboardingStateWithDiagnostics'>,
) {
  const localStateResult = await readCliLocalOnboardingState(dependencies);
  const localState = localStateResult.state;
  const effectiveContext = buildEffectiveContextSnapshot(env, localState);

  return {
    command: 'whoami',
    scope: 'local-only',
    ...(localStateResult.warnings.length === 0 ? {} : { localStateWarnings: localStateResult.warnings }),
    identityKind: 'effective-local-context',
    authoritativeRemoteLoginState: false,
    guidance: 'Reports effective local identity/context from env and local onboarding state only. This is not proof of platform login and does not replace /account/me.',
    identitySessionPlane: buildIdentitySessionPlaneCliSnapshot(),
    taskPlane: buildTaskPlaneCliSnapshot(),
    journeyBoundary: buildJourneyBoundarySnapshot(effectiveContext),
    identity: {
      tenantId: effectiveContext.tenantId,
      agentId: effectiveContext.agentId,
      principalId: effectiveContext.principalId,
      companyId: effectiveContext.companyId,
      registrationId: effectiveContext.registrationId,
    },
    localOnboardingState: {
      present: localState !== null,
      lastCompletedStep: effectiveContext.lastCompletedStep,
    },
    secretSafeSignals: {
      sessionId: effectiveContext.sessionId,
      adminSessionId: effectiveContext.adminSessionId,
    },
  };
}

async function buildOnboardSnapshot(
  env: NodeJS.ProcessEnv,
  dependencies: Pick<BidviaCliDependencies, 'readLocalOnboardingState' | 'readLocalOnboardingStateWithDiagnostics'>,
) {
  const localStateResult = await readCliLocalOnboardingState(dependencies);
  const localState = localStateResult.state;
  const effectiveContext = buildEffectiveContextSnapshot(env, localState);

  return {
    command: 'onboard',
    scope: 'local-first-guided',
    mode: 'non-interactive',
    rerunnable: true,
    ...(localStateResult.warnings.length === 0 ? {} : { localStateWarnings: localStateResult.warnings }),
    localOnboardingState: {
      present: localState !== null,
    },
    effectiveContext,
    onboarding: buildFirstAccessOnboardingSnapshot(effectiveContext, 'onboard'),
  };
}

function parseCliJsonInput(command: string, input: string | undefined): Record<string, unknown> {
  if (!input) {
    throw new Error(`Missing required --input for ${command}.`);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error(`Invalid JSON supplied to --input for ${command}.`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`The --input value for ${command} must be a JSON object.`);
  }

  return parsed as Record<string, unknown>;
}

function readRequiredStringInput(command: string, input: Record<string, unknown>, key: string): string {
  const value = input[key];

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required ${key} in --input for ${command}.`);
  }

  return value;
}

function readCanonicalAccountAgentId(command: string, parsedArgs: BidviaCliParsedArgs): string {
  const agentId = parsedArgs.flagValues['--agent-id'] ?? parsedArgs.flagValues['--registration-id'];
  if (!agentId) {
    throw new Error(`Missing required --agent-id for ${command}.`);
  }

  return agentId;
}

const onboardingActionCommandDefinitions = {
  'create-provisional-agent': {
    helperKey: 'createProvisionalAgent',
    run: (client, parsedArgs, now) => client.createProvisionalAgent({
      provisionalAgentRef: parsedArgs.flagValues['--provisional-agent-ref']!,
      now,
    }),
  },
  'query-provisional-agent': {
    helperKey: 'queryProvisionalAgent',
    run: (client, parsedArgs) => client.queryProvisionalAgent({
      provisionalAgentRef: parsedArgs.flagValues['--provisional-agent-ref']!,
    }),
  },
  'claim-provisional-agent': {
    helperKey: 'claimProvisionalAgent',
    run: (client, parsedArgs, now) => client.claimProvisionalAgent({
        provisionalAgentRef: parsedArgs.flagValues['--provisional-agent-ref']!,
        claimToken: parsedArgs.flagValues['--claim-token']!,
        now,
      }),
  },
} as const satisfies Record<
  BidviaCliOnboardingActionCommand,
  {
    helperKey: string;
    run: (
      client: BidviaClient,
      parsedArgs: BidviaCliParsedArgs,
      now: string,
    ) => Promise<unknown>;
  }
>;

const identitySessionCommandDefinitions = {
  'sign-up-personal': {
    helperKey: 'signUpPersonalAccount',
    run: (client, parsedArgs) => {
      const input = parseCliJsonInput('sign-up-personal', parsedArgs.input);
      return client.signUpPersonalAccount({
        email: readRequiredStringInput('sign-up-personal', input, 'email'),
        password: readRequiredStringInput('sign-up-personal', input, 'password'),
        invitationToken: readRequiredStringInput('sign-up-personal', input, 'invitationToken'),
        displayName: readRequiredStringInput('sign-up-personal', input, 'displayName'),
        now: readRequiredStringInput('sign-up-personal', input, 'now'),
      });
    },
  },
  'sign-up-enterprise': {
    helperKey: 'signUpEnterpriseAccount',
    run: (client, parsedArgs) => {
      const input = parseCliJsonInput('sign-up-enterprise', parsedArgs.input);
      return client.signUpEnterpriseAccount({
        email: readRequiredStringInput('sign-up-enterprise', input, 'email'),
        password: readRequiredStringInput('sign-up-enterprise', input, 'password'),
        invitationToken: readRequiredStringInput('sign-up-enterprise', input, 'invitationToken'),
        companyName: readRequiredStringInput('sign-up-enterprise', input, 'companyName'),
        now: readRequiredStringInput('sign-up-enterprise', input, 'now'),
      });
    },
  },
  'sign-in': {
    helperKey: 'signIn',
    run: (client, parsedArgs) => {
      const input = parseCliJsonInput('sign-in', parsedArgs.input);
      return client.signIn({
        email: readRequiredStringInput('sign-in', input, 'email'),
        password: readRequiredStringInput('sign-in', input, 'password'),
        now: readRequiredStringInput('sign-in', input, 'now'),
      });
    },
  },
  'account-me': {
    helperKey: 'getAccountMe',
    run: (client) => client.getAccountMe(),
  },
  'select-org': {
    helperKey: 'selectOrg',
    run: (client, parsedArgs) => {
      const input = parseCliJsonInput('select-org', parsedArgs.input);
      return client.selectOrg({
        orgId: readRequiredStringInput('select-org', input, 'orgId'),
      });
    },
  },
  'agent-self-service': {
    helperKey: 'patchAgentSelfService',
    run: async (client, parsedArgs) => {
      const input = parseCliJsonInput('agent-self-service', parsedArgs.input);
      const agentId = readCanonicalAccountAgentId('agent-self-service', parsedArgs);
      if (input.participationState !== undefined) {
        const claimedAgent = await client.getAccountAgent(agentId);
        const writableParticipationStates = claimedAgent
          && typeof claimedAgent === 'object'
          && 'governance_boundary' in (claimedAgent as Record<string, unknown>)
          && typeof (claimedAgent as Record<string, unknown>).governance_boundary === 'object'
          && (claimedAgent as { governance_boundary: Record<string, unknown> }).governance_boundary !== null
          && 'writable_participation_states' in (claimedAgent as { governance_boundary: Record<string, unknown> }).governance_boundary
          && Array.isArray((claimedAgent as { governance_boundary: Record<string, unknown> }).governance_boundary.writable_participation_states)
          ? (claimedAgent as { governance_boundary: { writable_participation_states: string[] } }).governance_boundary.writable_participation_states
          : undefined;
        if (writableParticipationStates && !writableParticipationStates.includes((input.participationState as { state: string }).state)) {
          throw new Error(`participationState.state is not currently writable through bounded self-service for this claimed agent|${writableParticipationStates.join(',')}`);
        }
      }
      return client.patchAgentSelfService(agentId, {
        now: readRequiredStringInput('agent-self-service', input, 'now'),
        ...(input.selfDescription === undefined ? {} : { selfDescription: input.selfDescription as string }),
        ...(input.capabilityProfile === undefined ? {} : { capabilityProfile: input.capabilityProfile as Record<string, unknown> }),
        ...(input.taskDispatchAcceptance === undefined
          ? {}
          : { taskDispatchAcceptance: input.taskDispatchAcceptance as { acceptsTaskDispatches?: boolean; acceptedTaskDispatchScopes?: string[] } }),
        ...(input.participationState === undefined
          ? {}
          : { participationState: input.participationState as { state: string; reason?: string } }),
      });
    },
  },
  'account-agent-authorization-refresh': {
    helperKey: 'refreshAccountAgentAuthorization',
    run: (client, parsedArgs) => {
      const input = parseCliJsonInput('account-agent-authorization-refresh', parsedArgs.input);
      return client.refreshAccountAgentAuthorization(
        readCanonicalAccountAgentId('account-agent-authorization-refresh', parsedArgs),
        {
          now: readRequiredStringInput('account-agent-authorization-refresh', input, 'now'),
        },
      );
    },
  },
  'account-agent-external-binding': {
    helperKey: 'createAccountAgentExternalBinding',
    run: (client, parsedArgs) => {
      const input = parseCliJsonInput('account-agent-external-binding', parsedArgs.input);
      return client.createAccountAgentExternalBinding(
        readCanonicalAccountAgentId('account-agent-external-binding', parsedArgs),
        {
          systemType: readRequiredStringInput('account-agent-external-binding', input, 'systemType'),
          systemName: readRequiredStringInput('account-agent-external-binding', input, 'systemName'),
          externalAccountRef: readRequiredStringInput('account-agent-external-binding', input, 'externalAccountRef'),
          now: readRequiredStringInput('account-agent-external-binding', input, 'now'),
        },
      );
    },
  },
  'account-agent-dispatch-authority-request': {
    helperKey: 'createAccountAgentDispatchAuthorityRequest',
    run: (client, parsedArgs, now) => client.createAccountAgentDispatchAuthorityRequest(
      readCanonicalAccountAgentId('account-agent-dispatch-authority-request', parsedArgs),
      { now },
    ),
  },
  'operator-dispatch-authority-decision': {
    helperKey: 'decideDispatchAuthorityRequest',
    run: (client, parsedArgs) => {
      const requestId = parsedArgs.flagValues['--request-id'];
      if (!requestId) {
        throw new Error('Missing required --request-id for operator-dispatch-authority-decision.');
      }

      const input = parseCliJsonInput('operator-dispatch-authority-decision', parsedArgs.input);
      return client.decideDispatchAuthorityRequest(requestId, {
        decision: readRequiredStringInput('operator-dispatch-authority-decision', input, 'decision'),
        resolutionReason: readRequiredStringInput('operator-dispatch-authority-decision', input, 'resolutionReason'),
        now: readRequiredStringInput('operator-dispatch-authority-decision', input, 'now'),
      });
    },
  },
  'session-refresh': {
    helperKey: 'refreshSession',
    run: (client) => client.refreshSession(),
  },
  'session-revoke': {
    helperKey: 'revokeSession',
    run: (client) => client.revokeSession(),
  },
} as const satisfies Record<
  BidviaCliIdentitySessionCommand,
  {
    helperKey: string;
    run: (
      client: BidviaClient,
      parsedArgs: BidviaCliParsedArgs,
      now: string,
    ) => Promise<unknown>;
  }
>;

function buildOnboardingActionExecutionContext(
  command: BidviaCliOnboardingActionCommand,
  env: NodeJS.ProcessEnv,
  localState: BidviaLocalOnboardingState | null,
  effectiveContext: ReturnType<typeof buildEffectiveContextSnapshot>,
) {
  return buildSharedCliOnboardingActionExecutionContext(command, env, localState, effectiveContext);
}

function buildIdentitySessionExecutionContext(
  env: NodeJS.ProcessEnv,
  localState: BidviaLocalOnboardingState | null,
  effectiveContext: ReturnType<typeof buildEffectiveContextSnapshot>,
) {
  return {
    tenantId: effectiveContext.tenantId.value ?? undefined,
    agentId: effectiveContext.agentId.value ?? undefined,
    principalId: undefined,
    companyId: effectiveContext.companyId.value ?? undefined,
    registrationId: undefined,
    sessionId: readEffectiveSessionId(env, localState),
    adminSessionId: readNonEmptyEnvValue(env, 'BIDVIA_ADMIN_SESSION_ID'),
  };
}

function buildTruthFetchExecutionContext(
  env: NodeJS.ProcessEnv,
  localState: BidviaLocalOnboardingState | null,
  effectiveContext: ReturnType<typeof buildEffectiveContextSnapshot>,
) {
  return {
    tenantId: effectiveContext.tenantId.value ?? undefined,
    agentId: effectiveContext.agentId.value ?? undefined,
    principalId: effectiveContext.principalId.value ?? undefined,
    companyId: effectiveContext.companyId.value ?? undefined,
    registrationId: effectiveContext.registrationId.value ?? undefined,
    sessionId: readEffectiveSessionId(env, localState),
  };
}

function buildPersistedIdentitySessionState(
  command: BidviaCliIdentitySessionCommand,
  result: unknown,
  existingState: BidviaLocalOnboardingState | null,
  executionContext: ReturnType<typeof buildIdentitySessionExecutionContext>,
  now: string,
) {
  const sessionRecord = (result && typeof result === 'object' && 'session' in (result as Record<string, unknown>))
    ? (result as Record<string, unknown>).session as Record<string, unknown> | undefined
    : undefined;
  const preserveExistingClaimedContext = command === 'agent-self-service'
    || command === 'account-agent-authorization-refresh'
    || command === 'account-agent-external-binding'
    || command === 'account-me'
    || command === 'select-org'
    || command === 'session-refresh'
    || command === 'account-agent-dispatch-authority-request';
  const tenantId = readOnboardingResultString(result, 'tenantId', 'tenant_id')
    ?? readOnboardingResultString(sessionRecord, 'tenantId', 'tenant_id')
    ?? executionContext.tenantId
    ?? existingState?.tenantId;
  const agentId = readOnboardingResultString(result, 'agentId', 'agent_id')
    ?? readOnboardingRegistrationResultString(result, 'agentId', ['agent_id'])
    ?? (preserveExistingClaimedContext ? existingState?.agentId : undefined);
  const principalId = readOnboardingResultString(result, 'principalId', 'principal_id')
    ?? readOnboardingRegistrationResultString(result, 'principalId', ['principal_id'])
    ?? (preserveExistingClaimedContext ? existingState?.principalId : undefined);
  const companyId = readOnboardingResultString(result, 'companyId', 'company_id')
    ?? readOnboardingRegistrationResultString(result, 'companyId', ['company_id'])
    ?? (preserveExistingClaimedContext ? existingState?.companyId : undefined);
  const registrationId = readOnboardingResultString(result, 'registrationId', 'registration_id')
    ?? readOnboardingRegistrationResultString(result, 'registrationId', ['agent_registration_id', 'registration_id'])
    ?? (preserveExistingClaimedContext ? existingState?.registrationId : undefined);
  const sessionId = command === 'session-revoke'
    ? undefined
    : readOnboardingResultString(result, 'sessionId', 'session_id')
      ?? readOnboardingResultString(sessionRecord, 'sessionId', 'session_id')
      ?? executionContext.sessionId
      ?? existingState?.sessionId;

  return {
    ...(tenantId === undefined ? {} : { tenantId }),
    ...(agentId === undefined ? {} : { agentId }),
    ...(principalId === undefined ? {} : { principalId }),
    ...(companyId === undefined ? {} : { companyId }),
    ...(registrationId === undefined ? {} : { registrationId }),
    ...(sessionId === undefined ? {} : { sessionId }),
    lastCompletedStep: command,
    createdAt: existingState?.createdAt ?? now,
    updatedAt: now,
  };
}

function buildPersistedOnboardingActionState(
  command: BidviaCliOnboardingActionCommand,
  result: unknown,
  existingState: BidviaLocalOnboardingState | null,
  effectiveContext: ReturnType<typeof buildEffectiveContextSnapshot>,
  executionContext: ReturnType<typeof buildOnboardingActionExecutionContext>,
  now: string,
) {
  return buildSharedCliPersistedOnboardingActionState(
    command,
    result,
    existingState,
    effectiveContext,
    executionContext,
    now,
  );
}

const truthFetchCommandDefinitions: Record<BidviaCliTruthFetchCommand, BidviaCliTruthFetchCommandDefinition> = {
  'account-agents': {
    run: (client) => client.listAccountAgents(),
  },
  'account-agent': {
    run: (client, parsedArgs) => client.getAccountAgent(readCanonicalAccountAgentId('account-agent', parsedArgs)),
  },
  'account-agent-dispatch-authority': {
    run: (client, parsedArgs) => client.getAccountAgentDispatchAuthority(
      readCanonicalAccountAgentId('account-agent-dispatch-authority', parsedArgs),
    ),
  },
  'account-agent-closure-status': {
    run: (client, parsedArgs) => client.getAccountAgentClosureStatus(
      readCanonicalAccountAgentId('account-agent-closure-status', parsedArgs),
    ),
  },
  'account-agent-execution-status': {
    run: (client, parsedArgs) => client.getAccountAgentExecutionStatus(
      readCanonicalAccountAgentId('account-agent-execution-status', parsedArgs),
    ),
  },
  'account-agent-execution-listing-status': {
    run: (client, parsedArgs) => client.getAccountAgentExecutionListingStatus(
      readCanonicalAccountAgentId('account-agent-execution-listing-status', parsedArgs),
      parsedArgs.flagValues['--listing-id']!,
    ),
  },
  'account-agent-execution-materialization-status': {
    run: (client, parsedArgs) => client.getAccountAgentExecutionListingMaterializationStatus(
      readCanonicalAccountAgentId('account-agent-execution-materialization-status', parsedArgs),
      parsedArgs.flagValues['--listing-id']!,
    ),
  },
  'account-integration-capabilities': {
    run: (client) => client.listAccountIntegrationCapabilities(),
  },
  'account-agent-integration-eligibility': {
    run: (client, parsedArgs) => client.getAccountAgentIntegrationEligibility(
      readCanonicalAccountAgentId('account-agent-integration-eligibility', parsedArgs),
      parsedArgs.flagValues['--integration-code']!,
    ),
  },
  'account-agent-bindings': {
    run: (client) => client.listAccountAgentBindings(),
  },
  'account-records': {
    run: (client) => client.listAccountRecords(),
  },
  'agent-presence': {
    run: (client, parsedArgs) => client.getAgentPresence(parsedArgs.flagValues['--registration-id']!),
  },
  'agent-authority': {
    run: (client, parsedArgs) => client.getAgentAuthority(parsedArgs.flagValues['--registration-id']!),
  },
  'agent-readiness': {
    run: (client, parsedArgs) => client.getAgentReadiness(parsedArgs.flagValues['--registration-id']!),
  },
  'agent-summary': {
    run: (client, parsedArgs) => client.getAgentSummary(parsedArgs.flagValues['--registration-id']!),
  },
  'agent-registrations': {
    run: (client) => client.listAgentRegistrations(),
  },
  'agent-registration': {
    run: (client, parsedArgs) => client.getAgentRegistration(parsedArgs.flagValues['--registration-id']!),
  },
  'authority-profiles': {
    run: (client) => client.listAuthorityProfiles(),
  },
  'agent-authority-profile': {
    run: (client, parsedArgs) => client.getAgentAuthorityProfile(parsedArgs.flagValues['--registration-id']!),
  },
  'agent-authority-ladder': {
    run: (client, parsedArgs) => client.getAgentAuthorityLadder(parsedArgs.flagValues['--registration-id']!),
  },
  'capability-profiles': {
    run: (client) => client.listCapabilityProfiles(),
  },
  'agent-capability-profile': {
    run: (client, parsedArgs) => {
      const capabilityProfileId = parsedArgs.flagValues['--capability-profile-id'];
      return capabilityProfileId
        ? client.getAgentCapabilityProfile(parsedArgs.flagValues['--registration-id']!, capabilityProfileId)
        : client.getAgentCapabilityProfile(parsedArgs.flagValues['--registration-id']!);
    },
  },
  'participation-states': {
    run: (client, parsedArgs) => client.listParticipationStates(parsedArgs.flagValues['--registration-id']!),
  },
  'participation-state': {
    run: (client, parsedArgs) => client.getParticipationState(
      parsedArgs.flagValues['--registration-id']!,
      parsedArgs.flagValues['--participation-state-id']!,
    ),
  },
  'task-dispatches': {
    run: (client, parsedArgs) => client.listTaskDispatches(readCanonicalAccountAgentId('task-dispatches', parsedArgs)),
  },
  'task-dispatch': {
    run: (client, parsedArgs) => client.getTaskDispatch(
      readCanonicalAccountAgentId('task-dispatch', parsedArgs),
      parsedArgs.flagValues['--task-dispatch-id']!,
    ),
  },
  'governed-work-closure': {
    run: (client, parsedArgs) => client.getAccountAgentGovernedWorkClosure(
      readCanonicalAccountAgentId('governed-work-closure', parsedArgs),
      parsedArgs.flagValues['--task-dispatch-id']!,
    ),
  },
  'canonical-semantic-concepts': {
    run: (client) => client.listCanonicalSemanticConcepts(),
  },
  'canonical-semantic-concept': {
    run: (client, parsedArgs) => client.getCanonicalSemanticConcept(parsedArgs.flagValues['--concept-id']!),
  },
  'canonical-semantic-labels': {
    run: (client) => client.listCanonicalSemanticLabels(),
  },
  'canonical-semantic-label': {
    run: (client, parsedArgs) => client.getCanonicalSemanticLabel(parsedArgs.flagValues['--label-id']!),
  },
  'canonical-semantic-mappings': {
    run: (client) => client.listCanonicalSemanticMappings(),
  },
  'canonical-semantic-mapping': {
    run: (client, parsedArgs) => client.getCanonicalSemanticMapping(parsedArgs.flagValues['--mapping-id']!),
  },
  'canonical-semantic-taxonomy-entries': {
    run: (client) => client.listCanonicalSemanticTaxonomyEntries(),
  },
  'canonical-semantic-taxonomy-entry': {
    run: (client, parsedArgs) => client.getCanonicalSemanticTaxonomyEntry(
      parsedArgs.flagValues['--taxonomy-entry-id']!,
    ),
  },
  'canonical-semantic-lineage-links': {
    run: (client) => client.listCanonicalSemanticLineageLinks(),
  },
  'canonical-semantic-lineage-link': {
    run: (client, parsedArgs) => client.getCanonicalSemanticLineageLink(
      parsedArgs.flagValues['--lineage-link-id']!,
    ),
  },
  'pricing-bases': {
    run: (client) => client.listPricingBases(),
  },
  'pricing-basis': {
    run: (client, parsedArgs) => client.getPricingBasis(parsedArgs.flagValues['--pricing-basis-id']!),
  },
  'pricing-rule-atoms': {
    run: (client) => client.listPricingRuleAtoms(),
  },
  'pricing-rule-atom': {
    run: (client, parsedArgs) => client.getPricingRuleAtom(parsedArgs.flagValues['--pricing-rule-atom-id']!),
  },
  'pricing-quotation-method-modules': {
    run: (client) => client.listPricingQuotationMethodModules(),
  },
  'pricing-quotation-method-module': {
    run: (client, parsedArgs) => client.getPricingQuotationMethodModule(
      parsedArgs.flagValues['--pricing-quotation-method-module-id']!,
    ),
  },
  'pricing-quote-templates': {
    run: (client) => client.listPricingQuoteTemplates(),
  },
  'pricing-quote-template': {
    run: (client, parsedArgs) => client.getPricingQuoteTemplate(
      parsedArgs.flagValues['--pricing-quote-template-id']!,
    ),
  },
  'pricing-quotations': {
    run: (client) => client.listPricingQuotations(),
  },
  'pricing-quotation': {
    run: (client, parsedArgs) => client.getPricingQuotation(
      parsedArgs.flagValues['--pricing-quotation-id']!,
    ),
  },
  'pricing-explanations': {
    run: (client) => client.listPricingExplanations(),
  },
  'pricing-explanation': {
    run: (client, parsedArgs) => client.getPricingExplanation(
      parsedArgs.flagValues['--pricing-explanation-id']!,
    ),
  },
  'document-artifacts': {
    run: (client) => client.listDocumentArtifacts(),
  },
  'document-artifact': {
    run: (client, parsedArgs) => client.getDocumentArtifact(parsedArgs.flagValues['--document-artifact-id']!),
  },
  'media-assets': {
    run: (client) => client.listMediaAssets(),
  },
  'media-asset': {
    run: (client, parsedArgs) => client.getMediaAsset(parsedArgs.flagValues['--media-asset-id']!),
  },
  'evidence-assets': {
    run: (client) => client.listEvidenceAssets(),
  },
  'evidence-asset': {
    run: (client, parsedArgs) => client.getEvidenceAsset(parsedArgs.flagValues['--evidence-asset-id']!),
  },
  'attachment-bindings': {
    run: (client) => client.listAttachmentBindings(),
  },
  'attachment-binding': {
    run: (client, parsedArgs) => client.getAttachmentBinding(parsedArgs.flagValues['--attachment-binding-id']!),
  },
};

function getSupportedValueFlagsForCommand(command: string): readonly BidviaCliSupportedValueFlag[] {
  const onboardingActionSupportedFlags = onboardingActionSupportedFlagsByCommand[
    command as BidviaCliOnboardingActionCommand
  ];
  if (onboardingActionSupportedFlags) {
    return onboardingActionSupportedFlags;
  }

  if (command === 'openclaw-bundle-export') {
    return ['--output'];
  }

  if (command === 'verification-bundle-preview' || command === 'verification-bundle-export') {
    return ['--input'];
  }

  if (command === 'industry-universe-execution') {
    return ['--input'];
  }

  const identitySessionSupportedFlags = identitySessionSupportedFlagsByCommand[
    command as BidviaCliIdentitySessionCommand
  ];
  if (identitySessionSupportedFlags) {
    return identitySessionSupportedFlags;
  }

  const supportedFlags = truthFetchSupportedFlagsByCommand[command as keyof typeof truthFetchSupportedFlagsByCommand];
  if (supportedFlags) {
    return supportedFlags;
  }

  if (truthFetchCollectionCommands.has(command)) {
    return [];
  }

  return [];
}

const verificationBundleInputValues = [
  'registration-lifecycle',
  'registered-agent-operations',
] as const;

type BidviaVerificationBundleInput = typeof verificationBundleInputValues[number];

function parseCliArgs(argv: string[]): BidviaCliParsedArgs {
  const normalizedArgv = argv[0] === 'context' && argv[1] === 'show'
    ? ['context show', ...argv.slice(2)]
    : argv;

  if (normalizedArgv.length === 0) {
    return {
      command: 'help',
      dryRun: false,
      flagValues: {},
      unknownFlags: [],
      extraPositionals: [],
      missingValueFlags: [],
    };
  }

  const firstToken = normalizedArgv[0];
  if (firstToken === '--help' || firstToken === '-h') {
    return {
      command: 'help',
      dryRun: false,
      flagValues: {},
      unknownFlags: [],
      extraPositionals: [],
      missingValueFlags: [],
    };
  }

  const command = firstToken ?? 'help';
  let dryRun = false;
  let input: string | undefined;
  const flagValues: Partial<Record<BidviaCliSupportedValueFlag, string>> = {};
  const unknownFlags: string[] = [];
  const extraPositionals: string[] = [];
  const missingValueFlags: BidviaCliSupportedValueFlag[] = [];

  for (let index = 1; index < normalizedArgv.length; index += 1) {
    const token = normalizedArgv[index]!;

    if (token === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (bidviaCliSupportedValueFlags.has(token as BidviaCliSupportedValueFlag)) {
      const nextToken = normalizedArgv[index + 1];
      if (!nextToken || nextToken.startsWith('--')) {
        missingValueFlags.push(token as BidviaCliSupportedValueFlag);
        continue;
      }

      flagValues[token as BidviaCliSupportedValueFlag] = nextToken;
      if (token === '--input') {
        input = nextToken;
      }
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
    flagValues,
    unknownFlags,
    extraPositionals,
    missingValueFlags,
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

function parseIndustryUniverseCliScenarioInput(input: string | undefined) {
  return parseCliJsonInput('industry-universe-execution', input);
}

export interface BidviaCliDependencies {
  createClient: (env?: NodeJS.ProcessEnv, contextOverride?: Partial<BidviaClientContext>) => BidviaClient;
  cliVersion: string;
  resolveExecutionContext: () => {
    tenantId?: string;
    principalId?: string;
    principalType?: string;
    authorizedRole?: string;
    registrationId?: string;
    sessionId?: string;
    adminSessionId?: string;
    companyId?: string;
  };
  resolveBaseUrl: () => string;
  resolveProcessEnv: () => NodeJS.ProcessEnv;
  resolveEnvironmentMode: () => ReturnType<typeof resolveBidviaEnvironmentModeFromEnv>;
  readLocalOnboardingState: () => Promise<BidviaLocalOnboardingState | null>;
  readLocalOnboardingStateWithDiagnostics?: () => Promise<{
    state: BidviaLocalOnboardingState | null;
    warnings: BidviaLocalOnboardingStateWarning[];
  }>;
  probeReachability: (baseUrl: string) => Promise<BidviaReachabilityProbeResult>;
  runDoctorReadinessCheck: (
    context: BidviaDoctorReadinessContext,
    baseUrl: string,
  ) => Promise<unknown>;
  now: () => string;
  printJson: (value: unknown) => void;
  printLine: (value: string) => void;
  printError: (value: string) => void;
  runLocalMcpServer: () => void;
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
    cliVersion: packageJson.version,
    resolveExecutionContext: () => {
      const env = process.env;

      return {
        tenantId: env.BIDVIA_TENANT_ID,
        agentId: env.BIDVIA_AGENT_ID,
        principalId: env.BIDVIA_PRINCIPAL_ID,
        principalType: env.BIDVIA_PRINCIPAL_TYPE,
        authorizedRole: env.BIDVIA_AUTHORIZED_ROLE,
        registrationId: env.BIDVIA_REGISTRATION_ID,
        sessionId: env.BIDVIA_SESSION_ID,
        adminSessionId: env.BIDVIA_ADMIN_SESSION_ID,
        companyId: env.BIDVIA_COMPANY_ID,
      };
    },
    resolveBaseUrl: resolveBidviaBaseUrlFromEnv,
    resolveProcessEnv: () => process.env,
    resolveEnvironmentMode: resolveBidviaEnvironmentModeFromEnv,
    readLocalOnboardingState: () => readLocalOnboardingState(),
    readLocalOnboardingStateWithDiagnostics: () => readLocalOnboardingStateWithDiagnostics(),
    probeReachability: probeBidviaBaseUrlReachability,
    runDoctorReadinessCheck: runDefaultDoctorReadinessCheck,
    now: () => new Date().toISOString(),
    printJson,
    printLine: (value) => {
      console.log(value);
    },
    printError: (value) => {
      console.error(value);
    },
    runLocalMcpServer: runLocalMcpServerMain,
    executionCommands: defaultExecutionCommands,
  };
}

function printHelp(printLine: (value: string) => void): void {
  printLine('bidvia');
  printLine('OpenClaw primary path: export stdio MCP config first, then add the companion bundle when you want bundle/bootstrap packaging.');
  printLine('OpenClaw scope for this version: local-first, Core-truth-consuming, stdio MCP primary.');
  printLine('Stage 1 client runtime is complete locally: CLI and MCP execution share one runtime core and local accumulation layer.');
  printLine('Getting Started (Agent-first Learn):');
  printLine('  onboard');
  printLine('  whoami');
  printLine('  context show');
  printLine('  doctor');
  printLine('  onboarding-readiness');
  printLine('Prerequisite Account / Session Support:');
  printLine('  sign-in --input ...');
  printLine('  sign-up-personal --input ...');
  printLine('  sign-up-enterprise --input ...');
  printLine('  account-me');
  printLine('  select-org --input ...');
  printLine('  agent-self-service --agent-id ... --input ...');
  printLine('  account-agent-dispatch-authority-request --agent-id ...');
  printLine('  session-refresh');
  printLine('  session-revoke');
  printLine('Advanced Integration (OpenClaw / Companion Bundle):');
  printLine('  openclaw-mcp-config');
  printLine('  openclaw-bundle-export --output ...');
  printLine('Agent Onboarding (Public Provisional -> Claim):');
  printLine('  create-provisional-agent --provisional-agent-ref ...');
  printLine('  query-provisional-agent --provisional-agent-ref ...');
  printLine('  claim-provisional-agent --provisional-agent-ref ... --claim-token ...');
  printLine('Agent Runtime (Run):');
  printLine('  route-context-matrix');
  printLine('  registration-lifecycle-plan');
  printLine('  registered-agent-operations-plan');
  printLine('  mcp-server');
  printLine('  industry-universe-execution --input ...');
  printLine('  heartbeat [--dry-run]');
  printLine('  sync-upload [--dry-run]');
  printLine('  evidence [--dry-run]');
  printLine('  proposal [--dry-run]');
  printLine('Diagnostics:');
  printLine('  environment-mode');
  printLine('  runtime-capabilities');
  printLine('  launch-topology-smoke');
  printLine('  server-capabilities');
  printLine('  operator-discovery');
  printLine('Advanced Governance / Internal Review:');
  for (const line of truthFetchVisibilityHelpLines) {
    printLine(line);
  }
  printLine('  industry-universe-plan');
  printLine('  industry-universe-review-packet-preview');
  printLine('  industry-universe-review-packet-export');
  printLine('  connection-approval-plan');
  printLine('  connection-approval-review-packet-preview');
  printLine('  connection-approval-review-packet-export');
  printLine('  opportunity-package-handoff-plan');
  printLine('  opportunity-package-handoff-review-packet-preview');
  printLine('  opportunity-package-handoff-review-packet-export');
  printLine('  multi-business-chain-verification-wave-preview');
  printLine('  commercial-action-verification-wave-preview');
  printLine('  verification-bundle-preview [--input registration-lifecycle|registered-agent-operations]');
  printLine('  verification-bundle-export [--input registration-lifecycle|registered-agent-operations]');
}

function buildOperatorDiscoverySnapshot() {
  const planeAdoption = listCorePlaneAdoptionStatuses();
  const enterpriseIntegrationPlane = buildEnterpriseIntegrationPlaneCliSnapshot();
  const enterpriseIntegrationDiscovery = buildEnterpriseIntegrationDiscoverySnapshot();

  return {
    command: 'operator-discovery',
    scope: 'local-only',
    cli: {
      routeCapabilities: buildLocalRouteCapabilityCatalog(),
      planeAdoption: planeAdoption.map((status): BidviaCorePlaneAdoptionStatus => ({
        ...status,
        notes: [...status.notes],
      })),
      corePayloadContractMatrix: listCorePayloadContractMatrixEntries(),
      planeExecutionGates: listPlaneExecutionGates(),
      releaseGate: buildStage3ReleaseGate(),
      enterpriseIntegrationPlane,
      enterpriseIntegrationDiscovery,
      nextStageReadRouteDiscoveryGroups: bidviaNextStageReadRouteDiscoveryGroups.map((group) => ({
        groupKey: group.groupKey,
        label: group.label,
        discoveryStatus: group.discoveryStatus,
        discoveryOnly: group.discoveryOnly,
        serverTruthClaimed: group.serverTruthClaimed,
        memberCount: group.members.length,
      })),
      nextStepHints: buildRouteContextMatrixNextStepHints(),
      executionGuidance: buildExecutionGuidanceEntries(),
      discoveryCatalog: buildLocalDiscoveryCatalog(),
    },
    mcp: buildLocalMcpProductizationSnapshot(),
  };
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
  if (!overrides.createClient) {
    dependencies.createClient = (env?: NodeJS.ProcessEnv, contextOverride?: Partial<BidviaClientContext>) => createClient(
      env ?? dependencies.resolveProcessEnv(),
      contextOverride,
    );
  }
  if (!overrides.resolveExecutionContext) {
    dependencies.resolveExecutionContext = () => {
      const env = dependencies.resolveProcessEnv();

      return {
        tenantId: env.BIDVIA_TENANT_ID,
        principalId: env.BIDVIA_PRINCIPAL_ID,
        principalType: env.BIDVIA_PRINCIPAL_TYPE,
        authorizedRole: env.BIDVIA_AUTHORIZED_ROLE,
        registrationId: env.BIDVIA_REGISTRATION_ID,
        sessionId: env.BIDVIA_SESSION_ID,
        adminSessionId: env.BIDVIA_ADMIN_SESSION_ID,
        companyId: env.BIDVIA_COMPANY_ID,
      };
    };
  }
  if (!overrides.resolveBaseUrl) {
    dependencies.resolveBaseUrl = () => resolveBidviaBaseUrlFromEnv(dependencies.resolveProcessEnv());
  }
  if (!overrides.resolveEnvironmentMode) {
    dependencies.resolveEnvironmentMode = () => resolveBidviaEnvironmentModeFromEnv(dependencies.resolveProcessEnv());
  }
  if (!overrides.readLocalOnboardingStateWithDiagnostics) {
    dependencies.readLocalOnboardingStateWithDiagnostics = overrides.readLocalOnboardingState
      ? async () => ({
        state: await overrides.readLocalOnboardingState!(),
        warnings: [],
      })
      : () => readLocalOnboardingStateWithDiagnostics({
        env: dependencies.resolveProcessEnv(),
      });
  }
  const parsedArgs = parseCliArgs(argv);
  const command = parsedArgs.command;
  const supportedValueFlags = getSupportedValueFlagsForCommand(command);
  const unsupportedKnownFlags = Object.keys(parsedArgs.flagValues)
    .filter((flag) => !supportedValueFlags.includes(flag as BidviaCliSupportedValueFlag));

  if (parsedArgs.missingValueFlags.length > 0) {
    const missingFlag = parsedArgs.missingValueFlags[0]!;
    if (missingFlag === '--input') {
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

    return printStructuredFailure(
      dependencies,
      buildStructuredFailure(
        command,
        'invalid-input',
        `Missing value for ${missingFlag} on ${command}.`,
        {
          details: [missingFlag],
        },
      ),
    );
  }

  if (unsupportedKnownFlags.length > 0) {
    return printStructuredFailure(
      dependencies,
      buildStructuredFailure(
        command,
        'invalid-input',
        `Unknown option(s): ${unsupportedKnownFlags.join(', ')}. Run --help to review supported commands and flags.`,
        {
          details: unsupportedKnownFlags,
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

  if (canonicalAccountAgentIdentifierCommands.has(command) && !parsedArgs.flagValues['--agent-id'] && !parsedArgs.flagValues['--registration-id']) {
    return printStructuredFailure(
      dependencies,
      buildStructuredFailure(
        command,
        'invalid-input',
        `Missing required --agent-id for ${command}.`,
        {
          details: ['--agent-id'],
        },
      ),
    );
  }

  const requiredTruthFetchFlags = truthFetchRequiredFlagsByCommand[
    command as keyof typeof truthFetchRequiredFlagsByCommand
  ];
  if (requiredTruthFetchFlags) {
    for (const requiredTruthFetchFlag of requiredTruthFetchFlags) {
      if (!parsedArgs.flagValues[requiredTruthFetchFlag]) {
        return printStructuredFailure(
          dependencies,
          buildStructuredFailure(
            command,
            'invalid-input',
            `Missing required ${requiredTruthFetchFlag} for ${command}.`,
            {
              details: [requiredTruthFetchFlag],
            },
          ),
        );
      }
    }
  }

  const requiredOnboardingActionFlags = onboardingActionSupportedFlagsByCommand[
    command as BidviaCliOnboardingActionCommand
  ];
  if (requiredOnboardingActionFlags) {
    for (const requiredOnboardingActionFlag of requiredOnboardingActionFlags) {
      if (!parsedArgs.flagValues[requiredOnboardingActionFlag]) {
        return printStructuredFailure(
          dependencies,
          buildStructuredFailure(
            command,
            'invalid-input',
            `Missing required ${requiredOnboardingActionFlag} for ${command}.`,
            {
              details: [requiredOnboardingActionFlag],
            },
          ),
        );
      }
    }
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
    dependencies.printJson(buildCapabilityPlaneServerSnapshot(buildSampleServerCapabilityPayload(), {
      getRouteCapabilityFromLocalCatalog,
      getLocalMcpToolDescriptor,
    }));
    return 0;
  }

  if (command === 'operator-discovery') {
    dependencies.printJson(buildOperatorDiscoverySnapshot());
    return 0;
  }

  if (command === 'onboarding-readiness') {
    dependencies.printJson({
      command,
      ...buildOnboardingReadiness(),
    });
    return 0;
  }

  if (command === 'context show') {
    dependencies.printJson(await buildContextShowSnapshot(
      dependencies.resolveProcessEnv(),
      dependencies,
    ));
    return 0;
  }

  if (command === 'whoami') {
    dependencies.printJson(await buildWhoamiSnapshot(
      dependencies.resolveProcessEnv(),
      dependencies,
    ));
    return 0;
  }

  if (command === 'doctor') {
    dependencies.printJson(await buildDoctorSnapshot(dependencies));
    return 0;
  }

  if (command === 'onboard') {
    dependencies.printJson(await buildOnboardSnapshot(
      dependencies.resolveProcessEnv(),
      dependencies,
    ));
    return 0;
  }

  if (command === 'openclaw-mcp-config') {
    dependencies.printJson({
      command,
      scope: 'local-only',
      config: exportOpenClawConfig(buildOpenClawConfig()),
      operatorNotes: {
        transportBoundary: 'Local stdio MCP on your side, remote HTTPS Bidvia API on the other side.',
        endpointOverride: 'Advanced/operator-only: set BIDVIA_BASE_URL only when you need a non-default deployment endpoint.',
      },
    });
    return 0;
  }

  if (command === 'openclaw-bundle-export') {
    const outputPath = parsedArgs.flagValues['--output'];
    if (!outputPath) {
      return printStructuredFailure(
        dependencies,
        buildStructuredFailure(
          command,
          'invalid-input',
          'Missing required --output for openclaw-bundle-export.',
          {
            details: ['--output'],
          },
        ),
      );
    }

    const writeResult = await writeOpenClawCompanionBundle(outputPath);

    dependencies.printJson({
      command,
      scope: 'local-only',
      outputPath: writeResult.outputPath,
      writtenFiles: writeResult.writtenFiles,
      operatorNotes: {
        primaryPath: 'Primary OpenClaw path: export stdio MCP config first, then add the companion bundle when you want packaging around that same local stdio MCP runtime path.',
        executionBoundary: 'Bundle/bootstrap only: OpenClaw stays config and packaging around the local stdio MCP server at `bidvia mcp-server`, where Bidvia execution actually runs.',
        developmentNote: 'Repo-local fallbacks such as `node dist/mcp-server.js` stay development-only and are not the primary bundle handoff.',
        deferredNativePlugin: 'Native-plugin-first and HTTP MCP paths stay out of scope for this version.',
      },
    });
    return 0;
  }

  if (command === 'mcp-server') {
    dependencies.runLocalMcpServer();
    return 0;
  }

  if (command === 'route-context-matrix') {
    dependencies.printJson({
      command,
      ...buildRouteContextMatrix(),
    });
    return 0;
  }

  const identitySessionCommand = identitySessionCommandDefinitions[
    command as BidviaCliIdentitySessionCommand
  ];
  if (identitySessionCommand) {
    const env = dependencies.resolveProcessEnv();
    const localStateResult = await readCliLocalOnboardingState(dependencies);
    const effectiveContext = buildEffectiveContextSnapshot(env, localStateResult.state);
    const requiredContext = identitySessionRequiredContextByCommand[
      command as BidviaCliIdentitySessionCommand
    ];
    const missingContext = requiredContext.filter((contextKey) => {
      if (contextKey === 'tenantId') {
        return effectiveContext.tenantId.value === null;
      }

      if (contextKey === 'adminSessionId') {
        return effectiveContext.adminSessionId.present === false;
      }

      return effectiveContext.sessionId.present === false;
    });

    if (missingContext.length > 0) {
      return printStructuredFailure(
        dependencies,
        buildStructuredFailure(
          command,
          'missing-context',
          buildCliMissingContextMessage(command, missingContext),
          {
            details: [...missingContext],
          },
        ),
      );
    }

    const now = dependencies.now();
    const executionContext = buildIdentitySessionExecutionContext(env, localStateResult.state, effectiveContext);

    try {
      const client = dependencies.createClient(env, executionContext);
      const result = await identitySessionCommand.run(client, parsedArgs, now);

      try {
        await writeLocalOnboardingState(
          buildPersistedIdentitySessionState(
            command as BidviaCliIdentitySessionCommand,
            result,
            localStateResult.state,
            executionContext,
            now,
          ),
          buildLocalOnboardingStateIoOptions(env),
        );
      } catch (error) {
        return printStructuredFailure(
          dependencies,
          buildLocalOnboardingStateWriteFailure(
            command,
            resolveLocalOnboardingStatePath(buildLocalOnboardingStateIoOptions(env)),
            error,
          ),
        );
      }

      dependencies.printJson(
        localStateResult.warnings.length === 0
          ? result
          : {
            ...((typeof result === 'object' && result !== null) ? result as Record<string, unknown> : { result }),
            localStateWarnings: localStateResult.warnings,
          },
      );
      return 0;
    } catch (error) {
      if (error instanceof Error && !(error instanceof BidviaClientTransportError)) {
        if (command === 'agent-self-service' && error.message.startsWith('participationState.state is not currently writable through bounded self-service for this claimed agent|')) {
          const [, allowedStatesRaw] = error.message.split('|', 2);
          return printStructuredFailure(
            dependencies,
            buildStructuredFailure(
              command,
              'invalid-input',
              'participationState.state is not currently writable through bounded self-service for this claimed agent',
              {
                allowedStates: allowedStatesRaw ? allowedStatesRaw.split(',').filter(Boolean) : [],
              },
            ),
          );
        }
        return printStructuredFailure(
          dependencies,
          buildStructuredFailure(
            command,
            'invalid-input',
            error.message,
          ),
        );
      }

      const normalizedFailure = normalizeOnboardingActionTransportFailure(error);
      return printStructuredFailure(
        dependencies,
        buildStructuredFailure(
          command,
          'transport-error',
          normalizedFailure.message,
          {
            details: [normalizedFailure.transport.name],
            transport: normalizedFailure.transport,
          },
        ),
      );
    }
  }

  const onboardingActionCommand = onboardingActionCommandDefinitions[
    command as BidviaCliOnboardingActionCommand
  ];
  if (onboardingActionCommand) {
    const env = dependencies.resolveProcessEnv();
    const localOnboardingStateIoOptions = buildLocalOnboardingStateIoOptions(env);
    const localStateResult = await readCliLocalOnboardingState(dependencies);
    const localState = localStateResult.state;
    const effectiveContext = buildEffectiveContextSnapshot(env, localState);
    const now = dependencies.now();
    const executionContext = buildOnboardingActionExecutionContext(
      command as BidviaCliOnboardingActionCommand,
      env,
      localState,
      effectiveContext,
    );
    const requiredContext = onboardingActionRequiredContextByCommand[
      command as BidviaCliOnboardingActionCommand
    ];
    const missingContext = requiredContext.filter((contextKey) => {
      if (contextKey === 'tenantId') {
        return effectiveContext.tenantId.value === null;
      }

      return effectiveContext.sessionId.present === false;
    });

    if (missingContext.length > 0) {
      return printStructuredFailure(
        dependencies,
        buildStructuredFailure(
          command,
          'missing-context',
          buildCliMissingContextMessage(command, missingContext),
          {
            details: [...missingContext],
          },
        ),
      );
    }

    let result: unknown;

    try {
      result = await runBidviaSurfaceCapability({
        transport: 'cli',
        helperKey: onboardingActionCommand.helperKey,
        capabilityKey: onboardingActionCommand.helperKey,
        identity: buildBidviaSurfaceRuntimeIdentityContext(executionContext),
        input: parsedArgs.flagValues,
        createClient: () => dependencies.createClient(env, executionContext),
        execute: async (client) => onboardingActionCommand.run(client, parsedArgs, now),
        now: dependencies.now,
        accumulation: { env },
      });
    } catch (error) {
      const normalizedFailure = normalizeOnboardingActionTransportFailure(error);
      return printStructuredFailure(
        dependencies,
        buildStructuredFailure(
          command,
          'transport-error',
          normalizedFailure.message,
          {
            details: [normalizedFailure.transport.name],
            transport: normalizedFailure.transport,
          },
        ),
      );
    }

    try {
      await writeLocalOnboardingState(
        buildPersistedOnboardingActionState(
          command as BidviaCliOnboardingActionCommand,
          result,
          localState,
          effectiveContext,
          executionContext,
          now,
        ),
        localOnboardingStateIoOptions,
      );
    } catch (error) {
      return printStructuredFailure(
        dependencies,
        buildLocalOnboardingStateWriteFailure(
          command,
          resolveLocalOnboardingStatePath(localOnboardingStateIoOptions),
          error,
        ),
      );
    }

    dependencies.printJson(
      localStateResult.warnings.length === 0
        ? result
        : {
          ...((typeof result === 'object' && result !== null) ? result as Record<string, unknown> : { result }),
          localStateWarnings: localStateResult.warnings,
        },
    );
    return 0;
  }

  const truthFetchCommand = truthFetchCommandDefinitions[command as BidviaCliTruthFetchCommand];
  if (truthFetchCommand) {
    try {
      const env = dependencies.resolveProcessEnv();
      const localStateResult = await readCliLocalOnboardingState(dependencies);
      const effectiveContext = buildEffectiveContextSnapshot(env, localStateResult.state);
      const client = dependencies.createClient(
        env,
        buildTruthFetchExecutionContext(env, localStateResult.state, effectiveContext),
      );
      const result = await truthFetchCommand.run(client, parsedArgs);
      dependencies.printJson(result);
      return 0;
    } catch (error) {
      if (error instanceof Error) {
        const match = error.message.match(/^(tenantId|principalId|sessionId|companyId|registrationId) is required/);
        if (match) {
          return printStructuredFailure(
            dependencies,
            buildStructuredFailure(
              command,
              'missing-context',
              error.message,
            ),
          );
        }
      }

      throw error;
    }
  }

  const executionCommand = dependencies.executionCommands[command as BidviaRegisteredAgentExecutionCommand];
  if (executionCommand) {
    const localStateResult = await readCliLocalOnboardingState(dependencies);
    const localState = localStateResult.state;
    const baseExecutionContext = dependencies.resolveExecutionContext();
    const executionContext = {
      tenantId: baseExecutionContext.tenantId ?? localState?.tenantId,
      principalId: baseExecutionContext.principalId ?? localState?.principalId,
      companyId: baseExecutionContext.companyId ?? localState?.companyId,
      registrationId: baseExecutionContext.registrationId ?? localState?.registrationId,
      sessionId: baseExecutionContext.sessionId ?? localState?.sessionId,
      adminSessionId: baseExecutionContext.adminSessionId,
      principalType: baseExecutionContext.principalType,
      authorizedRole: baseExecutionContext.authorizedRole,
    };
    const runtimeKeys = resolveExecutionCommandRuntimeKeys(
      command as BidviaRegisteredAgentExecutionCommand,
      executionCommand,
    );
    const preflight = buildCliExecutionPreflight(
      command,
      executionContext,
      parsedArgs.dryRun,
    );

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
        preflight,
        input: executionCommand.buildInput(now),
      });
      return 0;
    }

    if (preflight && preflight.missingContext.length > 0) {
      return printStructuredFailure(
        dependencies,
        buildStructuredFailure(
          command,
          'missing-context',
          buildCliMissingContextMessage(command, preflight.missingContext),
          {
            details: [...preflight.missingContext],
            preflight,
          },
        ),
      );
    }

    const env = dependencies.resolveProcessEnv();
    const now = dependencies.now();
    const result = await runBidviaSurfaceCapability({
      transport: 'cli',
      helperKey: runtimeKeys.helperKey,
      capabilityKey: runtimeKeys.capabilityKey,
      identity: buildBidviaSurfaceRuntimeIdentityContext(executionContext),
      input: executionCommand.buildInput(now),
      createClient: () => dependencies.createClient(env, executionContext),
      execute: async (client) => executionCommand.run(client, now),
      now: dependencies.now,
      accumulation: { env },
    });
    dependencies.printJson(result);
    return 0;
  }

  const now = dependencies.now();

  if (command === 'industry-universe-execution') {
    const localStateResult = await readCliLocalOnboardingState(dependencies);
    const localState = localStateResult.state;
    const baseExecutionContext = dependencies.resolveExecutionContext();
    const executionContext = {
      tenantId: baseExecutionContext.tenantId ?? localState?.tenantId,
      principalId: baseExecutionContext.principalId ?? localState?.principalId,
      companyId: baseExecutionContext.companyId ?? localState?.companyId,
      principalType: baseExecutionContext.principalType,
      authorizedRole: baseExecutionContext.authorizedRole,
      registrationId: baseExecutionContext.registrationId ?? localState?.registrationId,
      sessionId: baseExecutionContext.sessionId ?? localState?.sessionId,
      adminSessionId: baseExecutionContext.adminSessionId,
    };
    const preflight = buildCliExecutionPreflight(command, executionContext, parsedArgs.dryRun);
    let input: Record<string, unknown>;

    try {
      input = parseIndustryUniverseCliScenarioInput(parsedArgs.input);
    } catch (error) {
      return printStructuredFailure(
        dependencies,
        buildStructuredFailure(
          command,
          'invalid-input',
          error instanceof Error ? error.message : String(error),
        ),
      );
    }

    if (parsedArgs.dryRun) {
      dependencies.printJson({
        command,
        mode: 'dry-run',
        scope: 'local-only',
        preflight,
        input,
      });
      return 0;
    }

    if (preflight && preflight.missingContext.length > 0) {
      return printStructuredFailure(
        dependencies,
        buildStructuredFailure(
          command,
          'missing-context',
          buildCliMissingContextMessage(command, preflight.missingContext),
          {
            details: [...preflight.missingContext],
            preflight,
          },
        ),
      );
    }

    const env = dependencies.resolveProcessEnv();
    const result = await runBidviaSurfaceCapability({
      transport: 'cli',
      helperKey: 'executeIndustryUniverseScenario',
      capabilityKey: 'executeIndustryUniverseScenario',
      identity: buildBidviaSurfaceRuntimeIdentityContext(executionContext),
      input,
      createClient: () => dependencies.createClient(env, executionContext),
      execute: async (client) => executeIndustryUniverseScenario(
        client,
        buildIndustryUniverseScenarioPlan(
          input as unknown as Parameters<typeof buildIndustryUniverseScenarioPlan>[0],
        ),
      ),
      now: dependencies.now,
      accumulation: { env },
    });
    dependencies.printJson(result);
    return 0;
  }

  if (command === 'registration-lifecycle-plan') {
    dependencies.printJson({
      command,
      scope: 'local-only',
      workflowStagePlane: buildWorkflowStagePlaneCliSnapshot(),
      scenarioPlan: buildRegistrationLifecycleCliPlan(now),
    });
    return 0;
  }

  if (command === 'registered-agent-operations-plan') {
    dependencies.printJson({
      command,
      scope: 'local-only',
      workflowStagePlane: buildWorkflowStagePlaneCliSnapshot(),
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
    printReviewPacketJson(result.reviewPacket);
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
    printReviewPacketJson(result.exportedReviewPacket);
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
        riskTier: 'HIGH',
        policyVersion: 'policy-cli-v1',
        approvalMatrixVersion: 'matrix-cli-v1',
        actionType: 'CONTACT_SHARE',
        now,
      },
      approveConnectionRequest: {
        approvalRequestId: 'approval-cli-1',
        actorId: 'actor-cli-1',
        decision: 'APPROVE',
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
        riskTier: 'HIGH',
        policyVersion: 'policy-cli-v1',
        approvalMatrixVersion: 'matrix-cli-v1',
        actionType: 'CONTACT_SHARE',
        now,
      },
      approveConnectionRequest: {
        approvalRequestId: 'approval-cli-1',
        actorId: 'actor-cli-1',
        decision: 'APPROVE',
        now,
      },
    });
    printReviewPacketJson(result.reviewPacket);
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
        riskTier: 'HIGH',
        policyVersion: 'policy-cli-v1',
        approvalMatrixVersion: 'matrix-cli-v1',
        actionType: 'CONTACT_SHARE',
        now,
      },
      approveConnectionRequest: {
        approvalRequestId: 'approval-cli-1',
        actorId: 'actor-cli-1',
        decision: 'APPROVE',
        now,
      },
    });
    printReviewPacketJson(result.exportedReviewPacket);
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
    printReviewPacketJson(result.reviewPacket);
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
    printReviewPacketJson(result.exportedReviewPacket);
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
          riskTier: 'HIGH',
          policyVersion: 'policy-cli-v1',
          approvalMatrixVersion: 'matrix-cli-v1',
          actionType: 'CONTACT_SHARE',
          now,
        },
        approveConnectionRequest: {
          approvalRequestId: 'approval-cli-1',
          actorId: 'actor-cli-1',
          decision: 'APPROVE',
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
