# Agent-First Business Universe Productization Design

## Purpose

This design defines the next client-side productization wave for `bidvia-agent-client` after the latest deep integration rounds against current Bidvia Core truth.

The goal is not to keep adding isolated helper coverage. The goal is to turn the client into a **stable, agent-first operating entry** for multi-role Bidvia business-universe construction and progression.

This design is grounded in current downstream contract truth and fresh local-docker validation rather than route guesswork.

---

## Constitutional constraint

`bidvia-agent-client` is **for agents**, not for human operators.

This is a constitutional-level rule for the product:

- download, install, bootstrap, connect, repair, handoff, execution, diagnostics, evidence export, and bounded closure progression must all be runnable by agents without human interpretation
- machine-readable outputs are the default product surface
- human-readable explanation is support material, not the primary interface
- no required interactive wizard, hidden prompt, or human-only continuation step may exist on the canonical product path
- resumability, idempotency, and explicit next-step truth are mandatory product qualities, not convenience features

Human-facing guidance remains valuable, but only as secondary support for the agent-facing product surface.

---

## Current truth baseline

This design only productizes **Program 1–3 canonical truth already validated on current Core baselines**.

It must not overclaim:

- mixed-family universality
- universal `acct-* -> company-public` scope translation
- generalized executable handoff across arbitrary scope families
- ecosystem-grade provider-proof / reconciliation universality
- any Program 4 universal closure claim

Current validated hard-truth slices include:

1. claimant prerequisite repair
2. mixed-missing priority ordering
3. canonical `tenant-public + company-public` handoff executable bridge
4. operator-only deeper continuation through matching / connection / approval / opportunity / package / commercial-action
5. bounded fail-close behavior for non-canonical mixed-family scope

Program 4 is expected to continue evolving through:

1. P4-T1 — Mixed-Family Canonical Truth Normalization
2. P4-T2 — Scope / Ownership / Route Translation Closure
3. P4-T3 — Executable Handoff Generalization
4. P4-T4 — Ecosystem-Grade External Proof / Reconciliation Universality

The client must remain decoupled from those future internals by binding to stable downstream semantics rather than to each new route pattern.

---

## Product direction

The client should no longer be treated primarily as:

- a flat SDK helper repo
- a route-wrapper CLI
- a pile of validation scripts

It should become a **multi-role agent operating entry** with two axes:

1. **role axis**
   - claimant
   - operator
   - platform-managed
2. **stage axis**
   - entry
   - readiness
   - task-entry
   - handoff
   - progression
   - closure

Every formal client surface should be read as a role-stage entry into the current business-universe operating model.

---

## Chosen productization approach

Three broad approaches were considered:

### Option 1 — full rewrite

Rebuild the product surface from scratch around a new architecture.

**Rejected** because it would waste the current route-helper, verification, and discovery accumulation and introduce unnecessary delivery risk.

### Option 2 — continue expanding the current flat command/helper surface

Keep layering new CLI commands and helper exports directly on top of the current structure.

**Rejected** because it would continue drift between CLI, SDK, MCP, discovery, tests, and docs.

### Option 3 — semantic-kernel-first incremental productization

Keep the current atomic/helper/verification base, but add a new agent-first semantic and orchestration layer above it. Then re-point CLI, SDK, MCP, and discovery at that layer.

**Selected** because it:

- maximizes reuse of current validated assets
- minimizes risk compared to a rewrite
- prevents future Program 4 growth from forcing repeated client-wide redesign
- best matches the constitutional agent-first requirement

---

## Reuse strategy

The current repository should be reused in layers, not as one undifferentiated whole.

### Reuse directly as product kernel

These are high-value assets that should remain and be consumed by the new layer:

- `src/client.ts` atomic route helpers
- `src/capabilities.ts` capability metadata
- `src/discovery-catalog.ts` catalog/export mechanisms
- `src/route-context-matrix.ts` route capability explanation surface
- `src/mcp.ts` and `src/cli.ts` dispatch frameworks
- `src/runtime/*` session/runtime/accumulation scaffolding
- existing contract tests, validation evidence, verification helpers, and local-docker proof assets

### Reorganize into a new product layer

