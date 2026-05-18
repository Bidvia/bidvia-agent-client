# Bidvia Client Productization Design

**Goal**

Turn `bidvia-agent-client` into the complete, accurate, efficient operator/agent entrypoint for Bidvia platform work, so future agents can close platform business scenarios through the client itself rather than by reading Core source or runbooks.

## Problem Statement

The client already exposes a large helper surface and can participate in most platform flows. However, the remaining gap is no longer “missing low-level helpers” but inconsistent productization of guidance and orchestration:

- validation modes are easy to confuse (`default local docker`, `proof-lane`, `seeded/runtime-generated`)
- task-write-ready progression is not fully surfaced as a guided path
- expected gates are honest but not always actionable enough
- key business enums are still broad enough to encourage guesswork
- business-universe closure is possible, but the client does not fully present self-generated closure as the default path

The result is that the client is strong as an SDK, but not yet strong enough as the single high-quality entrypoint for platform work.

## Productization Target

The target is **not** a giant orchestration engine that re-implements Core truth. The target is a layered product surface:

1. **Execution Surface**
   - Expose every already-supported user/operator/admin path the agent needs to progress through surfaced platform logic.
   - Never fabricate or infer Core-owned truth.

2. **Guidance Surface**
   - Explain what lane the caller is in.
   - Explain whether a failure is missing context, expected gate, role/operator/admin step, or unresolved Core-owned progression.
   - Always tell the caller what the next step is and who must perform it.

3. **Closure Surface**
   - Make self-generated business closure the default guidance path.
   - Keep proof-lane and fixed seeded fixtures explicitly separate from default runtime guidance.

4. **Verification Surface**
   - Preserve fail-closed semantics when Core-owned progression is not yet available.
   - Provide review-safe previews, scenario plans, route-context explanations, and validator-aligned docs that all tell one coherent story.

## Design Principles

### 1. Core truth remains Core-owned
The client must not simulate or invent authority progression, dispatchability, or proof fixtures. Where Core has the truth, the client may only:

- surface it
- explain it
- guide the caller through the surfaced path

### 2. Guidance must be structured, not just phrased nicely
Human-readable docs are necessary but insufficient. The client should carry machine-readable guidance where practical so CLI, MCP, runtime-capability snapshots, and route-context matrices can all expose the same next-step semantics.

### 3. Validation lanes must be explicit
Agents should not need to infer whether they are validating:

- default local docker runtime behavior
- proof-lane / admin-session behavior
- seeded/runtime-generated closure

Those lanes are product concepts and should be treated as first-class guidance.

### 4. Productized paths beat fixture folklore
If a business-universe chain can be closed by creating real runtime objects, that path should be the primary client guidance. Fixed fixture ids should never be the default operator story.

### 5. Tighten only what has live evidence
Do not over-tighten contracts speculatively. If an enum or progression was not proven live, keep the client honest and explicit rather than forcing a narrower shape.

## Recommended Productization Scope

### Immediate scope

1. **Validation lane documentation and surfacing**
2. **Task-write-readiness and gate diagnostics**
3. **Tightened proven business enums**
4. **Self-generated closure guidance in scenario/review surfaces**

### Deliberately out of scope for this wave

1. Re-implementing Core progression logic inside the client
2. Hardcoding proof-lane ids as default runtime assumptions
3. Hiding unresolved Core-owned gates behind fake “ready” states
4. Building a giant imperative orchestration engine that would drift from Core truth

## Success Criteria

The client productization wave succeeds when all of the following are true:

1. A new agent can tell which validation lane to use without reading Core internals.
2. A new agent can understand why a flow is blocked and which actor must act next.
3. The client defaults to self-generated closure over fixed proof-fixture assumptions.
4. Proven business enums are no longer left broad enough to invite guesswork.
5. CLI, MCP, docs, runtime-capabilities, route-context-matrix, and review-safe scenario outputs all tell the same story.

## Risks To Avoid

- Smuggling Core-owned progression state into client-local heuristics
- Making docs more precise while leaving machine-readable surfaces behind
- Tightening contracts beyond what live integration has proven
- Treating proof-lane as the normal path for ordinary runtime closure

## Recommended Implementation Shape

Implement as a layered hardening wave:

1. **Docs / lanes**
2. **Structured execution guidance**
3. **Tightened proven contracts**
4. **Scenario/review closure guidance**
5. **Full verification**

This keeps the work incremental, testable, and resilient to future Core upgrades.
