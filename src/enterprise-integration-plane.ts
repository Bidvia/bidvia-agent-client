import { listCorePlaneAdoptionStatuses } from './core-plane-adoption.js';
import { getCorePayloadContractMatrixEntry } from './core-payload-contract-matrix.js';
import type {
  BidviaCorePlaneAdoptionStatus,
  BidviaEnterpriseIntegrationPlaneHelperGroup,
  BidviaEnterpriseIntegrationPlaneHelperGroupKey,
  BidviaEnterpriseIntegrationPlaneView,
} from './contracts.js';

const enterpriseIntegrationPlaneHelperGroups: readonly BidviaEnterpriseIntegrationPlaneHelperGroup[] = [
  {
    groupKey: 'integration-ownership-slice',
    label: 'Canonical account integration ownership slice',
    helperKeys: [
      'listPublicIntegrationApps',
      'createAccountIntegrationApp',
      'listAccountIntegrationApps',
      'createAccountIntegrationInstallation',
      'listAccountIntegrationInstallations',
      'connectAccountIntegrationInstallation',
      'listAccountIntegrationCapabilities',
      'getAccountAgentIntegrationEligibility',
    ],
    clientMethods: [
      'listPublicIntegrationApps',
      'createAccountIntegrationApp',
      'listAccountIntegrationApps',
      'createAccountIntegrationInstallation',
      'listAccountIntegrationInstallations',
      'connectAccountIntegrationInstallation',
      'listAccountIntegrationCapabilities',
      'getAccountAgentIntegrationEligibility',
    ],
    cliCommands: [
      'public-integration-apps',
      'create-account-integration-app',
      'account-integration-apps',
      'create-account-integration-installation',
      'account-integration-installations',
      'connect-account-integration-installation',
      'account-integration-capabilities',
      'account-agent-integration-eligibility',
    ],
    discoveryHelperKeys: [
      'listPublicIntegrationApps',
      'createAccountIntegrationApp',
      'listAccountIntegrationApps',
      'createAccountIntegrationInstallation',
      'listAccountIntegrationInstallations',
      'connectAccountIntegrationInstallation',
      'listAccountIntegrationCapabilities',
      'getAccountAgentIntegrationEligibility',
    ],
    broaderEnterpriseAuthorityClaimed: false,
    broaderSystemAuthorityClaimed: false,
    payloadPacketStatus: 'blocked-pending-packet',
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: [
      'The V14 canonical integration trunk includes the public and account integration-app directory, installation, installation-connection, capability, and bounded account-agent eligibility truth.',
      'The bounded inbound invocation route remains canonical ownership metadata but stays fail-closed here until Core freezes an open-client request body.',
    ],
  },
  {
    groupKey: 'compatibility-provider-routes',
    label: 'Compatibility-only provider onboarding seams',
    helperKeys: [
      'submitIntegrationOnboardingContract',
      'logInHaisiWms',
      'listHaisiWmsWarehouses',
      'createHaisiWmsInbound',
    ],
    clientMethods: [
      'submitIntegrationOnboardingContract',
      'logInHaisiWms',
      'listHaisiWmsWarehouses',
      'createHaisiWmsInbound',
    ],
    cliCommands: [],
    discoveryHelperKeys: [
      'submitIntegrationOnboardingContract',
      'logInHaisiWms',
      'listHaisiWmsWarehouses',
      'createHaisiWmsInbound',
    ],
    broaderEnterpriseAuthorityClaimed: false,
    broaderSystemAuthorityClaimed: false,
    payloadPacketStatus: 'blocked-pending-packet',
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: ['Legacy onboarding-contract and provider-shaped Haisi seams remain compatibility-only support surfaces rather than the canonical V14 product root.'],
  },
  {
    groupKey: 'asset-evidence-family',
    label: 'Assets, documents, media, evidence, and attachment bindings',
    helperKeys: ['consumeAssetObjectFamily', 'explainAssetConsumption'],
    clientMethods: [
      'listDocumentArtifacts',
      'getDocumentArtifact',
      'listMediaAssets',
      'getMediaAsset',
      'listEvidenceAssets',
      'getEvidenceAsset',
      'listAttachmentBindings',
      'getAttachmentBinding',
    ],
    cliCommands: [
      'document-artifacts',
      'document-artifact',
      'media-assets',
      'media-asset',
      'evidence-assets',
      'evidence-asset',
      'attachment-bindings',
      'attachment-binding',
    ],
    discoveryHelperKeys: [
      'listDocumentArtifacts',
      'getDocumentArtifact',
      'listMediaAssets',
      'getMediaAsset',
      'listEvidenceAssets',
      'getEvidenceAsset',
      'listAttachmentBindings',
      'getAttachmentBinding',
    ],
    broaderEnterpriseAuthorityClaimed: false,
    broaderSystemAuthorityClaimed: false,
    payloadPacketStatus: 'blocked-pending-packet',
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: ['Descriptive asset/document/media/evidence consumption stays bounded to the commercial-universe integration surface.'],
  },
  {
    groupKey: 'evidence-submission',
    label: 'Registration-bound evidence submission',
    helperKeys: ['buildEvidenceSubmissionInput'],
    clientMethods: ['submitEvidence'],
    cliCommands: ['evidence'],
    discoveryHelperKeys: ['submitEvidence'],
    broaderEnterpriseAuthorityClaimed: false,
    broaderSystemAuthorityClaimed: false,
    payloadPacketStatus: 'blocked-pending-packet',
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: ['Evidence submission stays registration-bound and does not claim packet-complete enterprise adjudication semantics.'],
  },
  {
    groupKey: 'commercial-action',
    label: 'Bounded commercial-action support',
    helperKeys: [
      'buildCommercialActionScenarioPlan',
      'runCommercialActionScenario',
      'readCommercialActionScenarioReview',
    ],
    clientMethods: [
      'createCommercialAction',
      'getCommercialActionStatus',
      'policyCheckCommercialAction',
      'requestCommercialActionApproval',
      'executeCommercialAction',
      'getCommercialActionReceipt',
      'getCommercialActionAudit',
    ],
    cliCommands: ['commercial-action-verification-wave-preview'],
    discoveryHelperKeys: [
      'createCommercialAction',
      'getCommercialActionStatus',
      'policyCheckCommercialAction',
      'requestCommercialActionApproval',
      'executeCommercialAction',
      'getCommercialActionReceipt',
      'getCommercialActionAudit',
    ],
    broaderEnterpriseAuthorityClaimed: false,
    broaderSystemAuthorityClaimed: false,
    payloadPacketStatus: 'blocked-pending-packet',
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: ['Commercial-action helpers stay bounded support and do not define the enterprise integration plane itself.'],
  },
  {
    groupKey: 'governed-proposals',
    label: 'Governed proposal recommendation, assessment, and authorized use',
    helperKeys: ['buildGovernedProposalReviewUsePlan', 'buildGovernedProposalReviewUseResult'],
    clientMethods: ['submitProposal'],
    cliCommands: ['proposal'],
    discoveryHelperKeys: ['submitProposal'],
    broaderEnterpriseAuthorityClaimed: false,
    broaderSystemAuthorityClaimed: false,
    payloadPacketStatus: 'blocked-pending-packet',
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: ['Governed proposal helpers remain bounded to recommendation, assessment, and authorized-use surfaces only.'],
  },
  {
    groupKey: 'opportunity-handoffs',
    label: 'Opportunity package handoff and export',
    helperKeys: ['buildOpportunityPackageHandoffPlan', 'runOpportunityPackageHandoff'],
    clientMethods: ['exportOpportunityPackage'],
    cliCommands: [
      'opportunity-package-handoff-plan',
      'opportunity-package-handoff-review-packet-preview',
      'opportunity-package-handoff-review-packet-export',
    ],
    discoveryHelperKeys: ['exportOpportunityPackage'],
    broaderEnterpriseAuthorityClaimed: false,
    broaderSystemAuthorityClaimed: false,
    payloadPacketStatus: 'blocked-pending-packet',
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: ['Package handoff helpers stay bounded to explicit export and review-safe readback, not broader enterprise orchestration.'],
  },
];

