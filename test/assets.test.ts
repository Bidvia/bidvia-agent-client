import test from 'node:test';
import assert from 'node:assert/strict';

import type {
  BidviaAssetConsumption,
  BidviaAssetExplanation,
  BidviaAttachmentBinding,
  BidviaDocumentArtifact,
  BidviaEvidenceAsset,
  BidviaFileResource,
  BidviaMediaAsset,
} from '../src/contracts.ts';

function expectAssetConsumption(value: BidviaAssetConsumption): BidviaAssetConsumption {
  return value;
}

function expectAssetExplanation(value: BidviaAssetExplanation): BidviaAssetExplanation {
  return value;
}

test('asset contracts keep file, document, evidence, media, and attachment binding semantics distinct', () => {
  const fileResource: BidviaFileResource = {
    fileResourceId: 'file-1',
    storageRef: 's3://assets/file-1.bin',
    fileName: 'inspection-report.pdf',
    mimeType: 'application/pdf',
    byteSize: 2048,
    observedAt: '2026-03-27T01:00:00.000Z',
  };

  const documentArtifact: BidviaDocumentArtifact = {
    documentArtifactId: 'doc-1',
    fileResourceId: 'file-1',
    artifactType: 'inspection-report',
    title: 'Warehouse inspection report',
    observedAt: '2026-03-27T01:05:00.000Z',
  };

  const evidenceAsset: BidviaEvidenceAsset = {
    evidenceAssetId: 'evidence-1',
    assetKind: 'inspection-proof',
    fileResourceId: 'file-1',
    documentArtifactId: 'doc-1',
    summary: 'Inspection evidence attached for review',
    observedAt: '2026-03-27T01:10:00.000Z',
    ownerRef: 'company://supplier-a',
    lineageRefs: ['capture://inspection/1'],
  };

  const mediaAsset: BidviaMediaAsset = {
    mediaAssetId: 'media-1',
    mediaType: 'image',
    fileResourceId: 'file-1',
    previewRef: 'https://preview.bidvia.test/media-1',
    observedAt: '2026-03-27T01:12:00.000Z',
  };

  const attachmentBinding: BidviaAttachmentBinding = {
    attachmentBindingId: 'binding-1',
    targetRef: 'listing://listing-1',
    assetRef: 'evidence-1',
    role: 'verification-support',
    visibility: 'review-safe',
    ownerRef: 'company://supplier-a',
    lineageRefs: ['capture://inspection/1', 'review-packet://wave-2/1'],
    intendedGovernanceEffect: 'support-review',
    observedAt: '2026-03-27T01:15:00.000Z',
  };

  const consumption: BidviaAssetConsumption = {
    fileResource,
    documentArtifact,
    evidenceAsset,
    mediaAsset,
    attachmentBinding,
  };

  assert.equal(expectAssetConsumption(consumption).fileResource.fileResourceId, 'file-1');
  assert.equal(consumption.documentArtifact.documentArtifactId, 'doc-1');
  assert.equal(consumption.evidenceAsset.evidenceAssetId, 'evidence-1');
  assert.equal(consumption.mediaAsset.mediaAssetId, 'media-1');
  assert.equal(consumption.attachmentBinding.attachmentBindingId, 'binding-1');

  // @ts-expect-error evidence assets are not attachment bindings
  const invalidAttachmentBinding: BidviaAttachmentBinding = evidenceAsset;

  void invalidAttachmentBinding;
});

