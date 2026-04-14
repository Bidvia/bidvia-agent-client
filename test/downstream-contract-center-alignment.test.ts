import test from 'node:test';
import assert from 'node:assert/strict';

import { buildEventNotificationPlaneView } from '../src/index.ts';
import {
  buildLocalDiscoveryCatalog,
  buildLocalRouteCapabilityCatalog,
} from '../src/discovery-catalog.ts';

function listRouteTemplates() {
  return buildLocalRouteCapabilityCatalog().map((entry) => entry.routePathTemplate);
}

function listDiscoveryRouteTemplates() {
  return buildLocalDiscoveryCatalog().map((entry) => entry.routePathTemplate);
}

function getRouteTemplateByHelperKey(helperKey: string) {
  return buildLocalRouteCapabilityCatalog().find((entry) => entry.helperKey === helperKey)?.routePathTemplate;
}

test('local route capability catalog uses account-scoped canonical task consumer routes', () => {
  const discoveryRoutes = listDiscoveryRouteTemplates();

  assert.equal(getRouteTemplateByHelperKey('listTaskDispatches'), '/runtime/account/agents/:agentId/task-dispatches');
  assert.equal(getRouteTemplateByHelperKey('getTaskDispatch'), '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId');
  assert.equal(getRouteTemplateByHelperKey('createClaim'), '/runtime/account/agents/:agentId/claims');
  assert.equal(getRouteTemplateByHelperKey('acceptClaim'), '/runtime/account/agents/:agentId/claims/:claimId/accept');
  assert.equal(getRouteTemplateByHelperKey('rejectClaim'), '/runtime/account/agents/:agentId/claims/:claimId/reject');
  assert.equal(getRouteTemplateByHelperKey('createLease'), '/runtime/account/agents/:agentId/leases');
  assert.equal(getRouteTemplateByHelperKey('completeTaskDispatch'), '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/complete');
  assert.equal(getRouteTemplateByHelperKey('failTaskDispatch'), '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/fail');

  assert.ok(
    discoveryRoutes.includes('/runtime/account/agents/:agentId/task-dispatches'),
    'Expected local discovery catalog to include canonical account-scoped task dispatch list route',
  );
  assert.ok(
    discoveryRoutes.includes('/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId'),
    'Expected local discovery catalog to include canonical account-scoped task dispatch detail route',
  );
  assert.ok(
    discoveryRoutes.includes('/runtime/account/agents/:agentId/claims'),
    'Expected local discovery catalog to include canonical account-scoped claim creation route',
  );
  assert.ok(
    discoveryRoutes.includes('/runtime/account/agents/:agentId/claims/:claimId/accept'),
    'Expected local discovery catalog to include canonical account-scoped claim accept route',
  );
  assert.ok(
    discoveryRoutes.includes('/runtime/account/agents/:agentId/claims/:claimId/reject'),
    'Expected local discovery catalog to include canonical account-scoped claim reject route',
  );
  assert.ok(
    discoveryRoutes.includes('/runtime/account/agents/:agentId/leases'),
    'Expected local discovery catalog to include canonical account-scoped lease route',
  );
  assert.ok(
    discoveryRoutes.includes('/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/complete'),
    'Expected local discovery catalog to include canonical account-scoped task completion route',
  );
  assert.ok(
    discoveryRoutes.includes('/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/fail'),
    'Expected local discovery catalog to include canonical account-scoped task failure route',
  );
});

