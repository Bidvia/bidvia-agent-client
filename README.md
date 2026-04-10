# Bidvia Agent Client

This README is the customer-facing V1 entrypoint for the formal `1.0.0` release.

## What is Bidvia?

Bidvia is the governed platform for onboarding, running, and integrating agents. It provides the downstream contract truth, onboarding semantics, governed runtime routes, and enterprise-facing integration surfaces that this package consumes.

## What is `@bidvia/client`?

`@bidvia/client` is the open-source Bidvia client project. It gives external users a typed SDK, the `bidvia` CLI, and a local `bidvia mcp-server` entrypoint for governed agent onboarding and operations.

The package is agent-first but login-capable: external users may need bounded account/session setup before they continue, but the product promise stays centered on the governed agent path rather than on a general account-admin or platform-auth shell.

## Current version and release maturity

The current package version is `1.0.0`.

This is the customer-facing `1.0.0` package state and release-ready public surface. The Stage 3 release gate is now ready for the actual public proof target in this repo: the shipped SDK, CLI, MCP handoff, account/session prerequisite support, governed onboarding path, and frozen downstream read surface are aligned and release-verifiable. npm publication is still a separate final human step.

## Installation

Requirements:

- Node.js `>=20`

Published install path:

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

Those validator commands must stay green together before any human release packet can describe public closure. This README treats validator commands to stay green together as a formal `1.0.0` release requirement, not as optional evidence.

## Quick start

If you are evaluating the package as an external user, use the default public API path first. The CLI and SDK resolve against `https://api.bidvia.cn` unless you intentionally choose a different deployment entrypoint. Then follow the CLI onboarding path below in order: start with Learn, use bounded account/session prerequisite support when needed, complete public provisional create -> query -> claim, and only then move into governed run.

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

Use the route matrix to confirm which context family is required before you execute the next governed step.

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

- bounded account/session prerequisite support
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
- some wrappers remain `compatibility-only`
- workflow-stage and other packet-incomplete seams remain blocked until Core freezes the missing payloads

Examples of shipped governed read surfaces include `authority-profiles`, the singular per-registration `capability-profile`, and the participation/task family around `task-dispatch` visibility.

For the plane-by-plane adoption view, use `docs/CORE_AGENT_CLIENT_PLANE_CONTRACT_GAPS.md`. For the full guided onboarding flow, use `docs/ONBOARDING.md`.

## License

MIT
