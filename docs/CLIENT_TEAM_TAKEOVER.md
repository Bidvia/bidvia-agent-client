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
- listing -> activate -> match helper slice
- connection -> approval helper slice
- opportunity package export helper
- generic scenario-envelope core and generic scenario builders
- industry-universe scenario-plan builder
- bounded industry-universe orchestration helper
- richer scenario verification bundle support
- bounded adapter seam and `industry-universe-plan` CLI command
- typed verification-bundle export helper
- bounded CLI commands for a small subset of operations

## Implemented but still thin

These exist, but should not be overstated:

- scenario support currently includes one bounded orchestration slice, not a general workflow layer
- verification packaging is richer than the original typed export helper, but not a full review-packet workflow layer
- adapter support is currently a local seam plus one planning/export command, not a complete MCP/runtime bridge
- CLI support is still limited and does not cover the broader business-chain helper families
- current docs describe a broader destination than the code delivers today

## Not yet implemented

These should still be treated as next-step work, not shipped capability:

- higher-level orchestration helpers across multiple business chains
- review-packet builders beyond one verification export helper
- MCP/tool adapters and other runtime adapter layers beyond the current local seam
- richer CLI flows for business verification waves

## Immediate takeover sequence

Follow this order:

1. keep docs aligned with actual implementation scope
2. use the generic scenario core as the basis for additional scenario families or refinements
3. broaden orchestration only after the scenario contract remains stable
4. grow verification packaging from richer bundles into review-packet workflows
5. extend adapter / MCP surfaces beyond the current local seam only after the core scenario boundary stays stable

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
