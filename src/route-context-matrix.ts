import type {
  BidviaLocalDiscoveryCatalogEntry,
} from './discovery-catalog.js';
import {
  listOnboardingJourneyDefinitions,
  type BidviaOnboardingJourneyDefinition,
  type BidviaOnboardingJourneyKey,
  type BidviaOnboardingJourneyRelevance,
  type BidviaOnboardingJourneyPresentationTier,
  type BidviaOnboardingJourneyStage,
} from './onboarding-journey.js';
import type {
  BidviaAgentLifecycleGuidance,
  BidviaExecutionGuidanceEntry,
  BidviaEventNotificationPlaneView,
  BidviaIdentitySessionPlaneView,
  BidviaMcpToolOutputMode,
  BidviaPlaneExecutionTruth,
  BidviaRouteCapability,
  BidviaScenarioContextKey,
  BidviaTaskPlaneView,
  BidviaWorkflowStagePlaneView,
} from './contracts.js';
import { getRouteCapability } from './capabilities.js';
import { buildStage3ReleaseGate } from './core-plane-adoption.js';
import { buildLocalDiscoveryCatalog } from './discovery-catalog.js';
import { buildEventNotificationPlaneView } from './event-notification-plane.js';
import { buildExecutionGuidanceEntries } from './execution-guidance.js';
import { buildIdentitySessionPlaneView } from './identity-session-plane.js';
import { requirePlaneExecutionGate } from './plane-execution-gate.js';
import { buildLocalRuntimeCapabilitySnapshot } from './runtime-capabilities.js';
import { buildAgentLifecycleGuidance, buildTaskPlaneView } from './task-plane.js';
import { buildWorkflowStagePlaneView } from './workflow-stage-plane.js';

type BidviaRouteContextJourneyKey = BidviaOnboardingJourneyKey;

type BidviaRouteContextRelevance = BidviaOnboardingJourneyRelevance;

type BidviaRouteContextPresentationTier = BidviaOnboardingJourneyPresentationTier;

type BidviaRouteContextOperationKind = 'read-only' | 'execute';

type BidviaRouteContextJourneyStage = BidviaOnboardingJourneyStage;

type BidviaRouteContextFamily =
  | 'agent-onboarding'
  | 'agent-runtime'
  | 'account'
  | 'canonical-semantics'
  | 'pricing'
  | 'assets'
  | 'scenario';

export interface BidviaRouteContextMatrixRow {
  journeyKey: BidviaRouteContextJourneyKey;
  helperKey: string;
  routePathTemplate: string;
  routeFamily: BidviaRouteContextFamily;
  journeyStage: BidviaRouteContextJourneyStage;
  journeyStageSemantics: 'local-only';
  accessContextFamily: BidviaRouteCapability['accessContextFamily'];
  contextSemantic: BidviaRouteCapability['contextSemantic'];
  requiredContext: BidviaScenarioContextKey[];
  operationKind: BidviaRouteContextOperationKind;
  executionTruth: BidviaPlaneExecutionTruth;
  executionBlockedBy: string | null;
  localCapabilityRiskTier: BidviaRouteCapability['localCapabilityRiskTier'];
  relevance: BidviaRouteContextRelevance;
  presentationTier: BidviaRouteContextPresentationTier;
  recommendedOutputMode: BidviaMcpToolOutputMode;
}

export interface BidviaRouteContextMatrix {
  defaults: {
    baseUrl: string;
    environmentMode: string;
    environmentSelectionRequired: false;
  };
  identitySessionPlane: BidviaIdentitySessionPlaneView;
  taskPlane: BidviaTaskPlaneView;
  workflowStagePlane: BidviaWorkflowStagePlaneView;
  eventNotificationPlane: BidviaEventNotificationPlaneView;
  governedReadPosture: {
    accessContextFamily: 'principal-governed-read';
    requiredContext: ['tenantId', 'principalId'];
    adminSessionOptional: true;
    operatorGuidance: string;
  };
  stage3ReleaseGate: import('./contracts.js').BidviaStage3ReleaseGate;
  executionGuidance: BidviaExecutionGuidanceEntry[];
  agentLifecycleGuidance: BidviaAgentLifecycleGuidance;
  rows: BidviaRouteContextMatrixRow[];
  firstSuccessNextSteps: Record<
    BidviaRouteContextJourneyKey,
    BidviaOnboardingJourneyDefinition['firstSuccessNextStep']
  >;
}

export interface BidviaRouteContextNextStepHint {
  journeyKey: BidviaRouteContextJourneyKey;
  journeyStage: BidviaRouteContextJourneyStage;
  journeyStageSemantics: 'local-only';
  relevance: BidviaRouteContextRelevance;
  command: string;
  rationale: string;
}

function requireJourneyHelperStage(
  journey: BidviaOnboardingJourneyDefinition,
  helperKey: string,
): BidviaRouteContextJourneyStage {
  const helperStep = journey.helperSteps.find((entry) => entry.helperKey === helperKey);
  if (!helperStep) {
    throw new Error(`Missing onboarding journey helper stage for ${journey.journeyKey}:${helperKey}`);
  }

  return helperStep.journeyStage;
}

