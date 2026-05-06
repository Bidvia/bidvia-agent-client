# Contract Boundary

This boundary reference supports the active truth-alignment execution plan at `docs/superpowers/plans/2026-04-30-client-truth-alignment-v3-implementation.md`. Read it as release-boundary guidance for the current shipped local-first surface, not as a competing roadmap.

For current downstream contract truth, use the Bidvia Core downstream contract center (`docs/downstream-contract-center/**` in the main Bidvia repo) as the frozen routine implementation source.

For the next OpenClaw-compatible version, keep one release-language rule explicit: this repo owns local operator ergonomics and guidance, while Bidvia Core still owns the truth being consumed.

Use one surface taxonomy consistently here: executable, review-safe, and compatibility-only. Executable surfaces perform bounded remote work, review-safe surfaces package or diagnose bounded flows without claiming server closure, and compatibility-only surfaces stay limited to tolerated transition seams.

The V1 boundary is agent-first but login-capable. Bounded account/session prerequisite support exists so external users can establish context when needed, but the package promise remains the governed agent path rather than a general account-admin or platform-auth shell.

## Rule

`Bidvia-agent-client` consumes agent-access truth from Bidvia core. It does not define that truth.

## What core owns

- bounded account/session payload truth for sign-up, sign-in, account/me, select-org, session refresh, and session revoke
- bounded membership lifecycle payload truth for invitation create/accept, membership-admin transfer, and removal
- bounded account-agent dispatch-authority read/request truth on the canonical claimant/account-plane `:agentId` family
- onboarding semantics
- provisional / claim semantics
- heartbeat / presence semantics
- sync upload/download semantics
- evidence submission semantics
- proposal submission semantics
- frozen governance truth-fetch reads for registrations, authority profiles, capability profiles, and the singular per-registration capability profile
- frozen participation-state and task-dispatch wrapper families where this repo already exposes them
- frozen account-scoped task-dispatch and notification route families where this repo already exposes them
- review / approval / operator-only boundaries
- fail-close behavior
- governed-runtime authorization projection semantics such as `active_role_binding_required`

## What this repo owns

- CLI and SDK ergonomics
- example implementations
- local validation helpers
- bounded account/session prerequisite support commands such as `sign-up-personal`, `sign-up-enterprise`, `sign-in`, `account-me`, `select-org`, `session-refresh`, and `session-revoke`
- bounded membership lifecycle helpers and documentation for the prerequisite surface only
- bounded account-agent dispatch-authority helpers and account-scoped task/notification wrappers where downstream packets are already frozen
- local ergonomic surfacing of canonical `agentId` account-plane continuation without inventing new Core-owned workflows
- onboarding guidance for internal team agents and seed-user agents
- scenario packaging and verification-bundle export on the agent side
- agent-side operating guidance for how to use frozen production contracts safely
- OpenClaw local operator guidance for `openclaw-mcp-config`, companion bundle export, and local stdio MCP handoff

## Hard rules

- if an operation is not frozen in Bidvia core, it is not official here
- heartbeat and presence do not create authority
- `active_role_binding_required` is not dispatch-authority review and must not be rewritten into a second approval workflow
- claimant/account-plane continuation must treat `agentId` as canonical even when compatibility seams still tolerate `registrationId`
- client convenience must not bypass platform truth
- proposals and evidence remain explicit platform operations
- bounded login/session support must not be described as platform-auth ownership
- OpenClaw wording must stay local-first, stdio-MCP-first, and must not claim hosted runtime, HTTP MCP, or control-plane ownership

## Current frozen focus

- bounded sign-up/sign-in/select-org/account-me/session-refresh/session-revoke support that prepares the user for the governed agent path
- bounded membership invitation, acceptance, admin transfer, and removal support that stays inside the same prerequisite-only surface
- bounded dispatch-authority read/request support for claimed account agents without widening into general account administration
- onboarding / claim
- heartbeat
- sync
- evidence
- proposal
- review-safe status operations
- principal-governed reads over the frozen downstream families now adopted in the SDK/CLI
- participation-state visibility and task-dispatch visibility/action wrappers already frozen downstream and exposed here
- production-proven commercial-action helper family
- production-proven listing / match / connection / approval / package helper slices
- verification bundle export

