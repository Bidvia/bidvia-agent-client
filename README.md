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

The current V11 repository state only implements part of that target shape. The implemented slice is still centered on the execution layer, but it now also includes a generic scenario boundary, two bounded orchestration slices, one bounded downstream handoff slice, richer scenario verification bundles, and a local adapter seam plus bounded CLI preview commands rather than a complete multi-layer operating kit.

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
- commercial-action helper flows plus one bounded commercial-action continuation slice proven in production
- listing/match/connection/approval/package helper slices proven in production
- generic scenario-envelope builders plus bounded registration-lifecycle, registered-agent-operations, industry-universe, connection-approval, commercial-action continuation, and one honest cross-chain coordinator layer across shipped slices
- explicit-opportunity package-export handoff planning for downstream review-safe export
- richer scenario verification bundles plus derived review-packet preview and export support with richer reviewer-facing packet detail
- machine-readable static capability metadata for shipped helpers and scenario route keys
- local runtime-capability snapshot output for repo-known route, MCP, and local server facts
- server-capability payload parsing and normalization for server-derived capability shapes
- static MCP-facing tool descriptors and catalog exports for the shipped bounded slices, plus a bounded local stdio MCP server entrypoint
- environment mode classification for `local`, `sim`, and `production` plus a read-only CLI visibility command
- one bounded adapter seam and bounded CLI preview commands for scenario plans, review-packet preview/export, and operator-facing verification wave previews across shipped slices
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
- a bounded registration-lifecycle scenario family now exists for onboarding plus registration-bound helper review flows only
- a bounded registered-agent-operations scenario family now exists for post-onboarding registration-bound helper review flows only
- scenario orchestration now exists for bounded `listing -> activate -> match-candidates`, `match -> connection-request -> approval`, and `commercial-action` continuation slices only, it is not yet a general workflow layer
- a bounded commercial-action continuation plan, write runner, review readback helper, and repo-local example now exist without introducing autonomous governance or a new runtime layer
- one honest broader cross-chain coordinator layer now exists for the shipped slices, but it still pauses at the explicit approval-to-opportunity external handoff boundary instead of crossing that seam automatically
- explicit-opportunity package-export handoff support exists, but it starts from a known `opportunityId` and does not create or discover one after approval
- richer scenario verification packaging and bounded review-packet preview and export now exist for the shipped scenario slices, including richer reviewer-facing route and record detail derived from existing facts only
- machine-readable capability discovery now exists through the static repo-local registry in `src/capabilities.ts`
- local runtime-capability snapshot output now exists through `buildLocalRuntimeCapabilitySnapshot(...)`, the read-only `runtime-capabilities` CLI command, and `examples/runtime-capabilities.ts`
- server-capability parsing now exists through `normalizeServerCapabilityPayload(...)`, the read-only `server-capabilities` CLI command, and `examples/server-capabilities.ts`
- environment mode classification now exists through `resolveBidviaEnvironmentMode(...)`, `resolveBidviaEnvironmentModeFromEnv(...)`, and the read-only `environment-mode` CLI command
- a local adapter seam plus static MCP-facing descriptor/catalog layer now exist, and `src/mcp-server.ts` can serve the shipped tools through a bounded local stdio loop, but not as a hosted MCP server or complete MCP/runtime bridge
- CLI preview and export commands exist for the currently exposed bounded operations, including bounded `multi-business-chain-verification-wave-preview` and `commercial-action-verification-wave-preview` flows
- broader multi-business-chain orchestration beyond the shipped coordinator path, approval-to-opportunity creation or discovery behavior, live server-provided runtime negotiation, hosted MCP/runtime expansion, and remote registry behavior remain deferred
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

For production launch guidance, the canonical HTTPS API domains are:

- global canonical API -> `https://api.bidvia.ai`
- china canonical API -> `https://api.bidvia.cn`

Production integrations should prefer an explicit `BIDVIA_BASE_URL` pointing at those canonical `api.*` domains.

For a read-only local launch verification check, use `launch-topology-smoke`. It prints JSON with the resolved base URL, resolved environment mode, canonical `api.*` production domains, and the current compatibility profile mappings.

The shipped environment-mode layer is classification-only. It helps callers see whether the current base URL resolves to `local`, `sim`, or `production`, but it does not change request behavior or enforce environment-specific policy by itself.

- `global` profile compatibility mapping -> `https://bidvia.ai`
- `china` profile compatibility mapping -> `https://bidvia.cn`

That profile behavior remains in place during the compatibility window. It is still supported, but it is no longer the canonical production recommendation.

Priority rule:

1. explicit `baseUrl`
2. `BIDVIA_BASE_URL`
3. `BIDVIA_BASE_URL_PROFILE`
4. internal development fallback

For open-source users, the primary recommendation is still:

- use explicit production `baseUrl` when you know the real deployment entrypoint, and prefer `https://api.bidvia.ai` or `https://api.bidvia.cn`
- treat profile switching as a convenience layer, not as the full product model
- use `launch-topology-smoke` when you want one local read-only check that the launch topology guidance and compatibility mapping are being interpreted as expected

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
