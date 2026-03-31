# Bidvia Agent Client

`bidvia-agent-client` is the open-source SDK and CLI for connecting governed agents to the Bidvia platform.

The active execution plan for the current documentation and productization wave is `.sisyphus/plans/agent-client-next-version-productization.md`. This README stays focused on the shipped local-first package surface and should be read alongside that plan, not as a competing roadmap.

Today, this package ships a usable current mainline client surface for the frozen Bidvia Commercial Universe V1 / Core V12 handoff boundary. It includes typed SDK helpers, a widened read-only truth-fetch layer, stronger local operator discovery surfaces, richer review-safe readback, bounded scenario and verification helpers, local CLI commands, and a local stdio MCP seam. Recent transport and auth-provider hardening support that local-only foundation, but they do not mean login is shipped. It does not claim hosted runtime behavior, remote registry behavior, integrated Core truth beyond frozen inputs, or client-owned authority.

## What ships today

This package currently gives external users two guided journeys:

- one primary public CLI-first journey for readiness, route context, bounded first success, and local operator visibility
- one secondary OpenClaw/operator journey for local stdio MCP wiring against the same remote HTTPS Bidvia API

The same package also ships an SDK for Bidvia agent access routes, onboarding flows, registration-bound operations, richer governance and business truth-fetch reads, bounded scenario planning, and verification-safe exports.

The current mainline remains explicitly bounded to the frozen Bidvia Commercial Universe V1 / Core V12 framing. This repo can improve client ergonomics, but it must not invent platform truth or widen governance authority on its own.

## Installation

### Use a published package release

```bash
npm install bidvia-agent-client
```

### Work from this repository locally

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
```

## Start here

### Primary public CLI-first journey

For the normal public package path, start with the package defaults. The CLI resolves against `https://api.bidvia.ai`, so the baseline public journey does not start with `BIDVIA_BASE_URL`.

After a local build, walk the guided path in this order:

```bash
node dist/cli.js onboarding-readiness
node dist/cli.js route-context-matrix
node dist/cli.js registration-lifecycle-plan
```

Use those commands for three different questions:

- `onboarding-readiness` shows the current public-first onboarding chain and keeps endpoint selection implicit
- `route-context-matrix` shows which context family each guided route needs before you cross from onboarding into runtime work
- `registration-lifecycle-plan` is the first bounded success step once you are ready to stay on the shipped provisional-to-registration chain

When onboarding is already complete and you are moving into post-registration work, the next bounded public step is visible, not buried:

```bash
node dist/cli.js registered-agent-operations-plan
```

`docs/ONBOARDING.md` expands this public path and shows where the read-only visibility commands fit around it.

### Secondary OpenClaw/operator journey

If your path is a local OpenClaw Gateway or node-host install, start from the shipped operator handoff instead of reconstructing the MCP config by hand:

```bash
node dist/cli.js openclaw-mcp-config
node dist/cli.js route-context-matrix
```

Use `openclaw-mcp-config` to export the local stdio MCP command, default public endpoint, and required environment placeholders. Then use `route-context-matrix` to confirm which context family the guided operator route needs before enabling execution.

Continue with:

- `docs/OPENCLAW_GATEWAY_ONBOARDING.md` for the install and handoff order
- `docs/OPENCLAW_GATEWAY_SMOKE.md` for the smoke sequence

## Quick SDK use

For the normal public package path, the guided public journey stays CLI-first. If you need the direct SDK equivalent, point it at the canonical public API at `https://api.bidvia.ai`.

```ts
import { BidviaClient, buildHeartbeatInput } from 'bidvia-agent-client';

const client = new BidviaClient({
  baseUrl: 'https://api.bidvia.ai',
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

In practice, the SDK currently covers:

- official onboarding and claim flows
- registration-bound heartbeat, sync, evidence, and proposal operations
- agent-state and task-participation helpers
- truth-fetch reads for account agents, account agent bindings, and account records; richer governance deep reads for agent presence, authority, readiness, summaries, authority profiles, authority ladders, and capability profiles; broader business truth-fetch families for canonical semantics, pricing, and document, media, evidence, attachment, and file-resource assets
- pricing, assets, connection, commercial-action, and related route helpers already present in code
- bounded scenario planning and verification bundle support
- richer review-safe readback for already-shipped bounded orchestration slices
- local capability and server-payload normalization helpers

The truth-fetch expansion now ships across the SDK and CLI, with the local stdio MCP layer exposing the currently approved read-only subset as a thin wrapper over shipped SDK helpers. The rollout is phased on purpose: the SDK and CLI now cover the widened client-owned read surface, while MCP keeps its narrower governance-first and business-truth read slices on the same local seam. That MCP layer stays local stdio only and read-only in every phase.

### Advanced endpoint override

Use an explicit production `baseUrl` only when you know you need a non-default deployment entrypoint. The canonical production API domains are:

- `https://api.bidvia.ai`
- `https://api.bidvia.cn`

