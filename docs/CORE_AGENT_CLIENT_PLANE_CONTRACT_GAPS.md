# Core Agent Client Plane Contract Gaps

This document is a Core-facing reference for what still remains between the completed Stage 1 client runtime architecture and the frozen six-plane Core contract model now maintained upstream.

Read it together with `docs/ROADMAP.md`, `docs/CONTRACT_BOUNDARY.md`, and the Bidvia Core downstream contract center (`docs/downstream-contract-center/**` in the main Bidvia repo).

The framing is strict:

- Stage 1 is complete on the client side
- that completion means the local runtime/session architecture now exists in this repo
- it does not mean Stage 2 or Stage 3 are complete
- it does not mean the client owns hosted runtime behavior, control-plane behavior, or Core truth

## Reading rule

Each plane is classified from the client-adoption perspective through the helper-level payload matrix, not through blanket blocked-by-default wording:

- `packet-grounded-execution`: the plane already contains canonical execution helpers grounded by frozen payload truth
- `packet-grounded-read`: the plane already contains canonical read helpers grounded by frozen payload truth
- `blocked-pending-packet`: the client must not invent missing request/response or lifecycle fields; it should land a fail-closed helper or wrapper until packet-complete truth exists
- `compatibility-only`: the helper still exists for bounded compatibility, but it is not the canonical payload-grounded truth path
- local runtime and local accumulation remain local-first planes that stay outside the shared Core-facing matrix

## Plane summary

| Plane | Status | Current client-adoption view | Next-stage expectation |
| --- | --- | --- | --- |
| Identity / session plane | packet-grounded-execution | Sign-up, sign-in, select-org, and session hygiene now sit alongside provisional create/query/claim so this plane has canonical payload-grounded execution coverage while the visible journey stays agent-first. | Keep freshness/invalidation semantics blocked pending packet completion instead of widening into broader login/session or platform-auth claims. |
| Task plane | packet-grounded-execution | Canonical heartbeat, claim, and lease helpers are payload-grounded, while compatibility-only task wrappers stay explicitly secondary to the frozen route family. | Keep timeout semantics local-only or blocked pending packet truth unless Core grounds them. |
| Capability plane | packet-grounded-read | Capability profile and summary reads are payload-grounded, while refresh remains compatibility-only until Core freezes a canonical refresh payload. | Keep remote refresh blocked until packet-complete capability payloads are provided. |
| Workflow / stage plane | blocked-pending-packet | Local journey labels remain honest and useful, but workflow-stage remains the only broadly blocked Core-facing plane because packet-grounded stage identifiers and transitions are still incomplete. | Keep stage identifiers and transition rules blocked until Core provides them. |
| Event / notification plane | packet-grounded-execution | Notification detail reads are payload-grounded and notification delivery and acknowledgement helpers are packet-grounded execution helpers. | Keep replay or other still-missing semantics fail-closed unless Core freezes them. |
| Enterprise integration plane | packet-grounded-read | Integration and commercial read helpers are packet-grounded, while compatibility-only writes and blocked scenario wrappers stay clearly separated. | Keep packet-incomplete enterprise/system detail fail-closed and avoid broader enterprise orchestration claims. |
| Local runtime / execution session plane | local-first | Stage 1 now gives the client a first-class local execution session and runtime core that CLI and MCP surfaces can consume. | Stage 2 should keep this local plane stable while hardening adapters that consume Core truth through the helper-level payload matrix. |
| Local accumulation / memory plane | local-first | Stage 1 now gives the client explicit local accumulation for onboarding memory, task execution memory, capability usage memory, and result memory. | Stage 2 should preserve this plane as local-only accumulation and avoid turning it into hosted memory or synthetic Core truth. |

## Plane details

### 1. Identity / session plane, packet-grounded-execution

What is already real for the client:

- public provisional create -> query -> claim is an explicit shipped path
- sign-up, sign-in, account/me, select-org, session refresh, and session revoke now exist as bounded prerequisite support
- `claim-provisional-agent` is session-bound
- governed reads already require real `tenantId` plus `principalId`
- some routes accept `adminSessionId` as an optional companion

Current client adoption state:

- the helper-level payload matrix now treats the canonical identity/session path as packet-grounded execution rather than as broadly blocked plane adoption
- session freshness and invalidation semantics remain explicitly blocked when packet-complete truth is still absent

Current client rule:

- use the frozen Core onboarding path exactly
- keep the package agent-first even though login/session is now supported
- keep any broader session/login semantics blocked pending payload packet truth

### 2. Task plane, packet-grounded-execution

What is already real for the client:

- Stage 1 added a local task runtime, journal, resumability, and lifecycle hooks
- the shipped participation-state and task-dispatch families are already consumable
- CLI and MCP execution now route through the same local runtime core before operator-facing results are returned

