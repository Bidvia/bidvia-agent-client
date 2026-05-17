import type {
  BidviaCorePayloadContractMatrixEntry,
  BidviaCorePlaneAdoptionStatus,
  BidviaCorePlaneName,
  BidviaPlaneExecutionGate,
  BidviaWorkflowStagePlaneView,
} from './contracts.js';
import { bidviaCorePlaneNames } from './contracts.js';

const blockedByPendingPacket = 'core-plane-payload-packet-not-yet-frozen' as const;

const corePayloadContractMatrixEntries: readonly BidviaCorePayloadContractMatrixEntry[] = [
  {
    plane: 'identity-session',
    helperKey: 'createProvisionalAgent',
    helperState: 'packet-grounded-execution',
    routePathTemplate: '/runtime/agents/provisional',
    blockedBy: null,
    notes: ['Public provisional agent creation is frozen in the Core onboarding contract.'],
  },
  {
    plane: 'identity-session',
    helperKey: 'queryProvisionalAgent',
    helperState: 'packet-grounded-read',
    routePathTemplate: '/runtime/agents/provisional',
    blockedBy: null,
    notes: ['Public provisional query is the canonical onboarding read in the implementation lookup.'],
  },
  {
    plane: 'identity-session',
    helperKey: 'claimProvisionalAgent',
    helperState: 'packet-grounded-execution',
    routePathTemplate: '/runtime/agents/provisional/claim',
    blockedBy: null,
    notes: ['Session-bound provisional claim remains a packet-grounded onboarding execution helper.'],
  },
  {
    plane: 'identity-session',
    helperKey: 'getAgentReadiness',
    helperState: 'packet-grounded-read',
    capabilityPlaneCapabilityMode: 'packet-grounded-read',
    stage3RouteModelWave: 'P0',
    routePathTemplate: '/runtime/agents/:agent_registration_id/readiness',
    blockedBy: null,
    notes: ['Governed readiness reads are frozen as canonical deep-read payload truth.'],
  },
  ...[
    ['listAgentRegistrations', '/runtime/agents/registrations'],
    ['getAgentRegistration', '/runtime/agents/:agent_registration_id'],
  ].map(([helperKey, routePathTemplate]): BidviaCorePayloadContractMatrixEntry => ({
    plane: 'identity-session',
    helperKey,
    helperState: 'packet-grounded-read',
    stage3RouteModelWave: 'P0',
    routePathTemplate,
    blockedBy: null,
    notes: ['Governed registration visibility is frozen as canonical identity/session read truth.'],
  })),
  {
    plane: 'identity-session',
    helperKey: 'getAccountAgentDispatchAuthority',
    helperState: 'packet-grounded-read',
    stage3RouteModelWave: 'P0',
    routePathTemplate: '/runtime/account/agents/:agentId/dispatch-authority',
    blockedBy: null,
    notes: [
      'Account-agent dispatch-authority visibility is frozen as a bounded session-scoped read and does not imply permanent ineligibility.',
    ],
  },
  {
    plane: 'identity-session',
    helperKey: 'createAccountAgentDispatchAuthorityRequest',
    helperState: 'packet-grounded-execution',
    stage3RouteModelWave: 'P0',
    routePathTemplate: '/runtime/account/agents/:agentId/dispatch-authority-requests',
    blockedBy: null,
    notes: [
      'Dispatch-authority review requests are bounded session-scoped writes distinct from active role-binding activation or operator execution flows.',
    ],
  },
  {
    plane: 'identity-session',
    helperKey: 'getAccountAgentClosureStatus',
    helperState: 'packet-grounded-read',
    stage3RouteModelWave: 'P0',
    routePathTemplate: '/runtime/account/agents/:agentId/closure-status',
    blockedBy: null,
    notes: ['Closure-status is the first canonical account-plane continuation read.'],
  },
  {
    plane: 'identity-session',
    helperKey: 'refreshAccountAgentAuthorization',
    helperState: 'packet-grounded-execution',
    stage3RouteModelWave: 'P0',
    routePathTemplate: '/runtime/account/agents/:agentId/governed-runtime/authorization-refresh',
    blockedBy: null,
    notes: ['Authorization refresh is the bounded claimant repair route for authorization projection.'],
  },
  {
    plane: 'identity-session',
    helperKey: 'createAccountAgentExternalBinding',
    helperState: 'packet-grounded-execution',
    stage3RouteModelWave: 'P0',
    routePathTemplate: '/runtime/account/agents/:agentId/external-account-bindings',
    blockedBy: null,
    notes: ['External account binding is the bounded claimant write used when binding completion is the emitted blocker.'],
  },
  {
    plane: 'identity-session',
    helperKey: 'decideDispatchAuthorityRequest',
    helperState: 'packet-grounded-execution',
    stage3RouteModelWave: 'P0',
    routePathTemplate: '/operator/dispatch-authority-requests/:request_id/decision',
    blockedBy: null,
    notes: ['Operator dispatch-authority decision closes the operator-owned review boundary for claimant continuation.'],
  },
  {
    plane: 'task',
    helperKey: 'postHeartbeat',
    helperState: 'packet-grounded-execution',
    routePathTemplate: '/runtime/agents/:registrationId/heartbeat',
    blockedBy: null,
    notes: ['Heartbeat is part of the frozen operational access family.'],
  },
  ...[
    ['listParticipationStates', '/runtime/agents/:agent_registration_id/participation-states'],
    ['getParticipationState', '/runtime/agents/:agent_registration_id/participation-states/:participation_state_id'],
    ['listTaskDispatches', '/runtime/account/agents/:agentId/task-dispatches'],
    ['getTaskDispatch', '/runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id'],
    ['getAccountAgentGovernedWorkClosure', '/runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/governed-work-closure'],
  ].map(([helperKey, routePathTemplate]): BidviaCorePayloadContractMatrixEntry => ({
    plane: 'task',
    helperKey,
    helperState: 'packet-grounded-read',
    stage3RouteModelWave: 'P0',
    routePathTemplate,
    blockedBy: null,
    notes: ['Task-plane read visibility is frozen by the canonical dispatch and participation route family.'],
  })),
  ...[
    ['createLease', '/runtime/account/agents/:agentId/leases'],
    ['createClaim', '/runtime/account/agents/:agentId/claims'],
    ['acceptClaim', '/runtime/account/agents/:agentId/claims/:claim_id/accept'],
    ['rejectClaim', '/runtime/account/agents/:agentId/claims/:claim_id/reject'],
  ].map(([helperKey, routePathTemplate]): BidviaCorePayloadContractMatrixEntry => ({
    plane: 'task',
    helperKey,
    helperState: 'packet-grounded-execution',
    stage3RouteModelWave: 'P0',
    routePathTemplate,
    blockedBy: null,
    notes: ['Lease and claim helpers now derive from the frozen Core task route family.'],
  })),
  ...[
    ['createParticipationState', '/runtime/agents/:agent_registration_id/participation-states'],
    ['createTaskDispatch', '/runtime/account/agents/:agentId/task-dispatches'],
    ['createTaskDispatchOutcome', '/runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/outcomes'],
    ['createTaskDispatchEvidenceBundle', '/runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/evidence-bundles'],
    ['createTaskDispatchConfirmationCycle', '/runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/confirmation-cycles'],
    ['assignTaskDispatch', '/runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/assign'],
    ['suspendTaskDispatch', '/runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/suspend'],
    ['resumeTaskDispatch', '/runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/resume'],
    ['completeTaskDispatch', '/runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/complete'],
    ['failTaskDispatch', '/runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/fail'],
  ].map(([helperKey, routePathTemplate]): BidviaCorePayloadContractMatrixEntry => ({
    plane: 'task',
    helperKey,
    helperState: 'packet-grounded-execution',
    stage3RouteModelWave: 'P0',
    routePathTemplate,
    blockedBy: null,
    notes: ['Task-dispatch write helpers now derive from the frozen Core account-scoped task route family.'],
  })),
  ...[
    ['listAuthorityProfiles', '/runtime/authority-profiles'],
    ['listCapabilityProfiles', '/runtime/capability-profiles'],
    ['getAgentSummary', '/runtime/agents/:agent_registration_id/summary'],
    ['getAgentCapabilityProfile', '/runtime/agents/:agent_registration_id/capability-profile'],
  ].map(([helperKey, routePathTemplate]): BidviaCorePayloadContractMatrixEntry => ({
    plane: 'capability',
    helperKey,
    helperState: 'packet-grounded-read',
    capabilityPlaneCapabilityMode: 'packet-grounded-read',
    stage3RouteModelWave: 'P1',
    routePathTemplate,
    blockedBy: null,
    notes: ['Capability-plane reads are frozen by the canonical Core profile and summary payloads.'],
  })),
  {
    plane: 'capability',
    helperKey: 'refreshRemoteCapabilityTruth',
    helperState: 'compatibility-only',
    capabilityPlaneCapabilityMode: 'compatibility-only',
    routePathTemplate: null,
    blockedBy: null,
    notes: ['Partial refresh remains compatibility-only until Core freezes a canonical refresh payload.'],
  },
  {
    plane: 'event-notification',
    helperKey: 'getNotification',
    helperState: 'packet-grounded-read',
    stage3RouteModelWave: 'P0',
    routePathTemplate: '/runtime/account/agents/:agentId/notifications/:notification_id',
    blockedBy: null,
    notes: ['Notification detail reads are frozen as account-scoped consumer visibility truth.'],
  },
  {
    plane: 'event-notification',
    helperKey: 'createNotificationDelivery',
    helperState: 'compatibility-only',
    routePathTemplate: null,
    blockedBy: null,
    notes: ['Notification delivery stays compatibility-only in this wave while canonical consumer execution narrows to acknowledgement.'],
  },
  {
    plane: 'event-notification',
    helperKey: 'acknowledgeNotification',
    helperState: 'packet-grounded-execution',
    stage3RouteModelWave: 'P0',
    routePathTemplate: '/runtime/account/agents/:agentId/notifications/:notification_id/acknowledgements',
    blockedBy: null,
    notes: ['Notification acknowledgement is the canonical account-scoped consumer execution helper in this wave.'],
  },
  {
    plane: 'event-notification',
    helperKey: 'retryNotification',
    helperState: 'compatibility-only',
    routePathTemplate: null,
    blockedBy: null,
    notes: ['Notification retry stays compatibility-only in this wave and is excluded from canonical consumer execution truth.'],
  },
  {
    plane: 'event-notification',
    helperKey: 'expireNotification',
    helperState: 'compatibility-only',
    routePathTemplate: null,
    blockedBy: null,
    notes: ['Notification expiry stays compatibility-only in this wave and is excluded from canonical consumer execution truth.'],
  },
  ...[
    ['listPublicIntegrationApps', '/runtime/public/integration-apps'],
    ['listAccountIntegrationApps', '/runtime/account/integration-apps'],
    ['listAccountIntegrationInstallations', '/runtime/account/integration-installations'],
    ['listAccountIntegrationCapabilities', '/runtime/account/integration-capabilities'],
    ['getAccountAgentIntegrationEligibility', '/runtime/account/agents/:agentId/integrations/:integrationCode/eligibility'],
  ].map(([helperKey, routePathTemplate]): BidviaCorePayloadContractMatrixEntry => ({
    plane: 'enterprise-integration',
    helperKey,
    helperState: 'packet-grounded-read',
    stage3RouteModelWave: 'P2',
    routePathTemplate,
    blockedBy: null,
    notes: ['Canonical account-plane integration ownership reads now derive from frozen Core capability and eligibility payload truth.'],
  })),
  ...[
    ['createAccountIntegrationApp', '/runtime/account/integration-apps'],
    ['createAccountIntegrationInstallation', '/runtime/account/integration-installations'],
    ['connectAccountIntegrationInstallation', '/runtime/account/integration-installations/:integrationInstallationId/connection'],
  ].map(([helperKey, routePathTemplate]): BidviaCorePayloadContractMatrixEntry => ({
    plane: 'enterprise-integration',
    helperKey,
    helperState: 'packet-grounded-execution',
    stage3RouteModelWave: 'P2',
    routePathTemplate,
    blockedBy: null,
    notes: ['Canonical account-plane integration app submission, installation, and configuration now derive from frozen Core payload truth.'],
  })),
  ...[
    ['submitIntegrationOnboardingContract', '/runtime/integrations/:integrationCode/onboarding-contract'],
    ['logInHaisiWms', '/runtime/integrations/haisi-wms/login'],
    ['listHaisiWmsWarehouses', '/runtime/integrations/haisi-wms/warehouses'],
    ['createHaisiWmsInbound', '/runtime/integrations/haisi-wms/inbound'],
  ].map(([helperKey, routePathTemplate]): BidviaCorePayloadContractMatrixEntry => ({
    plane: 'enterprise-integration',
    helperKey,
    helperState: 'compatibility-only',
    routePathTemplate,
    blockedBy: null,
    notes: ['Provider-shaped Haisi and onboarding-contract seams remain compatibility-only support surfaces in the V14 integration direction.'],
  })),
  ...[
    ['listDocumentArtifacts', '/runtime/document-artifacts'],
    ['getDocumentArtifact', '/runtime/document-artifacts/:document_artifact_id'],
    ['listMediaAssets', '/runtime/media-assets'],
    ['getMediaAsset', '/runtime/media-assets/:media_asset_id'],
    ['listEvidenceAssets', '/runtime/evidence-assets'],
    ['getEvidenceAsset', '/runtime/evidence-assets/:evidence_asset_id'],
    ['listAttachmentBindings', '/runtime/attachment-bindings'],
    ['getAttachmentBinding', '/runtime/attachment-bindings/:attachment_binding_id'],
    ['getCommercialActionStatus', '/runtime/commercial-actions/:commercialActionRequestId/status'],
    ['getCommercialActionReceipt', '/runtime/commercial-actions/:commercialActionRequestId/receipt'],
    ['getCommercialActionAudit', '/runtime/commercial-actions/:commercialActionRequestId/audit'],
  ].map(([helperKey, routePathTemplate]): BidviaCorePayloadContractMatrixEntry => ({
    plane: 'enterprise-integration',
    helperKey,
    helperState: 'packet-grounded-read',
    stage3RouteModelWave: 'P2',
    routePathTemplate,
    blockedBy: null,
    notes: ['Enterprise visibility and readback helpers now derive from frozen Core payload contracts.'],
  })),
  ...[
    ['createCommercialAction', '/runtime/commercial-actions'],
    ['policyCheckCommercialAction', '/runtime/commercial-actions/:commercialActionRequestId/policy-check'],
    ['requestCommercialActionApproval', '/runtime/commercial-actions/:commercialActionRequestId/request-approval'],
    ['executeCommercialAction', '/runtime/commercial-actions/:commercialActionRequestId/execute'],
  ].map(([helperKey, routePathTemplate]): BidviaCorePayloadContractMatrixEntry => ({
    plane: 'enterprise-integration',
    helperKey,
    helperState: 'compatibility-only',
    routePathTemplate,
    blockedBy: null,
    notes: ['Provider-specific commercial-action convenience wrappers remain compatibility-only.'],
  })),
  ...[
    'buildEvidenceSubmissionInput',
    'buildCommercialActionScenarioPlan',
    'runCommercialActionScenario',
    'readCommercialActionScenarioReview',
    'buildGovernedProposalReviewUsePlan',
    'buildGovernedProposalReviewUseResult',
    'buildOpportunityPackageHandoffPlan',
    'runOpportunityPackageHandoff',
  ].map((helperKey): BidviaCorePayloadContractMatrixEntry => ({
    plane: 'enterprise-integration',
    helperKey,
    helperState: 'blocked-pending-packet',
    routePathTemplate: null,
    blockedBy: blockedByPendingPacket,
    notes: ['Scenario and review-safe enterprise wrappers remain blocked until Core freezes a packet-grounded helper payload.'],
  })),
];

