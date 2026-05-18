# Agent-First Business Universe Productization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `bidvia-agent-client` into an agent-first operating entry for claimant, operator, and platform-managed roles across the currently validated Program 1–3 canonical business-universe path, while staying decoupled from Program 4 universality work.

**Architecture:** Preserve the existing atomic helper/runtime/test base and add a new `src/business-universe/` semantic kernel that models role, stage, ownership, handoff, and evidence. All first-class product surfaces — CLI, SDK facade, MCP tools, discovery, and route-context explanations — must consume this kernel rather than duplicating route-level interpretation logic. Execute in waves; each wave emits a machine-readable completion artifact so `/start-work` can continue safely without human narration.

**Tech Stack:** TypeScript, node:test, existing CLI/MCP/runtime layers, local-docker integration probes, npm scripts (`npm test`, `npm run typecheck`, `npm run build`).

---

## Global execution rules

### Constitutional rules
- The client's primary user is an **agent**, not a human.
- Every new canonical entrypoint must be non-interactive, machine-readable by default, resumable, idempotent where possible, and evidence-emitting.
- Human-readable explanation is a secondary output mode only.
- Do not productize Program 4 claims in this wave.

### Mainline waves vs support waves
- **Mainline waves**: 0, 1, 2, 3, 4
- **Support/alignment waves**: 5, 6, 7, 8, 9
- `/start-work` should always finish the current mainline wave before starting a support wave.

### Completion artifact path
Every wave must emit an artifact under:
- `.sisyphus/status/agent-first-business-universe/wave-<n>.json`

Artifact shape:
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

### Failure routing classes
Use only these classes when a wave blocks:
- `client-bug`
- `core-bug`
- `contract-gap`
- `non-canonical-fail-close`
- `future-wave-deferred`

### Required final verification for every wave
At minimum, before marking a wave complete:
- targeted tests for the wave
- `npm test`
- `npm run typecheck`
- `npm run build`
- if the wave touches canonical deep-integration behavior: fresh local-docker probe(s) proving the targeted canonical path still works

---

## Files to create across the plan

### Product kernel
- `src/business-universe/contracts.ts`
- `src/business-universe/baseline.ts`
- `src/business-universe/normalize.ts`
- `src/business-universe/evidence.ts`
- `src/business-universe/claimant.ts`
- `src/business-universe/operator.ts`
- `src/business-universe/platform-managed.ts`
- `src/business-universe/orchestrator.ts`
- `src/business-universe/index.ts`

### Test suites
- `test/business-universe-baseline-freeze.test.ts`
- `test/business-universe-normalize.test.ts`
- `test/claimant-product-entry.test.ts`
- `test/operator-product-entry.test.ts`
- `test/canonical-handoff-bridge-productization.test.ts`
- `test/noncanonical-fail-close-productization.test.ts`
- `test/universe-orchestrator.test.ts`
- `test/sdk-role-stage-facade.test.ts`
- `test/mcp-role-stage-productization.test.ts`
- `test/discovery-role-stage-productization.test.ts`
- `test/platform-managed-product-entry.test.ts`
- `test/evidence-packet-productization.test.ts`

### Validation tooling
- `scripts/validate-agent-first-business-universe.ts`

---

## Files to modify across the plan
- `src/cli.ts`
- `src/mcp.ts`
- `src/discovery-catalog.ts`
- `src/route-context-matrix.ts`
- `src/index.ts`
- `src/contracts.ts` (only if shared types need outward exposure)
- `README.md`
- `docs/ONBOARDING.md`
- `docs/CONTRACT_BOUNDARY.md`
- `docs/VALIDATION_LANES.md`
- `docs/ROADMAP.md` (only for wording alignment if required by shipped product boundary)

---

## Chunk 1: Wave 0 — Baseline freeze

**Entry criteria:** None. This is the starting wave.

**Execution scope:** Freeze only what is already validated. No new product entrypoints yet.

**Deliverables:**
- baseline truth summary module
- baseline acceptance matrix
- status artifact scaffolding

**Files:**
- Create: `src/business-universe/baseline.ts`
- Create: `test/business-universe-baseline-freeze.test.ts`
- Create: `.sisyphus/status/agent-first-business-universe/.gitkeep` (or equivalent directory bootstrap)
- Modify: `docs/superpowers/specs/2026-05-10-agent-first-business-universe-productization-design.md` only if review clarifications are needed