```ts
const client = new BidviaClient({
  baseUrl: 'https://api.bidvia.cn',
  context: {
    tenantId: 'tenant-a',
    principalId: 'agent-1',
    registrationId: 'registration-1',
  },
});
```

## CLI quick start

After a local build, the package exposes the CLI at `dist/cli.js`, and published installs expose the `bidvia-agent-client` binary.

For the normal public package path, CLI commands resolve against `https://api.bidvia.ai`. Start with the public CLI-first journey before you reach for explicit overrides.

Guided public journey:

```bash
node dist/cli.js onboarding-readiness
node dist/cli.js route-context-matrix
node dist/cli.js registration-lifecycle-plan
node dist/cli.js registered-agent-operations-plan
```

Guided OpenClaw/operator handoff:

```bash
node dist/cli.js openclaw-mcp-config
node dist/cli.js route-context-matrix
```

Start with grouped help when you want the current local-only command surface:

```bash
node dist/cli.js --help
```

Read-only visibility commands:

```bash
node dist/cli.js environment-mode
node dist/cli.js launch-topology-smoke
node dist/cli.js runtime-capabilities
node dist/cli.js server-capabilities
node dist/cli.js account-agents
node dist/cli.js agent-presence --registration-id areg-1
node dist/cli.js pricing-bases
node dist/cli.js media-asset --media-asset-id media-1
```

The full truth-fetch command group also includes detail and collection reads for account records, account agent bindings, richer governance deep reads such as agent readiness, summaries, authority profiles, authority ladders, and capability profiles, plus broader business truth families for canonical semantics, pricing, document artifacts, media assets, evidence assets, attachment bindings, and file resources. These commands stay read-only and operator-facing.

