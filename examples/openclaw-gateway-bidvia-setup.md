# OpenClaw Gateway Bidvia Setup Example

This example shows one concrete local operator path for preparing `@bidvia/client` under an OpenClaw Gateway / node-host style deployment.

It is intentionally bounded to the currently shipped local/Gateway model:

- local install
- default public remote HTTPS Bidvia API
- local read-only smoke checks
- optional local stdio MCP wiring

It does **not** assume:

- hosted Bidvia runtime
- hosted MCP service
- remote registry discovery
- live remote capability negotiation

## Install model, kept honest

Current public install path:

```bash
npm install @bidvia/client
```

That path gives you `bidvia` for the CLI and `bidvia mcp-server` for the local stdio MCP server.

Developer fallback path:

```bash
npm install
npm run build
```

That path gives you `node dist/cli.js` for the CLI and `node dist/mcp-server.js` as the local MCP fallback.

## 1. Install and build

```bash
npm install
npm run build
```

This gives you the CLI at `dist/cli.js` and the local stdio MCP fallback entrypoint at `dist/mcp-server.js`.

## 2. Start from the shipped OpenClaw handoff

Do not reconstruct the MCP command and environment block by hand. Export the shipped operator config first:

```bash
bidvia openclaw-mcp-config
```

Use that output as the source of truth for:

- the OpenClaw-compatible `command` / `args` / `env` fragment
- the default public `BIDVIA_BASE_URL`
- the required and optional environment placeholders
- the local-only boundary flags

The primary installed MCP execution story in that export is now `bidvia mcp-server`. Keep `node dist/mcp-server.js` only as the repo-local development/build fallback.

## 3. Confirm the guided route context

```bash
bidvia route-context-matrix
```

Use this to confirm that the public-first onboarding rows stay primary and the OpenClaw/operator row stays secondary before you enable execution.

## 4. Use the default public endpoint first

For the normal public operator path, `bidvia` already defaults to `https://api.bidvia.cn`.

Start with that package default. You do not need to export `BIDVIA_BASE_URL` for the baseline public smoke flow.

If this deployment needs local, sim, china, or another operator-managed endpoint instead, use the advanced override section below.

## 5. Set the minimum Bidvia context

Start with the minimum shared Gateway-side values:

```bash
export BIDVIA_TENANT_ID="tenant-a"
export BIDVIA_PRINCIPAL_ID="actor-gateway-1"
```

Add route-specific variables only when needed later:

- `BIDVIA_REGISTRATION_ID`
- `BIDVIA_SESSION_ID`

Do not assume every agent or every route family shares one execution context.

## 6. Run the read-only smoke commands

### 6.1 OpenClaw config export

```bash
bidvia openclaw-mcp-config
```

### 6.2 Route-context matrix

```bash
bidvia route-context-matrix
```

### 6.3 Launch topology smoke

```bash
bidvia launch-topology-smoke
```

Use this to confirm:

- resolved `baseUrl`
- resolved `environmentMode`
- default public resolution to `https://api.bidvia.cn` when no override is set
- canonical `api.*` domains
- compatibility profile mappings

### 6.4 Environment mode

```bash
bidvia environment-mode
```

Use this to confirm the current default or explicit override resolves to the expected environment classification.

### 6.5 Runtime capabilities

```bash
bidvia runtime-capabilities
```

Use this to inspect repo-local runtime-facing knowledge only.

### 6.6 Server capability normalization sample

```bash
bidvia server-capabilities
```

Use this to inspect the locally normalized server-derived sample shape only. It does not contact a server.

### 6.7 Grouped CLI help

```bash
bidvia --help
```

Use this to confirm the current packaged command surface before deciding whether the next operator step is dry-run execution, review-safe export, or local MCP wiring.

## 7. Advanced operator override, optional local integrity checks

If this deployment needs explicit endpoint control, set `BIDVIA_BASE_URL` before running the smoke flow.

Examples:

```bash
export BIDVIA_BASE_URL="http://127.0.0.1:8787"
export BIDVIA_BASE_URL="https://sim.bidvia.ai"
export BIDVIA_BASE_URL="https://api.bidvia.cn"
```

Active profile/default resolution note:

- default profile -> `https://api.bidvia.cn`
- `global` profile -> `https://api.bidvia.ai`
- `china` profile -> `https://api.bidvia.cn`

Compatibility-window note:

- `global` compatibility mapping may still appear as `https://bidvia.ai` in `launch-topology-smoke`
- `china` compatibility mapping may still appear as `https://bidvia.cn` in `launch-topology-smoke`

Those root domains are compatibility metadata in smoke output, not the active profile resolution targets. The default public setup path should stay package-first.

If you want a stronger local verification pass before Gateway wiring:

```bash
npm test
npm run validate
```

If you want explicit local execution payload previews without sending a request yet:

```bash
bidvia heartbeat --dry-run
bidvia sync-upload --dry-run
bidvia evidence --dry-run
bidvia proposal --dry-run
```

If you want review-safe verification-bundle previews or exports:

```bash
bidvia verification-bundle-preview --input registration-lifecycle
bidvia verification-bundle-export --input registered-agent-operations
```

## 8. Optional runnable local examples

If you want the standalone local examples for the same visibility surfaces:

```bash
npx tsx examples/runtime-capabilities.ts
npx tsx examples/server-capabilities.ts
```

These stay local and do not add hosted or remote behavior.

## 9. Optional local stdio MCP wiring

If the OpenClaw side is ready to consume a local stdio MCP server, the stable installed entrypoint is:

```bash
bidvia mcp-server
```

For repo-local development/build use, the direct fallback remains:

```bash
node dist/mcp-server.js
```

Treat it as:

- local
- stdio-only
- catalog-backed
- limited to the currently shipped tool surfaces
- exposing review-safe tools and explicit execution tools from the local package surface

Do **not** treat it as a hosted MCP service or remote registry participant.

Transport/auth-provider hardening supports this local path, but it still does not mean login ships in the package today.

## 10. Minimal copy-paste baseline

```bash
npm install @bidvia/client
bidvia openclaw-mcp-config
bidvia route-context-matrix
export BIDVIA_TENANT_ID="tenant-a"
export BIDVIA_PRINCIPAL_ID="actor-gateway-1"
bidvia launch-topology-smoke
bidvia environment-mode
bidvia runtime-capabilities
bidvia server-capabilities
```

If that baseline is clean, then the operator can move on to:

- `npm test`
- `npm run validate`
- or the exported `bidvia mcp-server` fragment, with `node dist/mcp-server.js` kept as the repo-local fallback

depending on whether the next step is stronger local verification or local stdio MCP wiring.

If the operator needs explicit endpoint control instead of the default public path, add `export BIDVIA_BASE_URL="..."` before the smoke commands and re-run the same bounded flow.

## 11. What this setup example does not prove

This example proves only a local / Gateway-side setup path.

It does **not** prove:

- hosted runtime readiness
- live remote capability negotiation
- hosted MCP integration
- remote registry discovery
- automatic seam crossing
- broader orchestration authority
