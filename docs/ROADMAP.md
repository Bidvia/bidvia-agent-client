# Roadmap

> Status: public roadmap
>
> This file describes the longer-term direction of `bidvia-agent-client` for outside users and contributors.

## Product direction

`Bidvia-agent-client` is on a long path toward a governed operating kit for agents connecting to the Bidvia platform.

The roadmap is not a backlog ledger. It is a public summary of how this repo should evolve without overstating what is already shipped, what is still bounded, and what still belongs to future Core or control-plane work.

## Current mainline boundary

The current mainline is still a partial slice aligned to the current Bidvia integration boundary.

That current slice is centered on the execution layer, with adjacent scenario, verification, and local adapter surfaces where those layers are already proven and bounded.

Today the mainline already includes:

- shipped local helpers for onboarding, claim, heartbeat, sync, evidence, proposal, and related governed execution flows
- shipped bounded identity/session prerequisite helpers for membership lifecycle and account-agent dispatch-authority support without widening into a general account-admin shell
- shipped local helper coverage for pricing, media, evidence, document, attachment, proposal, review, and authorized-use explanation surfaces
- shipped SDK/CLI visibility for the frozen registration, authority-profile, capability-profile, singular agent-capability-profile, participation-state, and task-dispatch route families now adopted downstream
- shipped account-scoped task-dispatch and notification helper families where the downstream packets are already frozen and adopted here
- shipped local scenario-envelope builders plus bounded scenario families for registration lifecycle, registered-agent operations, industry-universe, connection approval, commercial-action continuation, and one honest cross-chain coordinator path across shipped slices
- shipped local review-packet, verification-bundle, CLI preview/export, static capability metadata, local runtime snapshot, server-capability normalization, static MCP catalog, bounded local stdio MCP server, and environment-mode visibility surfaces
- shipped local install-integrity, validation-smoke, diagnostic-bundle-export, and public-runtime-interpretation-probe tooling for external-user-facing bounded diagnostics, runtime-baseline interpretation, and escalation packaging

This is meaningful progress, but it is still not the full operating-kit destination. The repo remains bounded by frozen Core contracts and must not claim platform authority, hosted runtime behavior, integrated Core truth, platform-auth ownership, or a general workflow engine.

The current V1 framing is agent-first with bounded login/session prerequisite support. External users may need account/session establishment before they can continue, but the package promise stays centered on the governed agent path rather than on a general account product shell.

## Validation lanes and closure guidance

Client-facing validation should now be explained through explicit lanes rather than a single generic local-dev story:

- **default local docker** validates real surfaced runtime behavior
- **proof-lane / admin-session** validates deterministic admin-scoped walkthroughs
- **seeded / runtime-generated object validation** covers closures where agents must create or obtain real runtime objects instead of assuming fixed proof ids

The roadmap should keep three operational rules clear:

1. fixed proof ids are not assumed in default local docker
2. self-generated runtime data is the preferred path for business-universe closure on the ordinary surfaced lane
3. task-write-ready progression is a distinct surfaced path, not an implied side effect of claim

That task-write-ready path should stay concrete: self-service patch -> dispatch-authority request -> operator/admin review closure -> external binding check -> post-step verification of task-write-ready and dispatch-eligibility truth. It is bounded task closure, not full business closure. The external claimed agent owns the self-service patch and bounded dispatch-authority request, operator/admin owns review closure, and the latest surfaced runtime now proves that claimant/account-scoped and operator/admin binding writes use different body contracts. The current repo now ships a first-class account-plane external binding write helper together with account-agent binding visibility reads, but the external binding step must stay fail-closed until the current lane has an explicit Core-owned route/body contract and the returned reads confirm runnable truth.

This means the client’s long-horizon value is not only helper coverage, but also accurate lane selection, truthful gate explanation, and efficient next-step guidance for agents that should not need Core-source archaeology.

That outward diagnostic story should now stay explicit in roadmap language too:

