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
2. configure the correct Bidvia API base URL and context variables
3. verify the local launch topology and capability surfaces with read-only commands
4. choose whether the next integration step is:
   - direct CLI/operator usage, or
   - local stdio MCP server wiring into OpenClaw

This guide is **not** the full smoke catalogue. Keep expanded smoke procedures in `docs/OPENCLAW_GATEWAY_SMOKE.md`.

## Recommended operator path

Follow this order:

1. install dependencies and build the package
2. set the Bidvia API base URL explicitly
3. set the minimum Bidvia context environment variables
4. run the read-only topology and capability smoke commands
5. decide whether the OpenClaw integration entry should be:
   - local CLI/operator checks first, or
   - local stdio MCP server consumption

Do **not** start by assuming hosted runtime or remote negotiation exists.

## Step 1 — install and build

From the repo root:

```bash
npm install
npm run build
```

This gives you the built CLI at `dist/cli.js` and the built local MCP server entrypoint at `dist/mcp-server.js`.

## Step 2 — configure the canonical Bidvia API domain

For production launch, the canonical API domains are:

- global canonical API -> `https://api.bidvia.ai`
- china canonical API -> `https://api.bidvia.cn`

In production, prefer an explicit `BIDVIA_BASE_URL` with one of those canonical `api.*` domains.

Example:

```bash
export BIDVIA_BASE_URL="https://api.bidvia.ai"
```

During the compatibility window, the profile mappings remain supported:

- `global` profile compatibility mapping -> `https://bidvia.ai`
- `china` profile compatibility mapping -> `https://bidvia.cn`

That compatibility behavior is still valid for now, but it is not the canonical production recommendation.

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
- canonical `api.*` domains
- compatibility profile mappings

### 4.2 Environment mode visibility

```bash
node dist/cli.js environment-mode
```

Use this to confirm the current base URL resolves to `local`, `sim`, or `production` as expected.

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
node dist/mcp-server.js
```

This entrypoint is intentionally bounded to the local stdio loop only. It is not a hosted MCP service, not a remote registry participant, and not a broader runtime platform.

In practical terms, the OpenClaw side should treat it as:

- a local MCP tool source
- stdio-only
- catalog-backed
- limited to the currently shipped tool surfaces

## Step 6 — what to hand off to the OpenClaw Gateway operator

At the end of onboarding, the operator should have these facts written down explicitly:

1. which canonical Bidvia API domain is being used
2. whether the deployment is currently relying on compatibility-window profile mapping
3. which environment variables are globally set for the Gateway context
4. which variables are injected per agent / per route family
5. whether the first integration step is CLI-first or stdio MCP-first

Do not leave these as tribal knowledge.

## Practical configuration baseline

For most OpenClaw Gateway installations, the safest baseline is:

1. install and build locally
2. set explicit `BIDVIA_BASE_URL` to canonical `api.*`
3. set the minimal shared Bidvia tenant/principal values
4. run the four read-only smoke commands
5. only then wire `node dist/mcp-server.js` into OpenClaw if the Gateway side is ready

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
