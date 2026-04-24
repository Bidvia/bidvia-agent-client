import type {
  BidviaScenarioExecutionResult,
  BidviaReviewPacketBoundaryDetail,
  BidviaReviewPacketDetail,
  BidviaReviewPacketRecordDetail,
  BidviaReviewPacketRecordGroupKey,
  BidviaReviewPacketRouteDetail,
  BidviaScenarioEnvelope,
  BidviaScenarioRouteStep,
  BidviaReviewPacket,
  BidviaReviewPacketSection,
  BidviaReviewPacketStatus,
  BidviaReviewPacketVerificationDetail,
  BidviaScenarioVerificationBundle,
  BidviaVerificationBundle,
  BidviaVerificationBundleRecordIds,
  BidviaVerificationMode,
} from './contracts.js';

function cloneScenarioExecutionResult(
  result: BidviaScenarioExecutionResult,
): BidviaScenarioExecutionResult {
  return structuredClone(result);
}

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
    ...(routeStep.stepName === undefined ? {} : { stepName: routeStep.stepName }),
    ...(routeStep.actorRole === undefined ? {} : { actorRole: routeStep.actorRole }),
    ...(routeStep.progressionCheckpoint === undefined
      ? {}
      : {
        progressionCheckpoint: {
          checkpointName: routeStep.progressionCheckpoint.checkpointName,
          verifyRecordGroups: [...routeStep.progressionCheckpoint.verifyRecordGroups],
          guidance: routeStep.progressionCheckpoint.guidance,
        },
      }),
  };
}

function cloneRouteChain(routeChain: BidviaScenarioRouteStep[]): BidviaScenarioRouteStep[] {
  return routeChain.map(cloneRouteStep);
}

function freezeRouteStep(routeStep: BidviaScenarioRouteStep): BidviaScenarioRouteStep {
  Object.freeze(routeStep.requiredContext);
  if (routeStep.progressionCheckpoint) {
    Object.freeze(routeStep.progressionCheckpoint.verifyRecordGroups);
    Object.freeze(routeStep.progressionCheckpoint);
  }
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

function freezeScenarioExecutionResult(
  result: BidviaScenarioExecutionResult,
): BidviaScenarioExecutionResult {
  Object.freeze(result.evidence.contextSummary);
  Object.freeze(result.evidence.requestSummary);
  Object.freeze(result.evidence.responseSummary);
  Object.freeze(result.evidence);
  if (result.nextStep) {
    Object.freeze(result.nextStep);
  }

  return Object.freeze(result);
}

function freezeReviewPacketSection(section: BidviaReviewPacketSection): BidviaReviewPacketSection {
  Object.freeze(section.entries);
  return Object.freeze(section);
}

function freezeReviewPacketBoundaryDetail(
  detail: BidviaReviewPacketBoundaryDetail,
): BidviaReviewPacketBoundaryDetail {
  return Object.freeze(detail);
}

function freezeReviewPacketVerificationDetail(
  detail: BidviaReviewPacketVerificationDetail,
): BidviaReviewPacketVerificationDetail {
  Object.freeze(detail.expectedRouteKeys);
  Object.freeze(detail.completedRouteKeys);
  Object.freeze(detail.pendingRouteKeys);
  Object.freeze(detail.minimumEvidenceFields);
  Object.freeze(detail.localDerivedExplanation);
  Object.freeze(detail.serverOwnedFacts);
  Object.freeze(detail.dependencyGatedSeams);
  Object.freeze(detail.roleSplit.user);
  Object.freeze(detail.roleSplit.operator);
  Object.freeze(detail.roleSplit.admin);
  Object.freeze(detail.roleSplit);
  if (detail.nextStep) {
    Object.freeze(detail.nextStep);
  }
  return Object.freeze(detail);
}

function freezeReviewPacketRouteDetail(detail: BidviaReviewPacketRouteDetail): BidviaReviewPacketRouteDetail {
  Object.freeze(detail.requiredContext);
  if (detail.progressionCheckpoint) {
    Object.freeze(detail.progressionCheckpoint.verifyRecordGroups);
    Object.freeze(detail.progressionCheckpoint);
  }
  return Object.freeze(detail);
}

function freezeReviewPacketRecordDetail(detail: BidviaReviewPacketRecordDetail): BidviaReviewPacketRecordDetail {
  Object.freeze(detail.ids);
  return Object.freeze(detail);
}

function freezeReviewPacket(packet: BidviaReviewPacket): BidviaReviewPacket {
  Object.freeze(packet.summary);
  freezeReviewPacketBoundaryDetail(packet.details.boundary);
  freezeReviewPacketVerificationDetail(packet.details.verification);
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
    && expectedStep.requiredContext.every((contextKey, index) => contextKey === completedRouteStep.requiredContext[index])
    && expectedStep.stepName === completedRouteStep.stepName
    && expectedStep.actorRole === completedRouteStep.actorRole
    && expectedStep.progressionCheckpoint?.checkpointName === completedRouteStep.progressionCheckpoint?.checkpointName
    && expectedStep.progressionCheckpoint?.guidance === completedRouteStep.progressionCheckpoint?.guidance
    && sameStringArray(
      expectedStep.progressionCheckpoint?.verifyRecordGroups ?? [],
      completedRouteStep.progressionCheckpoint?.verifyRecordGroups ?? [],
    );
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
    entries: [...scenario.sourceRefs],
  };
}