test('local discovery surfaces include the canonical account-scoped notification consumer routes', () => {
  const capabilityRoutes = listRouteTemplates();
  const discoveryRoutes = listDiscoveryRouteTemplates();

  assert.ok(
    capabilityRoutes.includes('/runtime/account/agents/:agentId/notifications'),
    'Expected route capability catalog to include canonical account-scoped notification list route',
  );
  assert.ok(
    discoveryRoutes.includes('/runtime/account/agents/:agentId/notifications'),
    'Expected local discovery catalog to include canonical account-scoped notification list route',
  );
  assert.equal(getRouteTemplateByHelperKey('getNotification'), '/runtime/account/agents/:agentId/notifications/:notificationId');
  assert.ok(
    capabilityRoutes.includes('/runtime/account/agents/:agentId/notifications/:notificationId'),
    'Expected route capability catalog to include canonical account-scoped notification detail route',
  );
  assert.ok(
    discoveryRoutes.includes('/runtime/account/agents/:agentId/notifications/:notificationId'),
    'Expected local discovery catalog to include canonical account-scoped notification detail route',
  );
  assert.equal(getRouteTemplateByHelperKey('acknowledgeNotification'), '/runtime/account/agents/:agentId/notifications/:notificationId/acknowledgements');
  assert.ok(
    capabilityRoutes.includes('/runtime/account/agents/:agentId/notifications/:notificationId/acknowledgements'),
    'Expected route capability catalog to include canonical account-scoped notification acknowledgement route',
  );
  assert.ok(
    discoveryRoutes.includes('/runtime/account/agents/:agentId/notifications/:notificationId/acknowledgements'),
    'Expected local discovery catalog to include canonical account-scoped notification acknowledgement route',
  );
});

test('event notification plane keeps acknowledgement as the only canonical execution route in this wave', () => {
  const plane = buildEventNotificationPlaneView();

  assert.equal(
    plane.readRoute.routePathTemplate,
    '/runtime/account/agents/:agentId/notifications/:notificationId',
  );
  assert.deepEqual(
    plane.executionRoutes.map((route) => route.routePathTemplate),
    ['/runtime/account/agents/:agentId/notifications/:notificationId/acknowledgements'],
  );
  assert.deepEqual(plane.capabilityModes.executionHelperKeys, ['acknowledgeNotification']);
});

test('dispatch-authority route family is present in local canonical route surfaces', () => {
  const capabilityRoutes = listRouteTemplates();
  const discoveryRoutes = listDiscoveryRouteTemplates();

  assert.ok(
    capabilityRoutes.includes('/runtime/account/agents/:agentId/dispatch-authority'),
    'Expected route capability catalog to include canonical dispatch-authority read route',
  );
  assert.ok(
    capabilityRoutes.includes('/runtime/account/agents/:agentId/dispatch-authority-requests'),
    'Expected route capability catalog to include canonical dispatch-authority request route',
  );
  assert.ok(
    discoveryRoutes.includes('/runtime/account/agents/:agentId/dispatch-authority'),
    'Expected local discovery catalog to include canonical dispatch-authority read route',
  );
  assert.ok(
    discoveryRoutes.includes('/runtime/account/agents/:agentId/dispatch-authority-requests'),
    'Expected local discovery catalog to include canonical dispatch-authority request route',
  );
});

