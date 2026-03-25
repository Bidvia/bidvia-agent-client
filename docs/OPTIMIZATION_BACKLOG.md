# Optimization Backlog

## Why this file exists

This backlog collects the concrete lessons from the V11 production verification waves and translates them into practical next improvements for `Bidvia-agent-client`.

The focus is not theoretical SDK perfection.
The focus is what the production verification actually proved was missing or awkward.

## Priority A — High-value near-term improvements

### A1. Add business-chain helpers

Current client helpers stop at atomic route calls.
Add higher-level SDK helpers for:

- listing creation + activation
- match generation
- connection request creation
- approval follow-through
- opportunity package export
- commercial-action continuation

Current progress:

- listing creation helper added
- listing activation helper added
- match generation helper added
- connection request helper added
- approval decision helper added
- opportunity package export helper added
- bounded connection-approval orchestration helper added
- bounded commercial-action continuation helper added
- honest cross-chain coordinator helper added across shipped slices only
- explicit-opportunity package handoff helper added

### A2. Add verification bundle output

Add a production-safe verification mode that emits:

- source refs
- evidence refs
- trace ids
- workflow ids
- record ids generated during the run
- final checkpoint-ready JSON output

Current progress:

- typed verification bundle export helper added
- richer scenario verification bundle added
- bounded review-packet preview and export support added for the shipped scenario slices
- richer reviewer-facing review-packet detail added from existing scenario and verification facts
- legacy export compatibility preserved

### A3. Make access-context requirements explicit

The client should clearly encode when a route needs:

- admin session
- operator principal headers
- session-bound enterprise context

This should be discoverable in the SDK surface, not learned only from runtime failures.

Current progress:

- admin-session commercial action status helper added
- operator-context commercial action create helper added

## Priority B — Operational ergonomics

### B1. Add scenario envelopes

Introduce a typed scenario object that carries:

- product family
- source packet refs
- evidence refs
- expected route chain
- resulting production ids

Current progress:

- generic scenario envelope core added
- generic scenario builders added
- registration-lifecycle scenario plan builder added
- bounded registration-lifecycle runner added
- repo-local `examples/registration-lifecycle-scenario.ts` added for lifecycle discoverability
- registered-agent-operations scenario plan builder added
- bounded registered-agent-operations runner added
- repo-local `examples/registered-agent-operations-scenario.ts` added for post-onboarding operations discoverability
- industry-universe scenario plan builder added
- connection-approval scenario plan builder added
- opportunity-package handoff plan builder added

### B2. Add commercial-action helper family

Wrap the production-proven `commercial-actions` path into dedicated helpers for:

- create
- policy check
- request approval
- execute
- status
- receipt
- audit

Current progress:

- create
- policy check
- request approval
- execute
- status
- receipt
- audit
- bounded commercial-action continuation scenario plan, runner, and readback helper added
- repo-local `examples/commercial-action-continuation.ts` added for slice discoverability

Current progress:

- create
- policy check
- request approval
- execute
- status
- receipt
- audit

### B3. Add CLI support for business verification flows

Current CLI is still limited to low-level operations.
Add CLI flows for:

- onboarding wave execution
- listing wave execution
- commercial-action wave execution
- verification export

Current progress:

- bounded `industry-universe-plan` CLI command added for review-safe planning output
- bounded `connection-approval-plan` CLI command added for review-safe planning output
- bounded `opportunity-package-handoff-plan` CLI command added for review-safe planning output
- bounded `multi-business-chain-verification-wave-preview` CLI command added for operator-facing cross-chain preview output
- bounded `commercial-action-verification-wave-preview` CLI command added for operator-facing commercial-action preview output

## Priority C — Structural upgrades

### C1. Add route capability metadata

The client now ships a machine-readable route capability map so a caller can discover:

- write/read scope
- required context
- fail-close expectations
- whether the route is atomic or chain-level

Current progress:

- static route capability registry added in `src/capabilities.ts`
- repo-local lookup helper added for shipped helper metadata
- access-context discovery is now machine-readable without requiring callers to inspect `src/client.ts` directly

