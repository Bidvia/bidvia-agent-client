# Roadmap

## Product direction

The long-term product direction is an agent operating kit, not only a route-wrapper SDK.

That means the repo should eventually cover:

- operating guidance
- context/environment handling
- execution helpers
- scenario envelopes
- verification export
- adapter/tooling surfaces

## Current delivered slice

The repo now includes a current mainline public consumer execution-layer wave, aligned to the frozen Bidvia Commercial Universe V1 / Core V12 handoff boundary, inside that broader product direction:

1. frozen core-aligned onboarding / query / claim request formation
2. frozen registration-bound heartbeat / sync / evidence / proposal request formation
3. canonical ingestion/normalization plus freshness-aware local working-view and snapshot discipline
4. governed agent-state and task-participation helpers that keep authority separate from presence, readiness, and cache-like signals
5. pricing plus media/evidence/document/attachment consumption helpers that explain structure without claiming final platform truth
6. review-safe governed proposal / review / authorized-use workflow helpers
7. production-proven business-chain helper slices for listing/match, connection/approval, package export, and commercial actions
8. generic scenario-envelope builders plus bounded registration-lifecycle, registered-agent-operations, industry-universe, connection-approval, and commercial-action continuation scenario slices, plus one honest cross-chain coordinator layer across those shipped slices
9. richer scenario verification bundle support, derived review-packet builders with reviewer-facing detail, and stable review-packet export compatibility
10. bounded CLI preview and export commands for scenario plans, review packets, and business verification wave previews across shipped slices
11. machine-readable static capability metadata for shipped helpers and scenario route keys
12. local runtime-capability snapshot output for repo-known route, MCP, and local server facts
13. server-capability payload parsing and normalization into the repo capability shape
14. dependency-gated remote capability refresh seam between local snapshot and optional core capability payload
15. static MCP-facing tool descriptors and catalog exports for the shipped bounded slices plus a bounded local stdio MCP server entrypoint
16. environment mode classification for `local`, `sim`, and `production` plus a read-only CLI visibility command
17. contract tests plus stubbed local example flows

## Release-language guardrail

For the current release train, describe the delivered slice in three separate buckets:

1. shipped local surfaces that are implemented and tested here
2. implemented seams that stay dependency-gated until Bidvia Core provides frozen truth
3. deferred runtime and control-plane areas that are still outside the repo boundary

The remote capability refresh path belongs in bucket 2. It is a shipped seam, but not a claim of integrated Core truth, live negotiation, remote discovery, hosted MCP/runtime behavior, or remote registry behavior.

## Planned next layers

1. broader scenario families beyond the currently delivered bounded slices
2. richer business-chain orchestration beyond the current bounded listing/match and connection-approval scenario paths
3. broader review-packet and verification workflow improvements beyond the current bounded preview and export layer
4. broader CLI flows for business verification waves
5. live MCP server, transport, negotiation, and broader adapter/runtime surfaces beyond the current static catalog layer

## Production verification lessons from the earlier V11 wave-1/2/3 work

The first production verification waves exposed a clear next backlog for the client.

### 1. Business-chain helpers above atomic routes

Current client scope is still mostly atomic:

- onboarding / claim
- heartbeat
- sync
- evidence
- proposal

Production wave-2 and wave-3 proved that real business verification quickly needs higher-level orchestration helpers for:

- `listing -> activate -> match-candidates`
- `match -> connection-request -> approval`
- explicit-opportunity `package-export`
- `commercial-actions` continuation

### 2. Scenario and evidence envelopes

Production real-data verification required carrying more than route payloads.
The client needs a first-class envelope for:

- source references
- evidence references
- product-family identity
- workflow/trace continuity
- runtime record ids produced at each step

Current progress:

- generic scenario envelope core added
- registration-lifecycle scenario plan builder added
- bounded registration-lifecycle runner added
- repo-local `examples/registration-lifecycle-scenario.ts` added for the shipped lifecycle path
- registered-agent-operations scenario plan builder added
- bounded registered-agent-operations runner added
- repo-local `examples/registered-agent-operations-scenario.ts` added for the shipped post-onboarding path
- industry-universe scenario plan builder added
- bounded listing -> activate -> match scenario orchestration helper added
- connection-approval scenario plan builder added
- bounded match -> connection-request -> approval orchestration helper added
- commercial-action continuation scenario plan builder added
- bounded commercial-action continuation runner and review readback helper added
- cross-chain coordinator plan builder plus pre-handoff and post-handoff runners added
- repo-local `examples/multi-business-chain-coordinator.ts` added for the shipped coordinator path
- explicit-opportunity package handoff plan/runner added

Current deferral boundary:

- no approval -> opportunity creation or discovery helper exists in this repo yet
- no automatic approval -> opportunity seam crossing exists in this repo yet
- no broader multi-business-chain orchestration layer exists beyond the current coordinator path yet
- no new marketplace, approval, or autonomous-governance authority is introduced by the registration-lifecycle family
- no onboarding, approval, marketplace, or autonomous-governance authority is introduced by the registered-agent operations family

### 3. Access-context switching

Production routes are not uniform today:

- some write-side routes accept explicit operator principal headers
- some read-side routes require admin-session wrapping

The client should make that split explicit instead of leaving callers to remember route-by-route access semantics.

Current progress:

- static route capability metadata added in `src/capabilities.ts`
- required context and access-context family are now discoverable through a repo-local machine-readable registry

Current deferral boundary:

- no runtime capability negotiation exists in this repo yet
- no server-provided capability discovery exists in this repo yet

### 4. Local runtime-capability snapshot

The client can now publish one repo-local capability snapshot without claiming that the server negotiated or provided it.

