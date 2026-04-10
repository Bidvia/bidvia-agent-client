# Core Agent Client Plane Contract Gaps

This document is a Core-facing reference for what still remains between the completed Stage 1 client runtime architecture and the frozen six-plane Core contract model now maintained upstream.

Read it together with `docs/ROADMAP.md`, `docs/CONTRACT_BOUNDARY.md`, and the Bidvia Core downstream contract center (`docs/downstream-contract-center/**` in the main Bidvia repo).

The framing is strict:

- Stage 1 is complete on the client side
- that completion means the local runtime/session architecture now exists in this repo
- it does not mean Stage 2 or Stage 3 are complete
- it does not mean the client owns hosted runtime behavior, control-plane behavior, or Core truth

## Reading rule

Each plane is classified from the client-adoption perspective only:

- `frozen-in-Core`: Core has frozen the downstream plane in the contract center
- `blocked pending payload packet`: the client must not invent missing request/response or lifecycle fields; it should land a fail-closed adapter until packet-complete truth exists
- `frozen`: the client plane is already local-first and stable inside this repo

## Plane summary

| Plane | Status | Current client-adoption view | Next-stage expectation |
| --- | --- | --- | --- |
| Identity / session plane | frozen-in-Core | The client now centralizes onboarding and governed-read semantics behind an explicit identity/session adapter used by readiness, route-context, and CLI guidance. | Keep freshness/invalidation semantics blocked pending payload packet truth instead of widening into broader login/session claims. |
| Task plane | frozen-in-Core | The client now groups task dispatch / claim / lease semantics behind an explicit task-plane adapter while keeping local task shells descriptive-only. | Keep timeout semantics local-only or blocked pending payload packet truth unless Core grounds them. |
| Capability plane | frozen-in-Core | Capability-profile reads now flow through an explicit capability-plane adapter, and `refreshRemoteCapabilityTruth(...)` remains dependency-gated and fail-closed. | Keep remote refresh blocked until packet-complete capability payloads are provided. |
| Workflow / stage plane | frozen-in-Core | The client now distinguishes local journey labels from Core stage semantics behind an explicit workflow/stage adapter. | Keep packet-grounded stage identifiers and transition rules blocked until Core provides them. |
| Event / notification plane | frozen-in-Core | The client now exposes an explicit event/notification adapter for frozen route visibility while keeping execution semantics fail-closed. | Keep delivery, acknowledgement, retry, and replay semantics blocked until packet-complete truth exists. |
| Enterprise integration plane | frozen-in-Core | The client now groups bounded asset, evidence, document, attachment, and commercial-action helper slices behind one enterprise integration adapter. | Keep any packet-incomplete enterprise/system detail fail-closed and avoid broader enterprise orchestration claims. |
| Local runtime / execution session plane | frozen | Stage 1 now gives the client a first-class local execution session and runtime core that CLI and MCP surfaces can consume. | Stage 2 should keep this local plane stable while hardening adapters that consume Core truth through explicit plane seams. |
| Local accumulation / memory plane | frozen | Stage 1 now gives the client explicit local accumulation for onboarding memory, task execution memory, capability usage memory, and result memory. | Stage 2 should preserve this plane as local-only accumulation and avoid turning it into hosted memory or synthetic Core truth. |

## Plane details

### 1. Identity / session plane, frozen-in-Core

What is already real for the client:

- public provisional create -> query -> claim is an explicit shipped path
- `claim-provisional-agent` is session-bound
- governed reads already require real `tenantId` plus `principalId`
- some routes accept `adminSessionId` as an optional companion

Current client adoption state:

- one shared identity/session adapter now centralizes onboarding, route-context, and readiness guidance
- session freshness and invalidation semantics remain explicitly blocked when packet-complete truth is still absent

Current client rule:

- use the frozen Core onboarding path exactly
- keep any broader session/login semantics blocked pending payload packet truth

### 2. Task plane, frozen-in-Core

What is already real for the client:

- Stage 1 added a local task runtime, journal, resumability, and lifecycle hooks
- the shipped participation-state and task-dispatch families are already consumable
- CLI and MCP execution now route through the same local runtime core before operator-facing results are returned

Current client adoption state:

- one explicit task-plane adapter now groups task dispatch / claim / lease semantics
- local descriptive task shells remain separate from frozen Core task truth
- blocked pending payload packet handling remains in place for task lifecycle fields not yet packet-grounded in Core

Current client rule:

- lease, suspend, resume, completion, and outcome semantics must come from packet-grounded Core truth when available
- timeout semantics stay local-only or blocked pending payload packet truth unless Core grounds them explicitly

### 3. Capability plane, frozen-in-Core

What is already real for the client:

- frozen capability-profile route families are shipped
- the Stage 1 local runtime now classifies capability execution locally and fail-closes risky calls when context is missing
- local accumulation records capability usage and blocked attempts without pretending either is Core truth

Current client adoption state:

- one stable capability-plane adapter now fronts capability refresh and runtime snapshots
- packet-grounded handling for capability manifest, freshness, and execution policy input stays fail-closed until Core provides it
- `refreshRemoteCapabilityTruth(...)` remains dependency-gated until packet-complete truth exists

### 4. Workflow / stage plane, frozen-in-Core

What is already real for the client:

- the repo has honest local journey labels such as Learn, Public Provisional, and Governed Run
- the runtime can record local task progress markers and stage-adjacent lifecycle events
- scenario envelopes already carry workflow identifiers

Current client adoption state:

- one explicit workflow/stage adapter now distinguishes local labels from Core stage semantics
- blocked pending payload packet handling remains in place for Core stage identifiers and transition rules that are not yet packet-grounded

Current client rule:

- local journey labels are local guidance only
- workflow identifiers may travel through scenarios and handoffs without being treated as complete Core stage truth

### 5. Event / notification plane, frozen-in-Core

What is already real for the client:

- Stage 1 local hooks and journals provide local observability
- operator-facing CLI and MCP outputs remain intact while internal wiring moved through the runtime core
- Core now freezes the notification route family in the downstream contract center

Current client adoption state:

- one explicit event/notification adapter now exposes frozen route visibility through the client surfaces
- blocked pending payload packet handling remains in place for execution or replay semantics not yet packet-grounded

Current client rule:

- local hook audit is not a substitute for governed event truth
- the client may surface frozen route visibility now, but must fail closed on packet-incomplete event execution semantics

### 6. Enterprise integration plane, frozen-in-Core

What is already real for the client:

- shipped asset, evidence, document, attachment, and commercial-action helper slices already expose a bounded commercial-universe surface
- review-safe and verification-safe packaging already exist around those bounded slices

Current client adoption state:

- one explicit enterprise integration adapter now groups the bounded helper slices
- stable payload groupings exist across those bounded helper slices
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