## Current frozen route families

The current V1 enterprise support family is intentionally mixed:

- enterprise visibility and readback remain the primary packet-grounded enterprise truth already exposed elsewhere in the repo
- the canonical integration ownership slice is the account integration capability directory plus bounded account-agent eligibility truth
- the bounded inbound invocation path is canonical ownership metadata, but this client keeps it fail-closed until Core freezes an open-client request body
- legacy onboarding-contract and provider-shaped Haisi routes remain compatibility-only support seams rather than the outward V14 product root
- the account-plane external binding seam now ships as a bounded first-class client helper, but still remains fail-closed unless the current lane has an explicit Core-owned route/body contract and the returned reads confirm runnable truth

- `POST /runtime/accounts/personal/sign-up`
- `POST /runtime/accounts/enterprise/sign-up`
- `POST /runtime/sessions/sign-in`
- `POST /runtime/sessions/refresh`
- `POST /runtime/sessions/revoke`
- `GET /runtime/account/me`
- `POST /runtime/account/select-org`
- `POST /runtime/account/memberships/invitations`
- `POST /runtime/account/memberships/accept-invitation`
- `POST /runtime/account/memberships/:membership_binding_id/transfer-admin`
- `POST /runtime/account/memberships/:membership_binding_id/remove`
- `GET /runtime/account/agents/:agentId/dispatch-authority`
- `POST /runtime/account/agents/:agentId/dispatch-authority-requests`
- `POST /runtime/account/agents/:agentId/external-account-bindings`
- `GET /runtime/account/agent-bindings`
- `GET /runtime/account/integration-capabilities`
- `GET /runtime/account/agents/:agentId/integrations/:integrationCode/eligibility`
- `POST /runtime/agents/provisional`
- `GET /runtime/agents/provisional?provisional_agent_ref=<...>`
- `POST /runtime/agents/provisional/claim`
- `POST /runtime/agents/:registration_id/heartbeat`
- `GET /runtime/agents/:registration_id/presence`
- `POST /runtime/agents/:registration_id/sync/upload`
- `GET /runtime/agents/:registration_id/sync/download`
- `POST /runtime/agents/:registration_id/evidence-submissions`
- `POST /runtime/agents/:registration_id/proposals`
- `GET /runtime/agents/registrations`
- `GET /runtime/agents/:registration_id`
- `GET /runtime/authority-profiles`
- `GET /runtime/capability-profiles`
- `GET /runtime/agents/:registration_id/capability-profile`
- `GET /runtime/agents/:registration_id/participation-states`
- `GET /runtime/agents/:registration_id/participation-states/:participation_state_id`
- `POST /runtime/agents/:registration_id/participation-states`
- `GET /runtime/agents/:registration_id/task-dispatches`
- `GET /runtime/agents/:registration_id/task-dispatches/:task_dispatch_id`
- `POST /runtime/agents/:registration_id/task-dispatches`
- `GET /runtime/account/agents/:agentId/task-dispatches`
- `GET /runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id`
- `POST /runtime/account/agents/:agentId/task-dispatches`
- `POST /runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/assign`
- `POST /runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/suspend`
- `POST /runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/resume`
- `POST /runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/complete`
- `POST /runtime/account/agents/:agentId/task-dispatches/:task_dispatch_id/fail`
- `GET /runtime/account/agents/:agentId/notifications/:notification_id`
- `POST /runtime/account/agents/:agentId/notifications/:notification_id/acknowledgements`

Compatibility-only enterprise integration seams:

- `POST /runtime/integrations/:integrationCode/onboarding-contract`
- `POST /runtime/integrations/haisi-wms/login`
- `GET /runtime/integrations/haisi-wms/warehouses`
- `POST /runtime/integrations/haisi-wms/inbound`

## Governed read posture

- principal-governed reads require `tenantId` plus `principalId`
- `adminSessionId` is optional on some detail routes, not the primary gate for the widened read family
- credential-less local or sim probes can prove route wiring, transport behavior, reachability, or auth-guard posture only
- full governed semantics still require real operator credentials and context
