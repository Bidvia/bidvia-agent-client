import type { BidviaRuntimeOwnedResultCommitInput, BidviaRuntimeOwnedResultCommitResponse } from './contracts.js';

export interface BidviaRuntimeClientPort {
  commitRuntimeResult?: (
    input: BidviaRuntimeOwnedResultCommitInput,
  ) => Promise<BidviaRuntimeOwnedResultCommitResponse>;
}

export function buildBidviaRuntimeClientPort<Client extends object>(
  client: Client & Partial<BidviaRuntimeClientPort>,
): BidviaRuntimeClientPort {
  const candidate = client as BidviaRuntimeClientPort;

  return typeof candidate.commitRuntimeResult === 'function'
    ? {
      commitRuntimeResult: candidate.commitRuntimeResult.bind(client),
    }
    : {};
}

export type {
  BidviaRuntimeOwnedResultCommitInput,
  BidviaRuntimeOwnedResultCommitResponse,
} from './contracts.js';