const corePayloadContractMatrixEntryByHelperKey = new Map(
  corePayloadContractMatrixEntries.map((entry) => [entry.helperKey, entry]),
);

function isPacketGroundedHelperState(helperState: BidviaCorePayloadContractMatrixEntry['helperState']): boolean {
  return helperState === 'packet-grounded-read' || helperState === 'packet-grounded-execution';
}

export function listCorePayloadContractEntriesForPlane(plane: BidviaCorePlaneName): BidviaCorePayloadContractMatrixEntry[] {
  return corePayloadContractMatrixEntries.filter((entry) => entry.plane === plane);
}

function getCorePayloadPlanePayloadPacketStatus(
  entries: readonly BidviaCorePayloadContractMatrixEntry[],
): BidviaCorePlaneAdoptionStatus['payloadPacketStatus'] {
  return entries.some((entry) => isPacketGroundedHelperState(entry.helperState))
    ? 'packet-grounded'
    : 'blocked-pending-packet';
}

function getCorePayloadPlaneExecutableHelperEligibility(
  entries: readonly BidviaCorePayloadContractMatrixEntry[],
): BidviaCorePlaneAdoptionStatus['executableHelperEligibility'] {
  if (entries.some((entry) => entry.helperState === 'packet-grounded-execution')) {
    return 'packet-grounded-execution';
  }

  if (entries.some((entry) => entry.helperState === 'packet-grounded-read')) {
    return 'packet-grounded-read';
  }

  if (entries.some((entry) => entry.helperState === 'compatibility-only')) {
    return 'compatibility-only';
  }

  return 'blocked-pending-packet';
}

