# Onboarding Guide

## Goal

This guide shows the minimum operating path for two current mainline audiences:

1. internal team agents using the full provisional -> query -> claim -> registration-bound flow
2. seed-user agents using the bounded registration-bound runtime after onboarding is already complete

This guide is intentionally more than an API quickstart. It explains how an agent should approach the platform at the operating level.

If your dominant path is a local OpenClaw Gateway / node-host install, use the dedicated package docs instead of reconstructing that flow from this file:

- `docs/OPENCLAW_GATEWAY_ONBOARDING.md` for the install/configure order
- `docs/OPENCLAW_GATEWAY_SMOKE.md` for the detailed smoke procedure

## Contract first

Before using this repo, remember the frozen Bidvia Commercial Universe V1 / Core V12 handoff rules:

- official onboarding path is `provisional -> query -> claim`
- registration-bound operations require:
  - `tenantId`
  - `principalId`
  - `registrationId`
- claim requires a session-bound context through `sessionId`
- heartbeat, sync, evidence, and proposal operations are execution/reporting surfaces only; they do not create authority

Additional current operating rule:

- production business chains may require different access contexts on different routes; the client should make those context expectations explicit rather than leaving them implicit in ad hoc scripts

## Repo-local quick start

```bash
npm install
npm test
npm run validate
npm run typecheck
npm run build
npm run example
```

## How an agent should use this repo

Think about this repo in this order:

1. read the contract boundary and onboarding docs
2. configure the right context for the environment
3. use the read-only `environment-mode` command when you need visibility into whether the current base URL resolves to `local`, `sim`, or `production`
4. use the read-only `runtime-capabilities` command when you need one local JSON view of repo-known runtime-facing facts
5. use the read-only truth-fetch SDK helpers or CLI commands when you need approved frozen Core reads for account, richer governance deep-read, semantic, pricing, or asset facts
6. choose the right helper family for the current route chain
7. check the static capability registry when you need machine-readable route or access-context expectations
8. check the local runtime-capability snapshot when you need one JSON view of repo-known route, MCP, and local server facts
9. check the local server-capability normalization surface when you need to parse one sample server-derived capability payload into repo shape
10. check the static MCP-facing tool catalog when you need export-only tool descriptors for shipped bounded slices
11. build a scenario envelope when the work is a multi-step reviewable flow
12. export a verification bundle when the run should be reviewable later
13. use explicit local execution commands when you need the packaged operator path for heartbeat, sync-upload, evidence, or proposal

In this phase, truth-fetch ships through the SDK and CLI as the full widened client-owned read surface, with a bounded local stdio MCP seam exposing the currently approved read-only subset. That MCP rollout is phased on purpose: governance-first truth-fetch tools ship first, then business-truth collection and detail tools ship second. In both phases, MCP stays read-only, local stdio only, and a thin wrapper over the shipped SDK helpers.

The honest phase split is:

- the SDK and CLI expose the widened governance deep-read family and the broader business truth-fetch families listed below
- the MCP seam keeps the currently approved governance-first tools for `account-*`, `agent-presence`, and `agent-authority`
- the MCP seam also exposes the shipped business-truth collection and detail tools for canonical semantics, pricing, document, media, evidence, and attachment reads
- the SDK and CLI stay the source of truth, and MCP only forwards to those already-shipped helpers

Safe operator order for truth-fetch work:

1. resolve the right `baseUrl` and `tenantId`
2. start with read-only CLI visibility commands or the matching SDK read helper
3. use explicit identifier flags for detail reads such as `--registration-id`, `--concept-id`, or `--media-asset-id`
4. keep execution commands separate from truth-fetch reads
5. treat returned payloads as frozen-route readbacks, not as new client-owned authority

## Environment mode visibility

The repo now ships environment mode classification in `src/config.ts` through `resolveBidviaEnvironmentMode(...)` and `resolveBidviaEnvironmentModeFromEnv(...)`.

It is intentionally visibility-only. Use it to classify the current base URL as one of:

- `local`
- `sim`
- `production`

If you want a repo-local view of that classification, use the read-only CLI command:

```bash
node dist/cli.js environment-mode
```

This layer does not change request payloads, enforce execution policy, or add environment-specific runtime controls. It only surfaces classification from the current base URL/profile inputs.

For global launch production guidance, prefer explicit canonical API domains:

- global canonical API -> `https://api.bidvia.ai`
- china canonical API -> `https://api.bidvia.cn`

Set `BIDVIA_BASE_URL` explicitly to one of those canonical `api.*` domains in production when you know the real deployment entrypoint.

If you want a read-only local check of the finalized launch topology guidance, use:

```bash
node dist/cli.js launch-topology-smoke
```

That command prints local JSON only: resolved `baseUrl`, resolved `environmentMode`, canonical global/china API domains, and the current compatibility profile mappings.

During the compatibility window, the `global` and `china` profiles still keep the root-domain compatibility mapping:

- `global` profile compatibility mapping -> `https://bidvia.ai`
- `china` profile compatibility mapping -> `https://bidvia.cn`

That compatibility behavior remains supported for now, but the canonical production recommendation is the explicit `api.*` base URL. The shipped runtime model also stays the same: local stdio MCP server plus remote HTTPS API.

For the dedicated local/Gateway operator path, keep using the separate OpenClaw Gateway package docs above. They stay bounded to local stdio MCP plus remote HTTPS API and do not imply any hosted runtime behavior.

## Capability discovery

The repo now ships a static capability registry in `src/capabilities.ts` so callers can discover current helper metadata without reading `src/client.ts` line by line.

It is intentionally descriptive-only. Use it to inspect repo-local facts such as:

- route path templates
- HTTP methods
- access-context families
- required context keys
- whether a helper is an atomic route or a bounded scenario helper

This registry does not negotiate with a live runtime, fetch server-provided capabilities, or generate requests from metadata. It is a machine-readable map of the shipped client surface only.

## Truth-fetch reads

The repo now ships a broad read-only truth-fetch layer across the SDK and CLI for approved frozen Core read routes. Today that covers:

- account agents, account agent bindings, and account records
- richer governance deep reads for agent presence, authority, readiness, summaries, authority profiles, authority ladders, and capability profiles
- broader canonical semantic reads for concepts, labels, mappings, taxonomy entries, and lineage links
- broader pricing reads for bases, rule atoms, quotation method modules, quote templates, quotations, and explanations
- broader document, media, evidence, attachment, and file-resource reads

The same approved reads now also have a phased MCP surface on the local stdio seam:

- the SDK and CLI expose the widened governance deep-read family plus the broader business truth-fetch families listed above
- the MCP seam keeps the currently approved governance-first tools for `account-*`, `agent-presence`, and `agent-authority`
- the MCP seam also exposes the shipped business-truth collection and detail tools for canonical semantics, pricing, document, media, evidence, and attachment reads
- the MCP layer stays read-only and forwards to the SDK helpers already shipped in this repo

Runnable repo-local example:

```bash
npx tsx examples/truth-fetch.ts
```

Runnable repo-local MCP example:

```bash
npx tsx examples/mcp-truth-fetch.ts
```

Built CLI examples after `npm run build`:

```bash
node dist/cli.js account-agents
node dist/cli.js agent-presence --registration-id areg-1
node dist/cli.js pricing-bases
node dist/cli.js media-asset --media-asset-id media-1
```

This truth-fetch layer stays read-only. The MCP portion stays local stdio only and does not add hosted runtime behavior, hosted MCP, remote registry or remote discovery, login, OAuth, auth implementation, capability-truth integration, notification or task truth, multi-agent coordination truth, or live negotiation.

Keep the deferred boundary explicit when you explain this surface to operators or SDK users:

- hosted runtime and hosted MCP stay deferred
- remote registry and remote discovery stay deferred
- login, OAuth, and auth implementation stay deferred
- capability-truth integration and live negotiation stay deferred
- notification truth, task dispatch truth, and multi-agent coordination truth stay deferred
- approval -> opportunity closure stays deferred beyond the explicit current handoff seam

## Local runtime-capability snapshot

