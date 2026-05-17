## Client Business-Closure-First Optimization Design

## Purpose

This design defines the next optimization wave for `bidvia-agent-client` after the latest multi-round local-docker integration validation against current Bidvia Core truth.

The primary goal is not internal cleanup for its own sake. The primary goal is to **expand the real business-closure capability that current Core truth already proves exists**, so the client can consume more of the claimant/operator commercial-universe collaboration path and produce more reliable business results.

This design is grounded in:

- direct client repo review
- documented local-docker claimant/operator integration evidence already persisted in repo docs
- current downstream contract-center role and ownership boundaries
- explicit bounded stops and later-wave classifications already emitted by Core

---

## Core planning decision

This optimization wave is **business-closure first**.

That means the client should optimize first for:

1. expanding executable business-closure coverage that Core already proves is real;
2. removing blocker-grade client defects that prevent already-proven Core abilities from being consumed correctly;
3. productizing stable claimant/operator/deeper readback surfaces consistently across SDK, CLI, MCP, and evidence outputs;
4. preserving honest bounded-stop and ownership semantics for surfaces that are still later-wave, read-only, or compatibility-only.

This wave is **not** primarily a long-term architecture cleanup wave, and it is **not** a client-side attempt to force later-wave Core families open.

---

## Goal

Turn the client into a stronger **business-closure consumer and operator/claimant collaboration surface** by productizing the real slices already proven in local-docker validation and by fixing the client-owned defects that still break those slices.

The intended result is not a false claim that “the entire Bidvia commercial universe is fully closed.”

The intended result is:

- claimant/bootstrap/account-plane closure is fully productized where Core truth is already stable
- claimant bounded task progression is more fully consumable
- operator-owned deeper continuation is more fully consumable
- claimant deeper readback is more stable and consistent
- integration ownership and lifecycle consumption is more complete where current Core truth already exposes it
- bounded/later-wave/unowned surfaces remain explicitly fail-closed instead of being softened into misleading success language

---

## Constitutional boundaries

This design must preserve the repo’s existing honesty constraints.

### 1. Do not invent deeper closure

The client must not overclaim:

- `product_closed` as `provider_proof_closed`
- bounded claimant readback as deeper mutation ownership
- operator-owned continuation as claimant-owned continuation
- route existence as ownership
- eligibility/visibility as invocation ownership

### 2. Do not force later-wave families open

Current live evidence and local contract docs still classify several families as out of current executable scope:

- platform-managed progression
- delegated governance continuation as a dedicated product family
- recovery governance as business-closure ownership
- reconciliation governance as a fully productized route family
- full proof universality

Those families stay out of scope for P0/P1 closure-expansion work except for clearer boundary expression.

### 3. Do not treat structure as the primary objective

Refactoring, taxonomy cleanup, and metadata consolidation are in scope only when they directly support:

- a proven closure slice
- a blocker-grade client defect
- a repeated product-surface inconsistency that materially harms business-closure consumption

---

## Current evidence baseline

The current planning baseline is the union of:

- `docs/CORE_FEEDBACK_2026-05-06_LOCAL_DOCKER_DEEP_INTEGRATION_REPORT.md`
- the additional local-docker multi-role validation findings established after that report
- `docs/CORE_AGENT_CLIENT_PLANE_CONTRACT_GAPS.md`
- current downstream role/stage/business-universe contract docs in the main Bidvia repo

### Standalone evidence summary

The currently documented and rerunnable evidence supports these facts:

1. claimant bootstrap, sign-in, account-me, and org/account-plane continuation are real on local docker
2. external-agent provisional create -> query -> claim is real and returns canonical account-plane continuation
3. dispatch-authority request + operator decision + claimant-side self-repair + external binding can move one claimant-owned agent to `dispatch_ready`
4. bounded claimant task entry is real, including live `create-task-dispatch`, live `create-lease`, and governed-work-closure readback
5. claimant execution listing create/update/activate/status/materialization readback is real
6. a canonical operator-owned deeper chain is real on the tenant-public/company-public path:
   - matching
   - connection
   - approval
   - opportunity materialization
   - package export
   - commercial-action execution
