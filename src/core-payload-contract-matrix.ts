import type {
  BidviaCorePayloadContractMatrixEntry,
  BidviaCorePlaneAdoptionStatus,
  BidviaCorePlaneName,
  BidviaPlaneExecutionGate,
  BidviaWorkflowStagePlaneView,
} from './contracts.js';

const blockedByPendingPacket = 'core-plane-payload-packet-not-yet-frozen' as const;

const corePayloadPlaneExecutionSummaryByPlane: Record<
  BidviaCorePlaneName,
  Pick<BidviaCorePlaneAdoptionStatus, 'descriptiveVisibility' | 'executableHelperEligibility'>
> = {
  'identity-session': {
    descriptiveVisibility: 'descriptive-plane-visible',
    executableHelperEligibility: 'packet-grounded-execution',
  },
  task: {
    descriptiveVisibility: 'descriptive-plane-visible',
    executableHelperEligibility: 'packet-grounded-execution',
  },
  capability: {
    descriptiveVisibility: 'descriptive-plane-visible',
    executableHelperEligibility: 'packet-grounded-read',
  },
  'workflow-stage': {
    descriptiveVisibility: 'descriptive-plane-visible',
    executableHelperEligibility: 'packet-grounded-read',
  },
  'event-notification': {
    descriptiveVisibility: 'descriptive-plane-visible',
    executableHelperEligibility: 'packet-grounded-execution',
  },
  'enterprise-integration': {
    descriptiveVisibility: 'descriptive-plane-visible',
    executableHelperEligibility: 'packet-grounded-read',
  },
};

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
    routePathTemplate: '/runtime/agents/:agent_registration_id/readiness',
    blockedBy: null,
    notes: ['Governed readiness reads are frozen as canonical deep-read payload truth.'],
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
    ['listTaskDispatches', '/runtime/agents/:agent_registration_id/task-dispatches'],
    ['getTaskDispatch', '/runtime/agents/:agent_registration_id/task-dispatches/:task_dispatch_id'],
  ].map(([helperKey, routePathTemplate]): BidviaCorePayloadContractMatrixEntry => ({
    plane: 'task',
    helperKey,
    helperState: 'packet-grounded-read',
    routePathTemplate,
    blockedBy: null,
    notes: ['Task-plane read visibility is frozen by the canonical dispatch and participation route family.'],
  })),
  ...[
    ['createLease', '/runtime/agents/:agent_registration_id/leases'],
    ['createClaim', '/runtime/agents/:agent_registration_id/claims'],
    ['acceptClaim', '/runtime/agents/:agent_registration_id/claims/:claim_id/accept'],
    ['rejectClaim', '/runtime/agents/:agent_registration_id/claims/:claim_id/reject'],
  ].map(([helperKey, routePathTemplate]): BidviaCorePayloadContractMatrixEntry => ({
    plane: 'task',
    helperKey,
    helperState: 'packet-grounded-execution',
    routePathTemplate,
    blockedBy: null,
    notes: ['Lease and claim helpers now derive from the frozen Core task route family.'],
  })),
  ...[
    ['createParticipationState', '/runtime/agents/:agent_registration_id/participation-states'],
    ['createTaskDispatch', '/runtime/agents/:agent_registration_id/task-dispatches'],
    ['assignTaskDispatch', '/runtime/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/assign'],
    ['suspendTaskDispatch', '/runtime/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/suspend'],
    ['resumeTaskDispatch', '/runtime/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/resume'],
    ['completeTaskDispatch', '/runtime/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/complete'],
    ['failTaskDispatch', '/runtime/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/fail'],
  ].map(([helperKey, routePathTemplate]): BidviaCorePayloadContractMatrixEntry => ({
    plane: 'task',
    helperKey,
    helperState: 'compatibility-only',
    routePathTemplate,
    blockedBy: null,
    notes: ['This helper is a downstream wrapper outside the current canonical Core task route family.'],
  })),
  ...[
    ['getAgentSummary', '/runtime/agents/:agent_registration_id/summary'],
    ['getAgentCapabilityProfile', '/runtime/agents/:agent_registration_id/capability-profile'],
  ].map(([helperKey, routePathTemplate]): BidviaCorePayloadContractMatrixEntry => ({
    plane: 'capability',
    helperKey,
    helperState: 'packet-grounded-read',
    routePathTemplate,
    blockedBy: null,
    notes: ['Capability-plane reads are frozen by the canonical Core profile and summary payloads.'],
  })),
  {
    plane: 'capability',
    helperKey: 'refreshRemoteCapabilityTruth',
    helperState: 'compatibility-only',
    routePathTemplate: null,
    blockedBy: null,
    notes: ['Partial refresh remains compatibility-only until Core freezes a canonical refresh payload.'],
  },
  {
    plane: 'event-notification',
    helperKey: 'getNotification',
    helperState: 'packet-grounded-read',
    routePathTemplate: '/runtime/notifications/:notification_id',
    blockedBy: null,
    notes: ['Notification detail reads are frozen Core payload truth.'],
  },
  {
    plane: 'event-notification',
    helperKey: 'createNotificationDelivery',
    helperState: 'packet-grounded-execution',
    routePathTemplate: '/runtime/notifications/deliveries',
    blockedBy: null,
    notes: ['Notification delivery now derives from the frozen Core notification action payload contract.'],
  },
  {
    plane: 'event-notification',
    helperKey: 'acknowledgeNotification',
    helperState: 'packet-grounded-execution',
    routePathTemplate: '/runtime/notifications/:notification_id/acknowledgements',
    blockedBy: null,
    notes: ['Notification acknowledgement now derives from the frozen Core notification action payload contract.'],
  },
  {
    plane: 'event-notification',
    helperKey: 'retryNotification',
    helperState: 'packet-grounded-execution',
    routePathTemplate: '/runtime/notifications/:notification_id/retry',
    blockedBy: null,
    notes: ['Notification retry now derives from the frozen Core notification action payload contract.'],
  },
  {
    plane: 'event-notification',
    helperKey: 'expireNotification',
    helperState: 'packet-grounded-execution',
    routePathTemplate: '/runtime/notifications/:notification_id/expire',
    blockedBy: null,
    notes: ['Notification expiry now derives from the frozen Core notification action payload contract.'],
  },
  ...[
    ['listDocumentArtifacts', '/runtime/document-artifacts'],
    ['getDocumentArtifact', '/runtime/document-artifacts/:document_artifact_id'],
    ['listMediaAssets', '/runtime/media-assets'],
    ['getMediaAsset', '/runtime/media-assets/:media_asset_id'],
    ['listEvidenceAssets', '/runtime/evidence-assets'],
    ['getEvidenceAsset', '/runtime/evidence-assets/:evidence_asset_id'],
    ['listAttachmentBindings', '/runtime/attachment-bindings'],
    ['getAttachmentBinding', '/runtime/attachment-bindings/:attachment_binding_id'],
    ['listFileResources', '/runtime/file-resources'],
    ['getFileResource', '/runtime/file-resources/:file_resource_id'],
    ['listTargetAttachmentBindings', '/runtime/targets/:target_ref/attachment-bindings'],
    ['getCommercialActionStatus', '/runtime/commercial-actions/:commercialActionRequestId/status'],
    ['getCommercialActionReceipt', '/runtime/commercial-actions/:commercialActionRequestId/receipt'],
    ['getCommercialActionAudit', '/runtime/commercial-actions/:commercialActionRequestId/audit'],
  ].map(([helperKey, routePathTemplate]): BidviaCorePayloadContractMatrixEntry => ({
    plane: 'enterprise-integration',
    helperKey,
    helperState: 'packet-grounded-read',
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

export function getCorePayloadPlaneExecutionSummary(
  plane: BidviaCorePlaneName,
): Pick<BidviaCorePlaneAdoptionStatus, 'descriptiveVisibility' | 'executableHelperEligibility'> {
  return {
    ...corePayloadPlaneExecutionSummaryByPlane[plane],
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
    payloadPacketStatus: 'packet-grounded',
    blockedBy: null,
    packetGroundedStageIdentifiers: [
      'notification.notification_state',
      'task.task_state',
      'latest_participation_state.context_handoff_state',
    ],
    transitionRules: [
      'transitions[].transition_kind',
      'transitions[].from_notification_state',
      'transitions[].to_notification_state',
      'transitions[].from_task_state',
      'transitions[].to_task_state',
    ],
    inventedIdentifiersBlocked: true,
  };
}
