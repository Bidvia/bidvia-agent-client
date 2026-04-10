import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';

test('enterprise integration plane adapter groups bounded enterprise helper families without broader authority claims', () => {
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
  assert.equal(plane.adoptionStatus.payloadPacketStatus, 'blocked-pending-packet');
  assert.equal(plane.adoptionStatus.blockedBy, 'core-plane-payload-packet-not-yet-frozen');
  assert.equal(plane.visibilityBoundary.boundedCommercialUniverseOnly, true);
  assert.equal(plane.visibilityBoundary.broaderEnterpriseAuthorityClaimed, false);
  assert.equal(plane.visibilityBoundary.broaderSystemAuthorityClaimed, false);
  assert.equal(plane.packetTruthBoundary.payloadPacketStatus, 'blocked-pending-packet');
  assert.equal(plane.packetTruthBoundary.blockedBy, 'core-plane-payload-packet-not-yet-frozen');
  assert.deepEqual(plane.packetTruthBoundary.packetCompleteFieldFamilies, []);
  assert.equal(plane.packetTruthBoundary.inventedPacketFieldsBlocked, true);
  assert.deepEqual(plane.helperGroups.map((group) => group.groupKey), [
    'asset-evidence-family',
    'evidence-submission',
    'commercial-action',
    'governed-proposals',
    'opportunity-handoffs',
  ]);
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
    payloadPacketStatus: 'blocked-pending-packet',
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: ['Descriptive asset/document/media/evidence consumption stays bounded to the commercial-universe integration surface.'],
  });
});