Current progress:

- `buildLocalRuntimeCapabilitySnapshot(...)` added in `src/runtime-capabilities.ts`
- read-only `runtime-capabilities` CLI command added in `src/cli.ts`
- repo-local `examples/runtime-capabilities.ts` added for discoverability

Current deferral boundary:

- no server-provided runtime negotiation exists in this repo yet
- no remote capability fetch exists in this repo yet
- no broader runtime truth is implied beyond shipped local knowledge

### 5. Server-capability normalization

The client can now normalize one server-derived capability payload into the repo’s capability model without claiming that it negotiated or fetched that payload itself.

Current progress:

- `normalizeServerCapabilityPayload(...)` added in `src/server-capabilities.ts`
- read-only `server-capabilities` CLI command added in `src/cli.ts`
- repo-local `examples/server-capabilities.ts` added for discoverability

Current deferral boundary:

- no live server negotiation exists in this repo yet
- no remote capability discovery exists in this repo yet
- no network fetch is introduced by the normalization layer

### 6. Dependency-gated remote capability refresh

The client can now wire together local snapshot knowledge and an optional server-derived payload shape, but only through a dependency-gated seam rather than a fully integrated Core truth path.

Current progress:

- `refreshRemoteCapabilityTruth(...)` added in `src/remote-capability-refresh.ts`
- local snapshot and normalized server payload can now be merged into one effective view shape
- the seam reports an explicit blocked `dependency-gated` state when frozen core capability truth is unavailable
- the seam stays fail-closed when Core-owned truth is missing, so callers can see the blocked boundary without treating local data as server truth

Current deferral boundary:

- no frozen Bidvia Core capability truth source exists in this repo yet
- no integrated live refresh loop exists in this repo yet
- no authority ownership shifts from Core to client through this seam
- no live remote negotiation, hosted MCP/runtime bridging, or remote registry behavior is introduced by this seam

### 7. Environment mode visibility

The client can now classify the current base URL into a simple environment mode without claiming control over runtime behavior.

Current progress:

- `resolveBidviaEnvironmentMode(...)` added in `src/config.ts`
- `resolveBidviaEnvironmentModeFromEnv(...)` added in `src/config.ts`
- read-only `environment-mode` CLI command added in `src/cli.ts`

Current deferral boundary:

- no environment-specific execution policy exists in this repo yet
- no runtime behavior changes are introduced by environment mode classification
- no broader transport/runtime expansion exists through this visibility layer

### 8. Production-safe verification mode

The client should gain a bounded verification mode that can:

- log every record id created
- preserve source/evidence links
- mark scenario waves clearly
- export a verification bundle for later review

Current progress:

- richer scenario verification bundle added
- bounded review-packet builders, previews, and exports added for shipped scenario slices
- richer reviewer-facing review-packet detail added for route coverage and recorded ids derived from existing scenario and bundle facts
- legacy verification export preserved for compatibility

### 9. Commercial-action support

Wave-3 proved that `commercial-actions` is a real production path now.
The client should grow dedicated helpers for:

- create
- policy-check
- request-approval
- execute
- status / receipt / audit readback

Current progress:

- dedicated create/policy-check/request-approval/execute/status/receipt/audit helpers added
- bounded commercial-action continuation plan, sequential write runner, and review readback helper added
- repo-local `examples/commercial-action-continuation.ts` added for the shipped slice

Current deferral boundary:

- no autonomous governance or self-authorizing execution layer exists in this repo yet
- no broader multi-business-chain orchestration layer exists around the current continuation slice yet

### 10. MCP-facing adapter catalog

The current bounded adapter seam can now be described through static MCP-facing tool descriptors without turning the repo into a runtime server.

Current progress:

- static MCP-facing tool catalog added in `src/mcp.ts`
- shipped bounded slices now expose exportable descriptor metadata for plan preview and review-packet preview/export modes
- bounded local stdio MCP server entrypoint added in `src/mcp-server.ts`
- shipped local loop is limited to `initialize`, `tools/list`, and `tools/call`

Current deferral boundary:

- no hosted MCP server exists in this repo yet
- no remote registry or hosted discovery behavior exists in this repo yet
- no broader MCP protocol/runtime complexity exists beyond the local stdio loop

### 11. Operator-facing verification wave previews

The current CLI can now preview bounded business verification waves without claiming a broader orchestration engine.

Current progress:

- `multi-business-chain-verification-wave-preview` added in `src/cli.ts`
- `commercial-action-verification-wave-preview` added in `src/cli.ts`
- both commands stay preview-oriented and print review-safe JSON only

Current deferral boundary:

- no live wave execution engine exists in the CLI yet
- no approval-to-opportunity seam crossing happens through the preview flows
- no broader runtime or MCP behavior is introduced by these commands

## Current release rule

The current mainline release in this repo is aligned to the frozen Bidvia Commercial Universe V1 / Core V12 handoff boundary and must follow those frozen handoff contracts before adding CLI or SDK behavior.

Required current-release direction:

1. consume frozen onboarding / claim / heartbeat / sync / evidence / proposal contracts from core
2. provide first usable CLI and SDK helpers for those allowed operations only
3. provide examples and local validation tooling for internal team agents and seed-user agents
4. do not widen into marketplace, autonomous governance, or unfrozen agent powers

## Authority split

- `Bidvia` core owns route truth, fail-close behavior, authority boundaries, and durable state
- `Bidvia-agent-client` owns tooling ergonomics, examples, local validation, and onboarding guidance

## Non-goals for the initial scaffold

- production-ready SDK guarantees
- frozen public API guarantees
- complete MCP/A2A bridge implementation
- marketplace or autonomous governance tooling
