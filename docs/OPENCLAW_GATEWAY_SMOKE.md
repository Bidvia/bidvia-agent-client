# OpenClaw Gateway Smoke Guide

## Goal

This document is the detailed smoke companion for `docs/OPENCLAW_GATEWAY_ONBOARDING.md`.

Use it after basic install and configuration are complete, and before you treat an OpenClaw Gateway / node-host deployment as ready for operator use.

This smoke guide is intentionally bounded to the shipped local operator path:

- local package build and validation
- local CLI read-only checks
- local stdio MCP server entry availability
- remote HTTPS API domain visibility only

It does **not** assume any hosted Bidvia runtime, hosted MCP service, or remote registry behavior.

## Scope boundary

This guide answers one question only:

> “Is this local / Gateway-side `bidvia-agent-client` install configured and visible enough to proceed?”

It does **not** prove:

- hosted runtime readiness
- live remote capability negotiation
- hosted MCP readiness
- approval-to-opportunity seam crossing
- broader orchestration behavior beyond the currently shipped bounded slices

## Recommended smoke order

Run the smoke checks in this order:

1. build check
2. test check
3. contract validation check
4. OpenClaw config export smoke
5. route-context matrix smoke
6. launch topology smoke
7. environment mode smoke
8. runtime-capability snapshot smoke
9. server-capability normalization smoke
10. optional local MCP server entry check

Do not skip directly to MCP wiring before the earlier checks are clean.

## 1. Build check

### Command

```bash
npm run build
```

### What this proves

- the package compiles
- `dist/cli.js` exists in a current build
- `dist/mcp-server.js` exists in a current build

### If this fails

Treat it as a local install/build problem first.

High-level meaning:

- TypeScript compile state is not clean
- the operator should not proceed to CLI or Gateway integration yet

## 2. Test check

### Command

```bash
npm test
```

### What this proves

- the shipped local test suite is still passing in the current install
- core helper and contract assumptions are not obviously broken in this environment

### If this fails

Treat it as a local package integrity or environment issue.

High-level meaning:

- do not assume the package is safe to hand off to a Gateway operator yet
- fix test failures before proceeding

## 3. Contract validation check

### Command

```bash
npm run validate
```

### What this proves

- local emitted route samples still match the frozen contract expectations
- representative headers and bodies remain aligned with current bounded helper surfaces

### If this fails

Treat it as a contract-surface warning, not a Gateway-only problem.

High-level meaning:

- the local install may no longer reflect the expected frozen client contract
- do not continue to operator rollout until resolved

## 4. OpenClaw config export smoke

### Command

```bash
node dist/cli.js openclaw-mcp-config
```

### What this proves

- the shipped local stdio MCP handoff can be exported without repo archaeology
- the default public `BIDVIA_BASE_URL` is visible in the operator config
- the local MCP command is handed off as `node dist/mcp-server.js`
- the boundary stays local-only, non-hosted, and non-discovery
- the visible next success step remains `route-context-matrix`

### If this fails

Treat it as a local operator handoff problem first.

High-level meaning:

- the Gateway-side setup is missing the convenience export that should anchor the rest of the smoke flow
- do not replace it with handwritten MCP config until the packaged export is understood

## 5. Route-context matrix smoke

### Command

```bash
node dist/cli.js route-context-matrix
```

### What this proves

- the public-first onboarding rows stay primary
- the local OpenClaw/operator row stays secondary
- the required context family is visible before local operator execution is enabled
- the visible operator next success step remains `registered-agent-operations-plan`

### If this fails

Treat it as a guided-journey context problem.

High-level meaning:

- the operator cannot safely tell which context family is required for the shipped route path
- do not move on to MCP wiring until the matrix output is back

## 6. Launch topology smoke

### Command

```bash
node dist/cli.js launch-topology-smoke
```

### What this proves

- the resolved `baseUrl` is what the current environment actually produces
- the resolved `environmentMode` is visible locally
- the default public path resolves to `https://api.bidvia.ai` when no override is set
- the canonical production API domains are visible as:
  - `https://api.bidvia.ai`
  - `https://api.bidvia.cn`
- the compatibility-window profile mappings are visible as:
  - `global -> https://bidvia.ai`
  - `china -> https://bidvia.cn`

### If this fails

Treat it as an environment/topology configuration problem.

High-level meaning:

- the operator may be pointing at the wrong domain
- the package default may have been overridden unexpectedly
- the canonical `api.*` guidance may not be reflected in the local environment
- profile compatibility assumptions may not match the current shell/env state