7. claimant opportunity status and end-state readbacks are real, but remain bounded and operator-handoff-oriented
8. integration ownership/capability readback is real, but the broader integration-app lifecycle is not yet fully productized in the client

The same evidence also establishes these current limits:

1. platform-managed role remains `later-wave-stop`
2. claimant deeper readback does not become deeper mutation ownership
3. `product_closed` / `product_closure_only` is not stronger provider-proof or reconciliation closure
4. compatibility-only Haisi/provider seams still sit behind bounded authorization/ownership gates and do not replace the canonical integration-app lifecycle

### Slices already proven live

The current evidence now proves:

1. account / session / org bootstrap
2. external agent onboarding / claim
3. canonical account-plane continuation
4. dispatch-authority request + operator/admin closure
5. self-service repair + scope alignment + external binding
6. dispatch-ready claimant bounded task entry
7. bounded governed-work readback
8. claimant execution listing subset
9. materialization bounded readback
10. canonical operator-owned deeper chain:
    - operator listing
    - matching
    - connection
    - approval
    - opportunity materialization
    - package export
    - commercial-action execution and readback
11. claimant deeper readbacks for opportunity status and end-state
12. bounded integration ownership / eligibility readback

### Boundaries still clearly open

The current evidence still does **not** prove:

1. full claimant bounded task progression package completion (`outcomes`, `evidence-bundles`, `confirmation-cycles`)
2. full integration-app lifecycle productization (catalogs, installations, installation connection, bounded invocation)
3. platform-managed executable closure
4. delegated governance executable closure family
5. recovery governance executable closure family
6. reconciliation/proof universality
7. full business-universe closure under every role family

### Newly confirmed client-owned gaps

The latest live runs surfaced concrete client gaps:

1. account-plane `task-dispatches` / `task-dispatch` read path appears to use the wrong header family and fails with `session_context_missing`
2. current client branch does not surface claimant bounded progression writes for:
   - `/outcomes`
   - `/evidence-bundles`
   - `/confirmation-cycles`
3. current client branch does not surface the broader integration-app lifecycle expected by the current Core guidance:
   - public/account integration-app catalogs
   - installations
   - installation connection
4. compatibility-only Haisi seams are present, but live results keep them behind bounded authorization/ownership gates and they do not replace the canonical integration-app lifecycle

---

## Optimization object model

This wave should be planned in four layers.

### 1. Closure capability layer

This is the primary layer for this wave.

It owns the real business-closure surface that the client can actually consume:

- claimant bounded task progression
- claimant execution listing progression and readback
- operator deeper continuation chain
- claimant deeper readbacks
- integration lifecycle ownership/eligibility/install/invocation consumption where Core truth is already stable enough

### 2. Surface productization layer

This layer makes the same proven closure capability consistently available via:

- SDK
- CLI
- MCP
- evidence/review output

The main problem this layer solves is not missing Core ability. It is inconsistent exposure of the same ability across product surfaces.

### 3. Truth adapter / transport correctness layer

This layer handles correctness defects such as:

- wrong header families
- wrong route family usage
- bad context projection
- claimant/operator scope translation misuse
- false-stop behavior caused by client wiring instead of Core truth

This layer is P0 whenever it blocks a proven closure slice.

### 4. Evidence and boundary governance layer

This layer ensures:

- real passes produce machine-readable evidence
- bounded stops are explicitly represented
- later-wave and compatibility-only surfaces do not read as success
- product-facing wording stays aligned with the actual closure scope

---

## Approaches considered

### Option 1 — defect cleanup first

Focus first on all currently visible client defects, then expand more business-closure surfaces after the repo is “clean.”