function buildEvidenceSection(scenario: BidviaScenarioEnvelope): BidviaReviewPacketSection {
  return {
    sectionKey: 'evidence',
    title: 'Evidence refs',
    entries: [...scenario.evidenceRefs],
  };
}

function buildTraceabilitySection(scenario: BidviaScenarioEnvelope): BidviaReviewPacketSection {
  return {
    sectionKey: 'traceability',
    title: 'Traceability refs',
    entries: [
      ...scenario.traceIds,
      ...scenario.workflowIds,
    ],
  };
}

function buildRoutesSection(
  expectedRouteChain: BidviaScenarioRouteStep[],
  completedRouteChain: BidviaScenarioRouteStep[],
): BidviaReviewPacketSection {
  const completedRouteKeys = new Set(completedRouteChain.map((routeStep) => routeStep.routeKey));
  const totalRouteCount = expectedRouteChain.length;

  return {
    sectionKey: 'routes',
    title: 'Route coverage',
    entries: expectedRouteChain.map((routeStep, index) => {
      const status = completedRouteKeys.has(routeStep.routeKey) ? 'completed' : 'pending-review';
      const stepName = routeStep.stepName ?? routeStep.routeKey;
      const actorRole = routeStep.actorRole ?? 'user';
      return `${status}:${index + 1}/${totalRouteCount}:${routeStep.routeKey}:${stepName}:actor=${actorRole}:requires=${routeStep.requiredContext.join('|')}`;
    }),
  };
}

function buildRoleSplit(
  expectedRouteChain: BidviaScenarioRouteStep[],
): Record<'user' | 'operator' | 'admin', string[]> {
  return expectedRouteChain.reduce<Record<'user' | 'operator' | 'admin', string[]>>((roleSplit, routeStep) => {
    const actorRole = routeStep.actorRole ?? 'user';
    roleSplit[actorRole].push(routeStep.stepName ?? routeStep.routeKey);
    return roleSplit;
  }, {
    user: [],
    operator: [],
    admin: [],
  });
}

function buildVerificationSection(params: {
  verificationMode: BidviaVerificationMode;
  status: BidviaReviewPacketStatus;
  expectedRouteCount: number;
  completedRouteCount: number;
  pendingRouteCount: number;
  sourceRefCount: number;
  evidenceRefCount: number;
  traceabilityRefCount: number;
  totalRecordCount: number;
  nextPendingRouteKey?: string;
  executionResult?: BidviaScenarioExecutionResult;
}): BidviaReviewPacketSection {
  return {
    sectionKey: 'verification',
    title: 'Verification facts',
    entries: [
      `verification-mode:${params.verificationMode}`,
      `review-packet-status:${params.status}`,
      `completed-routes:${params.completedRouteCount}/${params.expectedRouteCount}`,
      `pending-routes:${params.pendingRouteCount}`,
      `next-pending-route:${params.nextPendingRouteKey ?? 'none'}`,
      'route-coverage-note:completed-prefix-only',
      `local-derived-explanation:review-packet-status:${params.status}`,
      `local-derived-explanation:next-pending-route:${params.nextPendingRouteKey ?? 'none'}`,
      'local-derived-explanation:route-coverage-note:completed-prefix-only',
      `server-owned-facts:scenario-source-refs:${params.sourceRefCount}`,
      `server-owned-facts:scenario-evidence-refs:${params.evidenceRefCount}`,
      `server-owned-facts:traceability-refs:${params.traceabilityRefCount}`,
      `server-owned-facts:recorded-ids:${params.totalRecordCount}`,
      'minimum-evidence-fields:helperKey|routePathTemplate|actorRole|contextSummary|requestSummary|responseSummary',
      'server-truth-claimed:false',
      'adjudication-outcome-included:false',
      'dependency-gated-seams:core-truth-closure:deferred',
      ...(params.executionResult?.blockerClass === undefined ? [] : [`execution-blocker-class:${params.executionResult.blockerClass}`]),
      ...(params.executionResult?.closureStage === undefined ? [] : [`execution-closure-stage:${params.executionResult.closureStage}`]),
      ...(params.executionResult?.ownership === undefined ? [] : [`execution-ownership:${params.executionResult.ownership}`]),
      ...(params.executionResult?.resumable === undefined ? [] : [`execution-resumable:${String(params.executionResult.resumable)}`]),
    ],
  };
}

