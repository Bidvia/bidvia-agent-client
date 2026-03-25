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
But the current repo is still only a partial V11 implementation slice.

Treat the six-layer model in `docs/REPOSITORY_STRUCTURE_PROPOSAL.md` as the future target shape, not as the current implementation state.

## Actually implemented

Confirmed in source and tests today:

- onboarding / provisional -> query -> claim helpers
- heartbeat / sync / evidence / proposal helpers
- commercial-action helper family
- bounded commercial-action continuation slice
- one honest cross-chain coordinator layer across shipped slices
- listing -> activate -> match helper slice
- connection -> approval helper slice
- opportunity package export helper
- generic scenario-envelope core and generic scenario builders
- industry-universe scenario-plan builder
- connection-approval scenario-plan builder
- opportunity-package handoff plan builder
- bounded industry-universe orchestration helper
- bounded connection-approval orchestration helper
- bounded commercial-action continuation runner and review readback helper
- cross-chain coordinator pre-handoff and post-handoff runners
- bounded explicit-opportunity package handoff runner
- richer scenario verification bundle support
- derived review-packet builders plus bounded preview and export support with richer reviewer-facing detail
- machine-readable static capability registry for shipped helpers and scenario route keys
- static MCP-facing tool descriptor/catalog support for shipped bounded slices
- environment mode classification for `local`, `sim`, and `production`
- bounded adapter seam and `industry-universe-plan`, `connection-approval-plan`, and `opportunity-package-handoff-plan` CLI commands
- read-only `environment-mode` CLI command
- bounded `industry-universe-review-packet-preview`, `industry-universe-review-packet-export`, `connection-approval-review-packet-preview`, `connection-approval-review-packet-export`, `opportunity-package-handoff-review-packet-preview`, and `opportunity-package-handoff-review-packet-export` CLI commands
- typed verification-bundle export helper
- bounded CLI commands for a small subset of operations

## Implemented but still thin

These exist, but should not be overstated:

- scenario support currently includes two bounded orchestration slices plus one downstream handoff slice, not a general workflow layer
- scenario support currently includes three bounded orchestration slices plus one downstream handoff slice, not a general workflow layer
- cross-chain coordination now exists for one honest broader shipped path, but it still stops at an explicit approval-to-opportunity external handoff boundary
- package handoff support starts from a known `opportunityId`; it does not create or discover one after approval
- commercial-action continuation support is bounded to one review-safe continuation slice over existing helper methods; it does not imply autonomous governance
- verification packaging now includes bounded review-packet preview and export with richer reviewer-facing route and record detail, but it is still derived only from existing scenario and verification facts
- capability discovery is now machine-readable through a static repo-local registry, but it remains descriptive-only and does not negotiate with a runtime
- adapter support now includes a static MCP-facing descriptor/catalog layer, but it is still not a live MCP server or complete MCP/runtime bridge
- environment mode support is classification-only visibility over the current base URL/profile inputs, not execution policy or runtime control
- CLI support is still limited and does not cover the broader business-chain helper families
- current docs describe a broader destination than the code delivers today

## Not yet implemented

These should still be treated as next-step work, not shipped capability:

- approval -> opportunity creation or discovery behavior
- higher-level orchestration helpers across multiple business chains beyond the shipped coordinator path
- broader review-packet workflow expansion beyond the current bounded preview and export layer
- runtime capability negotiation or server-provided capability discovery
- live MCP server work, transport support, negotiation/runtime loops, and broader MCP/tool adapters beyond the current static catalog layer
- broader environment-specific policy logic or runtime behavior changes driven by environment mode
- richer CLI flows for business verification waves

## Immediate takeover sequence

Follow this order:

1. keep docs aligned with actual implementation scope
2. use the generic scenario core as the basis for additional scenario families or refinements
3. broaden orchestration only after the scenario contract remains stable
4. grow verification packaging beyond the current review-packet preview and export layer only when a broader workflow need is real
5. extend adapter / MCP surfaces beyond the current static descriptor/catalog layer only after the core scenario boundary stays stable

The current repo-local commercial-action example is `examples/commercial-action-continuation.ts`.
The current repo-local cross-chain coordinator example is `examples/multi-business-chain-coordinator.ts`.

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
