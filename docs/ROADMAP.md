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
4. generic scenario-envelope builders plus bounded industry-universe and connection-approval scenario slices
5. richer scenario verification bundle support plus legacy export compatibility
6. bounded CLI preview commands for industry-universe, connection-approval, and explicit-opportunity package handoff planning
7. contract tests plus stubbed local example flows

## Planned next layers

1. broader scenario families beyond the currently delivered bounded slices
2. richer business-chain orchestration beyond the current bounded listing/match and connection-approval scenario paths
3. review-packet and verification workflow improvements beyond the current richer bundle
4. broader CLI flows for business verification waves
5. future adapter/runtime surfaces beyond the current local adapter seam

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
- explicit-opportunity package handoff plan/runner added

Current deferral boundary:

- no approval -> opportunity creation or discovery helper exists in this repo yet
- no broader multi-business-chain orchestration layer exists yet

### 3. Access-context switching

Production routes are not uniform today:

- some write-side routes accept explicit operator principal headers
- some read-side routes require admin-session wrapping

The client should make that split explicit instead of leaving callers to remember route-by-route access semantics.

### 4. Production-safe verification mode

The client should gain a bounded verification mode that can:

- log every record id created
- preserve source/evidence links
- mark scenario waves clearly
- export a verification bundle for later review

Current progress:

- richer scenario verification bundle added
- legacy verification export preserved for compatibility

### 5. Commercial-action support

Wave-3 proved that `commercial-actions` is a real production path now.
The client should grow dedicated helpers for:

- create
- policy-check
- request-approval
- execute
- status / receipt / audit readback

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
