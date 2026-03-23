import type { BidviaProposalSubmissionInput } from './contracts.js';

export function buildProposalSubmissionInput(proposalType: string, proposalRef: string, summary: string, now: string): BidviaProposalSubmissionInput {
  return {
    proposalType,
    proposalRef,
    summary,
    now,
  };
}