- [ ] **Step 1: Write the failing baseline-freeze tests**

Test for:
- canonical claimant prerequisite repair is in-scope
- canonical `tenant-public + company-public` handoff executable bridge is in-scope
- mixed-family universality is explicitly out-of-scope
- operator-only deeper closure is in-scope

Run:
```bash
npx tsx --test test/business-universe-baseline-freeze.test.ts
```
Expected: FAIL because `src/business-universe/baseline.ts` does not exist.

- [ ] **Step 2: Implement baseline truth constants**

Implement a small module exporting:
- canonical validated capabilities
- explicit non-goals
- baseline acceptance classes
- wave artifact path constants

- [ ] **Step 3: Re-run targeted baseline tests**

Run:
```bash
npx tsx --test test/business-universe-baseline-freeze.test.ts
```
Expected: PASS

- [ ] **Step 4: Add status artifact bootstrap**

Ensure the status artifact directory convention is documented or scaffolded for `/start-work` use.

- [ ] **Step 5: Run full verification gate**

Run:
```bash
npm test && npm run typecheck && npm run build
```
Expected: PASS

**Failure routing:**
- If tests fail because baseline assumptions no longer match Core truth → `core-bug` or `contract-gap`
- If failures are local spec/module drift → `client-bug`

**Exit contract:**
- Baseline module exists
- Baseline tests pass
- Wave 0 artifact can be emitted

---

## Chunk 2: Wave 1 — Semantic kernel

**Entry criteria:** Wave 0 completed.

**Execution scope:** Add the shared agent-first semantic kernel. Do not expose new CLI commands yet.

**Deliverables:**
- role/stage/handoff/boundary/evidence contracts
- normalization layer for current Core truth

**Files:**
- Create: `src/business-universe/contracts.ts`
- Create: `src/business-universe/normalize.ts`
- Create: `src/business-universe/evidence.ts`
- Create: `src/business-universe/index.ts`
- Create: `test/business-universe-normalize.test.ts`

- [ ] **Step 1: Write failing normalization tests**

Cover at least:
- claimant repairable state
- executable canonical handoff state
- metadata-only handoff state
- non-canonical fail-close state
- bounded later-wave stop state

Run:
```bash
npx tsx --test test/business-universe-normalize.test.ts
```
Expected: FAIL because the kernel modules do not exist.

- [ ] **Step 2: Implement contracts**

Define:
- `RoleWorkspace`
- `StageSnapshot`
- `ActionDescriptor`
- `HandoffDescriptor`
- `BoundaryDescriptor`
- `EvidencePacket`

- [ ] **Step 3: Implement normalization functions**

Normalize Core outputs such as:
- `recommended_next_step`
- `next_step_kind`
- `next_step_route`
- `operator_handoff`
- `dispatch_eligibility`
- `continuity`
- `participation_model`

- [ ] **Step 4: Re-run targeted kernel tests**

Run:
```bash
npx tsx --test test/business-universe-normalize.test.ts
```
Expected: PASS

- [ ] **Step 5: Run full verification gate**

Run:
```bash
npm test && npm run typecheck && npm run build
```
Expected: PASS

**Failure routing:**
- Inconsistent normalized semantics due to changing Core outputs → `contract-gap`
- Type/model issues → `client-bug`

**Exit contract:**
- Kernel contracts exist
- normalization tests pass
- all later waves can consume one shared semantic model

---

## Chunk 3: Wave 2 — Claimant product package

**Entry criteria:** Waves 0–1 completed.

**Execution scope:** Productize the claimant canonical mainline only.

**Deliverables:**
- claimant SDK facade
- claimant CLI commands
- claimant MCP tools
- claimant discovery entries

