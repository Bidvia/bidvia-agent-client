# OpenClaw Gateway Bidvia Setup Example

This example shows one concrete local operator path for preparing `bidvia-agent-client` under an OpenClaw Gateway / node-host style deployment.

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

## 1. Change into the repo

```bash
cd /Users/liujiao/develop/Bidvia-agent-client
```

## 2. Install and build

```bash
npm install
npm run build
```

This gives you:

- `dist/cli.js`
- `dist/src/mcp-server.js`

## 3. Use the default public endpoint first

For the normal public operator path, `bidvia-agent-client` already defaults to `https://api.bidvia.ai`.

Start with that package default. You do not need to export `BIDVIA_BASE_URL` for the baseline public smoke flow.

If this deployment needs local, sim, china, or another operator-managed endpoint instead, use the advanced override section below.

## 4. Set the minimum Bidvia context

Start with the minimum shared Gateway-side values:

```bash
export BIDVIA_TENANT_ID="tenant-a"
export BIDVIA_PRINCIPAL_ID="actor-gateway-1"
```

Add route-specific variables only when needed later:

- `BIDVIA_REGISTRATION_ID`
- `BIDVIA_SESSION_ID`

Do not assume every agent or every route family shares one execution context.

## 5. Run the read-only smoke commands

### 5.1 Launch topology smoke

```bash
node dist/cli.js launch-topology-smoke
```

Use this to confirm:

- resolved `baseUrl`
- resolved `environmentMode`
- default public resolution to `https://api.bidvia.ai` when no override is set
- canonical `api.*` domains
- compatibility profile mappings

### 5.2 Environment mode

```bash
node dist/cli.js environment-mode
```

Use this to confirm the current default or explicit override resolves to the expected environment classification.

### 5.3 Runtime capabilities

```bash
node dist/cli.js runtime-capabilities
```

Use this to inspect repo-local runtime-facing knowledge only.

### 5.4 Server capability normalization sample

```bash
node dist/cli.js server-capabilities
```

Use this to inspect the locally normalized server-derived sample shape only. It does not contact a server.

### 5.5 Grouped CLI help

```bash
node dist/cli.js --help
```

Use this to confirm the current packaged command surface before deciding whether the next operator step is dry-run execution, review-safe export, or local MCP wiring.

## 6. Advanced operator override, optional local integrity checks

If this deployment needs explicit endpoint control, set `BIDVIA_BASE_URL` before running the smoke flow.

Examples:

```bash
export BIDVIA_BASE_URL="http://127.0.0.1:8787"
export BIDVIA_BASE_URL="https://sim.bidvia.ai"
export BIDVIA_BASE_URL="https://api.bidvia.cn"
```

Active profile/default resolution note:

- default or `global` profile -> `https://api.bidvia.ai`
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
node dist/cli.js heartbeat --dry-run
node dist/cli.js sync-upload --dry-run
node dist/cli.js evidence --dry-run
node dist/cli.js proposal --dry-run
```

If you want review-safe verification-bundle previews or exports:

```bash
node dist/cli.js verification-bundle-preview --input registration-lifecycle
node dist/cli.js verification-bundle-export --input registered-agent-operations
```

## 7. Optional runnable local examples

If you want the standalone local examples for the same visibility surfaces:

```bash
npx tsx examples/runtime-capabilities.ts
npx tsx examples/server-capabilities.ts
```

These stay local and do not add hosted or remote behavior.

## 8. Optional local stdio MCP wiring

If the OpenClaw side is ready to consume a local stdio MCP server, use the shipped entrypoint:

```bash
node dist/src/mcp-server.js
```

Treat it as:

- local
- stdio-only
- catalog-backed
- limited to the currently shipped tool surfaces
- exposing review-safe tools and explicit execution tools from the local package surface

Do **not** treat it as a hosted MCP service or remote registry participant.

Transport/auth-provider hardening supports this local path, but it still does not mean login ships in the package today.

## 9. Minimal copy-paste baseline

```bash
cd /Users/liujiao/develop/Bidvia-agent-client
npm install
npm run build
export BIDVIA_TENANT_ID="tenant-a"
export BIDVIA_PRINCIPAL_ID="actor-gateway-1"
node dist/cli.js launch-topology-smoke
node dist/cli.js environment-mode
node dist/cli.js runtime-capabilities
node dist/cli.js server-capabilities
```

If that baseline is clean, then the operator can move on to:

- `npm test`
- `npm run validate`
- or `node dist/src/mcp-server.js`

depending on whether the next step is stronger local verification or local stdio MCP wiring.

If the operator needs explicit endpoint control instead of the default public path, add `export BIDVIA_BASE_URL="..."` before the smoke commands and re-run the same bounded flow.

## 10. What this setup example does not prove

This example proves only a local / Gateway-side setup path.

It does **not** prove:

- hosted runtime readiness
- live remote capability negotiation
- hosted MCP integration
- remote registry discovery
- automatic seam crossing
- broader orchestration authority
