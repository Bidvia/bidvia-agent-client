# Bidvia Agent Client

`bidvia-agent-client` is the open-source SDK and CLI for connecting governed agents to the Bidvia platform.

Today, this package ships a usable current mainline client surface for the frozen Bidvia Commercial Universe V1 / Core V12 handoff boundary. It includes typed SDK helpers, bounded scenario and verification helpers, local CLI commands, and a local stdio MCP seam. Recent transport and auth-provider hardening support that local-only foundation, but they do not mean login is shipped. It does not claim hosted runtime behavior, remote registry behavior, integrated Core truth beyond frozen inputs, or client-owned authority.

## What ships today

This package currently gives external users three practical entry points:

- an SDK for Bidvia agent access routes, onboarding flows, registration-bound operations, truth-fetch reads, bounded scenario planning, and verification-safe exports
- a CLI for local visibility, explicit read-only truth-fetch commands, local execution commands, bounded plan preview, review-packet preview and export, and operator-facing verification previews
- a local OpenClaw Gateway and node-host path, using local stdio MCP plus the remote HTTPS Bidvia API

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

## Quick SDK use

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
- truth-fetch reads for account agents and records, agent presence and authority, canonical semantic concepts, pricing bases, and document, media, evidence, and attachment assets
- pricing, assets, connection, commercial-action, and related route helpers already present in code
- bounded scenario planning and verification bundle support
- local capability and server-payload normalization helpers

The truth-fetch expansion now ships in three aligned local surfaces. The SDK and CLI remain the source of truth, and the local stdio MCP layer is a thin read-only wrapper over those shipped SDK helpers. The rollout is phased on purpose: governance-first MCP truth-fetch tools ship first, then business-truth collection and detail tools ship second on the same local seam. That MCP layer stays local stdio only and read-only in both phases.

Use an explicit production `baseUrl` when you know the real deployment entrypoint. The canonical production API domains are:

- `https://api.bidvia.ai`
- `https://api.bidvia.cn`

## CLI quick start

After a local build, the package exposes the CLI at `dist/cli.js`, and published installs expose the `bidvia-agent-client` binary.

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

The full truth-fetch command group also includes detail and collection reads for account records, account agent bindings, agent authority, canonical semantic concepts, pricing bases, document artifacts, media assets, evidence assets, and attachment bindings. These commands stay read-only and operator-facing.

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

If you want a minimal repo-local truth-fetch example without live credentials, run:

```bash
npx tsx examples/truth-fetch.ts
```

If you want a minimal repo-local MCP truth-fetch example without live credentials, run:

```bash
npx tsx examples/mcp-truth-fetch.ts
```

## OpenClaw Gateway and local node-host path

This repository already supports a local OpenClaw Gateway and node-host integration path, but the path is intentionally narrow:

- local operator workflow
- local stdio MCP server
- remote HTTPS Bidvia API

The shipped local MCP seam exposes read-only truth-fetch tools, review-safe tooling, and explicit execution tooling, but only through a local stdio server. The truth-fetch rollout is phased: governance-first MCP reads ship first, business-truth reads ship second, and both stay thin wrappers over the shipped SDK helpers. This does not imply hosted MCP service, hosted Bidvia runtime behavior, remote registry participation, login, OAuth, auth implementation, capability-truth integration, or live negotiation.

Start here if that is your path:

- `docs/OPENCLAW_GATEWAY_ONBOARDING.md` for install and configuration order
- `docs/OPENCLAW_GATEWAY_SMOKE.md` for the detailed smoke sequence

For Gateway users, the safest order is still: install locally, set the canonical Bidvia API base URL explicitly, run the read-only smoke commands, then wire the local stdio MCP server only if the Gateway side is ready.

## Release boundary, kept honest

The current mainline uses three release categories, and they should stay separate.

### 1. Shipped local surfaces

These are implemented in code today and available to users now. They include:

- the typed SDK client and helper builders
- the typed SDK truth-fetch read wrappers for the approved account, governance, semantic, pricing, and asset groups
- the local stdio MCP truth-fetch read tools, shipped in two phases: governance-first first, then business-truth collection and detail reads second
- bounded scenario planning and verification bundle support
- review-packet preview and export helpers
- explicit local execution commands with `--dry-run`
- explicit CLI truth-fetch commands for the same approved read groups
- static capability metadata and local runtime-capability snapshots
- server-capability payload normalization
- environment-mode visibility
- the local CLI command surface
- the local stdio MCP descriptor and server seam, including review-safe and explicit execution tools
- OpenClaw Gateway operator documentation for the local path
- transport/auth-provider hardening for local execution paths

The shipped MCP truth-fetch slice stays narrow: local stdio only, read-only only, and sourced from the SDK helpers already in this repo. It is not a hosted runtime, not a new auth layer, and not a new source of platform truth.

In plain terms, phase order matters here. Governance-first tools ship first for `account-*`, `agent-presence`, and `agent-authority`. Business-truth tools ship second for canonical semantics, pricing, document, media, evidence, and attachment reads. Neither phase widens the MCP layer beyond a local stdio wrapper over already-shipped SDK truth-fetch helpers.

### 2. Implemented but dependency-gated seams

These seams exist in code, but they remain blocked until Bidvia Core provides frozen truth.

`refreshRemoteCapabilityTruth(...)` belongs here. The seam is implemented, but integrated Core truth is not. Until frozen Core-owned capability truth exists, it stays blocked and fail-closed.

### 3. Deferred areas

These areas are outside the current shipped boundary:

- hosted MCP and hosted runtime behavior
- remote registry behavior and remote discovery
- live remote negotiation
- login, OAuth, or any auth implementation beyond local transport/auth-provider seams
- capability truth integration beyond local descriptive surfaces
- richer governance deep reads beyond the approved truth-fetch groups
- approval-to-opportunity creation or discovery beyond the explicit current handoff seam
- broader orchestration beyond the shipped bounded slices
- any client-owned authority or server-truth claims beyond the frozen boundary

## Current scope, in plain language

This package is not yet the full Bidvia agent operating kit vision. The shipped slice is centered on the execution layer, with bounded scenario, verification, and local adapter support around it.

That means you can use it today for governed agent access, bounded reviewable flows, and local operator tooling. You should not read it as a complete runtime platform, a source of Core authority, or a promise of remote negotiation behavior that does not exist yet.

## Recommended docs next

- `docs/ONBOARDING.md` for the broader onboarding and operating path
- `docs/OPENCLAW_GATEWAY_ONBOARDING.md` for Gateway and node-host installation
- `docs/OPENCLAW_GATEWAY_SMOKE.md` for Gateway smoke verification
- `docs/CONTRACT_BOUNDARY.md` for contract and authority boundaries

## License

MIT
