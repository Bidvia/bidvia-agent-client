import type { BidviaEvidenceSubmissionInput } from './contracts.js';

export function buildEvidenceSubmissionInput(evidenceRef: string, evidenceKind: string, summary: string, now: string): BidviaEvidenceSubmissionInput {
  return {
    evidenceRef,
    evidenceKind,
    summary,
    now,
  };
}
