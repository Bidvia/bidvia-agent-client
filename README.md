# Bidvia Agent Client

Open-source agent operating kit for connecting governed agents to the Bidvia platform.

## Product definition

`Bidvia-agent-client` is not only a thin HTTP SDK.

Its intended role is a complete agent-side operating kit that helps an agent understand:

- how to connect to Bidvia
- which production endpoints and contracts are official
- what context is required before each operation
- how to execute approved operational chains in a governed way
- how to preserve source/evidence/trace data during verification or business execution

In practical terms, the long-term target shape is a six-layer operating kit:

1. **Guide layer** — onboarding guidance, platform usage rules, and scenario guidance
2. **Context layer** — session/admin-session/operator-context preparation plus controlled execution context helpers
3. **Execution layer** — SDK and helper functions for official routes and proven business chains
4. **Scenario layer** — typed scenario envelopes and scenario-aware helpers
5. **Verification layer** — verification bundles, review packets, and verification-safe exports
6. **Adapter layer** — CLI and future tool/adaptor surfaces for agent runtimes

The current V11 repository state only implements part of that target shape. The implemented slice is still centered on the execution layer, but it now also includes a generic scenario boundary, one bounded industry-universe orchestration slice, richer scenario verification bundles, and a local adapter seam plus bounded CLI planning command rather than a complete multi-layer operating kit.

## V11 boundary

This repository is a formal `V11` companion deliverable.

Hard rules:

- it must consume frozen Bidvia core agent-access contracts
- it must not define platform-authoritative behavior ahead of core-side contract freeze
- it may improve agent ergonomics, but it may not widen governance authority on its own

## What this repo is for right now

Today this repo already helps an agent or agent developer with:

- official onboarding and claim flows
- registration-bound heartbeat, sync, evidence, and proposal operations
- commercial-action helper flows proven in production
- listing/match/connection/approval/package helper slices proven in production
- generic scenario-envelope builders plus an industry-universe planning/orchestration slice
- richer scenario verification bundles alongside the legacy export helper
- one bounded adapter seam and an `industry-universe-plan` CLI preview command
- typed verification-bundle export for controlled verification runs

## Product layers

- `src/contracts` — request, response, context, and verification bundle contracts
- `src/client` — execution helpers and route-aware context handling
- `src/heartbeat` — registration-bound presence helpers
- `src/sync` — upload/download sync helpers
- `src/evidence` — evidence submission helpers
- `src/proposals` — proposal helpers
- `src/cli` — local operator/developer command surface
- `docs/` — guide layer, contract boundary, onboarding, roadmap, and optimization backlog

## Current status

- the first usable V11 execution layer is present
- helper coverage already includes production-proven route families beyond the initial atomic agent routes
- a generic scenario boundary now exists for planning multi-step reviewable flows
- scenario orchestration now exists for one bounded industry-universe slice only; it is not yet a general workflow layer
- richer scenario verification packaging exists, but not a full review-packet or verification workflow layer yet
- a local adapter seam exists, but not a complete MCP/runtime bridge
- CLI commands exist for the currently exposed bounded operations
- local contract tests run in `npm test`
- implementation remains bounded to the frozen V11 core contract and should stay aligned with Bidvia core launch/version docs
- the repo is not yet the full operating kit vision; it is still a partial V11 execution-layer slice of that broader product

## Local development

```bash
npm test
npm install
npm run typecheck
npm run build
npm run validate
npm run example
```

## Environment and profile handling

Environment/profile support exists for development convenience and controlled execution. It is not the main product identity of this repo.

- `global` -> `https://bidvia.ai`
- `china` -> `https://bidvia.cn`

Priority rule:

1. explicit `baseUrl`
2. `BIDVIA_BASE_URL`
3. `BIDVIA_BASE_URL_PROFILE`
4. internal development fallback

For open-source users, the primary recommendation is still:

- use explicit production `baseUrl` when you know the real deployment entrypoint
- treat profile switching as a convenience layer, not as the full product model

## Repository principles

- governance-first, not autonomy-first
- client convenience must not bypass platform truth
- heartbeats and sync are execution concerns, not authority concerns
- proposals and evidence are explicit operations, not hidden side effects
- contract truth lives in Bidvia core first, not in this repo

## Read next

- `docs/CONTRACT_BOUNDARY.md`
- `docs/ONBOARDING.md`
- `docs/CLIENT_TEAM_TAKEOVER.md`
- `docs/ROADMAP.md`
- `docs/OPTIMIZATION_BACKLOG.md`

## License

MIT