The repo now ships `buildLocalRuntimeCapabilitySnapshot(...)` in `src/runtime-capabilities.ts` so callers can inspect one repo-local JSON snapshot of current runtime-facing knowledge.

That snapshot includes only shipped local facts such as:

- resolved base URL and environment mode
- static route capability metadata
- static MCP tool metadata
- bounded local MCP server availability and supported methods
- an explicit deferred marker for server-provided negotiation

If you want that snapshot from the command line, use the read-only CLI command:

```bash
node dist/cli.js runtime-capabilities
```

If you want a runnable repo-local example, use:

```bash
npx tsx examples/runtime-capabilities.ts
```

This layer is intentionally local and descriptive. It does not negotiate with a server, fetch remote capability state, or imply any server-provided runtime truth.

## Server-capability normalization

The repo now also ships `normalizeServerCapabilityPayload(...)` in `src/server-capabilities.ts` so callers can parse one server-derived capability payload into the repo’s normalized capability shape.

This is intentionally a local parse/normalize layer only. It helps when you already have a payload and want to translate:

- snake_case server fields into repo capability structures
- route capability entries into repo route capability metadata
- MCP tool entries into repo MCP descriptor shapes
- bounded MCP server availability into the repo’s normalized view

If you want a local JSON view of that normalized shape, use the read-only CLI command:

```bash
node dist/cli.js server-capabilities
```

If you want a runnable repo-local example, use:

```bash
npx tsx examples/server-capabilities.ts
```

This surface does not contact a server, perform live negotiation, or discover remote capability state. It only normalizes a local sample payload into the server-derived snapshot shape.

## MCP-facing catalog discovery

The repo also ships a static MCP-facing tool catalog in `src/mcp.ts` so callers can export descriptor metadata for the currently shipped bounded slices.

It is intentionally export-only. Use it to inspect repo-local facts such as:

- shipped MCP-facing tool names, including the phased read-only truth-fetch tools
- tool descriptions
- input schema references
- output modes for plan preview, review-packet preview, and review-packet export
- bounded helper and capability references behind each descriptor

This catalog does not make the repo an MCP server on its own. It does not open a hosted transport, perform live negotiation, or discover remote registries. It is a static descriptor/catalog layer for the local stdio server and future bounded integration work only.

## Local MCP server entrypoint

The repo now also ships a bounded local stdio MCP server entrypoint in `src/mcp-server.ts`.

It is intentionally limited to the local request loop for:

- `initialize`
- `tools/list`
- `tools/call`

That local server uses the shipped tool catalog from `src/mcp.ts` and dispatches only the current bounded MCP-facing tools. It is useful when you want a repo-local MCP server surface for the shipped read-only truth-fetch tools, the already-shipped review-safe plan and packet tools, and the explicit local execution tools.

This server remains deliberately narrow. It does not add hosted runtime behavior, hosted MCP service, remote registry features, broader protocol/runtime complexity, or any MCP authority beyond the shipped local tool loop.

## Scenario planning and bounded orchestration preview

The repo now includes a generic scenario boundary plus one bounded onboarding-plus-registration scenario family, one bounded post-onboarding registered-agent operations family, three bounded orchestration slices, one honest cross-chain coordinator layer, and one bounded downstream handoff slice.
This is still not a full orchestration layer or adapter/runtime platform.
It is the first stable SDK-local container for:

- source refs
- evidence refs
- trace and workflow continuity
- expected route chains for reviewable flows

The current bounded slices support:

- scenario planning/building for onboarding plus registration-bound lifecycle work
- bounded registration-lifecycle execution through the SDK over the shipped provisional/query/claim and registration-bound helpers only
- scenario planning/building for post-onboarding registered-agent operations work
- bounded registered-agent operations execution through the SDK over the shipped registration-bound helpers only
- scenario planning/building for industry-universe work
- limited listing -> activate -> match orchestration through the SDK
- scenario planning/building for match -> connection-request -> approval work
- bounded connection-approval orchestration through the SDK
- scenario planning/building for bounded commercial-action continuation work
- bounded commercial-action continuation orchestration plus review-oriented readback through the SDK
- cross-chain coordination across the shipped slices up to an explicit approval-to-opportunity external handoff boundary
- explicit-opportunity package-export handoff planning from a known `opportunityId`
- review-safe scenario verification bundle generation
- bounded review-packet preview and export commands plus a repo-local review-packet example