**Rejected as the main approach** because it would delay the productization of already-proven Core abilities and still leave the largest business gaps untouched.

### Option 2 — architecture-first cleanup

Focus first on internal surface/runtime/evidence architecture, then expand closure capability once the shape is cleaner.

**Rejected as the main approach** because it optimizes internal elegance before the closure-expansion goal that the latest integration evidence makes actionable.

### Option 3 — business-closure-first expansion with blocker defect absorption

Expand already-proven closure slices first, while folding blocker-grade client defects into the same wave whenever they prevent use of proven Core abilities.

**Selected** because it:

- matches the planning goal chosen for this wave
- uses live evidence rather than intuition to drive priority
- expands actual business results fastest
- still fixes the defects that would otherwise make closure-expansion misleading or unstable

---

## Chosen strategy

Adopt a three-phase optimization strategy: **P0 / P1 / P2**.

### P0 — unblock already-proven closure slices

P0 contains only items that directly block already-proven closure slices from being consumed correctly.

#### P0-A. Fix account-plane task read correctness

Fix the client-owned header/path/context bug on:

- `task-dispatches`
- `task-dispatch`

Expected result:

- account-plane task reads use the same session/account-plane truth posture as the other successful claimant account-plane reads
- task-plane coverage no longer splits into “writes work, reads fail” for the same surface family

#### P0-B. Productize the missing bounded task progression package

Add full client support for the claimant bounded progression writes already described by current Core truth:

- `POST /runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/outcomes`
- `POST /runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/evidence-bundles`
- `POST /runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/confirmation-cycles`

Required outcome:

- SDK helpers
- CLI commands
- MCP tools where the surrounding product model supports them
- evidence/readback wiring for governed-work closure after those writes

P0-B is specifically justified because current Core truth already describes these writes as part of the bounded claimant progression package, while the current client branch does not yet expose them.

### P1 — expand already-proven closure capability into fuller product surfaces

P1 is the first true closure-expansion phase.

#### P1-A. Productize the canonical integration-app lifecycle subset already proven enough to consume

P1 should add the client surfaces that are now clearly needed by current integration evidence and downstream guidance, while still preserving the distinction between canonical lifecycle and compatibility-only provider seams.

The planning target is the integration-app lifecycle subset that current evidence and guidance already identify as downstream-facing:

- integration-app discovery/catalog surfaces
- installation-oriented surfaces
- installation-connection surfaces
- bounded ownership/eligibility progression where current Core truth already emits machine-readable next steps

This phase must not claim that compatibility-only Haisi/provider seams are equivalent to the canonical lifecycle.

#### P1-B. Stabilize claimant deeper readback semantics

Unify and harden the client-facing product surface for:

- materialization status
- opportunity status
- opportunity end-state

The key goal is not new Core ability; it is stable semantics and evidence output for readbacks that are already real.

#### P1-C. Turn the proven operator deeper chain into a first-class reusable product surface

P1 should also productize the now-proven deeper operator chain as stable product capability:

- operator listing create/activate
- operator matching
- operator connection
- operator approval
- operator opportunity package export
- operator commercial-action run/inspect

This phase should ensure the chain is consistently available through:

- SDK
- CLI
- MCP where appropriate
- evidence/review outputs

P1 is successful when the deeper operator-owned chain is not merely demonstrable through ad hoc scripts, but reusable through the official client surfaces.

### P2 — consolidate surface governance and truth expression

P2 should consolidate the product and evidence layer after P0/P1 expand the closure surface.

Key targets:

- reduce duplicated capability/surface mappings across discovery, CLI, MCP, and helper metadata
- tighten executable vs review-safe vs compatibility-only vs later-wave-stop classification
- align evidence output with the closure scopes actually proven
- improve product-facing wording so bounded closure does not read as universal closure

P2 exists to prevent future closure-expansion work from fragmenting the product model again.

---

## Role-family treatment in this wave

