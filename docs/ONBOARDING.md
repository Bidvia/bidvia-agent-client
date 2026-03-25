# Onboarding Guide

## Goal

This guide shows the minimum operating path for two V11 audiences:

1. internal team agents using the full provisional -> query -> claim -> registration-bound flow
2. seed-user agents using the bounded registration-bound runtime after onboarding is already complete

This guide is intentionally more than an API quickstart. It explains how an agent should approach the platform at the operating level.

## Contract first

Before using this repo, remember the frozen V11 rules:

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
4. choose the right helper family for the current route chain
5. check the static capability registry when you need machine-readable route or access-context expectations
6. check the static MCP-facing tool catalog when you need export-only tool descriptors for shipped bounded slices
7. build a scenario envelope when the work is a multi-step reviewable flow
8. export a verification bundle when the run should be reviewable later

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

## Capability discovery

The repo now ships a static capability registry in `src/capabilities.ts` so callers can discover current helper metadata without reading `src/client.ts` line by line.

It is intentionally descriptive-only. Use it to inspect repo-local facts such as:

- route path templates
- HTTP methods
- access-context families
- required context keys
- whether a helper is an atomic route or a bounded scenario helper

This registry does not negotiate with a live runtime, fetch server-provided capabilities, or generate requests from metadata. It is a machine-readable map of the shipped client surface only.

## MCP-facing catalog discovery

The repo also ships a static MCP-facing tool catalog in `src/mcp.ts` so callers can export descriptor metadata for the currently shipped bounded slices.

It is intentionally export-only. Use it to inspect repo-local facts such as:

- shipped MCP-facing tool names
- tool descriptions
- input schema references
- output modes for plan preview, review-packet preview, and review-packet export
- bounded helper and capability references behind each descriptor

This catalog does not make the repo an MCP server. It does not open a transport, perform protocol negotiation, or discover remote registries. It is a static descriptor/catalog layer for future integration work only.

## Scenario planning and bounded orchestration preview

The repo now includes a generic scenario boundary plus three bounded orchestration slices, one honest cross-chain coordinator layer, and one bounded downstream handoff slice.
This is still not a full orchestration layer or adapter/runtime platform.
It is the first stable SDK-local container for:

- source refs
- evidence refs
- trace and workflow continuity
- expected route chains for reviewable flows

The current bounded slices support:

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
npx tsx examples/review-packet-preview.ts
```

Built CLI preview after `npm run build`:

```bash
node dist/cli.js industry-universe-plan
node dist/cli.js industry-universe-review-packet-preview
node dist/cli.js industry-universe-review-packet-export
node dist/cli.js connection-approval-plan
node dist/cli.js connection-approval-review-packet-preview
node dist/cli.js connection-approval-review-packet-export
node dist/cli.js opportunity-package-handoff-plan
node dist/cli.js opportunity-package-handoff-review-packet-preview
node dist/cli.js opportunity-package-handoff-review-packet-export
```

The package handoff preview is intentionally downstream-only. It requires an externally known `opportunityId` and does not imply that this repo can create or discover one after approval.

The review-packet commands are intentionally bounded. They only preview or export JSON derived from existing scenario plans and verification bundles. The richer packet structure now includes reviewer-facing route coverage and recorded-id detail, but it still does not execute runtime work, create new platform authority, or widen the current local adapter seam.

The current review-packet preview and export surfaces stay review-oriented only. They expose richer detail for humans and downstream tooling, not signing, policy authority, or server-truth semantics.

The capability registry follows the same honesty boundary. It helps callers discover access-context expectations locally, but it does not imply runtime negotiation, server truth discovery, or MCP/runtime expansion.

The MCP-facing catalog follows the same boundary. It makes the shipped bounded slices legible in an MCP-friendly descriptor format, but it does not imply a live MCP server, hosted tool runtime, transport support, or negotiation loop.

The commercial-action continuation slice follows the same honesty boundary. It is a bounded continuation over already-shipped commercial-action helpers, with review-safe scenario output and readback, not an autonomous governance or runtime-expansion layer.

The environment-mode layer follows the same boundary. It improves visibility into the current environment classification, but it does not introduce environment-aware execution policy, runtime switching logic, or any broader transport/runtime expansion.

The cross-chain coordinator follows the same boundary. It composes the already-shipped slices and makes the approval-to-opportunity seam explicit as an external handoff boundary; it does not imply automatic seam crossing, server-side discovery, autonomous governance, or a broader runtime layer.

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

The offline validation command does not require a live Bidvia runtime. It records emitted URLs plus representative headers and bodies, then verifies those samples against the frozen V11 core contract.

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

- global profile -> `https://bidvia.ai`
- china profile -> `https://bidvia.cn`

## Hard stop rules

- do not treat `POST /runtime/account/agents` as the official onboarding path
- do not infer authority from heartbeat, sync, evidence, or proposal success
- do not add unfrozen operations here before they are frozen in Bidvia core

## Read next

- `docs/PRODUCT_POSITIONING.md`
- `docs/CONTRACT_BOUNDARY.md`
- `docs/ROADMAP.md`
- `docs/OPTIMIZATION_BACKLOG.md`
