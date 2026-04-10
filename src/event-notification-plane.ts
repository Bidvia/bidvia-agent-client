import type {
  BidviaCorePlaneAdoptionStatus,
  BidviaEventNotificationPlaneCapabilityMode,
  BidviaEventNotificationPlaneExecutionRoute,
  BidviaNotificationAcknowledgementWriteInput,
  BidviaNotificationDeliveryWriteInput,
  BidviaNotificationExpirationWriteInput,
  BidviaNotificationRetryWriteInput,
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

const eventNotificationPlaneExecutionGates = listPlaneExecutionGates().filter((gate) => gate.plane === 'event-notification');

const eventNotificationVisibilityOnlyHelperKeys = eventNotificationPlaneExecutionGates
  .filter((gate) => gate.executionTruth === 'packet-grounded-read')
  .map((gate) => gate.helperKey as 'getNotification');

const eventNotificationExecutionGates = eventNotificationPlaneExecutionGates.filter(
  (gate) => gate.executionTruth === 'packet-grounded-execution',
);

function buildEventNotificationExecutionRoute(
  helperKey: BidviaEventNotificationPlaneExecutionRoute['helperKey'],
): BidviaEventNotificationPlaneExecutionRoute {
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
    routePathTemplate: matrixEntry.routePathTemplate as BidviaEventNotificationPlaneExecutionRoute['routePathTemplate'],
    httpMethod: 'POST',
    blockedBy: null,
    notes: [...executionGate.notes],
  };
}

const eventNotificationExecutionRoutes: BidviaEventNotificationPlaneView['executionRoutes'] =
  eventNotificationExecutionGates.map((gate) => (
    buildEventNotificationExecutionRoute(
      gate.helperKey as BidviaEventNotificationPlaneExecutionRoute['helperKey'],
    )
  ));

const eventNotificationCapabilityModeByHelperKey = new Map<string, BidviaEventNotificationPlaneCapabilityMode>([
  ...eventNotificationVisibilityOnlyHelperKeys.map(
    (helperKey): readonly [string, BidviaEventNotificationPlaneCapabilityMode] => [helperKey, 'visibility-only'],
  ),
  ...eventNotificationExecutionRoutes.map(
    (route): readonly [string, BidviaEventNotificationPlaneCapabilityMode] => [route.helperKey, 'packet-grounded-execution'],
  ),
]);

export function buildEventNotificationPlaneView(): BidviaEventNotificationPlaneView {
  const adoptionStatus = requireEventNotificationPlaneAdoptionStatus();
  const readRouteEntry = getCorePayloadContractMatrixEntry('getNotification');
  if (!readRouteEntry?.routePathTemplate) {
    throw new Error('Missing event notification read route in payload contract matrix');
  }

  return {
    adoptionStatus: {
      ...adoptionStatus,
      notes: [...adoptionStatus.notes],
    },
    capabilityModes: {
      visibilityOnlyHelperKeys: [...eventNotificationVisibilityOnlyHelperKeys],
      executionHelperKeys: eventNotificationExecutionRoutes.map((route) => route.helperKey),
    },
    readRoute: {
      helperKey: 'getNotification',
      routePathTemplate: readRouteEntry.routePathTemplate as '/runtime/notifications/:notification_id',
      httpMethod: 'GET',
      requiredContext: ['tenantId', 'principalId'],
    },
    notificationReadTruth: {
      payloadPacketStatus: 'packet-grounded',
      blockedBy: null,
      remotePayloadSupported: true,
      notes: ['Notification detail visibility is frozen and can be surfaced as a governed read without inventing execution payloads.'],
    },
    executionRoutes: eventNotificationExecutionRoutes.map((route) => ({
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

export function buildNotificationDeliveryBody(input: BidviaNotificationDeliveryWriteInput) {
  return {
    notification_id: input.notificationId,
    channel: input.channel,
    destination: input.destination,
    delivery_ref: input.deliveryRef,
    now: input.now,
  };
}

export function buildNotificationAcknowledgementBody(input: BidviaNotificationAcknowledgementWriteInput) {
  return {
    acknowledged_by: input.acknowledgedBy,
    now: input.now,
  };
}

export function buildNotificationRetryBody(input: BidviaNotificationRetryWriteInput) {
  return {
    retry_reason: input.retryReason,
    now: input.now,
  };
}

export function buildNotificationExpirationBody(input: BidviaNotificationExpirationWriteInput) {
  return {
    expiration_reason: input.expirationReason,
    now: input.now,
  };
}