function cloneHelperGroup(
  helperGroup: BidviaEnterpriseIntegrationPlaneHelperGroup,
): BidviaEnterpriseIntegrationPlaneHelperGroup {
  const matrixBackedHelperKeys = [...new Set([
    ...helperGroup.helperKeys,
    ...helperGroup.clientMethods,
    ...helperGroup.discoveryHelperKeys,
  ])];
  const groupEntries = matrixBackedHelperKeys
    .map((helperKey) => getCorePayloadContractMatrixEntry(helperKey))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);

  const payloadPacketStatus = groupEntries.some((entry) => entry.helperState.startsWith('packet-grounded'))
    ? 'packet-grounded'
    : 'blocked-pending-packet';
  const blockedBy = payloadPacketStatus === 'packet-grounded'
    ? null
    : groupEntries.find((entry) => entry.blockedBy !== null)?.blockedBy ?? helperGroup.blockedBy;

  return {
    ...helperGroup,
    helperKeys: [...helperGroup.helperKeys],
    clientMethods: [...helperGroup.clientMethods],
    cliCommands: [...helperGroup.cliCommands],
    discoveryHelperKeys: [...helperGroup.discoveryHelperKeys],
    payloadPacketStatus,
    blockedBy,
    notes: [...helperGroup.notes],
  };
}

