import type { BidviaEvidencePacket } from './contracts.js';
import type { BidviaStageSnapshot } from './contracts.js';

export interface BidviaProductResultTaxonomy {
  role: BidviaStageSnapshot['roleWorkspace']['role'];
  stage: BidviaStageSnapshot['stage'];
  state: BidviaStageSnapshot['state'];
  executability: BidviaStageSnapshot['executability'];
  issueClass: string;
  blockerCodes: string[];
}

export interface BidviaProductEvidenceEnvelope {
  resultTaxonomy: BidviaProductResultTaxonomy;
  evidencePacket: BidviaEvidencePacket;
  stageSnapshot: BidviaStageSnapshot;
}

export interface BidviaProductEvidenceEnvelopeInput {
  command: string;
  input: unknown;
  result: unknown;
  fallbackStageSnapshot?: BidviaStageSnapshot;
}

function readObjectField(value: unknown, fieldName: string): unknown {
  if (typeof value !== 'object' || value === null || !(fieldName in value)) {
    return undefined;
  }
  return (value as Record<string, unknown>)[fieldName];
}

function isStageSnapshot(value: unknown): value is BidviaStageSnapshot {
  return typeof value === 'object'
    && value !== null
    && typeof readObjectField(value, 'stage') === 'string'
    && typeof readObjectField(value, 'state') === 'string'
    && typeof readObjectField(value, 'executability') === 'string'
    && typeof readObjectField(readObjectField(value, 'roleWorkspace'), 'role') === 'string';
}

function extractStageSnapshot(result: unknown): BidviaStageSnapshot | undefined {
  const directStageSnapshot = readObjectField(result, 'stageSnapshot');
  if (isStageSnapshot(directStageSnapshot)) {
    return directStageSnapshot;
  }

  const currentStageSnapshot = readObjectField(readObjectField(result, 'current'), 'stageSnapshot');
  if (isStageSnapshot(currentStageSnapshot)) {
    return currentStageSnapshot;
  }

  const handoffStageSnapshot = readObjectField(readObjectField(result, 'handoff'), 'stageSnapshot');
  if (isStageSnapshot(handoffStageSnapshot)) {
    return handoffStageSnapshot;
  }

  const beforeStageSnapshot = readObjectField(readObjectField(result, 'before'), 'stageSnapshot');
  if (isStageSnapshot(beforeStageSnapshot)) {
    return beforeStageSnapshot;
  }

  return undefined;
}

function deriveIssueClass(stageSnapshot: BidviaStageSnapshot): string {
  if (stageSnapshot.executability === 'later-wave-stop') {
    return 'future-wave-deferred';
  }
  if (stageSnapshot.executability === 'non-canonical-fail-close') {
    return 'non-canonical-fail-close';
  }
  if (stageSnapshot.executability === 'bounded-stop') {
    return 'bounded-stop';
  }
  if (stageSnapshot.executability === 'metadata-only-handoff' || stageSnapshot.executability === 'executable-handoff') {
    return 'handoff-required';
  }
  if (stageSnapshot.state === 'repairable') {
    return 'repairable';
  }
  if (stageSnapshot.state === 'completed') {
    return 'completed';
  }
  return 'canonical-progress';
}

export function buildEvidencePacket(input: BidviaEvidencePacket): BidviaEvidencePacket {
  return {
    route: input.route,
    payload: input.payload,
    expected: input.expected,
    actual: input.actual,
    interpretation_gap: input.interpretation_gap,
    issue_class: input.issue_class,
  };
}

export function buildProductResultTaxonomy(stageSnapshot: BidviaStageSnapshot): BidviaProductResultTaxonomy {
  return {
    role: stageSnapshot.roleWorkspace.role,
    stage: stageSnapshot.stage,
    state: stageSnapshot.state,
    executability: stageSnapshot.executability,
    issueClass: deriveIssueClass(stageSnapshot),
    blockerCodes: stageSnapshot.boundary?.reasonCodes ?? [],
  };
}

export function buildProductEvidenceEnvelope(input: BidviaProductEvidenceEnvelopeInput): BidviaProductEvidenceEnvelope {
  const stageSnapshot = extractStageSnapshot(input.result) ?? input.fallbackStageSnapshot;
  if (!stageSnapshot) {
    throw new Error(`No stageSnapshot available for evidence output on ${input.command}`);
  }
  const resultTaxonomy = buildProductResultTaxonomy(stageSnapshot);
  return {
    resultTaxonomy,
    evidencePacket: buildEvidencePacket({
      route: input.command,
      payload: input.input,
      expected: {
        role: stageSnapshot.roleWorkspace.role,
        stage: stageSnapshot.stage,
        machine_readable: true,
      },
      actual: input.result,
      interpretation_gap: stageSnapshot.boundary?.message ?? stageSnapshot.recommendedNextStep ?? 'none',
      issue_class: resultTaxonomy.issueClass,
    }),
    stageSnapshot,
  };
}