## 7. Environment mode smoke

### Command

```bash
node dist/cli.js environment-mode
```

### What this proves

- the current base URL resolves to `local`, `sim`, or `production`
- the local environment classifier is behaving consistently with the current default or explicit override

### If this fails

Treat it as a local environment interpretation problem.

High-level meaning:

- the current base URL may be malformed or unexpected
- the operator should not assume later capability output is being interpreted in the intended environment mode

## 8. Runtime-capability snapshot smoke

### Command

```bash
node dist/cli.js runtime-capabilities
```

### What this proves

- the repo-local runtime-facing knowledge surface is readable as JSON
- static route capability metadata is visible
- static MCP tool metadata is visible
- local MCP server availability is visible
- deferred server-provided negotiation is still represented as deferred, not invented as available truth

### If this fails

Treat it as a local visibility-layer problem.

High-level meaning:

- the operator has lost one of the main read-only diagnostics surfaces
- do not proceed to Gateway integration without restoring that visibility

## 9. Server-capability normalization smoke

### Command

```bash
node dist/cli.js server-capabilities
```

### What this proves

- the local parser/normalizer for server-derived capability payload shape is working
- the normalized output can be inspected without contacting a server
- `server-derived` knowledge is still clearly separated from local-static knowledge

### If this fails

Treat it as a local normalization/parser problem.

High-level meaning:

- server-derived payload handling cannot currently be inspected or demonstrated locally
- do not mistake this for a remote negotiation failure, because the command is sample/local only

## 10. Optional local MCP server entry check

### Entrypoint

```bash
node dist/mcp-server.js
```

### What this proves

- the built local stdio MCP server entrypoint exists
- the Gateway-side next step can use the shipped local stdio path if desired
- the local MCP surface remains bounded to shipped review-safe and explicit execution tools only

### Operational note

This is an entry check, not a hosted-service proof.

It should be treated as:

- local
- stdio-only
- bounded to `initialize`, `tools/list`, and `tools/call`

### If this fails

Treat it as a local packaging or MCP entrypoint problem.

High-level meaning:

- the Gateway cannot yet consume the shipped local stdio MCP surface
- fall back to CLI-first verification until the local MCP entrypoint is restored

## Smoke result interpretation

### Safe to continue to OpenClaw Gateway integration when:

- `npm run build` passes
- `npm test` passes
- `npm run validate` passes
- `openclaw-mcp-config` returns the shipped local stdio handoff with the expected default public base URL and boundary flags
- `route-context-matrix` keeps the public-first rows primary and the operator row secondary
- `launch-topology-smoke` returns the expected default public resolution or the intended explicit override, plus the canonical `api.*` and compatibility mapping information
- `environment-mode` reflects the intended environment
- `runtime-capabilities` returns local-static and deferred surfaces as expected
- `server-capabilities` returns normalized `server-derived` sample output as expected

### Stop and fix locally when:

- build/test/validate fails
- default public resolution or explicit override resolution looks wrong
- runtime capability visibility is missing
- server capability normalization output is missing or malformed

## Minimal smoke bundle for operators

If an operator only has time for the shortest meaningful check, use this exact order:

```bash
npm run build
node dist/cli.js openclaw-mcp-config
node dist/cli.js route-context-matrix
node dist/cli.js launch-topology-smoke
node dist/cli.js environment-mode
node dist/cli.js runtime-capabilities
node dist/cli.js server-capabilities
```

If that bundle is clean, then move on to the fuller test/validate path and the local stdio MCP entry wiring.

For the default public path, run that bundle without setting `BIDVIA_BASE_URL` first.

If the deployment needs local, sim, china, or other operator-managed routing instead, set `BIDVIA_BASE_URL` before the smoke run and treat that as an explicit advanced override, not the baseline public path.

If you want the grouped local-only command surface before or after the smoke run, use:

```bash
node dist/cli.js --help
```

That help output is the quickest way to confirm the current packaged CLI still includes read-only visibility commands, explicit execution commands with `--dry-run`, review-safe plan/review/export commands, and verification-bundle preview/export commands.

## Relationship to the main onboarding guide

Use `docs/OPENCLAW_GATEWAY_ONBOARDING.md` for:

- install/configure order
- `openclaw-mcp-config` as the operator handoff source
- `route-context-matrix` before execution enablement
- default public path first, with explicit override guidance second
- compatibility-window explanation
- CLI-first vs MCP-first entry choice

Use this document for:

- the detailed smoke sequence
- what each command proves
- how to interpret failures at a high level