function requireEnterpriseIntegrationAdoptionStatus(): BidviaCorePlaneAdoptionStatus {
  const adoptionStatus = listCorePlaneAdoptionStatuses().find((status) => status.plane === 'enterprise-integration');
  if (!adoptionStatus) {
    throw new Error('Missing core plane adoption status for enterprise integration');
  }

  return adoptionStatus;
}

export function listEnterpriseIntegrationPlaneHelperGroups(): BidviaEnterpriseIntegrationPlaneHelperGroup[] {
  return enterpriseIntegrationPlaneHelperGroups.map((helperGroup) => cloneHelperGroup(helperGroup));
}

export function getEnterpriseIntegrationPlaneHelperGroup(
  groupKey: BidviaEnterpriseIntegrationPlaneHelperGroupKey,
): BidviaEnterpriseIntegrationPlaneHelperGroup {
  const helperGroup = enterpriseIntegrationPlaneHelperGroups.find((candidate) => candidate.groupKey === groupKey);
  if (!helperGroup) {
    throw new Error(`Unknown enterprise integration helper group: ${groupKey}`);
  }

  return cloneHelperGroup(helperGroup);
}

export function buildEnterpriseIntegrationPlaneView(): BidviaEnterpriseIntegrationPlaneView {
  const adoptionStatus = requireEnterpriseIntegrationAdoptionStatus();

  return {
    adoptionStatus: {
      ...adoptionStatus,
      notes: [...adoptionStatus.notes],
    },
    visibilityBoundary: {
      boundedCommercialUniverseOnly: true,
      broaderEnterpriseAuthorityClaimed: false,
      broaderSystemAuthorityClaimed: false,
      notes: [
        'This adapter exposes the frozen Core integration route family plus bounded support slices already present in this repo.',
        'It does not claim broader enterprise or system authority.',
      ],
    },
    packetTruthBoundary: {
      payloadPacketStatus: 'packet-grounded',
      blockedBy: null,
      packetCompleteFieldFamilies: [
        'identity-mapping-fields',
        'account-integration-capability-read-models',
        'account-agent-invocation-eligibility-read-models',
        'attachment-document-media-evidence-visibility',
      ],
      inventedPacketFieldsBlocked: true,
      notes: [
        'Enterprise packet truth now derives from the frozen Core visibility, identity-mapping, and bounded account integration ownership payload fields.',
      ],
    },
    helperGroups: listEnterpriseIntegrationPlaneHelperGroups(),
  };
}

export function buildEnterpriseIntegrationPlaneCliSnapshot() {
  const plane = buildEnterpriseIntegrationPlaneView();

  return {
    adoptionStatus: plane.adoptionStatus,
    visibilityBoundary: plane.visibilityBoundary,
    packetTruthBoundary: plane.packetTruthBoundary,
    helperGroups: plane.helperGroups.map((helperGroup) => ({
      groupKey: helperGroup.groupKey,
      label: helperGroup.label,
      cliCommands: [...helperGroup.cliCommands],
      discoveryHelperKeys: [...helperGroup.discoveryHelperKeys],
    })),
  };
}
