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

The repo now includes a first usable V11 execution-layer wave inside that broader product direction:

1. frozen core-aligned onboarding / query / claim request formation
2. frozen registration-bound heartbeat / sync / evidence / proposal request formation
3. production-proven business-chain helper slices for listing/match, connection/approval, package export, and commercial actions
4. generic scenario-envelope builders plus bounded industry-universe, connection-approval, and commercial-action continuation scenario slices, plus one honest cross-chain coordinator layer across those shipped slices
5. richer scenario verification bundle support, derived review-packet builders with reviewer-facing detail, and stable review-packet export compatibility
6. bounded CLI preview and export commands for scenario plans plus review packets across industry-universe, connection-approval, and explicit-opportunity package handoff planning
7. machine-readable static capability metadata for shipped helpers and scenario route keys
8. static MCP-facing tool descriptors and catalog exports for the shipped bounded slices
9. environment mode classification for `local`, `sim`, and `production` plus a read-only CLI visibility command
10. contract tests plus stubbed local example flows

## Planned next layers

1. broader scenario families beyond the currently delivered bounded slices
2. richer business-chain orchestration beyond the current bounded listing/match and connection-approval scenario paths
3. broader review-packet and verification workflow improvements beyond the current bounded preview and export layer
4. broader CLI flows for business verification waves
5. live MCP server, transport, negotiation, and broader adapter/runtime surfaces beyond the current static catalog layer

## Production verification lessons from V11 wave-1/2/3

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

### 4. Environment mode visibility

The client can now classify the current base URL into a simple environment mode without claiming control over runtime behavior.

Current progress:

- `resolveBidviaEnvironmentMode(...)` added in `src/config.ts`
- `resolveBidviaEnvironmentModeFromEnv(...)` added in `src/config.ts`
- read-only `environment-mode` CLI command added in `src/cli.ts`

Current deferral boundary:

- no environment-specific execution policy exists in this repo yet
- no runtime behavior changes are introduced by environment mode classification
- no broader transport/runtime expansion exists through this visibility layer

### 5. Production-safe verification mode

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

### 6. Commercial-action support

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

### 7. MCP-facing adapter catalog

The current bounded adapter seam can now be described through static MCP-facing tool descriptors without turning the repo into a runtime server.

Current progress:

- static MCP-facing tool catalog added in `src/mcp.ts`
- shipped bounded slices now expose exportable descriptor metadata for plan preview and review-packet preview/export modes

Current deferral boundary:

- no live MCP server exists in this repo yet
- no stdio or other MCP transport exists in this repo yet
- no MCP protocol negotiation runtime exists in this repo yet

## V11 rule

The first real implementation wave in this repo belongs to `V11` and must follow frozen core-side agent access contracts before adding CLI or SDK behavior.

Required V11 direction:

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
