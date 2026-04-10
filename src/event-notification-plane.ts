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
  notes: ['Expose frozen notification visibility now and fail closed on packet-incomplete execution semantics.'],
};

const eventNotificationVisibilityOnlyHelperKeys = ['getNotification'] as const;

const eventNotificationBlockedExecutionRoutes: BidviaEventNotificationPlaneView['blockedExecutionRoutes'] = [
  {
    helperKey: 'createNotificationDelivery',
    routePathTemplate: '/runtime/notifications/deliveries',
    httpMethod: 'POST',
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: ['Delivery payload fields are not packet-complete yet, so execution stays blocked.'],
  },
  {
    helperKey: 'acknowledgeNotification',
    routePathTemplate: '/runtime/notifications/:notification_id/acknowledgements',
    httpMethod: 'POST',
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: ['Acknowledgement payload fields are not packet-complete yet, so execution stays blocked.'],
  },
  {
    helperKey: 'retryNotification',
    routePathTemplate: '/runtime/notifications/:notification_id/retry',
    httpMethod: 'POST',
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: ['Retry payload fields are not packet-complete yet, so execution stays blocked.'],
  },
  {
    helperKey: 'expireNotification',
    routePathTemplate: '/runtime/notifications/:notification_id/expire',
    httpMethod: 'POST',
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: ['Expire payload fields are not packet-complete yet, so execution stays blocked.'],
  },
];

const eventNotificationCapabilityModeByHelperKey = new Map<string, BidviaEventNotificationPlaneCapabilityMode>([
  ...eventNotificationVisibilityOnlyHelperKeys.map(
    (helperKey): readonly [string, BidviaEventNotificationPlaneCapabilityMode] => [helperKey, 'visibility-only'],
  ),
  ...eventNotificationBlockedExecutionRoutes.map(
    (route): readonly [string, BidviaEventNotificationPlaneCapabilityMode] => [route.helperKey, 'blocked-pending-packet'],
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
      payloadPacketStatus: 'blocked-pending-packet',
      blockedBy: 'core-plane-payload-packet-not-yet-frozen',
      localOnly: true,
      remotePayloadSupported: false,
      notes: [
        'Do not reuse local hook or journal data as if it were Core notification truth.',
        'Keep delivery, acknowledgement, retry, and expire helpers unavailable until Core freezes packet-complete payloads.',
      ],
    },
  };
}

export function getEventNotificationPlaneCapabilityMode(
  helperKey: string,
): BidviaEventNotificationPlaneCapabilityMode | undefined {
  return eventNotificationCapabilityModeByHelperKey.get(helperKey);
}
