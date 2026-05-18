import { createHash } from 'node:crypto';

export interface BidviaSurfaceSessionRefs {
  sessionId: string;
  sessionRef: string;
  localTaskRef: string;
  taskDispatchId: string;
  memoryRef: string;
  resultRef: string;
  resumeKey: string;
}

export interface BuildBidviaSurfaceSessionRefsInput {
  transport: 'cli' | 'mcp';
  helperKey: string;
  capabilityKey?: string;
  identity: Record<string, unknown>;
  input?: unknown;
}

function sanitizeRefSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]+/g, '-');
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, entryValue]) => [key, sortValue(entryValue)]),
    );
  }

  return value;
}

function normalizeSurfaceInput(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const normalizedInput = { ...(value as Record<string, unknown>) };

  delete normalizedInput.now;
  delete normalizedInput.expiresAt;

  return normalizedInput;
}

function buildResumeFingerprint(input: BuildBidviaSurfaceSessionRefsInput): string {
  return JSON.stringify(sortValue({
    transport: input.transport,
    helperKey: input.helperKey,
    capabilityKey: input.capabilityKey,
    identity: input.identity,
    input: normalizeSurfaceInput(input.input),
  }));
}

export function buildBidviaSurfaceSessionRefs(
  input: BuildBidviaSurfaceSessionRefsInput,
): BidviaSurfaceSessionRefs {
  const fingerprint = buildResumeFingerprint(input);
  const hash = createHash('sha256').update(fingerprint).digest('hex').slice(0, 16);
  const helperSegment = sanitizeRefSegment(input.helperKey);
  const resumeKey = `${input.transport}-${helperSegment}-${hash}`;

  return {
    sessionId: `session-${resumeKey}`,
    sessionRef: `local-session://${resumeKey}`,
    localTaskRef: `local-task://${resumeKey}`,
    taskDispatchId: `surface-dispatch://${resumeKey}`,
    memoryRef: `local-memory://${resumeKey}`,
    resultRef: `local-result://${resumeKey}`,
    resumeKey,
  };
}

export function buildBidviaSurfaceJournalFileName(resumeKey: string): string {
  return `${sanitizeRefSegment(`local-task://${resumeKey}-journal`)}.json`;
}