test('asset helpers consume asset families and explain binding context without finalizing qualification truth', async () => {
  const assetsModule = await import('../src/index.ts');

  assert.equal(typeof assetsModule.consumeAssetObjectFamily, 'function');
  assert.equal(typeof assetsModule.explainAssetConsumption, 'function');

  const consumption = assetsModule.consumeAssetObjectFamily({
    fileResource: {
      fileResourceId: 'file-1',
      storageRef: 's3://assets/file-1.bin',
      fileName: 'inspection-report.pdf',
      mimeType: 'application/pdf',
      byteSize: 2048,
      observedAt: '2026-03-27T01:00:00.000Z',
    },
    documentArtifact: {
      documentArtifactId: 'doc-1',
      fileResourceId: 'file-1',
      artifactType: 'inspection-report',
      title: 'Warehouse inspection report',
      observedAt: '2026-03-27T01:05:00.000Z',
    },
    evidenceAsset: {
      evidenceAssetId: 'evidence-1',
      assetKind: 'inspection-proof',
      fileResourceId: 'file-1',
      documentArtifactId: 'doc-1',
      summary: 'Inspection evidence attached for review',
      observedAt: '2026-03-27T01:10:00.000Z',
      ownerRef: 'company://supplier-a',
      lineageRefs: ['capture://inspection/1'],
    },
    mediaAsset: {
      mediaAssetId: 'media-1',
      mediaType: 'image',
      fileResourceId: 'file-1',
      previewRef: 'https://preview.bidvia.test/media-1',
      observedAt: '2026-03-27T01:12:00.000Z',
    },
    attachmentBinding: {
      attachmentBindingId: 'binding-1',
      targetRef: 'listing://listing-1',
      assetRef: 'evidence-1',
      role: 'verification-support',
      visibility: 'review-safe',
      ownerRef: 'company://supplier-a',
      lineageRefs: ['capture://inspection/1', 'review-packet://wave-2/1'],
      intendedGovernanceEffect: 'support-review',
      observedAt: '2026-03-27T01:15:00.000Z',
    },
  });

  const explanation = assetsModule.explainAssetConsumption(consumption);

  assert.equal(expectAssetConsumption(consumption).attachmentBinding.role, 'verification-support');
  assert.deepEqual(expectAssetExplanation(explanation), {
    fileResourceId: 'file-1',
    documentArtifactId: 'doc-1',
    evidenceAssetId: 'evidence-1',
    mediaAssetId: 'media-1',
    attachmentBindingId: 'binding-1',
    bindingContext: {
      targetRef: 'listing://listing-1',
      role: 'verification-support',
      visibility: 'review-safe',
      ownerRef: 'company://supplier-a',
      lineageRefs: ['capture://inspection/1', 'review-packet://wave-2/1'],
      intendedGovernanceEffect: 'support-review',
    },
    explanationLines: [
      'file resource file-1 carries the stored bytes for document artifact doc-1 (Warehouse inspection report)',
      'document artifact doc-1 structures file resource file-1 as inspection-report',
      'evidence asset evidence-1 references file resource file-1 and document artifact doc-1',
      'media asset media-1 references file resource file-1 as image media',
      'attachment binding binding-1 links asset evidence-1 to listing://listing-1 with role verification-support and visibility review-safe',
      'binding context remains descriptive consumption data and does not finalize evidence qualification or attachment authority',
    ],
  });
  assert.equal('qualified' in explanation, false);
  assert.equal(explanation.explanationLines.at(-1)?.includes('does not finalize'), true);
});

test('asset helpers expose their enterprise integration boundary without claiming broader authority', async () => {
  const assetsModule = await import('../src/index.ts');

  assert.equal(typeof assetsModule.buildEnterpriseAssetIntegrationBoundary, 'function');

  const boundary = assetsModule.buildEnterpriseAssetIntegrationBoundary();

  assert.equal(boundary.groupKey, 'asset-evidence-family');
  assert.deepEqual(boundary.helperKeys, ['consumeAssetObjectFamily', 'explainAssetConsumption']);
  assert.equal(boundary.broaderEnterpriseAuthorityClaimed, false);
  assert.equal(boundary.broaderSystemAuthorityClaimed, false);
  assert.equal(boundary.payloadPacketStatus, 'packet-grounded');
  assert.equal(boundary.blockedBy, null);
});
