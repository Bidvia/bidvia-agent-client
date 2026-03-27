# Client Team Takeover Baseline

## Purpose

This note is the shortest honest baseline for a client team taking over `Bidvia-agent-client`.

It separates what is actually implemented today from what is only positioned or planned.

## Read this first

1. `docs/PRODUCT_POSITIONING.md`
2. `docs/REPOSITORY_STRUCTURE_PROPOSAL.md`
3. `docs/OPTIMIZATION_BACKLOG.md`

## Current truth

`Bidvia-agent-client` is already positioned as an agent-side operating kit.
But the current repo is still only a partial current mainline implementation slice aligned to the frozen Bidvia Commercial Universe V1 / Core V12 handoff boundary.

Treat the six-layer model in `docs/REPOSITORY_STRUCTURE_PROPOSAL.md` as the future target shape, not as the current implementation state.

## Actually implemented

Confirmed in source and tests today:

- canonical ingestion/normalization helpers plus freshness-aware local working-view metadata
- governed agent-state helpers that split registration, identity, binding, participation-state, presence, readiness, and authority
- task-participation helpers for offer/claim/ack/lease/timeout/retry-aware local participation shells
- pricing explanation helpers for pricing basis, rule atoms, quotation methods, quote templates, and quotation objects
- asset/media/evidence/document/attachment consumption helpers with role-preserving explanation output
- review-safe governed proposal, review, and authorized-use helpers
- onboarding / provisional -> query -> claim helpers
- heartbeat / sync / evidence / proposal helpers
- bounded registration-lifecycle scenario family
- bounded registered-agent-operations scenario family
- commercial-action helper family
- bounded commercial-action continuation slice
- one honest cross-chain coordinator layer across shipped slices
- listing -> activate -> match helper slice
- connection -> approval helper slice
- opportunity package export helper
- generic scenario-envelope core and generic scenario builders
- registration-lifecycle scenario-plan builder
- registered-agent-operations scenario-plan builder
- industry-universe scenario-plan builder
- connection-approval scenario-plan builder
- opportunity-package handoff plan builder
- bounded registration-lifecycle runner
- bounded registered-agent-operations runner
- bounded industry-universe orchestration helper
- bounded connection-approval orchestration helper
- bounded commercial-action continuation runner and review readback helper
- cross-chain coordinator pre-handoff and post-handoff runners
- bounded explicit-opportunity package handoff runner
- richer scenario verification bundle support
- derived review-packet builders plus bounded preview and export support with richer reviewer-facing detail
- machine-readable static capability registry for shipped helpers and scenario route keys
- local runtime-capability snapshot output for repo-known runtime-facing facts
- server-capability payload parsing and normalization into the repo capability shape
- dependency-gated remote capability refresh seam across local snapshot and optional core payload shape
- static MCP-facing tool descriptor/catalog support for shipped bounded slices
- bounded local stdio MCP server entrypoint for the shipped MCP-facing tools
- environment mode classification for `local`, `sim`, and `production`
- bounded adapter seam and `industry-universe-plan`, `connection-approval-plan`, and `opportunity-package-handoff-plan` CLI commands
- read-only `environment-mode` CLI command
- read-only `runtime-capabilities` CLI command
- read-only `server-capabilities` CLI command
- bounded `industry-universe-review-packet-preview`, `industry-universe-review-packet-export`, `connection-approval-review-packet-preview`, `connection-approval-review-packet-export`, `opportunity-package-handoff-review-packet-preview`, and `opportunity-package-handoff-review-packet-export` CLI commands
- bounded `multi-business-chain-verification-wave-preview` and `commercial-action-verification-wave-preview` CLI commands
- typed verification-bundle export helper
- bounded CLI commands for a small subset of operations

## Implemented but still thin

These exist, but should not be overstated:

- scenario support currently includes three bounded orchestration slices plus one downstream handoff slice, not a general workflow layer
- registration-lifecycle support is bounded to onboarding plus registration-bound helper review flows only; it does not imply any new marketplace, approval, or autonomous-runtime behavior
- registered-agent-operations support is bounded to post-onboarding registration-bound helper review flows only; it does not add onboarding back in or imply any approval, marketplace, or broader runtime behavior
- cross-chain coordination now exists for one honest broader shipped path, but it still stops at an explicit approval-to-opportunity external handoff boundary
- package handoff support starts from a known `opportunityId`; it does not create or discover one after approval
- commercial-action continuation support is bounded to one review-safe continuation slice over existing helper methods; it does not imply autonomous governance
- verification packaging now includes bounded review-packet preview and export with richer reviewer-facing route and record detail, but it is still derived only from existing scenario and verification facts
- capability discovery is now machine-readable through a static repo-local registry, but it remains descriptive-only and does not negotiate with a runtime
- runtime-capability visibility now includes one repo-local snapshot surface, but it is still local knowledge only and not server-provided negotiation
- server-capability visibility now includes one local parse/normalize surface, but it still does not perform live negotiation or remote discovery
- dependency-gated remote capability refresh now has a local merge seam, but that seam is not the same thing as integrated Core truth and it stays blocked until Bidvia Core provides authoritative capability truth and freshness semantics
- adapter support now includes a static MCP-facing descriptor/catalog layer plus a bounded local stdio MCP server loop, but it is still not a hosted MCP server or complete MCP/runtime bridge
- environment mode support is classification-only visibility over the current base URL/profile inputs, not execution policy or runtime control
- verification-wave CLI support is preview-only and does not turn the repo into a live orchestration engine
- CLI support is still limited and does not cover the broader business-chain helper families
- current docs describe a broader destination than the code delivers today

Use this release-language split when you describe the repo externally:

- shipped and tested local surfaces
- implemented but dependency-gated seams
- deferred Core/runtime/control-plane areas

That split matters most for capability refresh. The seam is shipped. Core-owned truth is not.

## Not yet implemented

These should still be treated as next-step work, not shipped capability:

- approval -> opportunity creation or discovery behavior
- higher-level orchestration helpers across multiple business chains beyond the shipped coordinator path
- broader review-packet workflow expansion beyond the current bounded preview and export layer
- frozen server-provided runtime capability truth, live negotiation, or remote capability discovery
- hosted MCP server work, remote registry behavior, and broader MCP/tool runtime loops beyond the current local stdio server layer
- broader environment-specific policy logic or runtime behavior changes driven by environment mode
- richer CLI flows for business verification waves

Also still deferred:

- any claim that the client owns authority, freshness truth, or server truth on its own

## Immediate takeover sequence

Follow this order:

1. keep docs aligned with actual implementation scope
2. use the generic scenario core as the basis for additional scenario families or refinements
3. broaden orchestration only after the scenario contract remains stable
4. grow verification packaging beyond the current review-packet preview and export layer only when a broader workflow need is real
5. extend adapter / MCP surfaces beyond the current static descriptor/catalog layer only after the core scenario boundary stays stable

The current repo-local commercial-action example is `examples/commercial-action-continuation.ts`.
The current repo-local cross-chain coordinator example is `examples/multi-business-chain-coordinator.ts`.
The current repo-local registration lifecycle example is `examples/registration-lifecycle-scenario.ts`.
The current repo-local registered-agent operations example is `examples/registered-agent-operations-scenario.ts`.
The current repo-local runtime capability example is `examples/runtime-capabilities.ts`.
The current repo-local server capability example is `examples/server-capabilities.ts`.

## Why scenario envelope comes first

The repo now has a stable scenario-level container for source refs, evidence refs, trace continuity, expected route chains, and produced record ids.

That boundary landed before broader orchestration on purpose.
It remains the correct base for any future scenario family because it prevents later orchestration helpers from hard-coding workflow assumptions too early.

## External reference anchors

Useful comparators for the next client-team phase:

- Google ADK — operating-kit framing across SDK, runtime, CLI, evaluation, and deployment
- CrewAI — production architecture split between lower-level agent logic and higher-level flows
- Semantic Kernel — enterprise SDK/orchestration structure
- Promptfoo scenarios — practical scenario-envelope packaging pattern
- OpenAI Evals — verification bundle / dataset packaging pattern
- MCP spec + OpenAI Agents MCP wrappers — baseline for adapter/MCP layer design

## One-sentence summary

Take over this repo as a strong execution-layer client with early operating-kit direction, not as a completed multi-layer operating kit.
