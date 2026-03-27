import type {
  BidviaAssetConsumption,
  BidviaAssetExplanation,
  BidviaAttachmentBinding,
  BidviaDocumentArtifact,
  BidviaEvidenceAsset,
  BidviaFileResource,
  BidviaMediaAsset,
} from './contracts.js';

function cloneFileResource(fileResource: BidviaFileResource): BidviaFileResource {
  return {
    ...fileResource,
  };
}

function cloneDocumentArtifact(documentArtifact: BidviaDocumentArtifact): BidviaDocumentArtifact {
  return {
    ...documentArtifact,
  };
}

function cloneEvidenceAsset(evidenceAsset: BidviaEvidenceAsset): BidviaEvidenceAsset {
  return {
    ...evidenceAsset,
    lineageRefs: [...evidenceAsset.lineageRefs],
  };
}

function cloneMediaAsset(mediaAsset: BidviaMediaAsset): BidviaMediaAsset {
  return {
    ...mediaAsset,
  };
}

function cloneAttachmentBinding(attachmentBinding: BidviaAttachmentBinding): BidviaAttachmentBinding {
  return {
    ...attachmentBinding,
    lineageRefs: [...attachmentBinding.lineageRefs],
  };
}

function cloneAssetConsumption(input: BidviaAssetConsumption): BidviaAssetConsumption {
  return {
    fileResource: cloneFileResource(input.fileResource),
    documentArtifact: cloneDocumentArtifact(input.documentArtifact),
    evidenceAsset: cloneEvidenceAsset(input.evidenceAsset),
    mediaAsset: cloneMediaAsset(input.mediaAsset),
    attachmentBinding: cloneAttachmentBinding(input.attachmentBinding),
  };
}

function freezeAssetConsumption(input: BidviaAssetConsumption): BidviaAssetConsumption {
  Object.freeze(input.evidenceAsset.lineageRefs);
  Object.freeze(input.attachmentBinding.lineageRefs);
  Object.freeze(input.fileResource);
  Object.freeze(input.documentArtifact);
  Object.freeze(input.evidenceAsset);
  Object.freeze(input.mediaAsset);
  Object.freeze(input.attachmentBinding);
  return Object.freeze(input);
}

function freezeAssetExplanation(explanation: BidviaAssetExplanation): BidviaAssetExplanation {
  Object.freeze(explanation.bindingContext.lineageRefs);
  Object.freeze(explanation.bindingContext);
  Object.freeze(explanation.explanationLines);
  return Object.freeze(explanation);
}

export function consumeAssetObjectFamily(input: BidviaAssetConsumption): BidviaAssetConsumption {
  return freezeAssetConsumption(cloneAssetConsumption(input));
}

export function explainAssetConsumption(assetConsumption: BidviaAssetConsumption): BidviaAssetExplanation {
  const consumedAssets = consumeAssetObjectFamily(assetConsumption);

  return freezeAssetExplanation({
    fileResourceId: consumedAssets.fileResource.fileResourceId,
    documentArtifactId: consumedAssets.documentArtifact.documentArtifactId,
    evidenceAssetId: consumedAssets.evidenceAsset.evidenceAssetId,
    mediaAssetId: consumedAssets.mediaAsset.mediaAssetId,
    attachmentBindingId: consumedAssets.attachmentBinding.attachmentBindingId,
    bindingContext: {
      targetRef: consumedAssets.attachmentBinding.targetRef,
      role: consumedAssets.attachmentBinding.role,
      visibility: consumedAssets.attachmentBinding.visibility,
      ownerRef: consumedAssets.attachmentBinding.ownerRef,
      lineageRefs: [...consumedAssets.attachmentBinding.lineageRefs],
      intendedGovernanceEffect: consumedAssets.attachmentBinding.intendedGovernanceEffect,
    },
    explanationLines: [
      `file resource ${consumedAssets.fileResource.fileResourceId} carries the stored bytes for document artifact ${consumedAssets.documentArtifact.documentArtifactId} (${consumedAssets.documentArtifact.title})`,
      `document artifact ${consumedAssets.documentArtifact.documentArtifactId} structures file resource ${consumedAssets.fileResource.fileResourceId} as ${consumedAssets.documentArtifact.artifactType}`,
      `evidence asset ${consumedAssets.evidenceAsset.evidenceAssetId} references file resource ${consumedAssets.evidenceAsset.fileResourceId} and document artifact ${consumedAssets.evidenceAsset.documentArtifactId ?? 'unbound'}`,
      `media asset ${consumedAssets.mediaAsset.mediaAssetId} references file resource ${consumedAssets.mediaAsset.fileResourceId} as ${consumedAssets.mediaAsset.mediaType} media`,
      `attachment binding ${consumedAssets.attachmentBinding.attachmentBindingId} links asset ${consumedAssets.attachmentBinding.assetRef} to ${consumedAssets.attachmentBinding.targetRef} with role ${consumedAssets.attachmentBinding.role} and visibility ${consumedAssets.attachmentBinding.visibility}`,
      'binding context remains descriptive consumption data and does not finalize evidence qualification or attachment authority',
    ],
  });
}