**Files:**
- Create: `src/business-universe/claimant.ts`
- Create: `test/claimant-product-entry.test.ts`
- Modify: `src/cli.ts`
- Modify: `src/mcp.ts`
- Modify: `src/discovery-catalog.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing claimant product tests**

Cover:
- `precondition inspect`
- `precondition establish-canonical-company-public`
- `readiness inspect`
- `readiness repair`
- `task-entry inspect`
- `task-entry run`
- `handoff inspect`

Run:
```bash
npx tsx --test test/claimant-product-entry.test.ts
```
Expected: FAIL because claimant product layer is missing.

- [ ] **Step 2: Implement claimant semantic operations**

Implement a claimant product facade that composes existing helpers for:
- company-public canonical precondition creation
- readiness truth inspection
- self-repair steps
- bounded task entry
- handoff inspection

- [ ] **Step 3: Wire claimant CLI and MCP surfaces**

Add commands/tools:
- `bidvia claimant precondition inspect`
- `bidvia claimant precondition establish-canonical-company-public`
- `bidvia claimant precondition select-org`
- `bidvia claimant readiness inspect`
- `bidvia claimant readiness repair`
- `bidvia claimant task-entry inspect`
- `bidvia claimant task-entry run`
- `bidvia claimant handoff inspect`

- [ ] **Step 4: Re-run targeted claimant tests**

Run:
```bash
npx tsx --test test/claimant-product-entry.test.ts
```
Expected: PASS

- [ ] **Step 5: Prove canonical claimant path on local docker**

Run a fresh local-docker probe that proves:
- canonical company-public precondition can be established
- pure-missing readiness can be repaired
- task entry succeeds

Capture machine-readable evidence in the wave artifact.

- [ ] **Step 6: Run full verification gate**

Run:
```bash
npm test && npm run typecheck && npm run build
```
Expected: PASS

**Failure routing:**
- Current Core cannot establish company-public precondition via the maintained surfaced path → `core-bug` or `contract-gap`
- Claimant product API miswires existing helpers → `client-bug`
- Non-canonical fail-close accidentally treated as canonical → `client-bug`

**Exit contract:**
- a fresh agent can autonomously reach claimant task-entry readiness on canonical path
- claimant CLI/MCP/SDK/discovery surfaces all exist

---

## Chunk 4: Wave 3 — Operator product package

**Entry criteria:** Wave 2 completed.

**Execution scope:** Productize operator continuation over the current canonical path.

**Deliverables:**
- operator SDK facade
- operator CLI commands
- operator MCP tools
- operator discovery entries

**Files:**
- Create: `src/business-universe/operator.ts`
- Create: `test/operator-product-entry.test.ts`
- Create: `test/canonical-handoff-bridge-productization.test.ts`
- Create: `test/noncanonical-fail-close-productization.test.ts`
- Modify: `src/cli.ts`
- Modify: `src/mcp.ts`
- Modify: `src/discovery-catalog.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing operator continuation tests**

Cover:
- consume canonical handoff
- operator execution listing / activate / matching
- connection / approval / opportunity continuation
- package export
- commercial-action create / policy-check / request-approval / execute
- status / receipt / audit inspection
- non-canonical fail-close remains closed

Run:
```bash
npx tsx --test test/operator-product-entry.test.ts test/canonical-handoff-bridge-productization.test.ts test/noncanonical-fail-close-productization.test.ts
```
Expected: FAIL because operator product layer is missing.

- [ ] **Step 2: Implement operator semantic operations**

Implement operator facade methods for:
- handoff consume
- matching progression
- connection / approval continuation
- package export
- commercial-action exact seam progression
- bridged readback inspection

- [ ] **Step 3: Wire operator CLI and MCP surfaces**

Add commands/tools:
- `bidvia operator handoff consume`
- `bidvia operator progression match`
- `bidvia operator progression connect`
- `bidvia operator progression approve`
- `bidvia operator progression package-export`
- `bidvia operator closure commercial-action-run`
- `bidvia operator closure inspect`

- [ ] **Step 4: Re-run targeted operator tests**

Run:
```bash
npx tsx --test test/operator-product-entry.test.ts test/canonical-handoff-bridge-productization.test.ts test/noncanonical-fail-close-productization.test.ts
```
Expected: PASS

- [ ] **Step 5: Prove canonical operator continuation on local docker**

Run a fresh canonical probe that proves:
- handoff route is executable
- operator matching can materialize a real match
- connection / approval / opportunity / package / commercial-action chain succeeds
- non-canonical mixed-family source continues to fail-close

Capture evidence in the wave artifact.

- [ ] **Step 6: Run full verification gate**