Current client adoption state:

- the helper-level payload matrix now treats canonical claim, lease, and heartbeat helpers as packet-grounded execution and keeps downstream wrappers explicit
- local descriptive task shells remain separate from frozen Core task truth
- blocked pending payload packet handling remains in place for task lifecycle fields not yet packet-grounded in Core

Current client rule:

- lease, suspend, resume, completion, and outcome semantics must come from packet-grounded Core truth when available
- timeout semantics stay local-only or blocked pending payload packet truth unless Core grounds them explicitly

### 3. Capability plane, packet-grounded-read

What is already real for the client:

- frozen capability-profile route families are shipped
- the Stage 1 local runtime now classifies capability execution locally and fail-closes risky calls when context is missing
- local accumulation records capability usage and blocked attempts without pretending either is Core truth

Current client adoption state:

- the helper-level payload matrix now treats capability profile and summary visibility as packet-grounded read truth
- packet-grounded handling for capability manifest, freshness, and execution policy input stays fail-closed until Core provides it
- `refreshRemoteCapabilityTruth(...)` remains compatibility-only until packet-complete truth exists

### 4. Workflow / stage plane, blocked-pending-packet

What is already real for the client:

- the repo has honest local journey labels such as Learn, Public Provisional, and Governed Run
- the runtime can record local task progress markers and stage-adjacent lifecycle events
- scenario envelopes already carry workflow identifiers

Current client adoption state:

- workflow-stage remains the only broadly blocked Core-facing plane in the current summary
- blocked pending payload packet handling remains in place for Core stage identifiers and transition rules that are not yet packet-grounded

Current client rule:

- local journey labels are local guidance only
- workflow identifiers may travel through scenarios and handoffs without being treated as complete Core stage truth

### 5. Event / notification plane, packet-grounded-execution

What is already real for the client:

- Stage 1 local hooks and journals provide local observability
- operator-facing CLI and MCP outputs remain intact while internal wiring moved through the runtime core
- Core now freezes the notification route family in the downstream contract center

Current client adoption state:

- notification delivery and acknowledgement helpers are packet-grounded alongside notification detail visibility
- blocked pending payload packet handling remains in place for execution or replay semantics not yet packet-grounded

Current client rule:

- local hook audit is not a substitute for governed event truth
- the client may surface frozen route visibility now, but must fail closed on packet-incomplete event execution semantics

### 6. Enterprise integration plane, packet-grounded-read

What is already real for the client:

- shipped asset, evidence, document, attachment, integration, and commercial read helpers already expose a bounded commercial-universe surface
- review-safe and verification-safe packaging already exist around those bounded slices

Current client adoption state:

- integration and commercial read helpers are packet-grounded
- compatibility-only writes and blocked scenario wrappers remain clearly separated from the canonical payload-grounded read surface
- blocked handling remains in place for packet-incomplete enterprise/system fields

### 7. Local runtime / execution session plane, frozen

What Stage 1 completed on the client side:

- first-class execution session contract
- local task runtime and journal
- lifecycle hook registry
- CLI and MCP recomposition over the runtime core

Current operating rule:

- this plane is local-first and runtime-first
- it improves local reliability and maintainability
- it does not create hosted runtime claims, model-provider ownership, or Core truth ownership

What Stage 2 should do next:

- keep this plane stable
- focus changes on Core-plane adapters and seam hardening rather than reworking local runtime ownership

### 8. Local accumulation / memory plane, frozen

What Stage 1 completed on the client side:

- local onboarding memory
- local task execution memory
- local capability usage memory
- local result memory

Current operating rule:

- CLI and MCP execution now write local accumulation through the runtime core while preserving the same operator-facing outputs
- these records are local-only, removable, and non-authoritative
- they are not hosted memory, shared control-plane memory, or Core truth

What Stage 2 should do next:

- preserve the local-only boundary
- keep any future Core truth consumption separate from local accumulation records

## Stage 1 completion statement

Stage 1 is complete on the client side because the repo now has both local planes in place and the runtime-facing surfaces already consume them.

That statement must stay bounded:

- Stage 2 remains necessary because six Core-facing planes are now frozen in Core but still need explicit client adoption and gating work
- Stage 3 remains necessary because public `1.0.0` still needs both the completed client runtime and the executable release gate over the minimum frozen Core contracts

## Core follow-up checklist

Use this list when deciding whether a future Core payload is ready for client adoption:

1. does it close a full plane contract rather than another route-specific heuristic?
2. does it let the client consume Core truth without inventing local authority?
3. does it keep local runtime/session and local accumulation planes local-only?
4. does it remove client-side semantic inference instead of shifting it around?
5. can the plane stay fail-closed until all required semantics are packet-grounded?
