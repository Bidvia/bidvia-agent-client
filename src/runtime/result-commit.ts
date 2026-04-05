import type {
  BidviaRuntimeClientPort,
  BidviaRuntimeOwnedResultCommitInput,
  BidviaRuntimeOwnedResultCommitResponse,
} from './runtime-client-port.js';

export class BidviaRuntimeResultCommitUnavailableError extends Error {
  readonly name = 'BidviaRuntimeResultCommitUnavailableError';
}

export interface CommitRuntimeOwnedResultInput extends BidviaRuntimeOwnedResultCommitInput {
  port: BidviaRuntimeClientPort;
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return value;
}

export async function commitRuntimeOwnedResult(
  input: CommitRuntimeOwnedResultInput,
): Promise<BidviaRuntimeOwnedResultCommitResponse> {
  if (typeof input.port.commitRuntimeResult !== 'function') {
    throw new BidviaRuntimeResultCommitUnavailableError(
      `runtime-owned result commit path is unavailable for ${input.transport} ${input.helperKey}; local result remains staged for recovery`,
    );
  }

  const response = await input.port.commitRuntimeResult({
    transport: input.transport,
    helperKey: input.helperKey,
    taskDispatchId: input.taskDispatchId,
    resultRef: input.resultRef,
    kind: input.kind,
    terminalState: input.terminalState,
    ...(input.detail === undefined ? {} : { detail: input.detail }),
  });

  return {
    outcomeRef: requireNonEmptyString(response.outcomeRef, 'response.outcomeRef'),
  };
}