### In-scope executable families

- claimant bounded continuation
- claimant bounded task progression
- claimant selected execution subset
- operator deeper continuation chain
- claimant deeper readback

### In-scope boundary-expression families

- platform-managed
- delegated governance
- recovery governance
- reconciliation governance
- compatibility-only integration/provider seams

These families are in scope only for stronger boundary expression unless new executable truth is proven during the wave.

### Out of scope as optimization goals for this wave

The wave must not attempt to “make these live” locally through client invention:

- platform-managed progression as a real executable closure path
- delegated governance as a complete product family
- recovery governance as a client-owned business-closure path
- reconciliation/proof universality
- universal scope translation across mixed-family source objects

---

## Execution principles

### Evidence first

Every P0/P1 item must map to at least one live or bounded-readback scenario that can be rerun.

### Expand only current truth

Only productize what current Core truth already proves enough to consume safely.

### Preserve honest stops

Bounded stop, later-wave stop, read-only boundary, compatibility-only seam, and non-canonical fail-close must remain product-visible categories.

### Cross-surface consistency

Key proven closure capabilities should not exist only in one entry surface if they are intended product behavior.

---

## Completion criteria

### P0 completion

P0 is complete when:

1. account-plane task reads no longer fail because of client-owned header/path misuse
2. the claimant bounded progression writes below are all present as supported client surfaces and are rerunnable on local docker with a real dispatch id:
   - `outcomes`
   - `evidence-bundles`
   - `confirmation-cycles`
3. a rerun of the same account-plane task thread can read claimant task objects without the current `session_context_missing` failure caused by client wiring

### P1 completion

P1 is complete when the following rerunnable evidence exists:

1. integration-app lifecycle surfaces that are in scope for this phase are available through the intended client surfaces and can be exercised on local docker or fail-close with explicit bounded-stop semantics rather than being absent from the client
2. claimant materialization/opportunity/end-state readbacks are available through the intended client surfaces with stable, same-object semantics
3. the operator deeper continuation chain is available through stable product surfaces, not just ad hoc scripts
4. claimant/operator handoff and same-object readback are traceable through consistent client outputs
5. package/commercial-action continuation can be driven and inspected through the supported product surfaces

### P2 completion

P2 is complete when:

1. duplicated surface-definition drift is reduced in the critical closure families
2. executable / review-safe / compatibility-only / later-wave-stop semantics are represented consistently
3. evidence outputs and product wording no longer blur bounded closure with stronger universality claims

### Overall business-facing completion

This wave succeeds when the client can reliably prove and productize:

- claimant bounded continuation
- claimant bounded task progression
- claimant selected execution subset
- operator deeper continuation chain
- claimant deeper readback
- bounded integration ownership/eligibility progression and the explicitly selected integration lifecycle subset where current Core truth already supports it

while continuing to state honestly that it does **not** yet prove:

- universal commercial-universe closure
- platform-managed executable closure
- delegated or recovery closure family completion
- provider-proof/reconciliation universality
- generalized integration invocation ownership beyond the currently bounded truth

---

## Explicit non-goals

This wave does not aim to:

1. declare the full Bidvia commercial universe completely closed
2. replace Core truth with client-side derived semantics
3. turn later-wave families into active product surfaces by assumption
4. claim proof/reconciliation closure where current evidence only proves product closure
5. perform unrelated broad internal refactoring detached from closure-expansion value

---

## Deliverable expectation for planning

The follow-up implementation plan should be derived from a matrix with these columns:

1. proven capability to productize
2. blocker-grade client defect
3. missing surface/product gap
4. bounded stop to preserve
5. deferred family not to force open

That planning format keeps the next implementation wave coupled to evidence rather than to intuition.

---

## Current status

This design is ready for user review and, if accepted after review, should feed the next implementation-plan phase.

Note: this document is intentionally written without creating a git commit in this session, because no commit was explicitly requested.