function getCorePayloadPlaneBlockedBy(
  entries: readonly BidviaCorePayloadContractMatrixEntry[],
  payloadPacketStatus: BidviaCorePlaneAdoptionStatus['payloadPacketStatus'],
): BidviaCorePlaneAdoptionStatus['blockedBy'] {
  if (payloadPacketStatus === 'packet-grounded') {
    return null;
  }

  return entries.find((entry) => entry.blockedBy !== null)?.blockedBy ?? blockedByPendingPacket;
}

export function listCorePayloadContractMatrixEntries(): BidviaCorePayloadContractMatrixEntry[] {
  return corePayloadContractMatrixEntries.map((entry) => ({
    ...entry,
    notes: [...entry.notes],
  }));
}

export function getCorePayloadContractMatrixEntry(
  helperKey: string,
): BidviaCorePayloadContractMatrixEntry | undefined {
  const entry = corePayloadContractMatrixEntryByHelperKey.get(helperKey);
  if (!entry) {
    return undefined;
  }

  return {
    ...entry,
    notes: [...entry.notes],
  };
}

export function listCorePayloadPlaneAdoptionSummaries(): Array<Pick<
  BidviaCorePlaneAdoptionStatus,
  'plane' | 'payloadPacketStatus' | 'descriptiveVisibility' | 'executableHelperEligibility' | 'blockedBy'
