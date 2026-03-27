# Roadmap

## Product direction

`Bidvia-agent-client` is on a long path toward a governed operating kit for agents connecting to the Bidvia platform.

The roadmap is not a backlog ledger. It is the long-horizon blueprint for how this repo should evolve without overstating what is already shipped, what is only wired as a dependency-gated seam, and what still belongs to future Core, runtime, or control-plane work.

## Current mainline boundary

The current mainline is still a partial current slice aligned to the frozen Bidvia Commercial Universe V1 / Core V12 handoff boundary.

That current slice is centered on the execution layer, with adjacent scenario, verification, and local adapter surfaces where those layers are already proven and bounded.

Today the mainline already includes:

- shipped local helpers for onboarding, claim, heartbeat, sync, evidence, proposal, and related governed execution flows
- shipped local helper coverage for pricing, media, evidence, document, attachment, proposal, review, and authorized-use explanation surfaces
- shipped local scenario-envelope builders plus bounded scenario families for registration lifecycle, registered-agent operations, industry-universe, connection approval, commercial-action continuation, and one honest cross-chain coordinator path across shipped slices
- shipped local review-packet, verification-bundle, CLI preview/export, static capability metadata, local runtime snapshot, server-capability normalization, static MCP catalog, bounded local stdio MCP server, and environment-mode visibility surfaces

This is meaningful progress, but it is still not the full operating-kit destination. The repo remains bounded by frozen Core contracts and must not claim platform authority, hosted runtime behavior, integrated Core truth, or a general workflow engine.

## Release-language split for the current mainline

Keep every roadmap claim inside one of these three buckets:

### Shipped local surfaces

These are implemented and should be described as local repo-owned surfaces:

- governed execution helpers and bounded business-chain helpers already present in code and tests
- bounded scenario planning and bounded orchestration slices already present in code and tests
- verification-bundle and review-packet packaging already present in code and tests
- static capability metadata, local runtime-capability snapshot output, server-capability normalization, static MCP-facing catalog output, bounded local stdio MCP server, and read-only environment-mode visibility
- local operator and integrator surfaces, including the current OpenClaw Gateway path where the repo already provides local guidance and bounded tooling support

### Implemented but dependency-gated seams

These are implemented seams that must stay fail-closed until Bidvia Core provides frozen truth:

- `refreshRemoteCapabilityTruth(...)` is implemented, but it is blocked until frozen Core capability truth and freshness semantics exist
- the seam can merge local snapshot knowledge with a server-derived capability payload shape, but it must not be described as integrated Core truth, live negotiation, remote discovery, hosted MCP/runtime behavior, or remote registry behavior

### Deferred Core, runtime, and control-plane areas

These remain outside the shipped mainline boundary:

- integrated Core-owned capability truth and live refresh behavior
- hosted MCP/runtime expansion, remote registry behavior, and broader runtime negotiation loops
- approval-to-opportunity creation or discovery behavior after the current coordinator handoff boundary
- broader control-plane ownership, client-owned authority, or any claim that bounded orchestration is a general workflow engine

## Long-horizon blueprint

The approved order is Track 1 first, then Track 2, with explicit L1, L2, and L3 levels across that evolution.

### L1. Integration productization completion

L1 completes Track 1. The goal is for this repo to become the most reliable Bidvia integration product for external users, operators, and OpenClaw Gateway paths while staying inside the frozen current-mainline authority boundary.

#### Track 1. Integration productization for external users, operators, and OpenClaw Gateway paths

Track 1 focuses on turning the current partial slice into a clear, dependable integration product.

Primary outcomes:

- make the shipped local surfaces easier for external integrators and operators to understand, adopt, and verify
- keep the OpenClaw Gateway path visible as a local operator path, not as a hosted control-plane claim
- improve packaging, docs, bounded CLI/operator flows, and bounded scenario ergonomics around the surfaces that are already real
- widen coverage across bounded business-chain and review-safe operational slices only when those slices remain honest about current authority boundaries

Track 1 is complete when the repo presents a stable integration product around its shipped local surfaces, with clear operator guidance, bounded orchestration support, and no confusion between local tooling ergonomics and platform truth ownership.

### L2. Core truth consumption closure

L2 begins Track 2. The goal is to close the gap between local descriptive surfaces and frozen Core truth consumption, without shifting authority ownership away from Core.

#### Track 2. Core collaboration closure for capability truth, presence and notification semantics, and multi-agent coordination

Track 2 focuses on the seams that cannot become fully real until Bidvia Core exposes frozen truth.

Primary outcomes:

- consume frozen Core capability truth so local capability views no longer stop at descriptive local knowledge
- move capability refresh from an implemented but blocked seam toward a real Core-truth consumption path, while preserving fail-closed behavior until truth is available
- close remaining semantics around presence, notifications, task participation, and other coordination surfaces that require Core-owned truth to be trustworthy
- strengthen multi-agent coordination only where Core semantics are frozen and where the client still remains an integration product, not an authority owner

L2 is complete when the client can consume frozen Core truth for the collaboration semantics it already describes, especially capability truth and coordination semantics, without overstating client ownership.

### L3. Runtime, adapter, and multi-agent collaboration expansion

L3 is the final long-horizon level. It expands only after L1 productization and L2 Core-truth consumption closure are in place.

Primary outcomes:

- broaden runtime and adapter surfaces beyond the current bounded local adapter seam, only where the Core boundary is already stable
- extend multi-agent collaboration patterns beyond the current bounded orchestration slices, without turning the repo into an unfounded workflow-engine claim
- grow richer operator and integration surfaces across runtime-aware and collaboration-aware paths while keeping the release-language split explicit

L3 is where future runtime and adapter expansion can happen, but it must stay downstream of the earlier levels and must remain honest about what is local, what is dependency-gated, and what is still deferred.

## Strategic reading rule

Read this roadmap top-down:

1. current mainline, partial slice at the frozen Commercial Universe V1 / Core V12 handoff boundary
2. Track 1 first, productize the integration surface for external users, operators, and OpenClaw Gateway paths
3. Track 2 second, close Core collaboration seams once frozen truth exists
4. L3 only after L1 and L2, for broader runtime, adapter, and multi-agent expansion

That ordering keeps the roadmap honest. It protects the repo from claiming hosted runtime ownership, remote registry behavior, integrated Core truth, or client-owned authority before those boundaries are actually real.
