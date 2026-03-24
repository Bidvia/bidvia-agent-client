import type {
  BidviaScenarioEnvelope,
  BidviaScenarioRouteStep,
  BidviaScenarioVerificationBundle,
  BidviaVerificationBundle,
  BidviaVerificationBundleRecordIds,
  BidviaVerificationMode,
} from './contracts.js';

function cloneVerificationBundle<T>(bundle: T): T {
  return structuredClone(bundle);
}

function cloneRouteStep(routeStep: BidviaScenarioRouteStep): BidviaScenarioRouteStep {
  return {
    routeKey: routeStep.routeKey,
    requiredContext: [...routeStep.requiredContext],
  };
}

function cloneRouteChain(routeChain: BidviaScenarioRouteStep[]): BidviaScenarioRouteStep[] {
  return routeChain.map(cloneRouteStep);
}

function freezeRouteStep(routeStep: BidviaScenarioRouteStep): BidviaScenarioRouteStep {
  Object.freeze(routeStep.requiredContext);
  return Object.freeze(routeStep);
}

function freezeScenarioVerificationBundle(
  bundle: BidviaScenarioVerificationBundle,
): BidviaScenarioVerificationBundle {
  bundle.expectedRouteChain.forEach(freezeRouteStep);
  bundle.completedRouteChain.forEach(freezeRouteStep);
  Object.freeze(bundle.expectedRouteChain);
  Object.freeze(bundle.completedRouteChain);
  Object.freeze(bundle.recordIds);
  return Object.freeze(bundle);
}

function sameRouteStep(expectedStep: BidviaScenarioRouteStep, completedRouteStep: BidviaScenarioRouteStep): boolean {
  return expectedStep.routeKey === completedRouteStep.routeKey
    && expectedStep.requiredContext.length === completedRouteStep.requiredContext.length
    && expectedStep.requiredContext.every((contextKey, index) => contextKey === completedRouteStep.requiredContext[index]);
}

function requireCompletedRouteChainPrefix(
  expectedRouteChain: BidviaScenarioRouteStep[],
  completedRouteChain: BidviaScenarioRouteStep[],
): void {
  for (const [index, completedRouteStep] of completedRouteChain.entries()) {
    const expectedStep = expectedRouteChain[index];
    if (!expectedStep || !sameRouteStep(expectedStep, completedRouteStep)) {
      throw new Error('completed route chain must match the expected route chain prefix');
    }
  }
}

export interface BuildScenarioVerificationBundleInput {
  scenario: BidviaScenarioEnvelope;
  verificationMode: BidviaVerificationMode;
  completedRouteChain?: BidviaScenarioRouteStep[];
  recordIds?: BidviaVerificationBundleRecordIds;
}

export function buildScenarioVerificationBundle(
  input: BuildScenarioVerificationBundleInput,
): BidviaScenarioVerificationBundle {
  const completedRouteChain = input.completedRouteChain ?? [];
  requireCompletedRouteChainPrefix(input.scenario.expectedRouteChain, completedRouteChain);

  return freezeScenarioVerificationBundle({
    scenarioId: input.scenario.scenarioId,
    scenarioLabel: input.scenario.scenarioLabel,
    scenarioFamily: input.scenario.scenarioFamily,
    sourceRefs: input.scenario.sourceRefs,
    evidenceRefs: input.scenario.evidenceRefs,
    traceIds: input.scenario.traceIds,
    workflowIds: input.scenario.workflowIds,
    recordIds: cloneVerificationBundle(input.recordIds ?? input.scenario.recordIds ?? {}),
    verificationMode: input.verificationMode,
    expectedRouteChain: cloneRouteChain(input.scenario.expectedRouteChain),
    completedRouteChain: cloneRouteChain(completedRouteChain),
  });
}

export function appendCompletedRouteStep(
  bundle: BidviaScenarioVerificationBundle,
  completedRouteStep: BidviaScenarioRouteStep,
): BidviaScenarioVerificationBundle {
  const completedRouteChain = [...bundle.completedRouteChain, cloneRouteStep(completedRouteStep)];
  requireCompletedRouteChainPrefix(bundle.expectedRouteChain, completedRouteChain);

  return freezeScenarioVerificationBundle({
    ...bundle,
    completedRouteChain,
  });
}

export function exportLegacyVerificationBundle(bundle: BidviaVerificationBundle): BidviaVerificationBundle {
  return cloneVerificationBundle(bundle);
}

export function exportScenarioVerificationBundle(
  bundle: BidviaScenarioVerificationBundle,
): BidviaScenarioVerificationBundle {
  return freezeScenarioVerificationBundle(cloneVerificationBundle(bundle));
}
