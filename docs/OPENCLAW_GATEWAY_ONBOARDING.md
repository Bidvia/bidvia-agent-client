# OpenClaw Gateway Onboarding Guide

## Goal

This guide is the main operator entrypoint for installing and configuring `@bidvia/client` under an OpenClaw Gateway / node-host context.

It is intentionally bounded to the current shipped model:

- local operator workflow
- local stdio MCP server
- remote HTTPS Bidvia API

It does **not** assume any hosted Bidvia runtime, hosted MCP service, or remote registry behavior.

## Scope boundary

Use this guide when you want to:

1. install `@bidvia/client` in an environment managed by OpenClaw Gateway or a node-host
2. export the shipped OpenClaw/operator config instead of reconstructing it by hand
3. configure the minimum Bidvia context variables for the default public path
4. verify the default public endpoint resolution and local capability surfaces with read-only commands
5. choose whether the next integration step is direct CLI/operator usage or local stdio MCP server wiring into OpenClaw
6. optionally pin an explicit Bidvia API base URL when the operator needs local, sim, regional, or other managed endpoint control

This guide is **not** the full smoke catalogue. Keep expanded smoke procedures in `docs/OPENCLAW_GATEWAY_SMOKE.md`.

## Install model, kept honest

Current public install path:

```bash
npm install @bidvia/client
```

That path gives you `bidvia` for CLI commands and `bidvia mcp-server` for the stable local stdio MCP server.

Developer fallback path:

```bash
npm install
npm run build
```

That path gives you `node dist/cli.js` for the CLI and `node dist/mcp-server.js` as the local MCP fallback.

## Recommended operator path

Follow this order:

1. install the package
2. run `bidvia openclaw-mcp-config`
3. run `bidvia route-context-matrix`
4. set the minimum Bidvia context environment variables
5. run the read-only topology and capability smoke commands
6. decide whether the OpenClaw integration entry should be local CLI/operator checks first or local stdio MCP server consumption
7. only if needed, add an explicit `BIDVIA_BASE_URL` override for local, sim, regional, or operator-managed environments

Do **not** start by assuming hosted runtime or remote negotiation exists.

## Step 1 — install and build

From the repo root:

```bash
npm install
npm run build
```

This gives you the built CLI at `dist/cli.js` and the built local MCP fallback entrypoint at `dist/mcp-server.js`.

For the current installed public path, the equivalent surfaces are `bidvia` and `bidvia mcp-server`.

## Step 2 — export the shipped OpenClaw handoff first

Start from the convenience export instead of reconstructing the MCP command and environment block from repo files:

```bash
bidvia openclaw-mcp-config
```

Use that output as the handoff source for:

- the OpenClaw-compatible `command` / `args` / `env` fragment
- the default public `BIDVIA_BASE_URL`
- the required and optional environment placeholders
- the local-only, non-hosted boundary flags
- the visible next success step, `route-context-matrix`

The shipped config export is now intentionally split into two layers:

- primary installed execution surface: `bidvia mcp-server`
- repo-local development/build fallback: `node dist/mcp-server.js`

Use the exported fragment as the primary handoff. Keep the direct `dist/` entrypoint only as the development/build fallback.

## Step 3 — use the default public endpoint first

For the normal public operator path, `bidvia` now defaults to the canonical public API at `https://api.bidvia.ai`.

That means the simplest public onboarding flow does not need an initial `BIDVIA_BASE_URL` export. Build the package first, set the minimum context, then use the read-only CLI commands to confirm what the package resolves locally.

This simplified default does not remove operator control. Explicit endpoint selection still remains available when you need local, sim, regional, or other operator-managed routing.

## Step 4 — configure the minimum Bidvia context

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

## Step 5 — confirm guided route context, then run the read-only local smoke sequence

Before wiring OpenClaw tools, confirm the guided route context:

```bash
bidvia route-context-matrix
```

Use this to confirm:

- the public-first rows stay primary
- the local OpenClaw/operator row stays secondary
- the required context family is visible before you enable local execution
- the visible next success step for the operator journey stays `registered-agent-operations-plan`

Then run the read-only smoke commands in this order:

### 5.1 Launch topology smoke

```bash
bidvia launch-topology-smoke
```

Use this to confirm:

- resolved `baseUrl`
- resolved `environmentMode`
- default public resolution to `https://api.bidvia.ai` when no override is set
- canonical `api.*` domains
- compatibility profile mappings

### 5.2 Environment mode visibility

```bash
bidvia environment-mode
```

Use this to confirm the current base URL resolves to `local`, `sim`, or `production` as expected.

For the default public path, this should resolve as production without requiring an explicit endpoint export.

### 5.3 Local runtime-capability snapshot

```bash
bidvia runtime-capabilities
```

Use this to inspect repo-local runtime-facing knowledge only.

### 5.4 Server-capability normalization sample

```bash
bidvia server-capabilities
```

Use this to confirm the local parser/normalizer for server-derived payload shape. This is sample/local normalization only, not live negotiation.

If any of the matrix or smoke checks look wrong, stop here and fix the local install/configuration layer before attempting OpenClaw integration.

If you want the full grouped command surface before you choose the next step, run:

```bash
bidvia --help
```

The current shipped local-only CLI surface includes:

- read-only visibility commands
- the stable installed MCP subcommand `mcp-server`
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

## Step 6 — choose the integration entry mode

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

The stable installed MCP server command is:

```bash
bidvia mcp-server
```

For repo-local development/build use, the direct fallback remains:

```bash
node dist/mcp-server.js
```

This entrypoint is intentionally bounded to the local stdio loop only. It is not a hosted MCP service, not a remote registry participant, and not a broader runtime platform.

In practical terms, the OpenClaw side should treat it as:

- a local MCP tool source
- stdio-only
- catalog-backed
- limited to the currently shipped tool surfaces
- exposing both review-safe tools and explicit execution tools through the local server

That local execution surface is still not login. Transport/auth-provider hardening supports the local operator path, but Core-owned auth and user login remain outside the current executable package boundary.

## Step 7 — what to hand off to the OpenClaw Gateway operator

At the end of onboarding, the operator should have these facts written down explicitly:

1. the `openclaw-mcp-config` output that will be used as the local handoff source
2. which canonical Bidvia API domain is being used
3. whether the deployment is using the default public API or an explicit operator override
4. whether the deployment is currently relying on compatibility-window profile mapping
5. which environment variables are globally set for the Gateway context
6. which variables are injected per agent / per route family
7. whether the first integration step is CLI-first or stdio MCP-first

Do not leave these as tribal knowledge.

## Practical configuration baseline

For most OpenClaw Gateway installations, the safest baseline is:

1. install and build locally
2. export `openclaw-mcp-config`
3. confirm `route-context-matrix`
4. rely on the default public API unless operator control requires an override
5. set the minimal shared Bidvia tenant/principal values
6. run the four read-only smoke commands
7. only then wire the exported `bidvia mcp-server` fragment into OpenClaw if the Gateway side is ready, using `node dist/mcp-server.js` only as the repo-local fallback

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