function requireRouteCapability(helperKey: string): BidviaRouteCapability {
  const capability = getRouteCapability(helperKey);
  if (!capability) {
    throw new Error(`Missing route capability metadata for ${helperKey}`);
  }

  return capability;
}

function buildDiscoveryCatalogMap(): Map<string, BidviaLocalDiscoveryCatalogEntry> {
  return new Map(buildLocalDiscoveryCatalog().map((entry) => [entry.helperKey, entry]));
}

function buildPublicDefaults(): BidviaRouteContextMatrix['defaults'] {
  const runtimeSnapshot = buildLocalRuntimeCapabilitySnapshot();

  return {
    baseUrl: runtimeSnapshot.baseUrl,
    environmentMode: runtimeSnapshot.environmentMode,
    environmentSelectionRequired: false,
  };
}

function buildOperationKind(capability: BidviaRouteCapability): BidviaRouteContextOperationKind {
  return capability.scope === 'read' ? 'read-only' : 'execute';
}

function inferRouteFamily(routePathTemplate: string): BidviaRouteContextFamily {
  if (routePathTemplate.startsWith('/runtime/account/')) {
    return 'account';
  }

  if (routePathTemplate.startsWith('/runtime/canonical-semantic-')) {
    return 'canonical-semantics';
  }

  if (routePathTemplate.startsWith('/runtime/pricing-') || routePathTemplate === '/runtime/pricing-bases') {
    return 'pricing';
  }

  if (
    routePathTemplate.startsWith('/runtime/document-')
    || routePathTemplate.startsWith('/runtime/media-')
    || routePathTemplate.startsWith('/runtime/evidence-')
    || routePathTemplate.startsWith('/runtime/attachment-')
    || routePathTemplate.startsWith('/runtime/file-')
    || routePathTemplate.startsWith('/runtime/targets/')
  ) {
    return 'assets';
  }

  if (routePathTemplate.startsWith('/scenarios/')) {
    return 'scenario';
  }

  if (routePathTemplate.startsWith('/runtime/agents/provisional')) {
    return 'agent-onboarding';
  }

  return 'agent-runtime';
}

function buildMatrixRow(
  journey: BidviaOnboardingJourneyDefinition,
  helperKey: string,
  discoveryCatalogMap: Map<string, BidviaLocalDiscoveryCatalogEntry>,
): BidviaRouteContextMatrixRow {
  const capability = requireRouteCapability(helperKey);
  const discoveryEntry = discoveryCatalogMap.get(helperKey);
  const executionGate = requirePlaneExecutionGate(helperKey);

  return {
    journeyKey: journey.journeyKey,
    helperKey: capability.helperKey,
    routePathTemplate: capability.routePathTemplate,
    routeFamily: inferRouteFamily(capability.routePathTemplate),
    journeyStage: requireJourneyHelperStage(journey, capability.helperKey),
    journeyStageSemantics: 'local-only',
    accessContextFamily: capability.accessContextFamily,
    contextSemantic: capability.contextSemantic,
    requiredContext: [...capability.requiredContext],
    operationKind: buildOperationKind(capability),
    executionTruth: executionGate.executionTruth,
    executionBlockedBy: executionGate.blockedBy,
    localCapabilityRiskTier: capability.localCapabilityRiskTier,
    relevance: journey.relevance,
    presentationTier: journey.presentationTier,
    recommendedOutputMode: discoveryEntry?.recommendedOutputMode
      ?? (capability.scope === 'read' ? 'truth-fetch-result' : 'execution-result'),
  };
}

export function buildRouteContextMatrix(): BidviaRouteContextMatrix {
  const discoveryCatalogMap = buildDiscoveryCatalogMap();
  const journeys = listOnboardingJourneyDefinitions();
  const identitySessionPlane = buildIdentitySessionPlaneView();
  const taskPlane = buildTaskPlaneView();
  const workflowStagePlane = buildWorkflowStagePlaneView();
  const eventNotificationPlane = buildEventNotificationPlaneView();

  return {
    defaults: buildPublicDefaults(),
    identitySessionPlane,
    taskPlane,
    workflowStagePlane,
    eventNotificationPlane,
    governedReadPosture: identitySessionPlane.governedReadPosture,
    stage3ReleaseGate: buildStage3ReleaseGate(),
    executionGuidance: buildExecutionGuidanceEntries(),
    agentLifecycleGuidance: buildAgentLifecycleGuidance(),
    rows: journeys.flatMap((journey) => (
      journey.helperSteps.map(({ helperKey }) => buildMatrixRow(journey, helperKey, discoveryCatalogMap))
    )),
    firstSuccessNextSteps: Object.fromEntries(
      journeys.map((journey) => [journey.journeyKey, journey.firstSuccessNextStep]),
    ) as BidviaRouteContextMatrix['firstSuccessNextSteps'],
  };
}

export function buildRouteContextMatrixNextStepHints(): BidviaRouteContextNextStepHint[] {
  return listOnboardingJourneyDefinitions().map((journey) => ({
    journeyKey: journey.journeyKey,
    journeyStage: journey.firstSuccessNextStep.journeyStage,
    journeyStageSemantics: journey.firstSuccessNextStep.journeyStageSemantics,
    relevance: journey.relevance,
    command: journey.firstSuccessNextStep.command,
    rationale: journey.firstSuccessNextStep.rationale,
  }));
}
