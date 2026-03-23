# Onboarding Guide

## Goal

This guide shows the minimum repo-local path for two V11 audiences:

1. internal team agents using the full provisional -> query -> claim -> registration-bound flow
2. seed-user agents using the bounded registration-bound runtime after onboarding is already complete

## Contract first

Before using this repo, remember the frozen V11 rules:

- official onboarding path is `provisional -> query -> claim`
- registration-bound operations require:
  - `tenantId`
  - `principalId`
  - `registrationId`
- claim requires a session-bound context through `sessionId`
- heartbeat, sync, evidence, and proposal operations are execution/reporting surfaces only; they do not create authority

## Repo-local quick start

```bash
npm install
npm test
npm run validate
npm run typecheck
npm run build
npm run example
```

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

The offline validation command does not require a live Bidvia runtime. It records the emitted URLs, headers, and bodies and verifies they match the frozen V11 core contract.

```bash
npm run validate
```

Passing validation means:

- provisional create/query/claim use the correct route family
- registration-bound operations use the correct route family
- tenant/principal/session context is attached where required

## Environment hints

If you point the client at a real runtime instead of the stubbed example flow, use these environment variables:

- `BIDVIA_BASE_URL`
- `BIDVIA_BASE_URL_PROFILE` (`global`, `china`)
- `BIDVIA_TENANT_ID`
- `BIDVIA_PRINCIPAL_ID`
- `BIDVIA_REGISTRATION_ID`
- `BIDVIA_SESSION_ID` (claim operations only)

Recommended domain profile defaults for future rollout preparation:

- global profile -> `https://bidvia.ai`
- china profile -> `https://bidvia.cn`

## Hard stop rules

- do not treat `POST /runtime/account/agents` as the official onboarding path
- do not infer authority from heartbeat, sync, evidence, or proposal success
- do not add unfrozen operations here before they are frozen in Bidvia core
