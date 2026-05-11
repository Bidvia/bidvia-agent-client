import type { BidviaClient } from '../client.js';
import type {
  BidviaApproveConnectionRequestInput,
  BidviaCommercialActionCreateInput,
  BidviaCommercialActionExecuteInput,
  BidviaCommercialActionPolicyCheckInput,
  BidviaCommercialActionRequestApprovalInput,
  BidviaCreateConnectionRequestInput,
  BidviaExportOpportunityPackageInput,
  BidviaOperatorCommercialActionInspectInput,
  BidviaOperatorExecutionListingActivateInput,
  BidviaOperatorExecutionListingCreateInput,
  BidviaOperatorExecutionMatchCandidatesInput,
  BidviaOperatorMatchesListInput,
} from '../contracts.js';
import type { BidviaStageSnapshot } from './contracts.js';
import { normalizeOperatorHandoffFailure } from './normalize.js';

export async function consumeOperatorHandoff(
  client: Pick<BidviaClient, 'listOperatorMatches'>,
  input: { sourceListingId: string },
) {
  return client.listOperatorMatches({ sourceListingId: input.sourceListingId });
}

export async function runOperatorMatching(
  client: Pick<BidviaClient, 'createOperatorExecutionListing' | 'activateOperatorExecutionListing' | 'generateOperatorMatchCandidates' | 'listOperatorMatches'>,
  input: {
    sourceListingId: string;
    candidateListing: BidviaOperatorExecutionListingCreateInput;
    candidateActivation: BidviaOperatorExecutionListingActivateInput;
    matchCandidates: BidviaOperatorExecutionMatchCandidatesInput;
  },
) {
  const createCandidate = await client.createOperatorExecutionListing(input.candidateListing);
  const activateCandidate = await client.activateOperatorExecutionListing(input.candidateListing.listingId, input.candidateActivation);
  const generatedMatches = await client.generateOperatorMatchCandidates(input.sourceListingId, input.matchCandidates);
  const matches = await client.listOperatorMatches({ sourceListingId: input.sourceListingId });
  return { createCandidate, activateCandidate, generatedMatches, matches };
}

type OperatorConnectionCreationResult = {
  connectionRequest?: {
    approval_request_id?: string;
    approvalRequestId?: string;
  };
};

function readReturnedApprovalRequestId(
  value: OperatorConnectionCreationResult,
  fallbackApprovalRequestId: string,
): string {
  return value.connectionRequest?.approval_request_id
    ?? value.connectionRequest?.approvalRequestId
    ?? fallbackApprovalRequestId;
}

export async function runOperatorConnectionContinuation(
  client: Pick<BidviaClient, 'createOperatorConnection' | 'approveOperatorConnection'>,
  input: {
    connection: BidviaCreateConnectionRequestInput & { companyId: string };
    approval: BidviaApproveConnectionRequestInput;
  },
) {
  const connection = await client.createOperatorConnection(input.connection);
  const returnedApprovalRequestId = readReturnedApprovalRequestId(connection as OperatorConnectionCreationResult, input.approval.approvalRequestId);
  const approval = await client.approveOperatorConnection({
    ...input.approval,
    approvalRequestId: returnedApprovalRequestId,
  });
  return { connection, approval };
}

export async function runOperatorApprovalContinuation(
  client: Pick<BidviaClient, 'approveOperatorConnection'>,
  input: BidviaApproveConnectionRequestInput,
) {
  return client.approveOperatorConnection(input);
}

export async function runOperatorPackageExport(
  client: Pick<BidviaClient, 'exportOperatorOpportunityPackage'>,
  input: BidviaExportOpportunityPackageInput,
) {
  return client.exportOperatorOpportunityPackage(input);
}

type CommercialActionCreationResult = {
  request?: {
    commercial_action_request_id?: string;
    commercialActionRequestId?: string;
  };
  commercial_action_request_id?: string;
  commercialActionRequestId?: string;
};

function extractCommercialActionRequestId(value: CommercialActionCreationResult): string {
  return value.request?.commercial_action_request_id
    ?? value.request?.commercialActionRequestId
    ?? value.commercial_action_request_id
    ?? value.commercialActionRequestId
    ?? '';
}