function buildRecordsSection(recordIds: BidviaVerificationBundleRecordIds): BidviaReviewPacketSection {
  const recordGroupKeys: BidviaReviewPacketRecordGroupKey[] = [
    'proposals',
    'reviews',
    'listings',
    'matches',
    'connections',
    'approvals',
    'receipts',
    'opportunities',
    'packages',
    'commercialActions',
  ];

  return {
    sectionKey: 'records',
    title: 'Recorded ids',
    entries: recordGroupKeys.flatMap((recordGroupKey) => {
      const ids = recordIds[recordGroupKey] ?? [];
      if (ids.length === 0) {
        return [];
      }

      return [
        `record-group:${recordGroupKey}:count=${ids.length}`,
        ...ids.map((id) => `${recordGroupKey}:${id}`),
      ];
    }),
  };
}

function buildRouteDetails(
  expectedRouteChain: BidviaScenarioRouteStep[],
  completedRouteChain: BidviaScenarioRouteStep[],
): BidviaReviewPacketRouteDetail[] {
  return expectedRouteChain.map((routeStep, index) => ({
    sequence: index + 1,
    routeKey: routeStep.routeKey,
    ...(routeStep.stepName === undefined ? {} : { stepName: routeStep.stepName }),
    ...(routeStep.actorRole === undefined ? {} : { actorRole: routeStep.actorRole }),
    requiredContext: [...routeStep.requiredContext],
    completed: index < completedRouteChain.length,
    ...(routeStep.progressionCheckpoint === undefined
      ? {}
      : {
        progressionCheckpoint: {
          checkpointName: routeStep.progressionCheckpoint.checkpointName,
          verifyRecordGroups: [...routeStep.progressionCheckpoint.verifyRecordGroups],
          guidance: routeStep.progressionCheckpoint.guidance,
        },
      }),
  }));
}

