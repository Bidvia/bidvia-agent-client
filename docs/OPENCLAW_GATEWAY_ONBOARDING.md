# OpenClaw Gateway Onboarding Guide

## Goal

This guide is the main operator entrypoint for installing and configuring `bidvia-agent-client` under an OpenClaw Gateway / node-host context.

It is intentionally bounded to the current shipped model:

- local operator workflow
- local stdio MCP server
- remote HTTPS Bidvia API

It does **not** assume any hosted Bidvia runtime, hosted MCP service, or remote registry behavior.

## Scope boundary

Use this guide when you want to:

1. install `bidvia-agent-client` in an environment managed by OpenClaw Gateway or a node-host
2. configure the minimum Bidvia context variables for the default public path
3. verify the default public endpoint resolution and local capability surfaces with read-only commands
4. choose whether the next integration step is:
   - direct CLI/operator usage, or
   - local stdio MCP server wiring into OpenClaw
5. optionally pin an explicit Bidvia API base URL when the operator needs local, sim, regional, or other managed endpoint control

This guide is **not** the full smoke catalogue. Keep expanded smoke procedures in `docs/OPENCLAW_GATEWAY_SMOKE.md`.

## Recommended operator path

Follow this order:

1. install dependencies and build the package
2. set the minimum Bidvia context environment variables
3. run the read-only topology and capability smoke commands
4. decide whether the OpenClaw integration entry should be:
   - local CLI/operator checks first, or
   - local stdio MCP server consumption
5. only if needed, add an explicit `BIDVIA_BASE_URL` override for local, sim, regional, or operator-managed environments

Do **not** start by assuming hosted runtime or remote negotiation exists.

## Step 1 — install and build

From the repo root:

```bash
npm install
npm run build
```

This gives you the built CLI at `dist/cli.js` and the built local MCP server entrypoint at `dist/src/mcp-server.js`.

## Step 2 — use the default public endpoint first

For the normal public operator path, `bidvia-agent-client` now defaults to the canonical public API at `https://api.bidvia.ai`.

That means the simplest public onboarding flow does not need an initial `BIDVIA_BASE_URL` export. Build the package first, set the minimum context, then use the read-only CLI commands to confirm what the package resolves locally.

This simplified default does not remove operator control. Explicit endpoint selection still remains available when you need local, sim, regional, or other operator-managed routing.

## Step 3 — configure the minimum Bidvia context

Set the minimum environment variables that match the intended route family.

Common base variables:

```bash
export BIDVIA_TENANT_ID="tenant-a"
export BIDVIA_PRINCIPAL_ID="actor-gateway-1"
```

Add these only when the route family needs them:

- `BIDVIA_REGISTRATION_ID` for registration-bound runtime helpers
- `BIDVIA_SESSION_ID` for claim/onboarding surfaces
- `adminSessionId`-style behavior is route-specific and should stay bounded to the routes that need it
- `companyId`-style operator write scope is also route-specific and should not be assumed globally

For OpenClaw Gateway operators, the safe default is:

- keep the shared install/configure layer minimal
- add per-agent/per-route context only when the target helper family actually needs it

## Step 4 — run the read-only local smoke sequence

Before wiring OpenClaw tools, verify the local operator surface in this order:

### 4.1 Launch topology smoke

```bash
node dist/cli.js launch-topology-smoke
```

Use this to confirm:

- resolved `baseUrl`
- resolved `environmentMode`
- default public resolution to `https://api.bidvia.ai` when no override is set
- canonical `api.*` domains
- compatibility profile mappings

### 4.2 Environment mode visibility

```bash
node dist/cli.js environment-mode
```

Use this to confirm the current base URL resolves to `local`, `sim`, or `production` as expected.

For the default public path, this should resolve as production without requiring an explicit endpoint export.

### 4.3 Local runtime-capability snapshot

```bash
node dist/cli.js runtime-capabilities
```

Use this to inspect repo-local runtime-facing knowledge only.

### 4.4 Server-capability normalization sample

```bash
node dist/cli.js server-capabilities
```

