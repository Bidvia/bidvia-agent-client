# Bidvia Agent Client

`@bidvia/client` is the open-source SDK and CLI for connecting governed agents to the Bidvia platform.

The active execution plan for the current Stage 2 / Stage 3 wave is `.sisyphus/plans/agent-client-stage-2-stage-3-frozen-plane-execution.md`. This README stays focused on the shipped local-first package surface and should be read alongside that plan, not as a competing roadmap.

Today, this package ships a usable current mainline client surface for the frozen Bidvia Commercial Universe V1 / Core V12 handoff boundary. It includes typed SDK helpers, a widened read-only truth-fetch layer, stronger local operator discovery surfaces, richer review-safe readback, bounded scenario and verification helpers, local CLI commands, and a local stdio MCP seam. Stage 1 of the client-side runtime architecture upgrade is now complete in this repo: CLI and MCP execution flow through a shared local runtime core and write local accumulation records while preserving operator-facing outputs. Recent transport and auth-provider hardening support that local-only foundation, but they do not mean login is shipped. It does not claim hosted runtime behavior, remote registry behavior, integrated Core truth beyond frozen inputs, or client-owned authority.

## What ships today

This package currently gives external users two guided journeys:

- one primary public CLI-first journey organized as Learn, then Public Provisional create -> query -> claim, then Governed Run
- one secondary Governed Run journey where local stdio MCP remains a packaging/integration path, not a separate onboarding semantics layer

The same package also ships an SDK for Bidvia agent access routes, onboarding flows, registration-bound operations, the frozen downstream truth-fetch reads now adopted in the client surface, bounded scenario planning, and verification-safe exports.

The widened frozen read surface now visible in the SDK and CLI includes the canonical families behind `GET /runtime/agents/registrations`, `GET /runtime/agents/:registrationId`, `GET /runtime/authority-profiles`, `GET /runtime/capability-profiles`, `GET /runtime/agents/:registrationId/capability-profile`, plus the shipped participation-state and task-dispatch read/write wrappers where the client already exposes them. The local stdio MCP surface is now wider too, covering the approved OpenClaw-facing read, review-safe, and explicit execution families that already ship in this repo. It still stays local-first and bounded to the approved stdio runtime.

The current mainline remains explicitly bounded to the frozen Bidvia Commercial Universe V1 / Core V12 framing. This repo can improve client ergonomics, but it must not invent platform truth or widen governance authority on its own.

For current downstream contract truth, use the Bidvia Core downstream contract center (`docs/downstream-contract-center/**` in the main Bidvia repo) as the single frozen source for routine implementation.

For the current plane-by-plane adoption and gating view between the now-complete Stage 1 client runtime and the frozen Core-facing planes, use `docs/CORE_AGENT_CLIENT_PLANE_CONTRACT_GAPS.md`.

## Installation

### Current public install path

```bash
npm install @bidvia/client
```

The installed package exposes:

- `bidvia` for CLI commands
- `bidvia mcp-server` for the local stdio MCP server

### Developer fallback: repo-local development/build path

```bash
npm install
npm run build
```

This gives you:

- the local CLI at `node dist/cli.js`
- the local MCP fallback at `node dist/mcp-server.js`

Useful local verification commands:

```bash
npm test
npm run typecheck
npm run build
npm run validate
npm run validate:release-readiness
npm run validate:release-gate
```

## Start here

### Primary public CLI-first journey

For the normal public package path, start with the package defaults. The CLI resolves against `https://api.bidvia.cn`, so the baseline public journey does not start with `BIDVIA_BASE_URL`.

Current installed path:

```bash
bidvia onboard
bidvia context show
bidvia whoami
bidvia doctor
```

Developer fallback path:

```bash
node dist/cli.js onboard
node dist/cli.js context show
node dist/cli.js whoami
node dist/cli.js doctor
```

Use the first three commands for the Learn stage, and keep `doctor` as a supporting governed-run diagnostic once context starts to exist:

- `onboard` is the primary first-run entry point and rerunnable local guide
- `context show` shows effective local context and where each field came from
- `whoami` summarizes local identity without implying platform login
- `doctor` shows local diagnostics and, when enough context exists, the optional readiness live check on the governed side of the journey

When you need the explicit public provisional chain, keep create -> query -> claim visible instead of hiding query behind a browser flow or shorthand:

