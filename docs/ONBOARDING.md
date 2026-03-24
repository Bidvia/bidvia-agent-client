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
3. choose the right helper family for the current route chain
4. build a scenario envelope when the work is a multi-step reviewable flow
5. export a verification bundle when the run should be reviewable later

## Scenario planning and bounded orchestration preview

The repo now includes a generic scenario boundary plus two bounded orchestration slices and one bounded downstream handoff slice.
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
- explicit-opportunity package-export handoff planning from a known `opportunityId`
- review-safe scenario verification bundle generation
- bounded CLI preview commands

Still deferred on purpose:

- approval -> opportunity creation or discovery behavior
- broader multi-business-chain orchestration
- richer review-packet workflows
- MCP/runtime expansion beyond the current local seam

Runnable repo-local example:

```bash
npx tsx examples/industry-universe-agent.ts
npx tsx examples/connection-approval-agent.ts
npx tsx examples/opportunity-package-handoff.ts
```

Built CLI preview after `npm run build`:

```bash
node dist/cli.js industry-universe-plan
node dist/cli.js connection-approval-plan
node dist/cli.js opportunity-package-handoff-plan
```

The package handoff preview is intentionally downstream-only. It requires an externally known `opportunityId` and does not imply that this repo can create or discover one after approval.

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