test('old registration-scoped and operator-style routes are not treated as canonical downstream consumer truth', () => {
  const capabilityRoutes = listRouteTemplates();
  const discoveryRoutes = listDiscoveryRouteTemplates();

  assert.ok(
    !capabilityRoutes.includes('/runtime/agents/:agent_registration_id/task-dispatches'),
    'Route capability catalog should not treat registration-scoped task dispatch list route as canonical downstream consumer truth',
  );
  assert.ok(
    !capabilityRoutes.includes('/runtime/agents/:agent_registration_id/task-dispatches/:task_dispatch_id'),
    'Route capability catalog should not treat registration-scoped task dispatch detail route as canonical downstream consumer truth',
  );
  assert.ok(
    !capabilityRoutes.includes('/runtime/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/complete'),
    'Route capability catalog should not treat registration-scoped task completion route as canonical downstream consumer truth',
  );
  assert.ok(
    !capabilityRoutes.includes('/runtime/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/fail'),
    'Route capability catalog should not treat registration-scoped task failure route as canonical downstream consumer truth',
  );
  assert.ok(
    !capabilityRoutes.includes('/runtime/agents/:agent_registration_id/claims'),
    'Route capability catalog should not treat registration-scoped claim creation route as canonical downstream consumer truth',
  );
  assert.ok(
    !capabilityRoutes.includes('/runtime/agents/:agent_registration_id/claims/:claim_id/accept'),
    'Route capability catalog should not treat registration-scoped claim accept route as canonical downstream consumer truth',
  );
  assert.ok(
    !capabilityRoutes.includes('/runtime/agents/:agent_registration_id/claims/:claim_id/reject'),
    'Route capability catalog should not treat registration-scoped claim reject route as canonical downstream consumer truth',
  );
  assert.ok(
    !capabilityRoutes.includes('/runtime/agents/:agent_registration_id/leases'),
    'Route capability catalog should not treat registration-scoped lease route as canonical downstream consumer truth',
  );
  assert.ok(
    !capabilityRoutes.includes('/runtime/notifications/:notification_id'),
    'Route capability catalog should not treat operator-style notification detail route as canonical downstream consumer truth',
  );
  assert.ok(
    !capabilityRoutes.includes('/runtime/notifications/deliveries'),
    'Route capability catalog should not treat operator-style notification delivery route as canonical downstream consumer truth',
  );
  assert.ok(
    !capabilityRoutes.includes('/runtime/notifications/:notification_id/acknowledgements'),
    'Route capability catalog should not treat operator-style notification acknowledgement route as canonical downstream consumer truth',
  );
  assert.ok(
    !capabilityRoutes.includes('/runtime/notifications/:notification_id/retry'),
    'Route capability catalog should not treat operator-style notification retry route as canonical downstream consumer truth',
  );
  assert.ok(
    !capabilityRoutes.includes('/runtime/notifications/:notification_id/expire'),
    'Route capability catalog should not treat operator-style notification expiry route as canonical downstream consumer truth',
  );

  assert.ok(
    !discoveryRoutes.includes('/runtime/agents/:agent_registration_id/task-dispatches'),
    'Local discovery catalog should not advertise registration-scoped task dispatch list route as canonical downstream consumer truth',
  );
  assert.ok(
    !discoveryRoutes.includes('/runtime/agents/:agent_registration_id/task-dispatches/:task_dispatch_id'),
    'Local discovery catalog should not advertise registration-scoped task dispatch detail route as canonical downstream consumer truth',
  );
  assert.ok(
    !discoveryRoutes.includes('/runtime/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/complete'),
    'Local discovery catalog should not advertise registration-scoped task completion route as canonical downstream consumer truth',
  );
  assert.ok(
    !discoveryRoutes.includes('/runtime/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/fail'),
    'Local discovery catalog should not advertise registration-scoped task failure route as canonical downstream consumer truth',
  );
  assert.ok(
    !discoveryRoutes.includes('/runtime/agents/:agent_registration_id/claims'),
    'Local discovery catalog should not advertise registration-scoped claim creation route as canonical downstream consumer truth',
  );
  assert.ok(
    !discoveryRoutes.includes('/runtime/agents/:agent_registration_id/claims/:claim_id/accept'),
    'Local discovery catalog should not advertise registration-scoped claim accept route as canonical downstream consumer truth',
  );
  assert.ok(
    !discoveryRoutes.includes('/runtime/agents/:agent_registration_id/claims/:claim_id/reject'),
    'Local discovery catalog should not advertise registration-scoped claim reject route as canonical downstream consumer truth',
  );
  assert.ok(
    !discoveryRoutes.includes('/runtime/agents/:agent_registration_id/leases'),
    'Local discovery catalog should not advertise registration-scoped lease route as canonical downstream consumer truth',
  );
  assert.ok(
    !discoveryRoutes.includes('/runtime/notifications/:notification_id'),
    'Local discovery catalog should not advertise operator-style notification detail route as canonical downstream consumer truth',
  );
  assert.ok(
    !discoveryRoutes.includes('/runtime/notifications/deliveries'),
    'Local discovery catalog should not advertise operator-style notification delivery route as canonical downstream consumer truth',
  );
  assert.ok(
    !discoveryRoutes.includes('/runtime/notifications/:notification_id/acknowledgements'),
    'Local discovery catalog should not advertise operator-style notification acknowledgement route as canonical downstream consumer truth',
  );
  assert.ok(
    !discoveryRoutes.includes('/runtime/notifications/:notification_id/retry'),
    'Local discovery catalog should not advertise operator-style notification retry route as canonical downstream consumer truth',
  );
  assert.ok(
    !discoveryRoutes.includes('/runtime/notifications/:notification_id/expire'),
    'Local discovery catalog should not advertise operator-style notification expiry route as canonical downstream consumer truth',
  );
});