```bash
bidvia create-provisional-agent --provisional-agent-ref ...
bidvia query-provisional-agent --provisional-agent-ref ...
bidvia claim-provisional-agent --provisional-agent-ref ... --claim-token ...
```

When local context is ready and you are crossing into Run, use the bounded runtime path:

```bash
bidvia route-context-matrix
bidvia registration-lifecycle-plan
bidvia registered-agent-operations-plan
```

`docs/ONBOARDING.md` expands this Learn → Public Provisional create -> query -> claim → Governed Run path and shows where the supporting diagnostics fit around it.

In that split, `claim-provisional-agent` is session-bound, and `doctor`, `route-context-matrix`, and the plan commands belong to Governed Run rather than to the official public provisional chain.

### Secondary Governed Run journey

If your path includes a local OpenClaw Gateway or node-host install, treat that as one way to enter the same Governed Run surface rather than as a separate onboarding journey:

Current installed path:

```bash
bidvia openclaw-mcp-config
bidvia openclaw-bundle-export --output ./bidvia-openclaw-bundle
bidvia route-context-matrix
```

Developer fallback path:

```bash
node dist/cli.js openclaw-mcp-config
node dist/cli.js openclaw-bundle-export --output ./bidvia-openclaw-bundle
node dist/cli.js route-context-matrix
```

Use `openclaw-mcp-config` first to export the OpenClaw-compatible `command` / `args` / `env` fragment for the primary stdio MCP path. Use `openclaw-bundle-export --output ./bidvia-openclaw-bundle` when you want companion bundle/bootstrap packaging around that same local server written to disk. The installed execution story is still `bidvia mcp-server`, and the repo-local development fallback remains `node dist/mcp-server.js`. Then use `route-context-matrix` to confirm which context family the guided Governed Run route needs before enabling execution.

Continue with:

- `docs/OPENCLAW_GATEWAY_ONBOARDING.md` for the install and handoff order
- `docs/OPENCLAW_GATEWAY_SMOKE.md` for the smoke sequence

## Quick SDK use

For the normal public package path, the guided public journey stays CLI-first. If you need the direct SDK equivalent, point it at the canonical public API at `https://api.bidvia.cn`.

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

In practice, the SDK currently covers:

- official onboarding and claim flows
- registration-bound heartbeat, sync, evidence, and proposal operations
- agent-state and task-participation helpers
- truth-fetch reads for account agents, account agent bindings, and account records; richer governance deep reads for agent registrations, per-registration detail, agent presence, authority, readiness, summaries, authority profiles, capability profiles, and the singular per-registration capability profile; shipped participation-state and task-dispatch visibility plus task action wrappers; broader business truth-fetch families for canonical semantics, pricing, and document, media, evidence, attachment, and file-resource assets
- pricing, assets, connection, commercial-action, and related route helpers already present in code
- bounded scenario planning and verification bundle support
- richer review-safe readback for already-shipped bounded orchestration slices
- local capability and server-payload normalization helpers

The truth-fetch expansion now ships across the SDK and CLI, with the local stdio MCP layer exposing the approved OpenClaw-facing subset as a thin wrapper over shipped SDK helpers. The rollout is phased on purpose: the SDK and CLI now cover the widened frozen downstream read surface, while MCP exposes the currently approved governance, business-truth, review-safe, and explicit execution slices on the same local seam. That MCP layer stays local stdio only in every phase, and it stays Core-truth-consuming rather than truth-owning.

For the principal-governed read family, the honest default is `tenantId` plus `principalId`, with `adminSessionId` only as an optional companion on some routes. Local and sim probes without real governed credentials can prove route wiring, transport behavior, reachability, or auth-guard posture only. They do not prove full governed semantics.

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

Current installed path:

```bash
bidvia --help
```

Developer fallback path:

```bash
node dist/cli.js --help
```

For the normal public package path, CLI commands resolve against `https://api.bidvia.cn`. Start with `bidvia onboard` before you reach for explicit overrides.

Guided public journey, current installed path:

```bash
bidvia onboard
bidvia context show
bidvia whoami
bidvia doctor
bidvia create-provisional-agent --provisional-agent-ref ...
bidvia query-provisional-agent --provisional-agent-ref ...
bidvia claim-provisional-agent --provisional-agent-ref ... --claim-token ...
bidvia route-context-matrix
bidvia registration-lifecycle-plan
bidvia registered-agent-operations-plan
```

Developer fallback path:

```bash
node dist/cli.js onboard
node dist/cli.js context show
node dist/cli.js whoami
node dist/cli.js doctor
node dist/cli.js create-provisional-agent --provisional-agent-ref ...
node dist/cli.js query-provisional-agent --provisional-agent-ref ...
node dist/cli.js claim-provisional-agent --provisional-agent-ref ... --claim-token ...
node dist/cli.js route-context-matrix
node dist/cli.js registration-lifecycle-plan
node dist/cli.js registered-agent-operations-plan
```

Governed Run packaging/integration handoff, developer fallback path:

```bash
node dist/cli.js openclaw-mcp-config
node dist/cli.js openclaw-bundle-export
node dist/cli.js route-context-matrix
```

`openclaw-mcp-config` is the primary OpenClaw handoff because it points directly at `bidvia mcp-server`. `openclaw-bundle-export` is additive packaging for operators and agents that want bundle/bootstrap guidance around that same local runtime. `node dist/mcp-server.js` remains the repo-local fallback. Those steps support the same Governed Run journey rather than defining a separate OpenClaw-owned onboarding path.

Start with grouped help when you want the current local-only command surface:

```bash
node dist/cli.js --help
```

Supporting diagnostics and visibility commands:

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

The full truth-fetch command group also includes detail and collection reads for account records, account agent bindings, richer governance deep reads such as `agent-registrations`, `agent-registration`, `authority-profiles`, `capability-profiles`, and `agent-capability-profile`, plus `participation-states`, `participation-state`, `task-dispatches`, and `task-dispatch` around the frozen participation/task family. These commands stay operator-facing, and the governed read routes still require real principal context when you want more than local auth-posture proof.

`onboarding-readiness` remains available as a supporting read-only explainer, but `onboard` is now the visible public first-run entry point.

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

The CLI is intentionally local and operator-facing. It helps you inspect environment resolution, local capability views, dry-run payloads, and bounded reviewable flows. Its execution commands now run through the Stage 1 local runtime core and write local accumulation records without changing the operator-facing response shape. That does not turn this package into a hosted runtime, and it does not mean user login is already part of the executable package surface.

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

The shipped local MCP seam exposes widened truth-fetch tools, review-safe tooling, and explicit execution tooling, but only through a local stdio server. The truth-fetch rollout is phased: governance-first MCP reads ship first, business-truth reads ship second, and both stay thin wrappers over the shipped SDK helpers. The next OpenClaw-compatible release keeps stdio MCP first, companion bundle export second, and leaves HTTP MCP, hosted runtime behavior, remote registry participation, native-plugin-first runtime, login, OAuth, auth implementation, integrated Core capability truth refresh, full governed notification semantics, broader multi-agent coordination authority, and live negotiation out of scope.

Start here if that is your path:

```bash
bidvia openclaw-mcp-config
bidvia openclaw-bundle-export
bidvia route-context-matrix
```

Developer fallback path:

```bash
node dist/cli.js openclaw-mcp-config
node dist/cli.js openclaw-bundle-export
node dist/cli.js route-context-matrix
```

Then continue with:

- `docs/OPENCLAW_GATEWAY_ONBOARDING.md` for install and configuration order
- `docs/OPENCLAW_GATEWAY_SMOKE.md` for the detailed smoke sequence

For Gateway users on the public path, the safest order is still: install locally, export the operator config from `openclaw-mcp-config`, optionally export the companion bundle from `openclaw-bundle-export`, confirm route context with `route-context-matrix`, run the smoke commands against the default public API, then wire the local stdio MCP server only if the Gateway side is ready. The website handoff stays spec-only in `docs/WEBSITE_FIRST_ACCESS_HANDOFF.md` and does not change this OpenClaw runtime order.

If your Gateway deployment needs an operator-selected endpoint instead, set `BIDVIA_BASE_URL` explicitly before the smoke flow. Keep the boundary the same: local stdio MCP on your side, remote HTTPS Bidvia API on the other side.

## Release boundary, kept honest

The current mainline uses three release categories, and they should stay separate.

### 1. Shipped local surfaces

These are implemented in code today and available to users now. They include:

- the typed SDK client and helper builders
- the typed SDK truth-fetch read wrappers for the approved account, richer governance deep-read, semantic, pricing, and asset groups, including agent registrations, authority profiles, capability profiles, the singular per-registration capability profile, and the shipped participation/task visibility family
- the local stdio MCP tool surface for the approved governance, business-truth, review-safe, and explicit execution families, shipped in phases on the same local server
- bounded scenario planning and verification bundle support
- review-packet preview and export helpers, now with richer review-safe readback around the already-shipped bounded slices
- explicit local execution commands with `--dry-run`
- explicit CLI truth-fetch commands for the same approved read groups, centered on `agent-registrations`, `agent-registration`, `authority-profiles`, `capability-profiles`, `agent-capability-profile`, `participation-states`, `participation-state`, `task-dispatches`, and `task-dispatch`
- static capability metadata, operator discovery snapshots, and local runtime-capability snapshots
- server-capability payload normalization
- environment-mode visibility
- the local CLI command surface
- the local stdio MCP descriptor and server seam, including review-safe and explicit execution tools plus the companion OpenClaw bundle export
- OpenClaw Gateway operator documentation for the local path
- transport/auth-provider hardening for local execution paths

The shipped MCP slice stays local stdio only and sourced from the SDK helpers already in this repo. Its execution tools now use the same Stage 1 local runtime core and local accumulation layer as CLI execution, while keeping the tool results operator-facing and non-authoritative. It is not a hosted runtime, not HTTP MCP, not a native-plugin-first package, not a new auth layer, and not a new source of platform truth.

In plain terms, phase order matters here. The widened governance deep-read family ships through the SDK and CLI, while MCP now covers the approved governance, business-truth, review-safe, and explicit execution families that already ship in this repo. If canonical-semantic taxonomy or lineage aliases are mentioned at all, treat them as transitional or non-final only. None of that widens the MCP layer beyond a local stdio wrapper over already-shipped SDK helpers, and none of it turns the client into a hosted or control-plane-owning product.

### 2. Implemented but dependency-gated seams

These seams exist in code as readiness-only consumption points, but they remain blocked until Bidvia Core provides frozen truth.

`refreshRemoteCapabilityTruth(...)` belongs here. The seam is ready to consume a future frozen Core capability-truth payload, but this repo does not have that truth today. Until frozen Core-owned capability truth exists, every blocked refresh stays fail-closed and must not be read as truth closure.

The same rule now applies to the Stage 3 release closure gate. Stage 3 release closure stays blocked until P0, P1, and P2 adoption are packet-grounded. Operators can inspect that fail-closed gate through `bidvia runtime-capabilities`, `bidvia route-context-matrix`, and `bidvia operator-discovery`, but those repo-facing snapshots only encode current plane-adoption truth; the release validator suite remains a separate requirement before any human release packet can describe full `1.0.0` closure.

### 3. Deferred areas

These areas are outside the current shipped boundary:

- hosted MCP and hosted runtime behavior
- remote registry behavior and remote discovery
- live remote negotiation
- approval-to-opportunity creation or discovery beyond the explicit current handoff seam
- integrated Core-owned notification truth, full governed task outcome semantics beyond the shipped wrappers, and broader multi-agent coordination truth
- login, OAuth, or any auth implementation beyond local transport/auth-provider seams
- capability truth integration beyond local descriptive surfaces
- broader orchestration beyond the shipped bounded slices
- any client-owned authority or server-truth claims beyond the frozen boundary

The executable Stage 3 release gate also requires all of the following validator commands to stay green together before any human release packet can describe public closure:

```bash
npm test
npm run typecheck
npm run build
npm run validate
npm run validate:release-readiness
npm run validate:release-gate
```

## Current scope, in plain language

This package is not yet the full Bidvia agent operating kit vision. The shipped slice is centered on the execution layer, with bounded scenario, verification, and local adapter support around it.

That means you can use it today for governed agent access, bounded reviewable flows, and local operator tooling. You should not read it as a complete runtime platform, a source of Core authority, or a promise of remote negotiation behavior that does not exist yet.

## Recommended docs next

- `docs/ONBOARDING.md` for the primary public CLI-first Learn → Public Provisional create -> query -> claim → Governed Run path
- `docs/OPENCLAW_GATEWAY_ONBOARDING.md` for Gateway and node-host installation
- `docs/OPENCLAW_GATEWAY_SMOKE.md` for Gateway smoke verification
- `docs/WEBSITE_FIRST_ACCESS_HANDOFF.md` for the website-team handoff contract
- `docs/CONTRACT_BOUNDARY.md` for contract and authority boundaries

## License

MIT
