import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';
import {
  buildCapabilityPlaneView,
  getCapabilityPlaneCapabilityMode,
} from '../src/capability-plane.ts';
import { buildLocalDiscoveryCatalog } from '../src/discovery-catalog.ts';
import { getMcpToolDescriptor } from '../src/mcp.ts';

test('capability-plane truth separates packet-grounded read helpers from compatibility-only refresh helpers', () => {
  const exports = publicSurface as Record<string, unknown>;
  const matrixEntries = (exports.listCorePayloadContractMatrixEntries as () => Array<{
    helperKey: string;
    capabilityPlaneCapabilityMode?: string | null;
  }>)();
  const capabilityPlane = buildCapabilityPlaneView() as unknown as {
    helperTruth?: {
      packetGroundedReadHelperKeys: string[];
      compatibilityOnlyHelperKeys: string[];
      dispatchEligibilityDerivedFromReadTruth: boolean;
      governedRunAuthorizationDerivedFromReadTruth: boolean;
      notes: string[];
    };
  };
  const packetGroundedReadHelperKeys = matrixEntries
    .filter((entry) => entry.capabilityPlaneCapabilityMode === 'packet-grounded-read')
    .map((entry) => entry.helperKey);
  const compatibilityOnlyHelperKeys = matrixEntries
    .filter((entry) => entry.capabilityPlaneCapabilityMode === 'compatibility-only')
    .map((entry) => entry.helperKey);

  assert.equal(getCapabilityPlaneCapabilityMode('getAgentReadiness'), 'packet-grounded-read');
  assert.equal(getCapabilityPlaneCapabilityMode('getAgentSummary'), 'packet-grounded-read');
  assert.equal(getCapabilityPlaneCapabilityMode('getAgentCapabilityProfile'), 'packet-grounded-read');
  assert.equal(getCapabilityPlaneCapabilityMode('listAuthorityProfiles'), 'packet-grounded-read');
  assert.equal(getCapabilityPlaneCapabilityMode('listCapabilityProfiles'), 'packet-grounded-read');
  assert.equal(getCapabilityPlaneCapabilityMode('refreshRemoteCapabilityTruth'), 'compatibility-only');
  assert.deepEqual(capabilityPlane.helperTruth, {
    packetGroundedReadHelperKeys,
    compatibilityOnlyHelperKeys,
    dispatchEligibilityDerivedFromReadTruth: false,
    governedRunAuthorizationDerivedFromReadTruth: false,
    notes: [
      'packet-grounded capability/readiness truth stays read-only and does not widen dispatch eligibility',
      'packet-grounded capability/readiness truth stays read-only and does not widen governed-run authorization',
    ],
  });
});