Still deferred on purpose:

- runtime capability negotiation
- server-provided capability discovery
- request generation from metadata

### C2. Add local runtime-capability snapshot output

The client now ships one repo-local runtime-capability snapshot so callers can inspect current route, MCP, and local server facts in a single JSON view.

Current progress:

- `buildLocalRuntimeCapabilitySnapshot(...)` added in `src/runtime-capabilities.ts`
- read-only `runtime-capabilities` CLI command added for repo-local inspection
- repo-local `examples/runtime-capabilities.ts` added for discoverability

Still deferred on purpose:

- server-provided capability negotiation
- remote capability fetch or registry sync
- any broader runtime truth beyond local shipped knowledge

### C3. Add server-capability parsing layer

The client now ships a local server-capability parsing layer so callers can normalize one server-derived capability payload into the repo’s internal capability shape.

Current progress:

- `normalizeServerCapabilityPayload(...)` added in `src/server-capabilities.ts`
- read-only `server-capabilities` CLI command added for local normalization output
- repo-local `examples/server-capabilities.ts` added for discoverability

Still deferred on purpose:

- live server capability negotiation
- remote capability discovery
- any fetch-driven or runtime-driven server normalization loop

### C4. Add replay-safe orchestration helpers

The client should support replay-safe orchestration for a chain like:

- `listing -> match -> connection -> approval -> package -> commercial-action`

while preserving idempotency keys and trace continuity.

Current progress:

- bounded `listing -> activate -> match-candidates` scenario orchestration helper added
- bounded `match -> connection-request -> approval` scenario orchestration helper added
- bounded explicit-`opportunityId` package-export handoff added
- cross-chain coordinator plan plus pre-handoff/post-handoff runners added with an explicit approval-to-opportunity external handoff boundary
- repo-local `examples/multi-business-chain-coordinator.ts` added for coordinator discoverability

### C5. Add production-vs-sandbox mode distinctions

The client should make it obvious when an operation is being executed against:

- local sandbox
- sim
- production

and emit different default verbosity and safety prompts accordingly.

Current progress:

- `resolveBidviaEnvironmentMode(...)` added for `local` / `sim` / `production` classification
- `resolveBidviaEnvironmentModeFromEnv(...)` added for env-driven classification visibility
- read-only `environment-mode` CLI command added for repo-local inspection

Still deferred on purpose:

- environment-specific execution policy
- behavior changes driven by environment mode
- broader runtime or transport control logic

### C6. Add MCP-facing descriptor/catalog layer

The client now ships a static MCP-facing descriptor/catalog layer so callers can export bounded tool metadata for the currently shipped scenario slices.

Current progress:

- static MCP-facing tool catalog added in `src/mcp.ts`
- repo-local lookup and export helpers added for bounded MCP-friendly tool descriptors
- bounded local stdio MCP server entrypoint added in `src/mcp-server.ts`
- shipped server coverage is limited to `initialize`, `tools/list`, and `tools/call` for the existing bounded tools
- shipped tool coverage is limited to plan-preview, review-packet-preview, and review-packet-export descriptors for existing bounded slices

Still deferred on purpose:

- hosted MCP server implementation
- remote registry or hosted discovery behavior
- broader protocol negotiation/runtime complexity

## Current recommendation

The next post-V11 client iteration should start with:

1. broader orchestration beyond the current industry-universe, connection-approval, commercial-action continuation, coordinator path, and explicit-opportunity handoff slices
2. review-packet workflow improvements beyond the current bounded preview and export layer
3. live adapter / MCP expansion beyond the current static descriptor/catalog layer

Those three are now the clearest remaining gaps after the first scenario-driven client slice landed.

Keep the honesty boundary intact while doing that work:

- do not imply approval creates or discovers an `opportunityId`
- do not imply bounded commercial-action continuation creates autonomous governance authority
- do not imply the shipped coordinator crosses the approval -> opportunity seam automatically
- keep broader multi-business-chain orchestration deferred until the missing platform seam is real
