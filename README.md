# Bidvia Agent Client

This README is the customer-facing V1 entrypoint for the current `1.0.0` package state.

## What is Bidvia?

Bidvia is the governed platform for onboarding, running, and integrating agents. It provides the downstream contract truth, onboarding semantics, governed runtime routes, and enterprise-facing integration surfaces that this package consumes.

## What is `@bidvia/client`?

`@bidvia/client` is the open-source Bidvia client project. It gives external users a typed SDK, the `bidvia` CLI, and a local `bidvia mcp-server` entrypoint for governed agent onboarding and operations.

The package is agent-first but login-capable: external users may need bounded account/session setup before they continue, but the product promise stays centered on the governed agent path rather than on a general account-admin or platform-auth shell.

This repo presents itself as an **agent-first operating entry** organized around a **role-stage** model rather than a helper bundle. The product-facing surfaces are `client.claimant.*`, `client.operator.*`, `client.platformManaged.*`, and `client.universe.*`, and the CLI/MCP surfaces mirror the same role-stage operating entry.

## Current version and release maturity

The current package version is `1.0.0`.

This README documents the current public package surface for `@bidvia/client`. The shipped SDK, CLI, MCP handoff, account/session prerequisite support, governed onboarding path, and bounded validation tooling are described here, together with the limits that still remain in the current release boundary.

## Installation

Requirements:

- Node.js `>=20`

Install path when using the published package:

```bash
npm install @bidvia/client
```

That installs the `bidvia` CLI and the local `bidvia mcp-server` entrypoint.

Repo-local development fallback:

```bash
npm install
npm run build
```

Useful local verification commands:

```bash
npm test
npm run typecheck
npm run build
npm run validate
npm run validate:release-readiness
npm run validate:release-gate
```

Those validator commands should stay green together before you treat the local package surface as healthy.

For bounded external-user validation, start with these local-first commands before assuming the problem is deeper than the current machine or shell state:

```bash
bidvia install-integrity
bidvia validation-smoke
bidvia diagnostic-bundle-export --output ./bidvia-diagnostic-bundle
bidvia public-runtime-interpretation-probe
```

- `install-integrity` is the local install-path self-check
- `validation-smoke` is the bounded external-user smoke lane
- `diagnostic-bundle-export` packages that smoke report into machine-readable JSON plus a shareable markdown summary
- `public-runtime-interpretation-probe` reads live `/healthz` and `/readyz` and exports bounded runtime-baseline interpretation evidence without overclaiming release truth

These commands stay fail-closed. They do not become a Core-owned certification flow, do not claim hosted runtime truth, and do not turn bounded local diagnostics into full business closure claims. `public-runtime-interpretation-probe` stays narrower than the bounded matrix: it proves only the surfaced runtime baseline and does not claim business closure.

When you need a probe-backed local-docker regression artifact instead of the lighter smoke lane, run:

```bash
npx tsx scripts/verify-client-bounded-matrix.ts --base-url http://127.0.0.1:8787 --output ./bidvia-bounded-matrix.json
```

That bounded matrix stays local-first and review-safe. It can execute the checked-in proven slices when fresh artifact paths are available, and it reports a bounded mix of `pass`, `bounded-stop`, `contradiction`, and `blocked` results instead of pretending the entire business chain is either fully open or fully closed.

## Quick start

If you are evaluating the package as an external user, use the default public API path first. The CLI and SDK resolve against `https://api.bidvia.cn` unless you intentionally choose a different deployment entrypoint. Then follow the CLI onboarding path below in order: start with Learn, use bounded account/session prerequisite support when needed, complete public provisional create -> query -> claim, and only then move into governed run.

Before validating runtime behavior, choose the right lane:

- **default local docker** for real surfaced runtime behavior
- **proof-lane / admin-session** for deterministic admin-scoped walkthroughs
- **seeded / runtime-generated object validation** when you need to create your own business objects rather than relying on fixed proof ids

See `docs/VALIDATION_LANES.md` for the full lane guide. Fixed proof ids are not assumed in default local docker, self-generated runtime data is the preferred path for business-universe closure, and task-write-ready progression is a distinct surfaced path rather than an implied side effect of claim. When you need machine-consumable diagnostics instead of the default business result, the role-stage product commands may emit evidence output with `--output evidence`.

That surfaced progression is bounded task closure, not full business closure.

For task-write-ready progression, keep the chain explicit on the ordinary surfaced lane: self-service patch -> dispatch-authority request -> operator/admin review closure -> external binding check -> post-step verification of task-write-ready and dispatch-eligibility truth. The external claimed agent owns the self-service patch and bounded dispatch-authority request, operator/admin owns review closure, and the latest surfaced runtime now proves that claimant/account-scoped and operator/admin binding writes use different body contracts. This repo now ships a first-class account-plane external binding write helper together with the `account-agent-bindings` read helper, but the step still stays fail-closed unless the current lane has an explicit Core-owned route/body contract and the returned reads confirm runnable truth. If a governed read still returns `active_role_binding_required` after account-plane continuation succeeds, treat that as a separate authorization-projection gate rather than as dispatch-authority review or a hidden claimant-side activation workflow.

