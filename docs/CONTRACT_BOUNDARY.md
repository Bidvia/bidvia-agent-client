# Contract Boundary

This boundary reference supports the active execution plan at `.sisyphus/plans/agent-client-stage-2-stage-3-frozen-plane-execution.md`. Read it as release-boundary guidance for the current shipped local-first surface, not as a competing roadmap.

For current downstream contract truth, use the Bidvia Core downstream contract center (`docs/downstream-contract-center/**` in the main Bidvia repo) as the frozen routine implementation source.

For the next OpenClaw-compatible version, keep one release-language rule explicit: this repo owns local operator ergonomics and guidance, while Bidvia Core still owns the truth being consumed.

The V1 boundary is agent-first but login-capable. Bounded account/session prerequisite support exists so external users can establish context when needed, but the package promise remains the governed agent path rather than a general account-admin or platform-auth shell.

## Rule

`Bidvia-agent-client` consumes agent-access truth from Bidvia core. It does not define that truth.

## What core owns

- bounded account/session payload truth for sign-up, sign-in, account/me, select-org, session refresh, and session revoke
- onboarding semantics
- provisional / claim semantics
- heartbeat / presence semantics
- sync upload/download semantics
- evidence submission semantics
- proposal submission semantics
- frozen governance truth-fetch reads for registrations, authority profiles, capability profiles, and the singular per-registration capability profile
- frozen participation-state and task-dispatch wrapper families where this repo already exposes them
- review / approval / operator-only boundaries
- fail-close behavior

## What this repo owns

- CLI and SDK ergonomics
- example implementations
- local validation helpers
- bounded account/session prerequisite support commands such as `sign-up-personal`, `sign-up-enterprise`, `sign-in`, `account-me`, `select-org`, `session-refresh`, and `session-revoke`
- onboarding guidance for internal team agents and seed-user agents
- scenario packaging and verification-bundle export on the agent side
- agent-side operating guidance for how to use frozen production contracts safely
- OpenClaw local operator guidance for `openclaw-mcp-config`, companion bundle export, and local stdio MCP handoff

## Hard rules

- if an operation is not frozen in Bidvia core, it is not official here
- heartbeat and presence do not create authority
- client convenience must not bypass platform truth
- proposals and evidence remain explicit platform operations
- bounded login/session support must not be described as platform-auth ownership
- OpenClaw wording must stay local-first, stdio-MCP-first, and must not claim hosted runtime, HTTP MCP, or control-plane ownership

## Current frozen focus

- bounded sign-up/sign-in/select-org/account-me/session-refresh/session-revoke support that prepares the user for the governed agent path
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
- the canonical integration support family below is also frozen and shipped, but it remains bounded support for governed integration entry and does not make the whole enterprise plane a general write-first surface

- `POST /runtime/accounts/personal/sign-up`
- `POST /runtime/accounts/enterprise/sign-up`
- `POST /runtime/sessions/sign-in`
- `POST /runtime/sessions/refresh`
- `POST /runtime/sessions/revoke`
- `GET /runtime/account/me`
- `POST /runtime/account/select-org`
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
- `POST /runtime/integrations/:integrationCode/onboarding-contract`
- `POST /runtime/integrations/haisi-wms/login`
- `GET /runtime/integrations/haisi-wms/warehouses`
- `POST /runtime/integrations/haisi-wms/inbound`

## Governed read posture

- principal-governed reads require `tenantId` plus `principalId`
- `adminSessionId` is optional on some detail routes, not the primary gate for the widened read family
- credential-less local or sim probes can prove route wiring, transport behavior, reachability, or auth-guard posture only
- full governed semantics still require real operator credentials and context
