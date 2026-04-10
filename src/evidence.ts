import type {
  BidviaEnterpriseIntegrationPlaneHelperGroup,
  BidviaEvidenceSubmissionInput,
} from './contracts.js';
import { getEnterpriseIntegrationPlaneHelperGroup } from './enterprise-integration-plane.js';

export function buildEvidenceSubmissionInput(evidenceRef: string, evidenceKind: string, summary: string, now: string): BidviaEvidenceSubmissionInput {
  return {
    evidenceRef,
    evidenceKind,
    summary,
    now,
  };
}

export function buildEvidenceSubmissionEnterpriseBoundary(): BidviaEnterpriseIntegrationPlaneHelperGroup {
  return getEnterpriseIntegrationPlaneHelperGroup('evidence-submission');
}
