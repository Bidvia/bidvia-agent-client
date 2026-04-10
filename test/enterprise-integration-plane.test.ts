import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';

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
    'attachment-document-media-evidence-visibility',
  ]);
  assert.equal(plane.packetTruthBoundary.inventedPacketFieldsBlocked, true);
  assert.deepEqual(plane.helperGroups.map((group) => group.groupKey), [
    'core-integration-routes',
    'asset-evidence-family',
    'evidence-submission',
    'commercial-action',
    'governed-proposals',
    'opportunity-handoffs',
  ]);
  assert.deepEqual(plane.helperGroups.find((group) => group.groupKey === 'core-integration-routes'), {
    groupKey: 'core-integration-routes',
    label: 'Canonical Core enterprise integration routes',
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
    notes: ['The enterprise plane is anchored to the Core-owned integration route family and visibility boundaries.'],
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
      'listFileResources',
      'getFileResource',
      'listTargetAttachmentBindings',
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
      'file-resources',
      'file-resource',
      'target-attachment-bindings',
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
      'listFileResources',
      'getFileResource',
      'listTargetAttachmentBindings',
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