export async function runOperatorCommercialAction(
  client: Pick<BidviaClient,
    'createCommercialAction'
    | 'policyCheckCommercialAction'
    | 'requestCommercialActionApproval'
    | 'executeCommercialAction'
    | 'getOperatorCommercialActionStatus'
    | 'getOperatorCommercialActionReceipt'
    | 'getOperatorCommercialActionAudit'
  >,
  input: {
    create: BidviaCommercialActionCreateInput;
    policyCheck: BidviaCommercialActionPolicyCheckInput;
    requestApproval: BidviaCommercialActionRequestApprovalInput;
    execute: BidviaCommercialActionExecuteInput;
  },
) {
  const create = await client.createCommercialAction(input.create);
  const commercialActionRequestId = extractCommercialActionRequestId(create as CommercialActionCreationResult);
  const policyCheck = await client.policyCheckCommercialAction({
    ...input.policyCheck,
    commercialActionRequestId,
  });
  const requestApproval = await client.requestCommercialActionApproval({
    ...input.requestApproval,
    commercialActionRequestId,
  });
  const execute = await client.executeCommercialAction({
    ...input.execute,
    commercialActionRequestId,
  });
  const status = await client.getOperatorCommercialActionStatus({ commercialActionRequestId });
  const receipt = await client.getOperatorCommercialActionReceipt({ commercialActionRequestId });
  const audit = await client.getOperatorCommercialActionAudit({ commercialActionRequestId });
  return { create, policyCheck, requestApproval, execute, status, receipt, audit };
}

export async function inspectOperatorCommercialAction(
  client: Pick<BidviaClient, 'getOperatorCommercialActionStatus' | 'getOperatorCommercialActionReceipt' | 'getOperatorCommercialActionAudit'>,
  input: BidviaOperatorCommercialActionInspectInput,
) {
  const status = await client.getOperatorCommercialActionStatus(input);
  const receipt = await client.getOperatorCommercialActionReceipt(input);
  const audit = await client.getOperatorCommercialActionAudit(input);
  return { status, receipt, audit };
}

export function inspectOperatorHandoffFailure(input: {
  status: number;
  body: { error?: { code?: string; message?: string } };
  tenantId?: string;
  principalId?: string;
  authorizedCompanyId?: string;
}): BidviaStageSnapshot {
  return normalizeOperatorHandoffFailure(input);
}


export interface BidviaOperatorFacade {
  handoff: {
    consume: (input: { sourceListingId: string }) => Promise<unknown>;
  };
  progression: {
    match: (input: {
      sourceListingId: string;
      candidateListing: BidviaOperatorExecutionListingCreateInput;
      candidateActivation: BidviaOperatorExecutionListingActivateInput;
      matchCandidates: BidviaOperatorExecutionMatchCandidatesInput;
    }) => Promise<unknown>;
    connect: (input: {
      connection: BidviaCreateConnectionRequestInput & { companyId: string };
      approval: BidviaApproveConnectionRequestInput;
    }) => Promise<unknown>;
    approve: (input: BidviaApproveConnectionRequestInput) => Promise<unknown>;
    packageExport: (input: BidviaExportOpportunityPackageInput) => Promise<unknown>;
  };
  closure: {
    run: (input: {
      create: BidviaCommercialActionCreateInput;
      policyCheck: BidviaCommercialActionPolicyCheckInput;
      requestApproval: BidviaCommercialActionRequestApprovalInput;
      execute: BidviaCommercialActionExecuteInput;
    }) => Promise<unknown>;
    inspect: (input: BidviaOperatorCommercialActionInspectInput) => Promise<unknown>;
  };
}

export function createBidviaOperatorFacade(client: BidviaClient): BidviaOperatorFacade {
  return {
    handoff: {
      consume: (input: { sourceListingId: string }) => consumeOperatorHandoff(client, input),
    },
    progression: {
      match: (input) => runOperatorMatching(client, input),
      connect: (input) => runOperatorConnectionContinuation(client, input),
      approve: (input: BidviaApproveConnectionRequestInput) => runOperatorApprovalContinuation(client, input),
      packageExport: (input: BidviaExportOpportunityPackageInput) => runOperatorPackageExport(client, input),
    },
    closure: {
      run: (input) => runOperatorCommercialAction(client, input),
      inspect: (input: BidviaOperatorCommercialActionInspectInput) => inspectOperatorCommercialAction(client, input),
    },
  };
}