Use this to confirm the local parser/normalizer for server-derived payload shape. This is sample/local normalization only, not live negotiation.

If any of the four checks look wrong, stop here and fix the local install/configuration layer before attempting OpenClaw integration.

If you want the full grouped command surface before you choose the next step, run:

```bash
node dist/cli.js --help
```

The current shipped local-only CLI surface includes:

- read-only visibility commands
- explicit execution commands for `heartbeat`, `sync-upload`, `evidence`, and `proposal`, each with `--dry-run`
- review-safe scenario plan and review-packet preview/export commands
- verification-bundle preview/export commands
- bounded verification-wave preview commands

## Advanced operator note — explicit endpoint override

Use an explicit `BIDVIA_BASE_URL` only when you need to override the simplified public default.

Common operator-managed cases include:

- local control
- sim control
- china production routing
- another regional or managed deployment entrypoint

Examples:

```bash
export BIDVIA_BASE_URL="http://127.0.0.1:8787"
export BIDVIA_BASE_URL="https://sim.bidvia.ai"
export BIDVIA_BASE_URL="https://api.bidvia.cn"
```

The active public resolution behavior remains:

- default or `global` profile -> `https://api.bidvia.ai`
- `china` profile -> `https://api.bidvia.cn`

During the compatibility window, the older root-domain mappings may still appear in topology smoke output as informational context:

- `global` compatibility mapping -> `https://bidvia.ai`
- `china` compatibility mapping -> `https://bidvia.cn`

Those root-domain mappings are compatibility metadata, not the active profile resolution targets. The normal public onboarding path should still start with the package default instead of an explicit export.

## Step 5 — choose the integration entry mode

After the local read-only smoke checks pass, choose one of these operator paths.

### Option A — CLI/operator-first path

Use this when you want to verify local package behavior before introducing MCP wiring.

Typical uses:

- validating canonical API domain configuration
- checking launch topology
- checking local capability visibility
- previewing bounded scenario/review surfaces later

This is the safer first step for a new Gateway deployment.

### Option B — local stdio MCP server path

Use this when the OpenClaw side is ready to consume a local stdio MCP server.

The shipped local MCP server entrypoint is:

```bash
node dist/src/mcp-server.js
```

This entrypoint is intentionally bounded to the local stdio loop only. It is not a hosted MCP service, not a remote registry participant, and not a broader runtime platform.

In practical terms, the OpenClaw side should treat it as:

- a local MCP tool source
- stdio-only
- catalog-backed
- limited to the currently shipped tool surfaces
- exposing both review-safe tools and explicit execution tools through the local server

That local execution surface is still not login. Transport/auth-provider hardening supports the local operator path, but Core-owned auth and user login remain outside the current executable package boundary.

## Step 6 — what to hand off to the OpenClaw Gateway operator

At the end of onboarding, the operator should have these facts written down explicitly:

1. which canonical Bidvia API domain is being used
2. whether the deployment is using the default public API or an explicit operator override
3. whether the deployment is currently relying on compatibility-window profile mapping
4. which environment variables are globally set for the Gateway context
5. which variables are injected per agent / per route family
6. whether the first integration step is CLI-first or stdio MCP-first

Do not leave these as tribal knowledge.

## Practical configuration baseline

For most OpenClaw Gateway installations, the safest baseline is:

1. install and build locally
2. rely on the default public API unless operator control requires an override
3. set the minimal shared Bidvia tenant/principal values
4. run the four read-only smoke commands
5. only then wire `node dist/src/mcp-server.js` into OpenClaw if the Gateway side is ready

This order reduces ambiguity and keeps the integration bounded to shipped local surfaces.

## What this guide deliberately does not claim

This onboarding guide does **not** claim any of the following:

- hosted Bidvia runtime integration
- hosted MCP service
- remote registry discovery
- live remote capability negotiation
- automatic approval-to-opportunity seam crossing
- automatic multi-agent orchestration beyond the already shipped bounded slices

## Next document

Use `docs/OPENCLAW_GATEWAY_SMOKE.md` for the dedicated smoke checklist and expanded verification order.