Still deferred on purpose:

- approval -> opportunity creation or discovery behavior
- broader multi-business-chain orchestration beyond the shipped coordinator path
- MCP/runtime expansion beyond the current local seam

Runnable repo-local example:

```bash
npx tsx examples/industry-universe-agent.ts
npx tsx examples/connection-approval-agent.ts
npx tsx examples/commercial-action-continuation.ts
npx tsx examples/multi-business-chain-coordinator.ts
npx tsx examples/opportunity-package-handoff.ts
npx tsx examples/registered-agent-operations-scenario.ts
npx tsx examples/registration-lifecycle-scenario.ts
npx tsx examples/review-packet-preview.ts
```

Built CLI preview after `npm run build`:

```bash
node dist/cli.js --help
node dist/cli.js industry-universe-plan
node dist/cli.js industry-universe-review-packet-preview
node dist/cli.js industry-universe-review-packet-export
node dist/cli.js connection-approval-plan
node dist/cli.js connection-approval-review-packet-preview
node dist/cli.js connection-approval-review-packet-export
node dist/cli.js opportunity-package-handoff-plan
node dist/cli.js opportunity-package-handoff-review-packet-preview
node dist/cli.js opportunity-package-handoff-review-packet-export
node dist/cli.js registration-lifecycle-plan
node dist/cli.js registered-agent-operations-plan
node dist/cli.js multi-business-chain-verification-wave-preview
node dist/cli.js commercial-action-verification-wave-preview
node dist/cli.js verification-bundle-preview --input registration-lifecycle
node dist/cli.js verification-bundle-export --input registered-agent-operations
node dist/cli.js heartbeat --dry-run
node dist/cli.js sync-upload --dry-run
node dist/cli.js evidence --dry-run
node dist/cli.js proposal --dry-run
```

The package handoff preview is intentionally downstream-only. It requires an externally known `opportunityId` and does not imply that this repo can create or discover one after approval.

The verification-wave preview commands are intentionally bounded and operator-facing. `multi-business-chain-verification-wave-preview` previews the shipped coordinator path plus its explicit approval-to-opportunity handoff boundary, while `commercial-action-verification-wave-preview` previews the shipped commercial-action continuation wave. Neither command executes the wave, crosses the missing seam, or creates any new platform authority.

The verification-bundle preview and export commands are also review-safe only. They package the already-built scenario envelope into a local preview or exported bundle for review, not remote verification authority or hosted workflow behavior.

The review-packet commands are intentionally bounded. They only preview or export JSON derived from existing scenario plans and verification bundles. The richer packet structure now includes reviewer-facing route coverage, next-step readback, and recorded-id detail, but it still does not execute runtime work, create new platform authority, or widen the current local adapter seam.

The current review-packet preview and export surfaces stay review-oriented only. They expose richer detail for humans and downstream tooling, not signing, policy authority, or server-truth semantics.

The explicit execution commands follow the same honesty boundary. `heartbeat`, `sync-upload`, `evidence`, and `proposal` are packaged local operator commands, and `--dry-run` keeps them inspectable without creating a client request. That is local execution ergonomics, not login, not hosted runtime behavior, and not expanded platform authority.

The capability registry follows the same honesty boundary. It helps callers discover access-context expectations locally, but it does not imply runtime negotiation, server truth discovery, or MCP/runtime expansion.

The runtime-capability snapshot follows the same boundary. It combines repo-local shipped knowledge into one JSON surface, but it does not add server-provided negotiation, remote discovery, or broader runtime authority.

The server-capability normalization layer follows the same boundary. It parses server-derived payload shape locally, but it does not add live server negotiation, remote discovery, or broader runtime authority.

