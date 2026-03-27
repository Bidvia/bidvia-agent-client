# Bidvia Agent Client

`bidvia-agent-client` is the open-source SDK and CLI for connecting governed agents to the Bidvia platform.

Today, this package ships a usable current mainline client surface for the frozen Bidvia Commercial Universe V1 / Core V12 handoff boundary. It includes typed SDK helpers, bounded scenario and verification helpers, local CLI commands, and a local stdio MCP seam. It does not claim hosted runtime behavior, remote registry behavior, integrated Core truth beyond frozen inputs, or client-owned authority.

## What ships today

This package currently gives external users three practical entry points:

- an SDK for Bidvia agent access routes, onboarding flows, registration-bound operations, bounded scenario planning, and verification-safe exports
- a CLI for local visibility, bounded plan preview, review-packet preview and export, and operator-facing verification previews
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
- pricing, assets, connection, commercial-action, and related route helpers already present in code
- bounded scenario planning and verification bundle support
- local capability and server-payload normalization helpers

Use an explicit production `baseUrl` when you know the real deployment entrypoint. The canonical production API domains are:

- `https://api.bidvia.ai`
- `https://api.bidvia.cn`

## CLI quick start

After a local build, the package exposes the CLI at `dist/cli.js`, and published installs expose the `bidvia-agent-client` binary.

Read-only visibility commands:

```bash
node dist/cli.js environment-mode
node dist/cli.js launch-topology-smoke
node dist/cli.js runtime-capabilities
node dist/cli.js server-capabilities
```

Bounded preview and export commands:

```bash
node dist/cli.js industry-universe-plan
node dist/cli.js industry-universe-review-packet-preview
node dist/cli.js connection-approval-plan
node dist/cli.js opportunity-package-handoff-plan
node dist/cli.js multi-business-chain-verification-wave-preview
node dist/cli.js commercial-action-verification-wave-preview
```

The CLI is intentionally local and operator-facing. It helps you inspect environment resolution, local capability views, and bounded reviewable flows. It does not turn this package into a hosted runtime.

## OpenClaw Gateway and local node-host path

This repository already supports a local OpenClaw Gateway and node-host integration path, but the path is intentionally narrow:

- local operator workflow
- local stdio MCP server
- remote HTTPS Bidvia API

It does not imply hosted MCP service, hosted Bidvia runtime behavior, or remote registry participation.

Start here if that is your path:

- `docs/OPENCLAW_GATEWAY_ONBOARDING.md` for install and configuration order
- `docs/OPENCLAW_GATEWAY_SMOKE.md` for the detailed smoke sequence

For Gateway users, the safest order is still: install locally, set the canonical Bidvia API base URL explicitly, run the read-only smoke commands, then wire the local stdio MCP server only if the Gateway side is ready.

## Release boundary, kept honest

The current mainline uses three release categories, and they should stay separate.

### 1. Shipped local surfaces

These are implemented in code today and available to users now. They include:

- the typed SDK client and helper builders
- bounded scenario planning and verification bundle support
- review-packet preview and export helpers
- static capability metadata and local runtime-capability snapshots
- server-capability payload normalization
- environment-mode visibility
- the local CLI command surface
- the local stdio MCP descriptor and server seam
- OpenClaw Gateway operator documentation for the local path

### 2. Implemented but dependency-gated seams

These seams exist in code, but they remain blocked until Bidvia Core provides frozen truth.

`refreshRemoteCapabilityTruth(...)` belongs here. The seam is implemented, but integrated Core truth is not. Until frozen Core-owned capability truth exists, it stays blocked and fail-closed.

### 3. Deferred areas

These areas are outside the current shipped boundary:

- hosted MCP and hosted runtime behavior
- remote registry behavior
- live remote negotiation
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
