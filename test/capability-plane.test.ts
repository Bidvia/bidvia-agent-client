import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCapabilityPlaneView,
  getCapabilityPlaneCapabilityMode,
} from '../src/capability-plane.ts';
import { buildLocalDiscoveryCatalog } from '../src/discovery-catalog.ts';
import { getMcpToolDescriptor } from '../src/mcp.ts';

test('capability-plane truth separates packet-grounded read helpers from compatibility-only refresh helpers', () => {
  const capabilityPlane = buildCapabilityPlaneView() as {
    helperTruth?: {
      packetGroundedReadHelperKeys: string[];
      compatibilityOnlyHelperKeys: string[];
    };
  };

  assert.equal(getCapabilityPlaneCapabilityMode('getAgentReadiness'), 'packet-grounded-read');
  assert.equal(getCapabilityPlaneCapabilityMode('getAgentSummary'), 'packet-grounded-read');
  assert.equal(getCapabilityPlaneCapabilityMode('getAgentCapabilityProfile'), 'packet-grounded-read');
  assert.equal(getCapabilityPlaneCapabilityMode('refreshRemoteCapabilityTruth'), 'compatibility-only');
  assert.deepEqual(capabilityPlane.helperTruth, {
    packetGroundedReadHelperKeys: [
      'getAgentReadiness',
      'getAgentSummary',
      'getAgentCapabilityProfile',
    ],
    compatibilityOnlyHelperKeys: ['refreshRemoteCapabilityTruth'],
  });
});

test('capability-plane packet-grounded read truth flows through local discovery and MCP descriptors without widening refresh truth', () => {
  const catalog = buildLocalDiscoveryCatalog();

  assert.equal(
    (catalog.find((entry) => entry.helperKey === 'getAgentReadiness') as { capabilityPlaneCapabilityMode?: string })
      .capabilityPlaneCapabilityMode,
    'packet-grounded-read',
  );
  assert.equal(
    (catalog.find((entry) => entry.helperKey === 'getAgentSummary') as { capabilityPlaneCapabilityMode?: string })
      .capabilityPlaneCapabilityMode,
    'packet-grounded-read',
  );
  assert.equal(
    (catalog.find((entry) => entry.helperKey === 'getAgentCapabilityProfile') as { capabilityPlaneCapabilityMode?: string })
      .capabilityPlaneCapabilityMode,
    'packet-grounded-read',
  );

  assert.equal(
    (getMcpToolDescriptor('agent-readiness-read') as { capabilityPlaneCapabilityMode?: string }).capabilityPlaneCapabilityMode,
    'packet-grounded-read',
  );
  assert.equal(
    (getMcpToolDescriptor('agent-summary-read') as { capabilityPlaneCapabilityMode?: string }).capabilityPlaneCapabilityMode,
    'packet-grounded-read',
  );
  assert.equal(
    (getMcpToolDescriptor('agent-capability-profile-read') as { capabilityPlaneCapabilityMode?: string }).capabilityPlaneCapabilityMode,
    'packet-grounded-read',
  );
});