These assets are valuable but should no longer define the outward product shape directly:

- onboarding and readiness guidance
- scenario adapters and orchestration wrappers
- review packet / verification export helpers
- CLI command grouping logic
- MCP tool naming and capability grouping

### Do not treat as final outward mental model

These should not continue as the primary product-facing model:

- flat helper-name-first CLI/MCP surfaces
- route-inventory-first explanation style
- human-operator-first command narratives
- scattered local explanations of ownership/handoff semantics

---

## Product model

The new product layer should revolve around five stable concepts.

### 1. RoleWorkspace

Describes who is currently acting and under what effective context.

Fields should cover:

- role family (`claimant`, `operator`, `platform-managed`)
- session/admin-session presence
- tenant scope
- active org context
- principal context
- authorized company context
- canonicality classification (`canonical`, `non-canonical`, `bounded`, `later-wave`)

### 2. StageSnapshot

Describes where a role currently is in the business-universe progression.

Fields should cover:

- stage (`entry`, `readiness`, `task-entry`, `handoff`, `progression`, `closure`)
- state (`blocked`, `repairable`, `handoff-required`, `ready`, `continuing`, `completed`, `later-wave-stop`)
- current truth package
- current owner class
- current continuation class

### 3. ActionDescriptor

Describes what action is available right now.

Examples:

- may continue here
- may read here
- may not decide here
- exact-seam operator action
- bounded self-repair action

### 4. HandoffDescriptor

Describes the next baton pass.

Fields should cover:

- next action owner
- handoff class
- handoff route or tool
- whether handoff is metadata-only or executable
- canonicality constraints on the handoff

### 5. BoundaryDescriptor

Explains why the current role cannot continue further.

Examples:

- bounded stop
- later-wave stop
- visibility-only
- non-canonical fail-close
- unresolved contract drift
- probable Core defect

### 6. EvidencePacket

Every meaningful operation should be able to emit a stable machine-readable evidence packet using the frozen shape:

- route
- payload
- expected
- actual
- interpretation_gap
- issue_class

---

## New product kernel layer

A new layer should be added under `src/business-universe/`.

Recommended modules:

- `contracts.ts` — role/stage/handoff/boundary/evidence types
- `normalize.ts` — normalize Core outputs into stable client semantics
- `claimant.ts` — claimant role-stage operations
- `operator.ts` — operator role-stage operations
- `platform-managed.ts` — platform-managed role-stage operations
- `orchestrator.ts` — role-aware stage orchestration engine
- `evidence.ts` — machine-readable evidence builder

This layer is not a replacement for `src/client.ts`. It is a product-facing semantic layer that consumes the existing atomic helpers and verification assets.

---

## CLI-first product structure

The client should expose one orchestrating surface plus explicit role entry surfaces.

### Top-level orchestrator

- `bidvia universe run`
- `bidvia universe inspect`
- `bidvia universe explain`

This is not a human wizard. It is an agent-facing orchestration shell that:

- inspects role and stage
- decides which canonical next action is available
- runs deterministic packaged continuation when allowed
- emits machine-readable next-step and evidence outputs when blocked

### Role entry surfaces

- `bidvia claimant ...`
- `bidvia operator ...`
- `bidvia platform-managed ...`

### Claimant first-wave commands

- `bidvia claimant precondition inspect`
- `bidvia claimant precondition establish-canonical-company-public`
- `bidvia claimant precondition select-org`
- `bidvia claimant readiness inspect`
- `bidvia claimant readiness repair`
- `bidvia claimant task-entry inspect`
- `bidvia claimant task-entry run`
- `bidvia claimant handoff inspect`

### Operator first-wave commands

- `bidvia operator handoff consume`
- `bidvia operator progression match`
- `bidvia operator progression connect`
- `bidvia operator progression approve`
- `bidvia operator progression package-export`
- `bidvia operator closure commercial-action-run`
- `bidvia operator closure inspect`

### Platform-managed first-wave commands

- `bidvia platform-managed entry inspect`
- `bidvia platform-managed readiness inspect`
- `bidvia platform-managed progression run`

### CLI output rules

CLI defaults must be machine-readable and resumable.

Every command should emit a structured result such as:

```json
{
  "role_workspace": "claimant",
  "stage": "readiness",
  "state": "repairable",
  "recommended_next_step": "complete_claimed_agent_self_service",
  "next_action_owner": "claimant",
  "executability": "canonical",
  "evidence": {}
}
```

Human-readable prose may exist as an alternate output mode only.

---

## SDK-first mirror

The role-stage product surface must be mirrored in the SDK.

### Atomic layer remains

Existing route helpers remain available for low-level integration and internal reuse.

### Product-facing layer added

Recommended API shape:

- `client.claimant.precondition.*`
- `client.claimant.readiness.*`
- `client.claimant.taskEntry.*`
- `client.claimant.handoff.*`

- `client.operator.handoff.*`
- `client.operator.progression.*`
- `client.operator.closure.*`

- `client.platformManaged.entry.*`
- `client.platformManaged.readiness.*`
- `client.platformManaged.progression.*`

- `client.universe.*`

The product-facing SDK must expose role/stage operations, not require consumers to memorize route topology.

---

## MCP and discovery alignment

The MCP and discovery surfaces should stop exposing mostly helper-name-first organization.

### MCP

MCP tools should be organized around role/stage actions, for example:

- `claimant-precondition-establish-canonical-company-public`
- `claimant-readiness-repair`
- `operator-handoff-consume`
- `operator-progression-match`
- `operator-progress-connect`
- `operator-closure-commercial-action-run`

### Discovery

Discovery entries should carry at least:

- role
- stage
- executability
- ownership_class
- handoff_class
- canonicality
- may_continue_here / may_read_here / may_not_decide_here

This turns discovery into a role-stage capability map rather than a flat helper directory.

---

## First-wave product scope

### In scope

The first wave should productize only the currently validated canonical hard-acceptance path:

#### Claimant

- canonical company-public precondition establishment
- claimed onboarding
- readiness inspect / repair
- bounded task entry
- materialization readback
- operator handoff inspect

#### Operator

- canonical handoff consume
- operator execution listing / activate / matching
- connection / approval / opportunity progression
- package export
- commercial-action create / policy-check / request-approval / execute
- commercial-action status / receipt / audit inspection

#### Platform-managed

- formal role entry, but bounded to currently validated entry / readiness / continuation slices only

### Explicit non-goals

Do not productize these as first-wave client promises:

- mixed-family universal translation
- general `acct-* -> company-public` scope normalization
- executable handoff generalization beyond current canonical path
- provider-proof / reconciliation universality
- any Program 4 universality or ecosystem-grade autonomy claim

---

## Full wave plan

### Wave 0 — Baseline freeze

**Goal**
Freeze the currently validated canonical/non-canonical truth model before productization work begins.

**Deliverables**
- one frozen client-facing canonical baseline summary
- one frozen list of non-goals and non-claims
- one canonical acceptance matrix

**Exit criteria**
- current canonical path and current fail-close path are explicitly documented and test-linked

### Wave 1 — Semantic kernel

**Goal**
Implement the agent-first role-stage semantic layer.

**Deliverables**
- `src/business-universe/contracts.ts`
- `src/business-universe/normalize.ts`
- `src/business-universe/evidence.ts`
- initial semantic-kernel tests

**Exit criteria**
- role/stage/handoff/boundary truth no longer has to be inferred separately in CLI/MCP/discovery

### Wave 2 — Claimant product package

**Goal**
Turn claimant canonical entry/readiness/task-entry/handoff into a formal product package.

**Deliverables**
- claimant role-stage API layer
- claimant CLI commands
- claimant MCP tools
- claimant discovery entries
- canonical company-public precondition establish flow

**Exit criteria**
- a fresh agent can autonomously establish canonical preconditions, repair readiness, and enter bounded task progression

### Wave 3 — Operator product package

**Goal**
Turn operator matching/progression/closure into a formal continuation package.

**Deliverables**
- operator role-stage API layer
- operator CLI commands
- operator MCP tools
- operator discovery entries

**Exit criteria**
- operator can consume canonical handoff and continue through matching, connection, approval, package, and commercial-action progression

### Wave 4 — Universe orchestrator