>> {
  return bidviaCorePlaneNames.map((plane) => {
    const entries = listCorePayloadContractEntriesForPlane(plane);
    const payloadPacketStatus = getCorePayloadPlanePayloadPacketStatus(entries);

    return {
      plane,
      payloadPacketStatus,
      descriptiveVisibility: 'descriptive-plane-visible',
      executableHelperEligibility: getCorePayloadPlaneExecutableHelperEligibility(entries),
      blockedBy: getCorePayloadPlaneBlockedBy(entries, payloadPacketStatus),
    };
  });
}

export function getCorePayloadPlaneExecutionSummary(
  plane: BidviaCorePlaneName,
): Pick<BidviaCorePlaneAdoptionStatus, 'descriptiveVisibility' | 'executableHelperEligibility'> {
  const summary = listCorePayloadPlaneAdoptionSummaries().find((entry) => entry.plane === plane);
  if (!summary) {
    throw new Error(`Missing core payload plane adoption summary for ${plane}`);
  }

  return {
    descriptiveVisibility: summary.descriptiveVisibility,
    executableHelperEligibility: summary.executableHelperEligibility,
  };
}

export function listCorePayloadPlaneExecutionGates(): BidviaPlaneExecutionGate[] {
  return listCorePayloadContractMatrixEntries().map((entry) => ({
    plane: entry.plane,
    helperKey: entry.helperKey,
    executionTruth: entry.helperState,
    blockedBy: entry.blockedBy,
    notes: [...entry.notes],
  }));
}

export function buildWorkflowStageCoreStageSemantics(): BidviaWorkflowStagePlaneView['coreStageSemantics'] {
  return {
    payloadPacketStatus: 'blocked-pending-packet',
    blockedBy: 'core-write-semantics-not-frozen',
    packetGroundedStageIdentifiers: [],
    transitionRules: [],
    inventedIdentifiersBlocked: true,
  };
}
