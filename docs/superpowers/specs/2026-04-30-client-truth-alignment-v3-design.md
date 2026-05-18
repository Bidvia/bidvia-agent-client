# Bidvia Client Truth Alignment V3 Design

## Goal

Turn the latest fresh local-docker certification results into a durable client truth model that clearly separates what is now route-level proven from what still stops at operator handoff, opportunity emergence, authorization projection, or proof closure.

## Why a V3 wave is needed

The completed v2 surface-alignment wave fixed the biggest client-owned problems:

- continuation-state persistence drift
- account-plane header/context drift
- executable-truth drift around claimant account-owned `execution/*`
- overexposed compatibility seams

That moved the repo out of a “client bug first” state and into a different problem class:

- the client is now closer to the truth,
- but the truth it presents still needs a sharper boundary between
  - **bounded claimant closure now**, and
  - **deeper commercial-universe continuation not yet route-level proven**.

The next wave should therefore not be another seam-fix pass. It should be a truth-alignment wave.

## Problem statement

Fresh evidence now proves more than the older client surface communicated:

- claimant account-plane continuation is real
- claimant account-owned `execution/*` operations are real
- business entry and bounded task lifecycle are real

At the same time, fresh evidence also proves less than a naive success reading would imply:

- business-entry progression still stops at explicit operator handoff for matching
- opportunity status and end-state readbacks are not yet closing on the ordinary surfaced lane
- proof/reconciliation closure is not yet route-level proven
- authorization projection can remain separately blocked after continuation succeeds

If the client keeps only the v2 language, it risks collapsing these two truths into one misleading “ready” story.

## Design objective

V3 should make the client good at **telling the truth about partial closure**.

That means all user-facing and machine-facing surfaces should be able to say, consistently:

1. what is executable now;
2. what is only bounded closure now;
3. what still depends on operator/admin handoff;
4. what still lacks surfaced discovery/readback proof;
5. what remains proof-lane only or unresolved Core-owned progression.

## Closure classes and rendering rule

V3 needs one canonical closure-class model underneath all human-facing wording.

The canonical classes are:

1. `bounded-claimant-closure-proven`
2. `bounded-commercial-entry-proven`
3. `operator-handoff-required`
4. `proof-lane-only`
5. `core-progression-unresolved`

These classes are the stable truth contract.

Human-facing docs, CLI text, and review-safe summaries may render them with more specific explanatory phrases, but they must obey two rules:

- every rendered phrase must map back to one or more canonical classes above;
- rendered wording must not invent a new closure category or imply deeper commercial-universe closure when only bounded claimant/task/commercial-entry truth is proven.

Examples:

- `bounded task closure, not full business closure` is an allowed rendering of `bounded-claimant-closure-proven`
- `bounded task closure and bounded commercial entry` is an allowed combined rendering of `bounded-claimant-closure-proven` + `bounded-commercial-entry-proven`
- `handoff_to_operator_for_matching` should be interpreted as `operator-handoff-required`, not as deeper closure proof

This rule is what prevents README, onboarding guidance, runtime snapshots, and release-readiness text from all sounding slightly different while claiming to mean the same thing.

## Recommended strategy

Adopt a three-part truth-alignment strategy.

### Part V3-P0 — Promote the fresh evidence packet to a first-class truth input

The client already uses route matrices, capability metadata, discovery metadata, and guidance layers.

V3 should add one stronger discipline: fresh certification evidence must explicitly feed the wording of those layers.

The Core feedback packet from `docs/CORE_FEEDBACK_2026-04-30_LOCAL_DOCKER_CLOSURE.md` becomes the source of truth for what changed in interpretation.

### Part V3-P1 — Split bounded closure from deeper commercial closure everywhere

The client should explicitly distinguish:

- **bounded claimant closure now**
  - onboarding
  - account-plane continuation
  - authorization refresh
  - claimant `execution/*`
  - listing/business entry
  - bounded task lifecycle
- **deeper commercial closure not yet proven**
  - operator matching progression
  - opportunity emergence/discovery
  - opportunity status readback
  - end-state readback
  - proof/reconciliation closure

This split must appear consistently in CLI guidance, discovery metadata, validation docs, runtime-capability summaries, and release-readiness messaging.

For this specific wave, the shared execution-guidance layer is only required to make `task-write-ready` and `authorization-projection` boundaries explicit. The deeper operator-handoff / opportunity-closure boundary must be kept explicit in the evidence packet, docs, and release posture, but it is not yet required to ship as a new first-class execution-guidance entry in this wave.

### Part V3-P2 — Make the unresolved seams explicit product boundaries

The client must stop sounding as if the remaining problem is only missing helper coverage.

Instead it should explain that some unresolved seams are currently about:

- missing surfaced continuation semantics
- caller-known-id dependence
- authorization projection ambiguity
- proof-lane versus ordinary-lane confusion

This is not a retreat in functionality. It is a stronger product boundary.

## Architectural focus areas

### 1. Truth wording spine

The repo already has multiple wording surfaces:

- `README.md`
- `docs/ONBOARDING.md`
- `docs/VALIDATION_LANES.md`
- `docs/ROADMAP.md`
- runtime guidance output
- capability/discovery summaries

V3 should make them all consume the same closure vocabulary:

- executable now
- bounded-claimant-closure-proven
- bounded-commercial-entry-proven
- operator-handoff-required
- proof-lane-only
- core-progression-unresolved

Human-facing surfaces can still use explanatory prose, but the underlying class mapping must stay stable.

### 2. Capability and discovery interpretation

Surface metadata should stop at the proven boundary. In particular, route existence or lower-level wrappers must not imply:

- opportunity discoverability
- commercial-universe closure
- proof closure
- generalized scale-growth readiness

### 3. Readiness and release posture

The repo’s release-readiness story should remain blocked at the right layer.

The correct posture is no longer “claimant path broadly blocked,” but also not “commercial-universe closure proven.”

The new posture is:

- claimant bounded closure is real;
- deeper closure and scale-growth certification remain blocked pending upstream truth.

## Scope recommendation

### In scope now

- formalize the Core evidence packet
- create a v3 design and implementation plan
- update or add the docs/guidance surfaces that currently blur bounded closure with deeper closure
- align release-facing wording, including release notes, to the same closure classes
- harden targeted local tests that would otherwise inherit misleading local onboarding or environment state during truth-alignment verification
- keep release-language and validation-lane wording honest about what is and is not certified

### Explicitly out of scope now

- inventing new opportunity/proof semantics
- productizing deeper continuation as if it were already stable
- presenting caller-known-id handoff seams as user-friendly closure
- broad runtime or control-plane redesign unrelated to truth alignment

## Success criteria

V3 succeeds when:

1. the repo clearly communicates that claimant bounded closure is proven;
2. the repo clearly communicates that deeper commercial closure is not yet proven;
3. ordinary-lane, proof-lane, and operator-handoff boundaries are visible everywhere that matters;
4. future upstream progress can be adopted by changing one shared truth vocabulary rather than re-patching each surface independently.
