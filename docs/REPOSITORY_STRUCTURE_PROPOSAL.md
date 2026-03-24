# Repository Structure Proposal

## Goal

This proposal translates the new product positioning of `Bidvia-agent-client` into a concrete future repository layout.

The key shift is:

- not just an SDK/CLI repo
- but a full agent operating kit repo

## Proposed top-level structure

```text
/ 
├── src/
│   ├── contracts/          # Typed contracts and route-facing data shapes
│   ├── context/            # Session/admin-session/operator-context helpers
│   ├── execution/          # Route helpers and business-chain helpers
│   ├── verification/       # Verification bundle builders and export helpers
│   ├── scenarios/          # Typed scenario envelopes and scenario utilities
│   ├── adapters/           # Future MCP/tool/runtime adapters
│   ├── cli/                # CLI entrypoint and subcommands
│   └── index.ts            # Public exports
├── examples/               # Minimal runnable examples by audience and by scenario
├── docs/
│   ├── guide/              # Product usage guidance for agents/operators
│   ├── contracts/          # Frozen contract boundary and route docs
│   ├── scenarios/          # Scenario packet examples and source-backed patterns
│   ├── operations/         # Verification/export/review workflows
│   └── architecture/       # Product positioning and repo structure notes
├── scripts/                # Validation and maintenance scripts
└── test/                   # Contract tests and behavior-focused tests
```

## Recommended mapping from the current repo

### Current files that would later move under `src/`

- current `src/contracts.ts` -> `src/contracts/`
- current `src/client.ts` -> `src/execution/` plus shared `src/context/`
- current `src/heartbeat.ts` -> `src/execution/heartbeat/`
- current `src/sync.ts` -> `src/execution/sync/`
- current `src/evidence.ts` -> `src/execution/evidence/`
- current `src/proposals.ts` -> `src/execution/proposals/`
- current verification bundle helper -> `src/verification/`

### Current docs that would later move under `docs/`

- `docs/ONBOARDING.md` -> `docs/guide/`
- `docs/CONTRACT_BOUNDARY.md` -> `docs/contracts/`
- `docs/ROADMAP.md` -> `docs/architecture/`
- `docs/OPTIMIZATION_BACKLOG.md` -> `docs/operations/` or `docs/architecture/`
- `docs/PRODUCT_POSITIONING.md` -> `docs/architecture/`

## Recommended product-facing layers

### Layer 1 — Guide

Purpose:

- tell an agent or agent team how to use the platform safely
- explain contexts, boundaries, and operational expectations

Likely future docs:

- onboarding guide
- production usage guide
- role/context guide

### Layer 2 — Context

Purpose:

- make session/admin-session/operator-context preparation explicit
- avoid hidden route assumptions

Likely code:

- context builders
- header builders
- access requirement checks

### Layer 3 — Execution

Purpose:

- provide helper families around official routes and proven business chains

Likely code:

- onboarding helpers
- agent runtime helpers
- listing/match/connection/approval/package helpers
- commercial-action helpers

### Layer 4 — Scenario

Purpose:

- represent full business scenarios as first-class objects
- attach source refs, evidence refs, and route chains

Likely code/docs:

- scenario envelope types
- scenario examples
- scenario runner helpers

### Layer 5 — Verification

Purpose:

- capture and export verification artifacts in a review-safe form

Likely code/docs:

- verification bundle export
- review packet builders
- production-vs-sandbox verification workflows

### Layer 6 — Adapter

Purpose:

- expose the same operating kit through different runtime surfaces later

Likely future surfaces:

- CLI
- MCP/tool adapter
- other runtime adapters

## Why this structure is better than the current flat layout

The current repo is still small enough that a flat `src/` works.
But the product direction has already expanded beyond a route-wrapper SDK.

Without a layered structure, the repo will blur together:

- platform guidance
- context management
- route execution
- scenario orchestration
- verification export
- adapter logic

That will make it harder for a dedicated client team to evolve the product coherently.

## Practical recommendation for the future client team

Do not mass-refactor immediately.
Use this proposal as the target shape and move toward it incrementally when:

1. scenario envelope work begins
2. verification export grows beyond one helper
3. adapter/MCP work starts

## One-sentence summary

> The future `Bidvia-agent-client` repo should be structured like an agent operating kit, with explicit guide, context, execution, scenario, verification, and adapter layers rather than remaining a flat SDK/CLI package.