## CLI onboarding path

The CLI onboarding path is customer-facing, but it stays honest about prerequisites.

### 1. Start with the visible Learn stage

```bash
bidvia onboard
bidvia whoami
bidvia context show
bidvia doctor
```

- `onboard` is the visible first-run command
- `whoami` summarizes local identity without claiming platform login
- `context show` explains which local context fields are present
- `doctor` is a governed-run diagnostic once enough context exists

### 2. Use bounded account/session prerequisite support when needed

When account or session context is still missing, start with the bounded prerequisite support:

```bash
bidvia sign-up-personal --input ...
bidvia sign-up-enterprise --input ...
bidvia sign-in --input ...
bidvia select-org --input ...
bidvia account-me
```

Session support is available when needed:

```bash
bidvia session-refresh
bidvia session-revoke
```

### 3. Run the public provisional onboarding chain

Keep the official public chain explicit:

- use `bidvia create-provisional-agent` to start the provisional record
- use `bidvia query-provisional-agent` to check the provisional state
- use `bidvia claim-provisional-agent` to complete the session-bound handoff

```bash
bidvia create-provisional-agent --provisional-agent-ref ...
bidvia query-provisional-agent --provisional-agent-ref ...
bidvia claim-provisional-agent --provisional-agent-ref ... --claim-token ...
```

`claim-provisional-agent` is session-bound. It is the bridge from public provisional onboarding into governed runtime work.

### 4. Move into governed run

```bash
bidvia route-context-matrix
bidvia registration-lifecycle-plan
bidvia registered-agent-operations-plan
```

Use the route matrix to confirm which context family is required before you execute the next governed step. For claimant/account-plane continuation, treat `agentId` as the canonical account-plane identifier; any continued use of `registrationId` on that plane is compatibility-only.

### 5. Run bounded validation and diagnostic export when you need user-facing proof

After the onboarding path is clear, use the bounded local-first validation flow:

```bash
bidvia install-integrity
bidvia validation-smoke
bidvia diagnostic-bundle-export --output ./bidvia-diagnostic-bundle
```

When the current lane genuinely needs shipped bounded task-plane writes from CLI, the current surface now also includes `create-lease`, `create-task-dispatch`, `assign-task-dispatch`, `suspend-task-dispatch`, `resume-task-dispatch`, `complete-task-dispatch`, `fail-task-dispatch`, `create-claim`, `accept-claim`, and `reject-claim`. Those commands stay bounded to already-shipped helper semantics only, remain fail-closed, and do not imply deeper operator-owned continuation or full business closure.

## Machine-universe SDK integration (unpublished feature branch)

The `codex/universe-feedback-sdk-20260907` branch adds `client.machineUniverse` for five existing Core machine-plane operations: `consume`, `reportOutcome`, `confirmOutcome`, `approveContribution` and `submitSuccessorProposal`. Build this branch locally to use them. They are SDK additions only: this does not claim an npm release or new CLI/MCP commands, and it does not change the existing `client.universe` surface.

Use an explicitly enrolled machine identity and its current bearer credential. Choose the intended Core runtime explicitly; do not reuse an account/operator client or human session. For example, after Core has issued an eligible retrieval result:

```ts
import { BidviaClient } from '@bidvia/client';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const reporter = new BidviaClient({
  baseUrl: required('BIDVIA_CORE_BASE_URL'),
  context: { tenantId: required('BIDVIA_TENANT_ID') },
  machineIdentity: {
    tenantId: required('BIDVIA_TENANT_ID'),
    machinePrincipalId: required('BIDVIA_MACHINE_PRINCIPAL_ID'),
    agentRegistrationId: required('BIDVIA_AGENT_REGISTRATION_ID'),
    credentialVersion: Number(required('BIDVIA_MACHINE_CREDENTIAL_VERSION')),
  },
  auth: { bearerToken: required('BIDVIA_MACHINE_BEARER_TOKEN') },
});

const consumption = await reporter.machineUniverse.consume({
  retrievalResultSetRef: required('BIDVIA_RETRIEVAL_RESULT_SET_REF'),
  consumptionPurpose: 'Execute the assigned task using the selected publication',
  idempotencyKey: required('BIDVIA_CONSUMPTION_IDEMPOTENCY_KEY'),
});
```

Use the returned canonical references when reporting the actual task outcome; do not invent task, publication or evidence identities. Make independent confirmer and contribution-approver clients with their own current credentials and role scopes. A successor proposal additionally requires Core's fresh continuation/assignment acceptance. This SDK neither enrolls credentials nor creates those prerequisite business inputs.

