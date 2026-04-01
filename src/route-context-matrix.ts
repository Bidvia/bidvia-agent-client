import type {
  BidviaLocalDiscoveryCatalogEntry,
} from './discovery-catalog.js';
import type {
  BidviaMcpToolOutputMode,
  BidviaRouteCapability,
  BidviaScenarioContextKey,
} from './contracts.js';
import { getRouteCapability } from './capabilities.js';
import { buildLocalDiscoveryCatalog } from './discovery-catalog.js';
import { buildLocalRuntimeCapabilitySnapshot } from './runtime-capabilities.js';

type BidviaRouteContextJourneyKey = 'public-first-onboarding' | 'local-openclaw-operator';

type BidviaRouteContextRelevance = 'public-first-common' | 'operator-secondary';

type BidviaRouteContextPresentationTier = 'primary' | 'secondary';

type BidviaRouteContextOperationKind = 'read-only' | 'execute';

type BidviaRouteContextFamily =
  | 'agent-onboarding'
  | 'agent-runtime'
  | 'account'
  | 'canonical-semantics'
  | 'pricing'
  | 'assets'
  | 'scenario';

interface BidviaRouteContextJourneyDefinition {
  journeyKey: BidviaRouteContextJourneyKey;
  helperKeys: readonly string[];
  relevance: BidviaRouteContextRelevance;
  presentationTier: BidviaRouteContextPresentationTier;
  firstSuccessNextStep: {
    command: string;
    rationale: string;
  };
}

export interface BidviaRouteContextMatrixRow {
  journeyKey: BidviaRouteContextJourneyKey;
  helperKey: string;
  routePathTemplate: string;
  routeFamily: BidviaRouteContextFamily;
  accessContextFamily: BidviaRouteCapability['accessContextFamily'];
  requiredContext: BidviaScenarioContextKey[];
  operationKind: BidviaRouteContextOperationKind;
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
  governedReadPosture: {
    accessContextFamily: 'principal-governed-read';
    requiredContext: ['tenantId', 'principalId'];
    adminSessionOptional: true;
    operatorGuidance: string;
  };
  rows: BidviaRouteContextMatrixRow[];
  firstSuccessNextSteps: Record<
    BidviaRouteContextJourneyKey,
    BidviaRouteContextJourneyDefinition['firstSuccessNextStep']
  >;
}

export interface BidviaRouteContextNextStepHint {
  journeyKey: BidviaRouteContextJourneyKey;
  relevance: BidviaRouteContextRelevance;
  command: string;
  rationale: string;
}

const routeContextJourneyDefinitions: readonly BidviaRouteContextJourneyDefinition[] = [
  {
    journeyKey: 'public-first-onboarding',
    helperKeys: ['createProvisionalAgent', 'claimProvisionalAgent', 'getAgentReadiness'],
    relevance: 'public-first-common',
    presentationTier: 'primary',
    firstSuccessNextStep: {
      command: 'registration-lifecycle-plan',
      rationale: 'Stay on the shipped onboarding chain before switching into post-registration runtime execution.',
    },
  },
  {
    journeyKey: 'local-openclaw-operator',
    helperKeys: ['postHeartbeat'],
    relevance: 'operator-secondary',
    presentationTier: 'secondary',
    firstSuccessNextStep: {
      command: 'registered-agent-operations-plan',
      rationale: 'Use the post-onboarding operations plan after the local MCP operator path has the required registration context.',
    },
  },
] as const;

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
  journey: BidviaRouteContextJourneyDefinition,
  helperKey: string,
  discoveryCatalogMap: Map<string, BidviaLocalDiscoveryCatalogEntry>,
): BidviaRouteContextMatrixRow {
  const capability = requireRouteCapability(helperKey);
  const discoveryEntry = discoveryCatalogMap.get(helperKey);

  return {
    journeyKey: journey.journeyKey,
    helperKey: capability.helperKey,
    routePathTemplate: capability.routePathTemplate,
    routeFamily: inferRouteFamily(capability.routePathTemplate),
    accessContextFamily: capability.accessContextFamily,
    requiredContext: [...capability.requiredContext],
    operationKind: buildOperationKind(capability),
    localCapabilityRiskTier: capability.localCapabilityRiskTier,
    relevance: journey.relevance,
    presentationTier: journey.presentationTier,
    recommendedOutputMode: discoveryEntry?.recommendedOutputMode
      ?? (capability.scope === 'read' ? 'truth-fetch-result' : 'execution-result'),
  };
}

export function buildRouteContextMatrix(): BidviaRouteContextMatrix {
  const discoveryCatalogMap = buildDiscoveryCatalogMap();

    return {
      defaults: buildPublicDefaults(),
      governedReadPosture: {
        accessContextFamily: 'principal-governed-read',
        requiredContext: ['tenantId', 'principalId'],
        adminSessionOptional: true,
        operatorGuidance: 'On local docker host, authority and presence require a valid admin session plus operator context. Authority-ladder is an operator-governed write and not a workspace admin-session route.',
      },
      rows: routeContextJourneyDefinitions.flatMap((journey) => (
        journey.helperKeys.map((helperKey) => buildMatrixRow(journey, helperKey, discoveryCatalogMap))
      )),
    firstSuccessNextSteps: Object.fromEntries(
      routeContextJourneyDefinitions.map((journey) => [journey.journeyKey, journey.firstSuccessNextStep]),
    ) as BidviaRouteContextMatrix['firstSuccessNextSteps'],
  };
}

export function buildRouteContextMatrixNextStepHints(): BidviaRouteContextNextStepHint[] {
  return routeContextJourneyDefinitions.map((journey) => ({
    journeyKey: journey.journeyKey,
    relevance: journey.relevance,
    command: journey.firstSuccessNextStep.command,
    rationale: journey.firstSuccessNextStep.rationale,
  }));
}
