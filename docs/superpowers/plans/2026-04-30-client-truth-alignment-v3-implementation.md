# Client Truth Alignment V3 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align client-facing docs, diagnostics, metadata, and release posture with the latest fresh evidence: bounded claimant closure and bounded commercial entry are now proven, while deeper commercial-universe continuation and proof closure are still not route-level certified.

**Architecture:** Treat the new Core evidence packet and v3 design as approved inputs. Reapply the current draft truth-alignment patch set in a clean isolated worktree, normalize it around the canonical closure classes, and verify both the direct docs/guidance surfaces and the downstream CLI/runtime projections that consume that wording. Finish by proving that release/readiness messaging stops at the bounded-closure line and that targeted tests remain deterministic under inherited local environment state.

This wave does **not** have to introduce a brand-new execution-guidance entry for deeper operator matching or opportunity closure. That boundary must remain explicit in the evidence packet, docs, and release posture, but the executable shared-guidance layer for this wave is limited to the already-shipped `task-write-ready` and `authorization-projection` guidance families.

**Tech Stack:** Markdown docs, TypeScript guidance/metadata surfaces, `node:test`, `tsx`, existing validation and readiness tests.

---

## Execution prerequisites

Before executing the tasks below:

- treat these files as the approved truth inputs, not as new work products:
  - `docs/CORE_FEEDBACK_2026-04-30_LOCAL_DOCKER_CLOSURE.md`
  - `docs/superpowers/specs/2026-04-30-client-truth-alignment-v3-design.md`
  - `docs/superpowers/plans/2026-04-30-client-truth-alignment-v3-implementation.md`
- execute in a clean isolated worktree rather than on the dirty `main` workspace
- use the dirty main-workspace diffs only as draft input to reapply intentionally in the clean worktree
- replace stale `/start-work` state before execution if `.sisyphus/boulder.json` still points at the old `2026-04-24` plan/worktree
- do **not** create git commits during this execution unless the user later explicitly requests them

## Chunk 1: Align the shared bounded-closure wording spine

### Task 1: Align shared wording across docs, release notes, and execution guidance

**Files:**
- Review: `docs/CORE_FEEDBACK_2026-04-30_LOCAL_DOCKER_CLOSURE.md`
- Review: `docs/superpowers/specs/2026-04-30-client-truth-alignment-v3-design.md`
- Modify: `README.md`
- Modify: `docs/ONBOARDING.md`
- Modify: `docs/VALIDATION_LANES.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/RELEASE_NOTES_LOCAL_ONLY_NEXT_VERSION.md`
- Modify: `src/execution-guidance.ts`
- Test: `test/readme-customer-guidance.test.ts`
- Test: `test/onboarding-readiness.test.ts`
- Test: `test/validation-lanes-docs.test.ts`
- Test: `test/v1-release-candidate.test.ts`
- Test: `test/public-release-shape.test.ts`

- [ ] **Step 1: Update the targeted assertions first**

Adjust the listed tests so they assert the repaired wording contract:

- ordinary surfaced lane still says `bounded task closure, not full business closure`
- docs explicitly mention that claimant/account-scoped and operator/admin binding writes use different body contracts
- release-facing text uses `workflow-stage truth and the remaining route-model adoption seams` language instead of the older broader phrase
- release/readiness text does not imply deeper opportunity or proof closure

- [ ] **Step 2: Run the targeted doc/guidance tests and confirm they fail from clean HEAD**

```bash
npx tsx --test test/readme-customer-guidance.test.ts test/onboarding-readiness.test.ts test/validation-lanes-docs.test.ts test/v1-release-candidate.test.ts test/public-release-shape.test.ts
```

Expected before implementation from clean HEAD:

- failures on the old external-binding wording and/or the older Stage 3 blocked-language expectations

- [ ] **Step 3: Apply the minimal wording changes**

Update only the listed docs and `src/execution-guidance.ts` so they all map cleanly back to the canonical closure classes defined in the v3 design.

Rules:

- preserve `bounded task closure, not full business closure` for the task-write-ready lane
- keep deeper commercial-universe continuation explicitly unproven
- keep operator handoff and proof-lane boundaries distinct
- do not invent a local binding-completion helper or broader Core-owned closure semantics

