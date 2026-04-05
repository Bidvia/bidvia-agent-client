# Core Agent Client Plane Contract Gaps

This document is a Core-facing reference for the client-consumption gaps that remain after Stage 1 of the agent-client runtime architecture upgrade.

Read it together with `docs/ROADMAP.md` and `docs/CONTRACT_BOUNDARY.md`.

The framing is strict:

- Stage 1 is complete on the client side
- that completion means the local runtime/session architecture now exists in this repo
- that completion is proven for the shipped CLI and MCP execution paths
- it does not mean Stage 2 or Stage 3 are complete
- it does not mean the client owns hosted runtime behavior, control-plane behavior, or Core truth

## Reading rule

Each plane is classified from the client-consumption perspective only:

- `frozen`: the client can already consume a stable enough explicit contract for the currently shipped slice
- `partial`: the client consumes some frozen route families or local seams, but the full plane is not yet an explicit Core-level contract
- `missing`: the client must stay fail-closed because the required Core plane contract is still absent

## Plane summary

| Plane | Status | Current client-consumption view | Next-stage expectation |
| --- | --- | --- | --- |
| Identity / session plane | partial | Public provisional create -> query -> claim and governed context requirements are real, but Core-level session truth is still route-scoped rather than one explicit plane contract. | Stage 2 should promote explicit identity/session payloads, freshness, and transition semantics so the client stops inferring them from helper families. |
| Task plane | partial | The client now has a local task runtime and can consume shipped participation-state and task-dispatch wrappers, but full task lifecycle truth is still not one frozen Core plane. | Stage 2 should provide explicit task receive/claim/lease/execute/complete-or-fail semantics and outcome truth at plane level. |
| Capability plane | partial | Core exposes frozen capability-profile reads and the client has a Stage 1 local orchestration layer, but there is still no full Core-owned capability manifest contract for execution policy or refresh. | Stage 2 should freeze plane-level capability manifests and freshness semantics so `refreshRemoteCapabilityTruth(...)` can consume real Core truth. |
| Workflow / stage plane | missing | The client can label local journey stages and bounded runtime steps, but workflow/stage truth is still a local interpretation layer, not a Core contract. | Stage 2 should replace local stage inference with explicit Core workflow and stage truth where those contracts are frozen. |
| Event / notification plane | missing | The client has local journals, hooks, and operator-facing outputs, but no frozen Core notification/event plane to consume. | Stage 2 should add explicit event/notification payloads and delivery semantics, or keep this plane fail-closed. |
| Enterprise integration plane | partial | The client ships bounded commercial and document/media/evidence helper slices, but enterprise integration truth is still route-family specific rather than one stable plane contract. | Stage 2 should define the minimum enterprise integration truth needed for the public V1 commercial-universe release. |
| Local runtime / execution session plane | frozen | Stage 1 now gives the client a first-class local execution session and runtime core that CLI and MCP surfaces consume directly. OpenClaw currently rides that same local stdio MCP path through config and bundle surfaces, rather than as a separately proven direct runtime consumer. | Stage 2 should keep this local plane stable while hardening adapters that consume Core truth through explicit plane seams. |
| Local accumulation / memory plane | frozen | Stage 1 now gives the client explicit local accumulation for onboarding memory, task execution memory, capability usage memory, and result memory. | Stage 2 should preserve this plane as local-only accumulation and avoid turning it into hosted memory or synthetic Core truth. |

## Plane details

### 1. Identity / session plane, partial

What is already real for the client:

- public provisional create -> query -> claim is an explicit shipped path
- `claim-provisional-agent` is session-bound
- governed reads already require real `tenantId` plus `principalId`
- some routes accept `adminSessionId` as an optional companion

Why this is not frozen yet:

- the client still learns important session semantics from individual routes and help text
- there is no single Core payload that closes session state, identity freshness, or transition truth for all consumers

What Stage 2 should freeze:

- identity/session plane payloads
- explicit claim-to-governed-run transition semantics
- session freshness and invalidation semantics

### 2. Task plane, partial

What is already real for the client:

- Stage 1 added a local task runtime, journal, resumability, and lifecycle hooks
- the shipped participation-state and task-dispatch families are already consumable
- CLI and MCP execution now route through the same local runtime core before operator-facing results are returned

Why this is not frozen yet:

- the local runtime still fills gaps around task semantics that Core has not yet promoted into one plane contract
- the client can operate on narrow shipped wrappers, but not on complete Core task-truth closure

What Stage 2 should freeze:

- task dispatch and claim semantics at plane level
- lease, suspend, resume, timeout, and completion semantics at plane level
- explicit outcome/result truth beyond helper-local inference

### 3. Capability plane, partial

What is already real for the client:

- frozen capability-profile route families are shipped
- the Stage 1 local runtime now classifies capability execution locally and fail-closes risky calls when context is missing
- local accumulation records capability usage and blocked attempts without pretending either is Core truth

Why this is not frozen yet:

- local orchestration policy still depends on shipped route metadata, not a full Core-owned capability manifest
- `refreshRemoteCapabilityTruth(...)` is still dependency-gated

What Stage 2 should freeze:

- one stable capability manifest plane
- versioning/freshness semantics for capability truth
- explicit contract for capability execution policy input from Core

### 4. Workflow / stage plane, missing

What is already real for the client:

- the repo now has honest local journey labels such as Learn, Public Provisional, and Governed Run
- the runtime can record local task progress markers and stage-adjacent lifecycle events

Why this is still missing:

- those labels are local guidance and local runtime structure, not Core-owned workflow truth
- there is no frozen workflow/stage contract the client can consume directly

What Stage 2 should freeze:

- explicit workflow and stage payloads from Core
- stage transition truth that removes route-by-route inference
- workflow linkage needed for operator-visible execution truth

### 5. Event / notification plane, missing

What is already real for the client:

- Stage 1 local hooks and journals provide local observability
- operator-facing CLI and MCP outputs remain intact while internal wiring moved through the runtime core

Why this is still missing:

- there is no frozen Core event or notification plane for subscription, delivery, acknowledgement, or replay semantics
- local hook audit is not a substitute for governed event truth

What Stage 2 should freeze:

- event payload contracts
- notification delivery and acknowledgement semantics
- any replay or audit semantics that must come from Core rather than local journaling

### 6. Enterprise integration plane, partial

What is already real for the client:

- shipped pricing, asset, evidence, document, attachment, and commercial-action helper slices already expose a bounded commercial-universe surface
- review-safe and verification-safe packaging already exist around those bounded slices

Why this is not frozen yet:

- the client still consumes separate route families rather than one explicit enterprise integration plane
- downstream business-chain truth remains bounded and incomplete by design

What Stage 2 should freeze:

- the minimum integration contracts needed for the initial public commercial-universe release
- stable enterprise payload groupings so the client can scale without another version-scale rewrite

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

Stage 1 is complete on the client side because the repo now has both local planes in place and the shipped CLI and MCP execution paths already consume them directly.

OpenClaw wording must stay narrower than that completion claim. In the current repo, OpenClaw rides the same local stdio MCP path through exported config and companion-bundle packaging, rather than as a separately proven direct runtime consumer.

That statement must stay bounded:

- Stage 2 remains necessary because six Core-facing planes are still partial or missing from the client-consumption perspective
- Stage 3 remains necessary because public `1.0.0` needs both the completed client runtime and the minimum frozen Core contracts

## Core follow-up checklist

Use this list when deciding whether a future Core payload is ready for client adoption:

1. does it close a full plane contract rather than another route-specific heuristic?
2. does it let the client consume Core truth without inventing local authority?
3. does it keep local runtime/session and local accumulation planes local-only?
4. does it remove client-side semantic inference instead of shifting it around?
5. can the plane stay fail-closed until all required semantics are frozen?
