import type {
  BidviaCorePlaneAdoptionStatus,
  BidviaEventNotificationPlaneCapabilityMode,
  BidviaEventNotificationPlaneBlockedExecutionRoute,
  BidviaEventNotificationPlaneView,
} from './contracts.js';
import { getCorePayloadContractMatrixEntry } from './core-payload-contract-matrix.js';
import { listCorePlaneAdoptionStatuses } from './core-plane-adoption.js';
import { listPlaneExecutionGates } from './plane-execution-gate.js';

function requireEventNotificationPlaneAdoptionStatus(): BidviaCorePlaneAdoptionStatus {
  const adoptionStatus = listCorePlaneAdoptionStatuses().find((status) => status.plane === 'event-notification');
  if (!adoptionStatus) {
    throw new Error('Missing core plane adoption status for event notification');
  }

  return adoptionStatus;
}

const eventNotificationVisibilityOnlyHelperKeys = ['getNotification'] as const;

const eventNotificationExecutionGates = listPlaneExecutionGates().filter(
  (gate) => gate.plane === 'event-notification' && gate.executionTruth === 'packet-grounded-execution',
);

function buildEventNotificationBlockedExecutionRoute(
  helperKey: BidviaEventNotificationPlaneBlockedExecutionRoute['helperKey'],
): BidviaEventNotificationPlaneBlockedExecutionRoute {
  const executionGate = eventNotificationExecutionGates.find((gate) => gate.helperKey === helperKey);
  if (!executionGate) {
    throw new Error(`Missing event notification execution gate for ${helperKey}`);
  }

  const matrixEntry = getCorePayloadContractMatrixEntry(helperKey);
  if (!matrixEntry?.routePathTemplate) {
    throw new Error(`Missing event notification route path for ${helperKey}`);
  }

  return {
    helperKey,
    routePathTemplate: matrixEntry.routePathTemplate as BidviaEventNotificationPlaneBlockedExecutionRoute['routePathTemplate'],
    httpMethod: 'POST',
    blockedBy: null,
    notes: [...executionGate.notes],
  };
}

const eventNotificationBlockedExecutionRoutes: BidviaEventNotificationPlaneView['blockedExecutionRoutes'] =
  eventNotificationExecutionGates.map((gate) => (
    buildEventNotificationBlockedExecutionRoute(
      gate.helperKey as BidviaEventNotificationPlaneBlockedExecutionRoute['helperKey'],
    )
  ));

const eventNotificationCapabilityModeByHelperKey = new Map<string, BidviaEventNotificationPlaneCapabilityMode>([
  ...eventNotificationVisibilityOnlyHelperKeys.map(
    (helperKey): readonly [string, BidviaEventNotificationPlaneCapabilityMode] => [helperKey, 'visibility-only'],
  ),
  ...eventNotificationBlockedExecutionRoutes.map(
    (route): readonly [string, BidviaEventNotificationPlaneCapabilityMode] => [route.helperKey, 'packet-grounded-execution'],
  ),
]);

export function buildEventNotificationPlaneView(): BidviaEventNotificationPlaneView {
  const adoptionStatus = requireEventNotificationPlaneAdoptionStatus();

  return {
    adoptionStatus: {
      ...adoptionStatus,
      notes: [...adoptionStatus.notes],
    },
    capabilityModes: {
      visibilityOnlyHelperKeys: [...eventNotificationVisibilityOnlyHelperKeys],
      blockedExecutionHelperKeys: eventNotificationBlockedExecutionRoutes.map((route) => route.helperKey),
    },
    readRoute: {
      helperKey: 'getNotification',
      routePathTemplate: '/runtime/notifications/:notification_id',
      httpMethod: 'GET',
      requiredContext: ['tenantId', 'principalId'],
    },
    notificationReadTruth: {
      payloadPacketStatus: 'packet-grounded',
      blockedBy: null,
      remotePayloadSupported: true,
      notes: ['Notification detail visibility is frozen and can be surfaced as a governed read without inventing execution payloads.'],
    },
    blockedExecutionRoutes: eventNotificationBlockedExecutionRoutes.map((route) => ({
      ...route,
      notes: [...route.notes],
    })),
    executionTruth: {
      payloadPacketStatus: 'packet-grounded',
      blockedBy: null,
      localOnly: false,
      remotePayloadSupported: true,
      notes: [
        'Notification execution helpers now derive from frozen Core delivery, acknowledgement, retry, and expire payloads.',
        'Local hooks and journaling remain derived layers, not canonical notification truth.',
      ],
    },
  };
}

export function getEventNotificationPlaneCapabilityMode(
  helperKey: string,
): BidviaEventNotificationPlaneCapabilityMode | undefined {
  return eventNotificationCapabilityModeByHelperKey.get(helperKey);
}