Machine identity is supplied only through `machineIdentity`. Mixed human authority, cross-tenant context and provider-supplied `x-bidvia-*` / `x-authorized-*` headers are rejected. The existing request policy supports abort/timeout and transport errors. Preserve the same idempotency key for retries of the same operation, inspect canonical admission and gateway delivery, and never interpret HTTP 202 as completed delivery or independent confirmation. Core remains authoritative for 403/409 conflicts and current eligibility; the SDK maintains no parallel workflow state.

The Core connected Docker proof imports this actual built SDK in four fresh proof processes and uses real HTTP for all five operations. It covers A/B feedback and successor submission with three PostgreSQL restarts and stable terminal replay. Initial business roots, test credential provisioning, operator decisions and the final replay driver remain explicit proof inputs; this is not a separately deployed autonomous agent or production-readiness certification. See Core's `docs/runbooks/local-development-handoff.md` for the dedicated-database command and `BIDVIA_FEEDBACK_LOOP_CLIENT_ROOT` binding.

## SDK quick start

Use the SDK when you want the same governed client surface in code.

```ts
import { BidviaClient, buildHeartbeatInput } from '@bidvia/client';

const client = new BidviaClient({
  baseUrl: 'https://api.bidvia.cn',
  context: {
    tenantId: 'tenant-a',
    principalId: 'agent-1',
    registrationId: 'registration-1',
  },
});

const now = new Date().toISOString();

const heartbeat = await client.postHeartbeat(
  buildHeartbeatInput(
    now,
    new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  ),
);

console.log(heartbeat);
```

The shipped SDK includes:

- product-facing role-stage facades such as `client.claimant.precondition.inspect(...)`, `client.operator.handoff.consume(...)`, `client.platformManaged.entry.inspect(...)`, and `client.universe.inspect(...)`

- bounded account/session prerequisite support
- bounded membership lifecycle support for invitation create/accept, admin transfer, and removal
- bounded account-agent dispatch-authority read/request support on the canonical `/runtime/account/agents/:agentId/...` continuation family
- account-scoped task-dispatch and notification canonical families where the current downstream packets are already adopted
- provisional create -> query -> claim helpers
- registration-bound heartbeat, sync, evidence, and proposal helpers
- governed reads such as `authority-profiles`, `capability-profile`, agent registration visibility, participation-state visibility, and task-dispatch visibility
- bounded scenario, review-safe, and verification export helpers

For governed reads, the honest default is `tenantId` plus `principalId`, with `adminSessionId` only as an optional companion on some routes.

## OpenClaw and advanced integration

OpenClaw and node-host integration stay local-first. The standard handoff is:

```bash
bidvia openclaw-mcp-config
bidvia openclaw-bundle-export --output ./bidvia-openclaw-bundle
bidvia route-context-matrix
```

- `bidvia openclaw-mcp-config` exports the primary OpenClaw stdio configuration
- `openclaw-bundle-export` is additive packaging around that same local server
- `bidvia mcp-server` remains the installed runtime command

If you need explicit endpoint control, set `BIDVIA_BASE_URL` yourself and keep the boundary the same: local stdio MCP on your side, remote HTTPS Bidvia API on the other side.

## Boundaries, contract truth, and compatibility-only surfaces

Use the Bidvia Core downstream contract center (`docs/downstream-contract-center/**` in the main Bidvia repo) as the canonical contract truth source.

This package ships local value, but it does not become:

- a hosted runtime
- an HTTP MCP product
- a platform-auth product
- a remote registry participant
- a source of Core-owned truth

The current helper-level payload model matters:

- packet-grounded execution helpers already ship in the identity/session, task, and event-notification surfaces
- packet-grounded read helpers already ship in the capability and enterprise surfaces
- identity/session prerequisite support remains bounded even when it now includes membership lifecycle and dispatch-authority helpers
- claimant/account-plane continuation is canonical on `agentId`, while `registrationId` remains legitimate on registration-bound deep-read and operator/control-plane families only
- account-scoped task-dispatch and notification helpers only claim the currently adopted downstream route families; they do not imply a general account-admin shell
- use one surface taxonomy here: executable, review-safe, and compatibility-only
- next-version surface language stays explicit: executable surfaces perform bounded remote work, review-safe surfaces package or diagnose bounded flows without claiming server closure, and compatibility-only surfaces stay available only for tolerated transition seams
- some wrappers remain `compatibility-only`
- workflow-stage and remaining route-model adoption seams stay blocked until Core freezes the missing payloads

Examples of shipped governed read surfaces include `authority-profiles`, the singular per-registration `capability-profile`, and the participation/task family around `task-dispatch` visibility.

For the plane-by-plane adoption view, use `docs/CORE_AGENT_CLIENT_PLANE_CONTRACT_GAPS.md`. For the full guided onboarding flow, use `docs/ONBOARDING.md`.
For the lane-by-lane validation guide, use `docs/VALIDATION_LANES.md`. For migration from helper-first usage into the role-stage product entry, use `docs/AGENT_FIRST_MIGRATION.md`.

## License

MIT
