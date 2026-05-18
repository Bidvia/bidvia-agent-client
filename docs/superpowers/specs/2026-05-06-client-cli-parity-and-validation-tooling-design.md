# Client CLI Parity and Validation Tooling Design

## Purpose

This design defines the next client-only optimization wave for `bidvia-agent-client` after the latest local-docker validation round.

The intent is **not** to fix Core defects inside this repo. The intent is to improve the client as a product by:

1. making more already-shipped bounded capabilities directly usable from the CLI, and
2. making installation, smoke validation, diagnostics, and evidence export easier for external users without embedding heavy internal/Core workflows into the product.

---

## Current validated context

The current client worktree already achieved all of the following:

- account/session/org prerequisite support
- provisional create -> query -> claim
- canonical account-plane continuation
- dispatch-authority request + operator/admin review closure handoff
- external-account binding
- self-service capability-profile wire-format correction
- bounded materialization readback
- bounded integration ownership / eligibility readback
- bounded public proof-reading

The latest local-docker baseline now also confirms:

- non-empty runtime identity / version markers
- identity-complete baseline
- no stale top-level closure/governed-work summary from the older baseline

What remains unresolved at the platform level is mostly outside client ownership:

- task dispatch acceptance persistence / reload defect in Core
- authorization refresh vs governed-read projection ambiguity in Core
- deeper opportunity continuation that remains bounded / operator-owned / later-wave by design

This next client wave must therefore stay narrowly client-owned.

---

## Scope

This wave is organized as **two tracks**.

### Track 1 — Install-path robustness and CLI parity

Goal: make already-shipped bounded client surfaces more directly usable and less fragile for real users.

Subgoals:

- detect and explain active binary / install path drift
- reduce “SDK/MCP-only” gaps where the same bounded surface should reasonably be callable from CLI
- improve command-level ergonomics for user-operated validation and bounded execution

### Track 2 — External-user-facing validation tooling

Goal: turn manual install/smoke/diagnostic steps into reusable user-facing tools and artifacts.

Subgoals:

- provide a repeatable smoke/doctor lane for external users
- generate machine-readable and human-readable evidence from bounded validation runs
- keep tooling useful for support and escalation without embedding internal Core workflows into the product

---

## Explicit non-goals

The following do **not** belong in this design or implementation plan:

1. Fixing Core hard defects
2. Adding workflow-stage truth
3. Inventing approval -> opportunity emergence paths
4. Inventing end-state / proof / reconciliation closure helpers
5. Embedding operator-only or later-wave continuation as claimant-owned CLI flows
6. Introducing hosted runtime, hosted MCP, remote registry, or live capability negotiation product claims
7. Making this repo responsible for internal Core acceptance workflows

If any proposed step requires new Core semantics, it must be deferred.

---

## Design principles

### 1. CLI parity only over already-shipped bounded helpers

CLI parity here means: if a bounded helper is already shipped and already exposed honestly in SDK and/or MCP, then the CLI may gain a direct command surface for it.

CLI parity does **not** mean:

- exposing blocked workflow-stage semantics
- exposing operator-owned deeper continuations
- exposing compatibility-only or internal-only helpers as first-class public commands

### 2. Validation tooling must help external users first

Validation tooling should answer questions like:

- “Which `bidvia` binary am I actually running?”
- “Is my install healthy and consistent?”
- “Do I have the right context for this bounded route family?”
- “Can I export a clean diagnostic packet to support/Core?”

It should not force external users to understand internal Core lane choreography.

### 3. Evidence before interpretation

Every new smoke/doctor/report tool must clearly separate:

- local install/config truth
- request-context truth
- route reachability / transport truth
- returned server truth

And it must avoid turning a successful read into a broader closure claim.

### 4. Fail-closed messages are a product feature

When the current environment cannot continue, the CLI should fail with:

- a stable code or category
- a concise explanation
- a next step
- enough machine-readable context to support reruns and escalation

This wave should use one closed blocker/error classification vocabulary wherever concepts overlap. At minimum the implementation plan must freeze a shared taxonomy covering:

- install-path mismatch
- missing local/user context
- transport failure
- returned bounded stop / handoff
- unsupported/deferred-by-design surface

### 5. No hidden internal dependency on Core-only workflows

Track 2 may export evidence that helps support/Core, but it must not hardcode heavy internal orchestration into the product surface.

---

## Track 1 design

### T1.1 Install-path robustness

Add one bounded diagnostic surface that makes binary resolution and package state explicit.

This surface is the **shared primitive** for Track 2. Track 2 may orchestrate or export its results, but must not duplicate its binary/path/package-state detection logic in a second implementation.

Expected capabilities:

- show the active CLI binary path
- show the package root/dist path backing that binary
- show package version / build metadata available locally
- detect likely path/prefix drift between the active executable and a different npm global prefix
- point the user to the safe next step instead of silently assuming the right binary is active

This must remain a **local install diagnostic**, not a Core truth endpoint.

### T1.2 Task-plane CLI parity

Add CLI commands only for the bounded task-plane writes that are already shipped in SDK/MCP and make sense for user-operated validation.

Candidate parity surface:

