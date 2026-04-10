import type {
  BidviaCorePlaneAdoptionStatus,
  BidviaEventNotificationPlaneCapabilityMode,
  BidviaEventNotificationPlaneView,
} from './contracts.js';
import { getCorePlaneExecutionSummary } from './plane-execution-gate.js';

const eventNotificationPlaneAdoptionStatus: BidviaCorePlaneAdoptionStatus = {
  plane: 'event-notification',
  frozenInCore: true,
  payloadPacketStatus: 'blocked-pending-packet',
  ...getCorePlaneExecutionSummary('event-notification'),
  blockedBy: 'core-plane-payload-packet-not-yet-frozen',
  notes: ['Expose frozen notification payload truth directly from the authoritative Core payload contract matrix.'],
};

const eventNotificationVisibilityOnlyHelperKeys = ['getNotification'] as const;

const eventNotificationBlockedExecutionRoutes: BidviaEventNotificationPlaneView['blockedExecutionRoutes'] = [
  {
    helperKey: 'createNotificationDelivery',
    routePathTemplate: '/runtime/notifications/deliveries',
    httpMethod: 'POST',
    blockedBy: null,
    notes: ['Notification delivery now derives from the frozen Core notification action payload contract.'],
  },
  {
    helperKey: 'acknowledgeNotification',
    routePathTemplate: '/runtime/notifications/:notification_id/acknowledgements',
    httpMethod: 'POST',
    blockedBy: null,
    notes: ['Notification acknowledgement now derives from the frozen Core notification action payload contract.'],
  },
  {
    helperKey: 'retryNotification',
    routePathTemplate: '/runtime/notifications/:notification_id/retry',
    httpMethod: 'POST',
    blockedBy: null,
    notes: ['Notification retry now derives from the frozen Core notification action payload contract.'],
  },
  {
    helperKey: 'expireNotification',
    routePathTemplate: '/runtime/notifications/:notification_id/expire',
    httpMethod: 'POST',
    blockedBy: null,
    notes: ['Notification expiry now derives from the frozen Core notification action payload contract.'],
  },
];

const eventNotificationCapabilityModeByHelperKey = new Map<string, BidviaEventNotificationPlaneCapabilityMode>([
  ...eventNotificationVisibilityOnlyHelperKeys.map(
    (helperKey): readonly [string, BidviaEventNotificationPlaneCapabilityMode] => [helperKey, 'visibility-only'],
  ),
  ...eventNotificationBlockedExecutionRoutes.map(
    (route): readonly [string, BidviaEventNotificationPlaneCapabilityMode] => [route.helperKey, 'packet-grounded-execution'],
  ),
]);

export function buildEventNotificationPlaneView(): BidviaEventNotificationPlaneView {
  return {
    adoptionStatus: {
      ...eventNotificationPlaneAdoptionStatus,
      notes: [...eventNotificationPlaneAdoptionStatus.notes],
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
