import type {
  BidviaReviewPacketDetail,
  BidviaReviewPacketRecordDetail,
  BidviaReviewPacketRecordGroupKey,
  BidviaReviewPacketRouteDetail,
  BidviaScenarioEnvelope,
  BidviaScenarioRouteStep,
  BidviaReviewPacket,
  BidviaReviewPacketSection,
  BidviaReviewPacketStatus,
  BidviaScenarioVerificationBundle,
  BidviaVerificationBundle,
  BidviaVerificationBundleRecordIds,
  BidviaVerificationMode,
} from './contracts.js';

function cloneVerificationBundle<T>(bundle: T): T {
  return structuredClone(bundle);
}

function cloneReviewPacket(packet: BidviaReviewPacket): BidviaReviewPacket {
  return structuredClone(packet);
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

function freezeReviewPacketSection(section: BidviaReviewPacketSection): BidviaReviewPacketSection {
  Object.freeze(section.entries);
  return Object.freeze(section);
}

function freezeReviewPacketRouteDetail(detail: BidviaReviewPacketRouteDetail): BidviaReviewPacketRouteDetail {
  Object.freeze(detail.requiredContext);
  return Object.freeze(detail);
}

function freezeReviewPacketRecordDetail(detail: BidviaReviewPacketRecordDetail): BidviaReviewPacketRecordDetail {
  Object.freeze(detail.ids);
  return Object.freeze(detail);
}

function freezeReviewPacket(packet: BidviaReviewPacket): BidviaReviewPacket {
  Object.freeze(packet.summary);
  packet.details.routeDetails.forEach(freezeReviewPacketRouteDetail);
  packet.details.recordDetails.forEach(freezeReviewPacketRecordDetail);
  Object.freeze(packet.details.routeDetails);
  Object.freeze(packet.details.recordDetails);
  Object.freeze(packet.details);
  packet.sections.forEach(freezeReviewPacketSection);
  Object.freeze(packet.sections);
  return Object.freeze(packet);
}

function sameRouteStep(expectedStep: BidviaScenarioRouteStep, completedRouteStep: BidviaScenarioRouteStep): boolean {
  return expectedStep.routeKey === completedRouteStep.routeKey
    && expectedStep.requiredContext.length === completedRouteStep.requiredContext.length
    && expectedStep.requiredContext.every((contextKey, index) => contextKey === completedRouteStep.requiredContext[index]);
}

function sameStringArray(left: string[], right: string[]): boolean {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function sameRouteChain(
  left: BidviaScenarioRouteStep[],
  right: BidviaScenarioRouteStep[],
): boolean {
  return left.length === right.length
    && left.every((routeStep, index) => sameRouteStep(routeStep, right[index]!));
}

function requireMatchingScenarioBundle(
  scenario: BidviaScenarioEnvelope,
  bundle: BidviaScenarioVerificationBundle,
): void {
  if (scenario.scenarioId !== bundle.scenarioId
    || scenario.scenarioLabel !== bundle.scenarioLabel
    || scenario.scenarioFamily !== bundle.scenarioFamily
    || !sameStringArray(scenario.sourceRefs, bundle.sourceRefs)
    || !sameStringArray(scenario.evidenceRefs, bundle.evidenceRefs)
    || !sameStringArray(scenario.traceIds, bundle.traceIds)
    || !sameStringArray(scenario.workflowIds, bundle.workflowIds)
    || !sameRouteChain(scenario.expectedRouteChain, bundle.expectedRouteChain)) {
    throw new Error('scenario and verification bundle facts must match');
  }
}

function deriveReviewPacketStatus(
  expectedRouteCount: number,
  completedRouteCount: number,
): BidviaReviewPacketStatus {
  if (completedRouteCount === expectedRouteCount) {
    return 'complete';
  }

  if (completedRouteCount > 0) {
    return 'partial';
  }

  return 'pending-review';
}

function buildScenarioSection(scenario: BidviaScenarioEnvelope): BidviaReviewPacketSection {
  return {
    sectionKey: 'scenario',
    title: 'Scenario facts',
    entries: [
      ...scenario.sourceRefs,
      ...scenario.evidenceRefs,
      ...scenario.traceIds,
      ...scenario.workflowIds,
    ],
  };
}

function buildRoutesSection(scenario: BidviaScenarioEnvelope): BidviaReviewPacketSection {
  return {
    sectionKey: 'routes',
    title: 'Route coverage',
    entries: scenario.expectedRouteChain.map((routeStep) => routeStep.routeKey),
  };
}

function buildRecordsSection(recordIds: BidviaVerificationBundleRecordIds): BidviaReviewPacketSection {
  return {
    sectionKey: 'records',
    title: 'Recorded ids',
    entries: [
      ...(recordIds.listings ?? []),
      ...(recordIds.matches ?? []),
      ...(recordIds.connections ?? []),
      ...(recordIds.approvals ?? []),
      ...(recordIds.receipts ?? []),
      ...(recordIds.opportunities ?? []),
      ...(recordIds.packages ?? []),
      ...(recordIds.commercialActions ?? []),
    ],
  };
}

function buildRouteDetails(
  expectedRouteChain: BidviaScenarioRouteStep[],
  completedRouteChain: BidviaScenarioRouteStep[],
): BidviaReviewPacketRouteDetail[] {
  return expectedRouteChain.map((routeStep, index) => ({
    routeKey: routeStep.routeKey,
    requiredContext: [...routeStep.requiredContext],
    completed: index < completedRouteChain.length,
  }));
}

function buildRecordDetails(recordIds: BidviaVerificationBundleRecordIds): BidviaReviewPacketRecordDetail[] {
  const recordGroupKeys: BidviaReviewPacketRecordGroupKey[] = [
    'listings',
    'matches',
    'connections',
    'approvals',
    'receipts',
    'opportunities',
    'packages',
    'commercialActions',
  ];

  return recordGroupKeys.flatMap((recordGroupKey) => {
    const ids = recordIds[recordGroupKey];
    if (!ids || ids.length === 0) {
      return [];
    }

    return [{
      recordGroupKey,
      count: ids.length,
      ids: [...ids],
    }];
  });
}

function buildReviewPacketDetail(
  scenario: BidviaScenarioEnvelope,
  bundle: BidviaScenarioVerificationBundle,
): BidviaReviewPacketDetail {
  return {
    routeDetails: buildRouteDetails(scenario.expectedRouteChain, bundle.completedRouteChain),
    recordDetails: buildRecordDetails(bundle.recordIds),
  };
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

export interface BuildReviewPacketInput {
  scenario: BidviaScenarioEnvelope;
  bundle: BidviaScenarioVerificationBundle;
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

export function buildReviewPacket(input: BuildReviewPacketInput): BidviaReviewPacket {
  requireMatchingScenarioBundle(input.scenario, input.bundle);

  const expectedRouteCount = input.scenario.expectedRouteChain.length;
  const completedRouteCount = input.bundle.completedRouteChain.length;

  return freezeReviewPacket({
    scenarioId: input.bundle.scenarioId,
    scenarioLabel: input.bundle.scenarioLabel,
    scenarioFamily: input.bundle.scenarioFamily,
    verificationMode: input.bundle.verificationMode,
    status: deriveReviewPacketStatus(expectedRouteCount, completedRouteCount),
    summary: {
      sourceRefCount: input.scenario.sourceRefs.length,
      evidenceRefCount: input.scenario.evidenceRefs.length,
      workflowIdCount: input.scenario.workflowIds.length,
      expectedRouteCount,
      completedRouteCount,
    },
    details: buildReviewPacketDetail(input.scenario, input.bundle),
    sections: [
      buildScenarioSection(input.scenario),
      buildRoutesSection(input.scenario),
      buildRecordsSection(input.bundle.recordIds),
    ],
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

export function exportReviewPacket(packet: BidviaReviewPacket): BidviaReviewPacket {
  return freezeReviewPacket(cloneReviewPacket(packet));
}