**Goal**
Provide a single orchestration shell above claimant and operator packages.

**Deliverables**
- `bidvia universe run`
- `bidvia universe inspect`
- `bidvia universe explain`
- role-aware orchestration engine

**Exit criteria**
- one agent can invoke the orchestrator and receive deterministic role-stage continuation or evidence packets without human interpretation

### Wave 5 — SDK product facade

**Goal**
Expose the same role-stage model through a first-class product-facing SDK.

**Deliverables**
- `client.claimant.*`
- `client.operator.*`
- `client.platformManaged.*`
- `client.universe.*`

**Exit criteria**
- external agent runtimes no longer need to stitch raw route helpers together for the canonical path

### Wave 6 — MCP + discovery + route-context alignment

**Goal**
Align all machine-facing discovery and tool surfaces with the semantic kernel.

**Deliverables**
- role/stage MCP tools
- discovery capability map upgrade
- route-context matrix semantic upgrade

**Exit criteria**
- CLI, SDK, MCP, and discovery all describe the same role-stage truth

### Wave 7 — Platform-managed formal entry

**Goal**
Promote platform-managed into a formal role entry without overclaiming universality.

**Deliverables**
- bounded platform-managed role-stage product layer

**Exit criteria**
- platform-managed is a first-class product role, but still bounded to current validated truth

### Wave 8 — Diagnostics and evidence layer

**Goal**
Turn evidence-return shape into a first-class product capability.

**Deliverables**
- CLI evidence mode
- SDK evidence payloads
- MCP evidence packets
- stable blocker/result taxonomy

**Exit criteria**
- agents can automatically produce Core-consumable evidence without human rewrite

### Wave 9 — Docs and migration closure

**Goal**
Make the repository outwardly agent-first and provide migration guidance from helper-first usage.

**Deliverables**
- README rewrite
- docs rewrite
- migration guide
- legacy entry deprecation notes

**Exit criteria**
- the public identity of the client is now an agent-first operating entry, not merely a helper bundle

---

## Start-work execution model

The implementation plan for this design must be executable as a persistent `/start-work` plan rather than as a one-shot task list.

Each wave must therefore include:

1. entry criteria
2. execution scope
3. deliverables
4. verification gate
5. failure routing
6. exit contract
7. completion artifact

### Completion artifact

Each wave should emit a machine-readable artifact such as:

```json
{
  "wave": "wave-2-claimant-package",
  "status": "completed",
  "verified_at": "...",
  "roles_covered": ["claimant"],
  "stages_covered": ["entry", "readiness", "task-entry", "handoff"],
  "known_limits": [],
  "next_wave_ready": true
}
```

### Failure routing

Wave failures must be classified as:

- `client-bug`
- `core-bug`
- `contract-gap`
- `non-canonical-fail-close`
- `future-wave-deferred`

This prevents repeated re-investigation of intentionally bounded or deferred areas.

### Mainline vs support waves

#### Mainline waves

These should run serially first:

- Wave 0
- Wave 1
- Wave 2
- Wave 3
- Wave 4

#### Support/alignment waves

These can be sequenced after or alongside the mainline once dependencies are satisfied:

- Wave 5
- Wave 6
- Wave 7
- Wave 8
- Wave 9

---

## Success criteria

The full productization objective is complete only when all of the following are true:

1. a fresh agent can install, connect, establish canonical preconditions, repair readiness, continue bounded claimant execution, hand off to operator, and continue through the canonical deeper path without human interpretation
2. CLI, SDK, MCP, and discovery all consume the same role-stage semantic kernel
3. canonical, bounded, later-wave, and non-canonical fail-close outcomes are distinguishable without route archaeology
4. the client remains decoupled from Program 4 internals by binding to stable semantics rather than to future route-specific behavior
5. every important product action can emit machine-readable evidence in the frozen downstream evidence-return shape

---

## Final recommendation

The current client accumulation should be **layer-reused**, not blindly preserved as the final outward product.

- keep the atomic helper/runtime/test/verification base
- add a new agent-first semantic kernel
- rebuild outward product surfaces around role-stage product entry
- preserve boundedness and explicit non-claims so current product truth remains honest while future Program 4 work continues upstream