The MCP-facing catalog follows the same boundary. It makes the shipped bounded slices legible in an MCP-friendly descriptor format, but it does not imply a live MCP server, hosted tool runtime, transport support, or negotiation loop.

The local MCP server follows the same boundary. It is a local stdio server for the shipped tool catalog only, not a hosted service, not a remote registry participant, and not a broader MCP runtime platform.

The commercial-action continuation slice follows the same honesty boundary. It is a bounded continuation over already-shipped commercial-action helpers, with review-safe scenario output and readback, not an autonomous governance or runtime-expansion layer.

The environment-mode layer follows the same boundary. It improves visibility into the current environment classification, but it does not introduce environment-aware execution policy, runtime switching logic, or any broader transport/runtime expansion.

The cross-chain coordinator follows the same boundary. It composes the already-shipped slices and makes the approval-to-opportunity seam explicit as an external handoff boundary; it does not imply automatic seam crossing, server-side discovery, autonomous governance, or a broader runtime layer.

The registration-lifecycle scenario family follows the same boundary. It is limited to the shipped onboarding and registration-bound helper path only, with review-safe verification output; it does not imply marketplace behavior, approval authority, autonomous execution, or a broader runtime layer.

The registered-agent operations scenario family follows the same boundary. It is explicitly post-onboarding and limited to the shipped registration-bound helper path only, with review-safe verification output; it does not add onboarding behavior back in or imply approval, marketplace, autonomous, or broader runtime semantics.

## Internal team agent path

Use this when the operator or internal team is exercising the full onboarding flow.

1. create a provisional agent through `client.createProvisionalAgent(...)`
2. query the same provisional ref through `client.queryProvisionalAgent(...)`
3. claim it through `client.claimProvisionalAgent(...)` using a `sessionId`
4. once a `registrationId` exists, move to heartbeat / sync / evidence / proposal operations

Runnable repo-local example:

```bash
npm run example:internal
```

## Seed-user agent path

Use this when onboarding is already complete and the seed-user agent only needs bounded runtime operations.

1. start from an existing `registrationId`
2. submit bounded evidence through `client.submitEvidence(...)`
3. submit bounded proposals through `client.submitProposal(...)`
4. do not assume any approval, publishing, or autonomous execution authority

Runnable repo-local example:

```bash
npm run example:seed
```

## Validation flow

The offline validation command does not require a live Bidvia runtime. It records emitted URLs plus representative headers and bodies, then verifies those samples against the frozen Bidvia Commercial Universe V1 / Core V12 handoff contract docs.

```bash
npm run validate
```

Passing validation means:

- provisional create/query/claim use the correct route family
- registration-bound operations use the correct route family
- representative tenant/principal/session/operator context is attached where required
- representative request bodies still match the expected frozen contract fields

## Environment hints

If you point the client at a real runtime instead of the stubbed example flow, use these environment variables:

- `BIDVIA_BASE_URL`
- `BIDVIA_BASE_URL_PROFILE` (`global`, `china`)
- `BIDVIA_TENANT_ID`
- `BIDVIA_PRINCIPAL_ID`
- `BIDVIA_REGISTRATION_ID`
- `BIDVIA_SESSION_ID` (claim operations only)

Additional context now supported for production-proven routes:

- `adminSessionId` for admin-session detail routes
- `companyId` for operator-context write routes

Recommended domain profile defaults for future rollout preparation:

- global canonical API -> `https://api.bidvia.ai`
- china canonical API -> `https://api.bidvia.cn`

Compatibility mapping still retained during launch window:

- global profile -> `https://bidvia.ai`
- china profile -> `https://bidvia.cn`

## Hard stop rules

- do not treat `POST /runtime/account/agents` as the official onboarding path
- do not infer authority from heartbeat, sync, evidence, or proposal success
- do not add unfrozen operations here before they are frozen in Bidvia core
- do not read local transport/auth-provider hardening as shipped login or Core-owned auth

## Read next

- `docs/PRODUCT_POSITIONING.md`
- `docs/CONTRACT_BOUNDARY.md`
- `docs/ROADMAP.md`
- `docs/OPTIMIZATION_BACKLOG.md`