test('capability-plane packet-grounded read truth flows through local discovery and MCP descriptors without implying dispatch or governed-run eligibility', () => {
  const catalog = buildLocalDiscoveryCatalog();
  const readinessEntry = catalog.find((entry) => entry.helperKey === 'getAgentReadiness') as {
    capabilityPlaneCapabilityMode?: string;
    dispatchEligibilityDerivedFromCapabilityReadTruth?: boolean;
    governedRunAuthorizationDerivedFromCapabilityReadTruth?: boolean;
  };
  const summaryEntry = catalog.find((entry) => entry.helperKey === 'getAgentSummary') as {
    capabilityPlaneCapabilityMode?: string;
    dispatchEligibilityDerivedFromCapabilityReadTruth?: boolean;
    governedRunAuthorizationDerivedFromCapabilityReadTruth?: boolean;
  };
  const capabilityProfileEntry = catalog.find((entry) => entry.helperKey === 'getAgentCapabilityProfile') as {
    capabilityPlaneCapabilityMode?: string;
    dispatchEligibilityDerivedFromCapabilityReadTruth?: boolean;
    governedRunAuthorizationDerivedFromCapabilityReadTruth?: boolean;
  };
  const authorityProfilesEntry = catalog.find((entry) => entry.helperKey === 'listAuthorityProfiles') as {
    capabilityPlaneCapabilityMode?: string;
    dispatchEligibilityDerivedFromCapabilityReadTruth?: boolean;
    governedRunAuthorizationDerivedFromCapabilityReadTruth?: boolean;
  };
  const capabilityProfilesEntry = catalog.find((entry) => entry.helperKey === 'listCapabilityProfiles') as {
    capabilityPlaneCapabilityMode?: string;
    dispatchEligibilityDerivedFromCapabilityReadTruth?: boolean;
    governedRunAuthorizationDerivedFromCapabilityReadTruth?: boolean;
  };
  const readinessDescriptor = getMcpToolDescriptor('agent-readiness-read') as {
    capabilityPlaneCapabilityMode?: string;
    dispatchEligibilityDerivedFromCapabilityReadTruth?: boolean;
    governedRunAuthorizationDerivedFromCapabilityReadTruth?: boolean;
  };
  const summaryDescriptor = getMcpToolDescriptor('agent-summary-read') as {
    capabilityPlaneCapabilityMode?: string;
    dispatchEligibilityDerivedFromCapabilityReadTruth?: boolean;
    governedRunAuthorizationDerivedFromCapabilityReadTruth?: boolean;
  };
  const capabilityProfileDescriptor = getMcpToolDescriptor('agent-capability-profile-read') as {
    capabilityPlaneCapabilityMode?: string;
    dispatchEligibilityDerivedFromCapabilityReadTruth?: boolean;
    governedRunAuthorizationDerivedFromCapabilityReadTruth?: boolean;
  };

  assert.equal(
    readinessEntry.capabilityPlaneCapabilityMode,
    'packet-grounded-read',
  );
  assert.equal(readinessEntry.dispatchEligibilityDerivedFromCapabilityReadTruth, false);
  assert.equal(readinessEntry.governedRunAuthorizationDerivedFromCapabilityReadTruth, false);
  assert.equal(
    summaryEntry.capabilityPlaneCapabilityMode,
    'packet-grounded-read',
  );
  assert.equal(summaryEntry.dispatchEligibilityDerivedFromCapabilityReadTruth, false);
  assert.equal(summaryEntry.governedRunAuthorizationDerivedFromCapabilityReadTruth, false);
  assert.equal(
    capabilityProfileEntry.capabilityPlaneCapabilityMode,
    'packet-grounded-read',
  );
  assert.equal(capabilityProfileEntry.dispatchEligibilityDerivedFromCapabilityReadTruth, false);
  assert.equal(capabilityProfileEntry.governedRunAuthorizationDerivedFromCapabilityReadTruth, false);
  assert.equal(authorityProfilesEntry.capabilityPlaneCapabilityMode, 'packet-grounded-read');
  assert.equal(authorityProfilesEntry.dispatchEligibilityDerivedFromCapabilityReadTruth, false);
  assert.equal(authorityProfilesEntry.governedRunAuthorizationDerivedFromCapabilityReadTruth, false);
  assert.equal(capabilityProfilesEntry.capabilityPlaneCapabilityMode, 'packet-grounded-read');
  assert.equal(capabilityProfilesEntry.dispatchEligibilityDerivedFromCapabilityReadTruth, false);
  assert.equal(capabilityProfilesEntry.governedRunAuthorizationDerivedFromCapabilityReadTruth, false);

  assert.equal(
    readinessDescriptor.capabilityPlaneCapabilityMode,
    'packet-grounded-read',
  );
  assert.equal(readinessDescriptor.dispatchEligibilityDerivedFromCapabilityReadTruth, false);
  assert.equal(readinessDescriptor.governedRunAuthorizationDerivedFromCapabilityReadTruth, false);
  assert.equal(
    summaryDescriptor.capabilityPlaneCapabilityMode,
    'packet-grounded-read',
  );
  assert.equal(summaryDescriptor.dispatchEligibilityDerivedFromCapabilityReadTruth, false);
  assert.equal(summaryDescriptor.governedRunAuthorizationDerivedFromCapabilityReadTruth, false);
  assert.equal(
    capabilityProfileDescriptor.capabilityPlaneCapabilityMode,
    'packet-grounded-read',
  );
  assert.equal(capabilityProfileDescriptor.dispatchEligibilityDerivedFromCapabilityReadTruth, false);
  assert.equal(capabilityProfileDescriptor.governedRunAuthorizationDerivedFromCapabilityReadTruth, false);
});