- `install-integrity` is the local install-path self-check
- `validation-smoke` is the bounded external-user validation lane
- `diagnostic-bundle-export` packages bounded smoke evidence into shareable artifacts
- `public-runtime-interpretation-probe` stays bounded to live runtime-baseline interpretation over `/healthz` and `/readyz`
- bounded task-plane CLI parity commands such as `create-task-dispatch`, `assign-task-dispatch`, `complete-task-dispatch`, `create-claim`, `accept-claim`, and `reject-claim` stay limited to already-shipped helper semantics only
- all of those surfaces remain fail-closed and do not turn the client into a Core-owned certification flow

## Payload-grounded V1 truth model

The current mainline should now be described through the helper-level payload matrix rather than through blanket plane-wide blockage language.

The canonical summary is:

- `identity-session | packet-grounded-execution`
- `task | packet-grounded-execution`
- `capability | packet-grounded-read`
- `workflow-stage | blocked-pending-packet`
- `event-notification | packet-grounded-execution`
- `enterprise-integration | packet-grounded-read`

That helper-level payload matrix is grounded in the downstream contract center and keeps four distinct helper states visible in repo language:

- `packet-grounded-execution`
- `packet-grounded-read`
- `blocked-pending-packet`
- `compatibility-only`

Docs should therefore stop implying that all six Core-facing planes are broadly blocked. Only the workflow-stage plane remains broadly blocked at the current plane-summary level; the others already contain payload-grounded helpers and must be described accordingly.

## Release-language split for the current mainline

Keep every roadmap claim inside one of these three buckets:

### Shipped local surfaces

These are implemented and should be described as local repo-owned surfaces:

- governed execution helpers and bounded business-chain helpers already present in code and tests
- widened frozen downstream read surfaces already present in the SDK and CLI, including principal-governed registration/profile reads and the shipped participation/task wrappers
- bounded scenario planning and bounded orchestration slices already present in code and tests
- verification-bundle and review-packet packaging already present in code and tests
- static capability metadata, local runtime-capability snapshot output, server-capability normalization, static MCP-facing catalog output, bounded local stdio MCP server, and read-only environment-mode visibility
- local operator and integrator surfaces, including the current OpenClaw Gateway path where the repo already provides local guidance, bounded tooling support, and the next-version stdio-MCP-first plus companion-bundle OpenClaw packaging story

For the next OpenClaw-compatible version, the roadmap language should stay specific: `bidvia mcp-server` remains the primary OpenClaw runtime handoff, `openclaw-bundle-export` is additive packaging around that same local server, and native-plugin-first or HTTP MCP claims stay deferred.

### Implemented but dependency-gated seams

These are implemented seams that must stay fail-closed until Bidvia Core provides frozen truth:

- `refreshRemoteCapabilityTruth(...)` is implemented as a readiness-only consumption seam, but it remains `compatibility-only` until frozen Core capability truth and freshness semantics exist
- the seam can accept a future server-derived capability payload shape without rewriting the client boundary, but it must not be described as integrated Core truth, truth closure, live negotiation, remote discovery, hosted MCP/runtime behavior, or remote registry behavior

### Deferred Core, runtime, and control-plane areas

These remain outside the shipped mainline boundary:

- integrated Core-owned capability truth and live refresh behavior
- hosted MCP/runtime expansion, remote registry behavior, and broader runtime negotiation loops
- approval-to-opportunity creation or discovery behavior after the current coordinator handoff boundary
- broader control-plane ownership, client-owned authority, or any claim that bounded orchestration is a general workflow engine

The current wave also keeps six speculative mechanisms explicitly deferred: transport profiles, workspace grants, confirmation gates, durable session stores, context compression, and memory blocks. Treat them as out of scope for current-wave implementation until a future plan provides separate evidence for promotion. See `.sisyphus/internal/AGENT_CLIENT_DEFERRED_MECHANISMS_EVIDENCE.md`.

## Plane model for the long-term architecture

The repo now needs to be read through two groups of planes rather than through a flat feature list.

### Core-facing platform planes

These are the planes where Bidvia Core now freezes stable downstream truth and where the client must stop inferring semantics from individual routes and local metadata:

1. identity / session plane
2. task plane
3. capability plane
4. workflow / stage plane
5. event / notification plane
6. enterprise integration plane

Core now freezes these six planes through the downstream contract center, but client adoption still proceeds in waves because packet-complete payload truth is not yet equally complete across every plane.

### Agent-client local planes