Run:
```bash
npm test && npm run typecheck && npm run build
```
Expected: PASS

**Failure routing:**
- canonical route no longer executable → `core-bug`
- mixed-family fail-close accidentally opens → `core-bug` or `contract-gap`
- operator packaging misclassifies exact seams or bridge semantics → `client-bug`

**Exit contract:**
- operator can autonomously continue canonical handoff through deeper closure slices
- non-canonical mixed-family route remains fail-closed

---

## Chunk 5: Wave 4 — Universe orchestrator

**Entry criteria:** Waves 2–3 completed.

**Execution scope:** Build one agent-facing orchestration shell above claimant and operator packages.

**Deliverables:**
- universe orchestrator module
- top-level `universe run / inspect / explain`
- resume/idempotency/result contract

**Files:**
- Create: `src/business-universe/orchestrator.ts`
- Create: `test/universe-orchestrator.test.ts`
- Modify: `src/cli.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing orchestrator tests**

Cover:
- role detection
- stage progression
- deterministic next-step emission
- claimant → operator baton handoff
- fail-closed stop emission with evidence
- resume from prior artifact

Run:
```bash
npx tsx --test test/universe-orchestrator.test.ts
```
Expected: FAIL because orchestrator is missing.

- [ ] **Step 2: Implement orchestrator**

Use the claimant/operator semantic packages to implement:
- `run`
- `inspect`
- `explain`

Return machine-readable results only by default.

- [ ] **Step 3: Add CLI top-level universe entrypoints**

Add:
- `bidvia universe run`
- `bidvia universe inspect`
- `bidvia universe explain`

- [ ] **Step 4: Re-run targeted orchestrator tests**

Run:
```bash
npx tsx --test test/universe-orchestrator.test.ts
```
Expected: PASS

- [ ] **Step 5: Prove end-to-end canonical orchestration on local docker**

Run a fresh orchestrated canonical path proving one agent can:
- establish canonical precondition
- repair claimant readiness
- hand off to operator
- continue deeper operator closure

- [ ] **Step 6: Run full verification gate**

Run:
```bash
npm test && npm run typecheck && npm run build
```
Expected: PASS

**Failure routing:**
- orchestrator cannot resume or loses role-stage truth → `client-bug`
- orchestrator encounters later-wave boundary but misreports it as canonical failure → `client-bug`

**Exit contract:**
- one top-level agent-facing orchestrator can traverse the canonical path without human interpretation

---

## Chunk 6: Wave 5 — SDK product facade

**Entry criteria:** Wave 4 completed.

**Execution scope:** Expose product-facing SDK role/stage facades.

**Deliverables:**
- `client.claimant.*`
- `client.operator.*`
- `client.platformManaged.*`
- `client.universe.*`

**Files:**
- Modify: `src/business-universe/claimant.ts`
- Modify: `src/business-universe/operator.ts`
- Create or modify: `src/business-universe/platform-managed.ts`
- Modify: `src/index.ts`
- Create: `test/sdk-role-stage-facade.test.ts`

- [ ] **Step 1: Write failing SDK facade tests**

Run:
```bash
npx tsx --test test/sdk-role-stage-facade.test.ts
```
Expected: FAIL because façade exports are missing.

- [ ] **Step 2: Add outward SDK namespaces and exports**
- [ ] **Step 3: Re-run targeted SDK facade tests**
- [ ] **Step 4: Run full verification gate**

**Failure routing:** `client-bug` unless a Core truth assumption was wrong.

**Exit contract:** external agent runtimes can use the canonical path without stitching raw helpers.

---

## Chunk 7: Wave 6 — MCP + discovery + route-context alignment

**Entry criteria:** Waves 1–5 completed.

**Execution scope:** Align machine-facing surfaces to the semantic kernel.

**Deliverables:**
- role/stage MCP tools
- discovery capability map upgrade
- route-context matrix semantic upgrade

**Files:**
- Modify: `src/mcp.ts`
- Modify: `src/discovery-catalog.ts`
- Modify: `src/route-context-matrix.ts`
- Create: `test/mcp-role-stage-productization.test.ts`
- Create: `test/discovery-role-stage-productization.test.ts`

- [ ] **Step 1: Write failing MCP/discovery tests**
- [ ] **Step 2: Add role-stage MCP tools**
- [ ] **Step 3: Add role-stage discovery metadata fields**
- [ ] **Step 4: Upgrade route-context matrix output to semantic role-stage guidance**
- [ ] **Step 5: Re-run targeted MCP/discovery tests**
- [ ] **Step 6: Run full verification gate**

**Exit contract:** CLI, SDK, MCP, and discovery all describe the same role-stage truth.

---

## Chunk 8: Wave 7 — Platform-managed formal entry

**Entry criteria:** Waves 1–6 completed.

**Execution scope:** Promote platform-managed into a bounded first-class product role.

**Deliverables:**
- platform-managed product package
- platform-managed CLI/MCP/discovery/SDK surfaces

**Files:**
- Create or expand: `src/business-universe/platform-managed.ts`
- Create: `test/platform-managed-product-entry.test.ts`
- Modify: `src/cli.ts`
- Modify: `src/mcp.ts`
- Modify: `src/discovery-catalog.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing platform-managed tests**
- [ ] **Step 2: Implement bounded platform-managed entry/readiness/progression surface**
- [ ] **Step 3: Re-run targeted platform-managed tests**
- [ ] **Step 4: Run full verification gate**

