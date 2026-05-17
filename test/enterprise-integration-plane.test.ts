import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';
import {
  getCorePayloadContractMatrixEntry,
  listCorePayloadContractEntriesForPlane,
} from '../src/core-payload-contract-matrix.ts';

test('enterprise integration matrix exposes the current canonical integration-app lifecycle subset plus bounded eligibility routes', () => {
  const ownershipEntries = listCorePayloadContractEntriesForPlane('enterprise-integration').filter((entry) =>
    entry.helperKey === 'listPublicIntegrationApps'
    || entry.helperKey === 'createAccountIntegrationApp'
    || entry.helperKey === 'listAccountIntegrationApps'
    || entry.helperKey === 'createAccountIntegrationInstallation'
    || entry.helperKey === 'listAccountIntegrationInstallations'
    || entry.helperKey === 'connectAccountIntegrationInstallation'
    || entry.helperKey === 'listAccountIntegrationCapabilities'
    || entry.helperKey === 'getAccountAgentIntegrationEligibility'
  );

  assert.deepEqual(
    ownershipEntries.map((entry) => entry.helperKey),
    [
      'listPublicIntegrationApps',
      'listAccountIntegrationApps',
      'listAccountIntegrationInstallations',
      'listAccountIntegrationCapabilities',
      'getAccountAgentIntegrationEligibility',
      'createAccountIntegrationApp',
      'createAccountIntegrationInstallation',
      'connectAccountIntegrationInstallation',
    ],
  );
  assert.equal(
    getCorePayloadContractMatrixEntry('listPublicIntegrationApps')?.routePathTemplate,
    '/runtime/public/integration-apps',
  );
  assert.equal(
    getCorePayloadContractMatrixEntry('createAccountIntegrationApp')?.routePathTemplate,
    '/runtime/account/integration-apps',
  );
  assert.equal(
    getCorePayloadContractMatrixEntry('listAccountIntegrationApps')?.routePathTemplate,
    '/runtime/account/integration-apps',
  );
  assert.equal(
    getCorePayloadContractMatrixEntry('createAccountIntegrationInstallation')?.routePathTemplate,
    '/runtime/account/integration-installations',
  );
  assert.equal(
    getCorePayloadContractMatrixEntry('listAccountIntegrationInstallations')?.routePathTemplate,
    '/runtime/account/integration-installations',
  );
  assert.equal(
    getCorePayloadContractMatrixEntry('connectAccountIntegrationInstallation')?.routePathTemplate,
    '/runtime/account/integration-installations/:integrationInstallationId/connection',
  );
  assert.equal(
    getCorePayloadContractMatrixEntry('getAccountAgentIntegrationEligibility')?.routePathTemplate,
    '/runtime/account/agents/:agentId/integrations/:integrationCode/eligibility',
  );
});

test('enterprise integration plane adapter centers the canonical core integration route family without broader authority claims', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.buildEnterpriseIntegrationPlaneView, 'function');

  const plane = (exports.buildEnterpriseIntegrationPlaneView as () => {
    adoptionStatus: {
      plane: string;
      payloadPacketStatus: string;
      blockedBy: string | null;
    };
    visibilityBoundary: {
      boundedCommercialUniverseOnly: boolean;
      broaderEnterpriseAuthorityClaimed: boolean;
      broaderSystemAuthorityClaimed: boolean;
    };
    packetTruthBoundary: {
      payloadPacketStatus: string;
      blockedBy: string | null;
      packetCompleteFieldFamilies: string[];
      inventedPacketFieldsBlocked: boolean;
    };
    helperGroups: Array<{
      groupKey: string;
      label: string;
      helperKeys: string[];
      clientMethods: string[];
      cliCommands: string[];
      discoveryHelperKeys: string[];
      broaderEnterpriseAuthorityClaimed: boolean;
      broaderSystemAuthorityClaimed: boolean;
      payloadPacketStatus: string;
      blockedBy: string | null;
      notes: string[];
    }>;
  })();

  assert.equal(plane.adoptionStatus.plane, 'enterprise-integration');
  assert.equal(plane.adoptionStatus.payloadPacketStatus, 'packet-grounded');
  assert.equal(plane.adoptionStatus.blockedBy, null);
  assert.equal(plane.visibilityBoundary.boundedCommercialUniverseOnly, true);
  assert.equal(plane.visibilityBoundary.broaderEnterpriseAuthorityClaimed, false);
  assert.equal(plane.visibilityBoundary.broaderSystemAuthorityClaimed, false);
  assert.equal(plane.packetTruthBoundary.payloadPacketStatus, 'packet-grounded');
  assert.equal(plane.packetTruthBoundary.blockedBy, null);
  assert.deepEqual(plane.packetTruthBoundary.packetCompleteFieldFamilies, [
    'identity-mapping-fields',
    'account-integration-capability-read-models',
    'account-agent-invocation-eligibility-read-models',
    'attachment-document-media-evidence-visibility',
  ]);
  assert.equal(plane.packetTruthBoundary.inventedPacketFieldsBlocked, true);
  assert.deepEqual(plane.helperGroups.map((group) => group.groupKey), [
    'integration-ownership-slice',
    'compatibility-provider-routes',
    'asset-evidence-family',
    'evidence-submission',
    'commercial-action',
    'governed-proposals',
    'opportunity-handoffs',
  ]);
  assert.deepEqual(plane.helperGroups.find((group) => group.groupKey === 'integration-ownership-slice'), {
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
    payloadPacketStatus: 'packet-grounded',
    blockedBy: null,
    notes: [
      'The V14 canonical integration trunk includes the public and account integration-app directory, installation, installation-connection, capability, and bounded account-agent eligibility truth.',
      'The bounded inbound invocation route remains canonical ownership metadata but stays fail-closed here until Core freezes an open-client request body.',
    ],
  });
  assert.deepEqual(plane.helperGroups.find((group) => group.groupKey === 'compatibility-provider-routes'), {
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
  });
  assert.deepEqual(plane.helperGroups.find((group) => group.groupKey === 'asset-evidence-family'), {
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
    payloadPacketStatus: 'packet-grounded',
    blockedBy: null,
    notes: ['Descriptive asset/document/media/evidence consumption stays bounded to the commercial-universe integration surface.'],
  });
  assert.deepEqual(plane.helperGroups.find((group) => group.groupKey === 'commercial-action'), {
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
    payloadPacketStatus: 'packet-grounded',
    blockedBy: null,
    notes: ['Commercial-action helpers stay bounded support and do not define the enterprise integration plane itself.'],
  });
});