These are the planes the client must own locally, regardless of whether Core has already promoted the corresponding platform truth into an explicit contract:

7. local runtime / execution session plane
8. local accumulation / memory plane

The local planes must stay local-first and must not turn this repo into a hosted runtime, control plane, or model-provider owner.

## V1.0-oriented architecture path

The current roadmap should now be read as a three-stage path toward an eventual public `1.0.0` release.

### Stage 1. Agent-client runtime architecture upgrade

Stage 1 is intentionally client-first and should proceed even when Core has not yet promoted every missing plane into an explicit contract.

The goal is to complete the client's own architecture so it is no longer just a helper/CLI/MCP access layer, but a stable local runtime for agents operating on Bidvia.

Primary outcomes:

- introduce a first-class execution-session/runtime model over the existing SDK, CLI, and MCP surfaces
- add a task runtime layer over the already-shipped claim / lease / dispatch / completion primitives
- add local checkpoint, result-journal, and resumability mechanisms that remain explicitly local and fail-closed
- add a local accumulation layer for onboarding memory, task execution memory, capability usage memory, and result memory
- introduce lifecycle hook seams so agent runtimes such as OpenClaw can integrate without making this repo the model-provider owner
- refactor CLI/MCP/operator surfaces so they consume the runtime/session layer instead of each command rebuilding its own local state machine

This stage must not claim Core truth ownership. It should focus on local runtime quality, reliability, and maintainability.

### Stage 2. Core contract consumption and seam hardening

Stage 2 is not a passive waiting period. The client should continue evolving by hardening the seams that consume the frozen six-plane Core truth, while keeping any still-incomplete payload packets fail-closed.

Primary outcomes:

- keep identity/session, task, capability, workflow, event, and enterprise integration dependencies aligned to the helper-level payload matrix instead of collapsing them into coarser plane defaults
- consume Core capability truth only through stable plane-level payloads, not through scattered route heuristics or helper-local metadata
- replace client-side semantic inference with Core-provided workflow/stage and task-truth consumption wherever those contracts are frozen
- keep all still-packet-incomplete Core plane payloads fail-closed and clearly documented, rather than emulating them locally
- maintain local runtime evolution while preventing drift between local ergonomics and Core-owned truth

Stage 2 now executes in three waves:

- P0: identity/session, task, and event/notification
- P1: capability and workflow/stage
- P2: enterprise integration plus the Stage 3 release gate handoff

This stage is where the repo should converge on a model in which capability growth in Core does not force a version-scale client rewrite, provided the plane contracts remain stable.

### Stage 3. V1.0 release closure

The public `1.0.0` release should happen only when both the client runtime upgrade and the critical Core contract support are present, and when the repo can prove that blocked payload work remains blocked rather than guessed locally.

Stage 3 is now an explicit release gate, not narrative-only wording. Its default repo-state posture must stay blocked until P0, P1, and P2 adoption are packet-grounded. The release validator suite remains a separate closure requirement rather than a hardcoded runtime-snapshot blocker.

For `1.0.0`, the client must be able to support all of the following through the public product path:

- complete agent onboarding and claim
- complete task receive / claim / lease / execute / complete-or-fail flow
- complete platform capability consumption across the frozen execution and governance surfaces required for real work
- complete result submission and operator-visible diagnostics
- complete OpenClaw/local-agent operator path and website/docs handoff consistency

Core does not need a full architectural rewrite before this release, but it does need to keep exposing the minimum stable contract surface required for:

- claim -> governed-run closure
- explicit task runtime semantics
- explicit capability manifest truth
- explicit workflow / stage truth
- the subset of enterprise integration truth required by the initial commercial-universe operating-system release

## Roadmap reading rule

Read this roadmap in order:

1. respect the current shipped boundary and release-language split
2. complete Stage 1 as a client-owned runtime architecture upgrade
3. use Stage 2 to harden plane-consumption seams and align on the frozen Core contracts as they are adopted
4. use Stage 3 as an executable `1.0.0` closure gate only when both the client runtime and the necessary Core contracts are ready

This ordering keeps the roadmap honest. It allows substantial client-side architecture evolution now, without pretending the client owns Core truth, hosted runtime behavior, remote registry behavior, or model-provider execution.