**Exit contract:** platform-managed becomes a formal product role without overclaiming universality.

---

## Chunk 9: Wave 8 — Diagnostics and evidence layer

**Entry criteria:** Waves 1–7 completed.

**Execution scope:** Make evidence and blocker/result taxonomy first-class product output.

**Deliverables:**
- CLI evidence mode
- SDK evidence payloads
- MCP evidence packets
- stable result taxonomy

**Files:**
- Modify: `src/business-universe/evidence.ts`
- Modify: `src/cli.ts`
- Modify: `src/mcp.ts`
- Create: `test/evidence-packet-productization.test.ts`
- Create: `scripts/validate-agent-first-business-universe.ts`

- [ ] **Step 1: Write failing evidence/taxonomy tests**
- [ ] **Step 2: Implement frozen evidence-return shape helpers**
- [ ] **Step 3: Add CLI and MCP evidence output paths**
- [ ] **Step 4: Add validation script for wave regression checks**
- [ ] **Step 5: Re-run targeted evidence tests**
- [ ] **Step 6: Run full verification gate**

**Exit contract:** agents can emit Core-consumable evidence without human rewrite.

---

## Chunk 10: Wave 9 — Docs and migration closure

**Entry criteria:** Waves 1–8 completed.

**Execution scope:** Rewrite outward docs to agent-first and add migration guidance.

**Deliverables:**
- README rewrite
- docs alignment
- migration guide
- legacy surface deprecation notes

**Files:**
- Modify: `README.md`
- Modify: `docs/ONBOARDING.md`
- Modify: `docs/CONTRACT_BOUNDARY.md`
- Modify: `docs/VALIDATION_LANES.md`
- Create: `docs/AGENT_FIRST_MIGRATION.md`
- Create or modify: tests that assert new outward wording if such tests already exist or are appropriate

- [ ] **Step 1: Write failing outward-doc tests if the repo already guards these surfaces**
- [ ] **Step 2: Rewrite README as agent-first operating entry**
- [ ] **Step 3: Align onboarding, boundary, and validation docs to the role-stage model**
- [ ] **Step 4: Add migration mapping from old helper-first usage to role-stage product entry**
- [ ] **Step 5: Re-run targeted doc/output tests if present**
- [ ] **Step 6: Run full verification gate**

**Exit contract:** the repo outwardly presents itself as an agent-first operating entry rather than a helper bundle.

---

## Final completion contract

The entire productization objective is complete only when:
- a fresh agent can install, connect, establish canonical preconditions, repair readiness, continue bounded claimant execution, hand off to operator, and continue through the canonical deeper path without human interpretation
- CLI, SDK, MCP, and discovery all consume the same role-stage semantic kernel
- canonical vs non-canonical vs bounded vs later-wave outcomes are machine-distinguishable
- the client stays decoupled from Program 4 internals
- every key action can emit a machine-readable evidence packet in the frozen downstream shape

---

## Practical execution note

Only start implementation after the user explicitly asks to execute this plan. When implementation starts, use a dedicated worktree and update the wave completion artifact after every verified wave.