function buildRecordDetails(recordIds: BidviaVerificationBundleRecordIds): BidviaReviewPacketRecordDetail[] {
  const recordGroupKeys: BidviaReviewPacketRecordGroupKey[] = [
    'proposals',
    'reviews',
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

function countRecordGroups(recordDetails: BidviaReviewPacketRecordDetail[]): number {
  return recordDetails.length;
}

function countTotalRecords(recordDetails: BidviaReviewPacketRecordDetail[]): number {
  return recordDetails.reduce((total, detail) => total + detail.count, 0);
}

function buildReviewPacketBoundaryDetail(): BidviaReviewPacketBoundaryDetail {
  return {
    derivedFromScenarioFacts: true,
    derivedFromVerificationFacts: true,
    localDerivedExplanationIncluded: true,
    serverOwnedFactsIncluded: true,
    dependencyGatedSeamsIncluded: true,
    serverTruthClaimed: false,
    adjudicationOutcomeIncluded: false,
  };
}

function buildReviewPacketVerificationDetail(
  expectedRouteChain: BidviaScenarioRouteStep[],
  completedRouteChain: BidviaScenarioRouteStep[],
  totalRecordCount: number,
  executionResult?: BidviaScenarioExecutionResult,
): BidviaReviewPacketVerificationDetail {
  const expectedRouteKeys = expectedRouteChain.map((routeStep) => routeStep.routeKey);
  const completedRouteKeys = completedRouteChain.map((routeStep) => routeStep.routeKey);

  return {
    expectedRouteKeys,
    completedRouteKeys,
    pendingRouteKeys: expectedRouteKeys.slice(completedRouteKeys.length),
    totalRecordCount,
    minimumEvidenceFields: [
      'helperKey',
      'routePathTemplate',
      'actorRole',
      'contextSummary',
      'requestSummary',
      'responseSummary',
    ],
    localDerivedExplanation: [
      'review-packet-status',
      'next-pending-route',
      'route-coverage-note',
    ],
    serverOwnedFacts: [
      'scenario-source-refs',
      'scenario-evidence-refs',
      'traceability-refs',
      'recorded-ids',
    ],
    dependencyGatedSeams: [
      'server-truth-claimed:false',
      'adjudication-outcome-included:false',
      'core-truth-closure:deferred',
    ],
    roleSplit: buildRoleSplit(expectedRouteChain),
    ...(executionResult?.blockerClass === undefined ? {} : { blockerClass: executionResult.blockerClass }),
    ...(executionResult?.closureStage === undefined ? {} : { closureStage: executionResult.closureStage }),
    ...(executionResult?.ownership === undefined ? {} : { ownership: executionResult.ownership }),
    ...(executionResult?.resumable === undefined ? {} : { resumable: executionResult.resumable }),
    ...(executionResult?.nextStep === undefined ? {} : { nextStep: structuredClone(executionResult.nextStep) }),
  };
}

function buildReviewPacketDetail(
  scenario: BidviaScenarioEnvelope,
  bundle: BidviaScenarioVerificationBundle,
  executionResult?: BidviaScenarioExecutionResult,
): BidviaReviewPacketDetail {
  const recordDetails = buildRecordDetails(bundle.recordIds);

  return {
    boundary: buildReviewPacketBoundaryDetail(),
    verification: buildReviewPacketVerificationDetail(
      scenario.expectedRouteChain,
      bundle.completedRouteChain,
      countTotalRecords(recordDetails),
      executionResult,
    ),
    routeDetails: buildRouteDetails(scenario.expectedRouteChain, bundle.completedRouteChain),
    recordDetails,
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
  executionResult?: BidviaScenarioExecutionResult;
}

export interface BidviaScenarioReviewResult {
  verificationBundle: BidviaScenarioVerificationBundle;
  reviewPacket: BidviaReviewPacket;
}

export function buildScenarioExecutionResult(
  input: BidviaScenarioExecutionResult,
): BidviaScenarioExecutionResult {
  return freezeScenarioExecutionResult(cloneScenarioExecutionResult(input));
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
  const pendingRouteCount = expectedRouteCount - completedRouteCount;
  const details = buildReviewPacketDetail(input.scenario, input.bundle, input.executionResult);
  const totalRecordCount = countTotalRecords(details.recordDetails);
  const status = deriveReviewPacketStatus(expectedRouteCount, completedRouteCount);

  return freezeReviewPacket({
    scenarioId: input.bundle.scenarioId,
    scenarioLabel: input.bundle.scenarioLabel,
    scenarioFamily: input.bundle.scenarioFamily,
    verificationMode: input.bundle.verificationMode,
    status,
    closureGuidance: input.scenario.closureGuidance,
    summary: {
      sourceRefCount: input.scenario.sourceRefs.length,
      evidenceRefCount: input.scenario.evidenceRefs.length,
      traceIdCount: input.scenario.traceIds.length,
      workflowIdCount: input.scenario.workflowIds.length,
      expectedRouteCount,
      completedRouteCount,
      pendingRouteCount,
      recordGroupCount: countRecordGroups(details.recordDetails),
      totalRecordCount,
    },
    details,
    sections: [
      buildScenarioSection(input.scenario),
      buildEvidenceSection(input.scenario),
      buildTraceabilitySection(input.scenario),
      buildRoutesSection(input.scenario.expectedRouteChain, input.bundle.completedRouteChain),
      buildVerificationSection({
        verificationMode: input.bundle.verificationMode,
        status,
        expectedRouteCount,
        completedRouteCount,
        pendingRouteCount,
        sourceRefCount: input.scenario.sourceRefs.length,
        evidenceRefCount: input.scenario.evidenceRefs.length,
        traceabilityRefCount: input.scenario.traceIds.length + input.scenario.workflowIds.length,
        totalRecordCount,
        nextPendingRouteKey: input.bundle.completedRouteChain.length < input.scenario.expectedRouteChain.length
          ? input.scenario.expectedRouteChain[input.bundle.completedRouteChain.length]?.routeKey
          : undefined,
        executionResult: input.executionResult,
      }),
      buildRecordsSection(input.bundle.recordIds),
    ],
  });
}

export function buildCompletedScenarioReviewResult(
  scenario: BidviaScenarioEnvelope,
): BidviaScenarioReviewResult {
  const verificationBundle = buildScenarioVerificationBundle({
    scenario,
    verificationMode: 'review-safe',
    completedRouteChain: scenario.expectedRouteChain,
    recordIds: scenario.recordIds,
  });

  return {
    verificationBundle,
    reviewPacket: buildReviewPacket({
      scenario,
      bundle: verificationBundle,
    }),
  };
}

export function exportLegacyVerificationBundle(bundle: BidviaVerificationBundle): BidviaVerificationBundle {
  return cloneVerificationBundle(bundle);
}

export function exportScenarioVerificationBundle(
  bundle: BidviaScenarioVerificationBundle,
): BidviaScenarioVerificationBundle {
  return freezeScenarioVerificationBundle(cloneVerificationBundle(bundle));
}

export function exportScenarioExecutionResult(
  result: BidviaScenarioExecutionResult,
): BidviaScenarioExecutionResult {
  return freezeScenarioExecutionResult(cloneScenarioExecutionResult(result));
}

export function exportReviewPacket(packet: BidviaReviewPacket): BidviaReviewPacket {
  return freezeReviewPacket(cloneReviewPacket(packet));
}