- `create-task-dispatch`
- `assign-task-dispatch`
- `suspend-task-dispatch`
- `resume-task-dispatch`
- `complete-task-dispatch`
- `fail-task-dispatch`
- `create-claim`
- `accept-claim`
- `reject-claim`
- `create-lease`

`create-lease` is included only if the implementation plan confirms all three are already true in this repo:

1. shipped SDK helper exists,
2. discovery/MCP/runnable surface already exists, and
3. tests already prove the helper contract shape.

If any of those three checks fail, `create-lease` must be explicitly deferred from CLI parity in this wave instead of being force-fit.

These commands must:

- reuse current shared input parsing and context resolution patterns
- surface request/response JSON without inventing new semantics
- preserve the existing account-plane / governed-read / operator-company boundaries

Important: if Core still rejects these commands under the latest baseline, CLI parity is still valuable because it makes the failure reproducible and user-visible. The client should expose the bounded route honestly even when the server currently returns a fail-closed response.

### T1.3 Help and discovery coherence

Any new CLI command must also update:

- grouped `--help`
- discovery catalog
- route capability output
- operator discovery / runtime capabilities snapshots
- CLI tests and discovery tests

No hidden CLI surface.

---

## Track 2 design

### T2.1 External-user smoke runner

Create one small, bounded smoke entrypoint for external users.

It should orchestrate only safe local/user-facing checks such as:

- active binary/install path inspection
- `environment-mode`
- `launch-topology-smoke`
- `runtime-capabilities`
- `server-capabilities`
- optional local MCP availability
- optional bounded account/session context checks when env/session data exists

It must not silently run internal operator-only workflows.

Track 2 must be implemented as **thin orchestration over Track 1 and existing diagnostics**, not as a second independent truth engine.

### T2.2 Evidence export for support escalation

Create a report/export surface that packages the smoke results into:

- machine-readable JSON
- user-shareable summary

This report should be targeted at:

- external users
- support engineers
- Core escalation

But it must describe only what the client can actually prove.

### T2.3 Bounded actor/context explanation

Diagnostics should explicitly categorize blockers into:

- install-path / binary mismatch
- missing local/user context
- transport / route failure
- Core returned bounded stop / handoff

This is the highest-value reporting improvement because it reduces unnecessary guesswork.

### T2.4 Reusable smoke + evidence bundle

The output of Track 2 should be designed so the same evidence bundle can be attached to:

- user bug reports
- support triage
- Core escalation

without rewriting it manually.

---

## Proposed user-facing deliverables

At the end of this wave, external users should be able to do all of the following directly:

1. verify which `bidvia` binary is actually active
2. run one bounded smoke pass over local install/runtime diagnostics
3. run more of the already-shipped bounded task-plane writes from CLI
4. export one clean evidence packet for escalation

---

## Acceptance criteria

### Track 1 acceptance

- the install-path diagnostic reliably distinguishes the active binary from stale installs
- newly exposed CLI task-plane commands are discoverable in help output
- discovery catalog, MCP, route capabilities, and runtime snapshots remain coherent
- commands do not widen beyond already-shipped helper semantics

Track 1 acceptance must be backed by explicit output contracts, not interpretation only. At minimum the implementation plan must require tests for:

- install-path diagnostic JSON/text fields,
- grouped CLI help command presence,
- discovery catalog and route-capability entries,
- command-level error code/message shape for missing context and transport failures.

The executable plan must freeze those output contracts in its first chunk instead of leaving them to implementation-time interpretation.

### Track 2 acceptance

- a bounded smoke tool runs without requiring internal operator choreography
- evidence output is generated in stable machine-readable form
- diagnostics classify failures clearly enough for external users to self-diagnose or escalate
- report output stays fail-closed and does not overclaim server truth

Track 2 acceptance must also be output-contract based. The implementation plan must define exact machine-readable keys for at least:

- active binary / package location summary,
- environment/base-url classification,
- context availability summary,
- command/check results,
- blocked/fail reasons,
- evidence artifact path(s).

The same plan chunk should also choose the single user-facing summary format explicitly (text or markdown) rather than defer that choice during implementation.

### Global acceptance

- no Core hard-defect remediation is embedded into the client
- no deeper operator-only or later-wave path is mislabeled as claimant-owned
- all new tooling is backed by tests and full validation gate success

---

## Main risks

1. **CLI parity overreach**
   - adding commands for surfaces that are still conceptually blocked or internal

2. **validation-tooling overreach**
   - accidentally building an internal Core acceptance runner into the public product

3. **truth drift across outputs**
   - CLI help, discovery, route capability metadata, diagnostics, and docs diverge again

4. **install-path heuristics becoming platform-specific guesswork**
   - the install-path tool must diagnose, not over-assert

---

## Recommended execution structure

The corresponding `/start-work` plan should be split into these chunks:

1. install-path robustness
2. task-plane CLI parity
3. external-user smoke tooling
4. evidence export/report bundling
5. full verification and final review

That structure keeps the user-facing command surface and validation surface decoupled but coordinated.

---

## Final design stance

This wave is a **client-productization and validation-ergonomics** wave, not a Core-remediation wave.

If a scenario exposes a Core defect, the client should make it easier to reproduce, classify, and export — not paper over it.