Bounded preview and export commands:

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
node dist/cli.js registration-lifecycle-plan
node dist/cli.js registered-agent-operations-plan
node dist/cli.js multi-business-chain-verification-wave-preview
node dist/cli.js commercial-action-verification-wave-preview
node dist/cli.js verification-bundle-preview --input registration-lifecycle
node dist/cli.js verification-bundle-export --input registered-agent-operations
```

Local execution commands are explicit and support payload preview through `--dry-run`:

```bash
node dist/cli.js heartbeat --dry-run
node dist/cli.js sync-upload --dry-run
node dist/cli.js evidence --dry-run
node dist/cli.js proposal --dry-run
```

The CLI is intentionally local and operator-facing. It helps you inspect environment resolution, local capability views, dry-run payloads, and bounded reviewable flows. It does not turn this package into a hosted runtime, and it does not mean user login is already part of the executable package surface.

### Advanced CLI endpoint override

When you need an explicit operator-selected endpoint, set `BIDVIA_BASE_URL` before running commands. The public defaults stay package-first, but explicit override remains available for operator-managed environments.

```bash
export BIDVIA_BASE_URL="https://api.bidvia.cn"
node dist/cli.js environment-mode
```

If you want a minimal repo-local truth-fetch example without live credentials, run:

```bash
npx tsx examples/truth-fetch.ts
```

If you want a minimal repo-local MCP truth-fetch example without live credentials, run:

```bash
npx tsx examples/mcp-truth-fetch.ts
```

## OpenClaw Gateway and local node-host path

This repository already supports a local OpenClaw Gateway and node-host integration path. The default public path still stays intentionally narrow:

- local operator workflow
- local stdio MCP server
- remote HTTPS Bidvia API

The shipped local MCP seam exposes read-only truth-fetch tools, review-safe tooling, and explicit execution tooling, but only through a local stdio server. The truth-fetch rollout is phased: governance-first MCP reads ship first, business-truth reads ship second, and both stay thin wrappers over the shipped SDK helpers. This does not imply hosted MCP service, hosted Bidvia runtime behavior, remote registry participation, login, OAuth, auth implementation, capability-truth integration, notification or task truth, multi-agent coordination truth, or live negotiation.

Start here if that is your path:

```bash
node dist/cli.js openclaw-mcp-config
node dist/cli.js route-context-matrix
```

Then continue with:

- `docs/OPENCLAW_GATEWAY_ONBOARDING.md` for install and configuration order
- `docs/OPENCLAW_GATEWAY_SMOKE.md` for the detailed smoke sequence

For Gateway users on the public path, the safest order is still: install locally, export the operator config from `openclaw-mcp-config`, confirm route context with `route-context-matrix`, run the read-only smoke commands against the default public API, then wire the local stdio MCP server only if the Gateway side is ready.

If your Gateway deployment needs an operator-selected endpoint instead, set `BIDVIA_BASE_URL` explicitly before the smoke flow. Keep the boundary the same: local stdio MCP on your side, remote HTTPS Bidvia API on the other side.

## Release boundary, kept honest

The current mainline uses three release categories, and they should stay separate.

### 1. Shipped local surfaces

These are implemented in code today and available to users now. They include:

- the typed SDK client and helper builders
- the typed SDK truth-fetch read wrappers for the approved account, richer governance deep-read, semantic, pricing, and asset groups
- the local stdio MCP truth-fetch read tools, shipped in two phases: governance-first first, then business-truth collection and detail reads second
- bounded scenario planning and verification bundle support
- review-packet preview and export helpers, now with richer review-safe readback around the already-shipped bounded slices
- explicit local execution commands with `--dry-run`
- explicit CLI truth-fetch commands for the same approved read groups
- static capability metadata, operator discovery snapshots, and local runtime-capability snapshots
- server-capability payload normalization
- environment-mode visibility
- the local CLI command surface
- the local stdio MCP descriptor and server seam, including review-safe and explicit execution tools
- OpenClaw Gateway operator documentation for the local path
- transport/auth-provider hardening for local execution paths

The shipped MCP truth-fetch slice stays narrow: local stdio only, read-only only, and sourced from the SDK helpers already in this repo. It is not a hosted runtime, not a new auth layer, and not a new source of platform truth.

In plain terms, phase order matters here. The widened governance deep-read family ships through the SDK and CLI, while MCP keeps the currently approved governance-first tools for `account-*`, `agent-presence`, and `agent-authority`. The business-truth MCP slice covers canonical semantics, pricing, document, media, evidence, and attachment reads. None of that widens the MCP layer beyond a local stdio wrapper over already-shipped SDK truth-fetch helpers.

### 2. Implemented but dependency-gated seams

These seams exist in code as readiness-only consumption points, but they remain blocked until Bidvia Core provides frozen truth.

`refreshRemoteCapabilityTruth(...)` belongs here. The seam is ready to consume a future frozen Core capability-truth payload, but this repo does not have that truth today. Until frozen Core-owned capability truth exists, every blocked refresh stays fail-closed and must not be read as truth closure.

### 3. Deferred areas

These areas are outside the current shipped boundary:

- hosted MCP and hosted runtime behavior
- remote registry behavior and remote discovery
- live remote negotiation
- approval-to-opportunity creation or discovery beyond the explicit current handoff seam
- notification, task dispatch, and multi-agent truth
- login, OAuth, or any auth implementation beyond local transport/auth-provider seams
- capability truth integration beyond local descriptive surfaces
- broader orchestration beyond the shipped bounded slices
- any client-owned authority or server-truth claims beyond the frozen boundary

## Current scope, in plain language

This package is not yet the full Bidvia agent operating kit vision. The shipped slice is centered on the execution layer, with bounded scenario, verification, and local adapter support around it.

That means you can use it today for governed agent access, bounded reviewable flows, and local operator tooling. You should not read it as a complete runtime platform, a source of Core authority, or a promise of remote negotiation behavior that does not exist yet.

## Recommended docs next

- `docs/ONBOARDING.md` for the primary public CLI-first onboarding and operating path
- `docs/OPENCLAW_GATEWAY_ONBOARDING.md` for Gateway and node-host installation
- `docs/OPENCLAW_GATEWAY_SMOKE.md` for Gateway smoke verification
- `docs/CONTRACT_BOUNDARY.md` for contract and authority boundaries

## License

MIT
