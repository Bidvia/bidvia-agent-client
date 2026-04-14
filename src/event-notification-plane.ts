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
      routePathTemplate: readRouteEntry.routePathTemplate as '/runtime/account/agents/:agent_registration_id/notifications/:notification_id',
      httpMethod: 'GET',
      requiredContext: ['tenantId', 'principalId'],
    },
    notificationReadTruth: {
      payloadPacketStatus: 'packet-grounded',
      blockedBy: null,
      remotePayloadSupported: true,
      notes: ['Notification detail visibility is frozen as an account-scoped governed read without inventing extra execution payloads.'],
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
        'Notification acknowledgement is the only canonical packet-grounded consumer execution helper in this wave.',
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
    registration_id: input.registrationId,
    task_kind: input.taskKind,
    task_ref: input.taskRef,
    now: input.now,
    reason: input.reason,
  };
}

export function buildNotificationAcknowledgementBody(input: BidviaNotificationAcknowledgementWriteInput) {
  return {
    registration_id: input.registrationId,
    decision: input.decision,
    now: input.now,
    reason: input.reason,
  };
}

export function buildNotificationRetryBody(input: BidviaNotificationRetryWriteInput) {
  return {
    registration_id: input.registrationId,
    now: input.now,
    next_attempt_at: input.nextAttemptAt,
    reason: input.reason,
  };
}

export function buildNotificationExpirationBody(input: BidviaNotificationExpirationWriteInput) {
  return {
    registration_id: input.registrationId,
    now: input.now,
    reason: input.reason,
  };
}