- [ ] **Step 4: Re-run the targeted doc/guidance tests**

Run the same command from Step 2.

Expected after implementation:

- the direct docs/guidance tests pass with the repaired wording contract

## Chunk 2: Keep downstream projections consistent and deterministic

### Task 2: Verify and fix downstream consumers of the shared execution guidance

**Files:**
- Modify if targeted failures show stale duplication: `src/cli.ts`
- Modify if targeted failures show stale duplication: `src/route-context-matrix.ts`
- Modify if targeted failures show stale duplication: `src/runtime-capabilities.ts`
- Modify if targeted failures show stale duplication: `src/discovery-catalog.ts`
- Modify if additional shared wording changes are required: `src/execution-guidance.ts`
- Modify: `test/cli-phase12.test.ts`
- Modify: `test/operator-ergonomics.test.ts`
- Modify: `test/route-context-matrix.test.ts`
- Modify: `test/runtime-capabilities.test.ts`

- [ ] **Step 1: Tighten the downstream regression expectations**

Update the listed tests so they assert the repaired projected wording and, where needed, isolate themselves from inherited local onboarding or environment state.

Specific expectations:

- projected CLI/runtime/readiness snapshots use the new binding guidance text consistently
- dry-run and preflight tests that should stay local-only do not inherit `BIDVIA_*` execution state from the shell
- tests that should ignore persisted onboarding state explicitly stub `readLocalOnboardingState` to `null`

- [ ] **Step 2: Run the targeted downstream tests and confirm failure from clean HEAD**

Run:

```bash
npx tsx --test test/cli-phase12.test.ts test/operator-ergonomics.test.ts test/route-context-matrix.test.ts test/runtime-capabilities.test.ts
```

Expected before implementation from clean HEAD:

- failures on stale projected strings and/or nondeterministic local-context assumptions

- [ ] **Step 3: Apply the minimal propagation and determinism fixes**

Rules:

- prefer fixing one shared guidance source over patching many projections independently
- only touch `src/cli.ts`, `src/route-context-matrix.ts`, `src/runtime-capabilities.ts`, or `src/discovery-catalog.ts` if the targeted tests prove those surfaces duplicate stale text locally
- keep dry-run verification local-only and fail-closed

- [ ] **Step 4: Re-run the targeted downstream tests**

Run the same command from Step 2.

Expected after implementation:

- downstream snapshots and dry-run/preflight regressions pass consistently

## Chunk 3: Re-check release posture and run full verification

### Task 3: Confirm that bounded-closure posture stays blocked at the right boundary

**Files:**
- Review: `README.md`
- Review: `docs/ONBOARDING.md`
- Review: `docs/VALIDATION_LANES.md`
- Review: `docs/ROADMAP.md`
- Review: `docs/RELEASE_NOTES_LOCAL_ONLY_NEXT_VERSION.md`
- Review: `src/execution-guidance.ts`
- Test: `test/v1-release-candidate.test.ts`
- Test: `test/public-release-shape.test.ts`
- Test: `test/readme-customer-guidance.test.ts`
- Test: `test/validation-lanes-docs.test.ts`

- [ ] **Step 1: Run the release-focused targeted regression**

Run:

```bash
npx tsx --test test/v1-release-candidate.test.ts test/public-release-shape.test.ts test/readme-customer-guidance.test.ts test/validation-lanes-docs.test.ts
```

Expected:

- all release-facing wording checks pass without implying deeper closure

- [ ] **Step 2: Run the full repo verification suite**

Run:

```bash
npm test
npm run typecheck
npm run build
npm run validate
npm run validate:release-readiness
npm run validate:release-gate
```

- [ ] **Step 3: Record any still-open Core-owned closure gaps in the final work summary**

Use `docs/CORE_FEEDBACK_2026-04-30_LOCAL_DOCKER_CLOSURE.md` as the authoritative source for the remaining unresolved seams: operator matching/opportunity emergence, end-state/proof closure, authorization projection, and `/healthz.version_markers.*`.
