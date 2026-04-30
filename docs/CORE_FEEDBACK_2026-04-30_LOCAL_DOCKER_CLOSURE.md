# Core Feedback — 2026-04-30 Local-Docker Closure Certification

## Purpose

This document is the Core-facing evidence packet for the latest fresh local-docker multi-actor certification run against `bidvia-agent-client` main plus the latest local Core.

It is intentionally route-level and lane-specific. It does not redefine the client roadmap, and it does not convert partial route success into broader closure claims.

Read this together with:

- `docs/VALIDATION_LANES.md`
- `docs/ROADMAP.md`
- `docs/CORE_AGENT_CLIENT_PLANE_CONTRACT_GAPS.md`
- `docs/superpowers/specs/2026-04-30-client-truth-alignment-v3-design.md`
- `docs/superpowers/plans/2026-04-30-client-truth-alignment-v3-implementation.md`

## Validation lane and method

The certification run used the following posture:

- **primary lane:** default local docker
- **actors:** admin, operator, claimant/external-user agent
- **object strategy:** fresh runtime-generated objects wherever possible
- **goal:** determine whether the current surfaced runtime proves bounded claimant progression only, or the deeper commercial-universe continuation and closure path required for scale-growth claims

## What is now proven on the ordinary surfaced lane

The following route families are now fresh-proven on the default local-docker lane.

### 1. Runtime baseline and onboarding chain are real

- `GET /healthz` -> `200`
- `GET /readyz` -> `200`
- admin sign-in succeeded
- invitation issue succeeded
- enterprise sign-up / sign-in / account-me succeeded
- provisional create -> query -> claim succeeded

This means the ordinary surfaced onboarding path is no longer the primary blocker for client truth.

### 2. Claimant account-plane continuation is real

The following claimant/account-plane chain is proven:

- self-service agent update
- dispatch-authority request
- external-account-binding visibility
- capability profile self-service visibility
- participation state reaching `commercial-authority-bound`
- authorization refresh succeeding on the account-owned plane

This proves that claimant continuation is not limited to public claim alone. The account-owned continuation family is real and should remain the canonical claimant progression surface in the client.

### 3. Claimant operational package is real on account-owned `execution/*`

The following account-owned operational route family is now fresh-proven:

- execution status
- presence
- sync download
- sync upload
- evidence submissions
- proposals

This is important because it narrows the remaining gap. The unresolved problem is no longer “claimant cannot execute at all.”

### 4. Business-entry and minimal dispatch lifecycle are real

The following surfaced business-entry chain is proven:

- listing create
- listing activate
- materialization-status readback

The following minimal task/dispatch lifecycle is also proven on fresh objects:

- claim create
- claim accept
- lease create
- task-dispatch complete
- invalid post-complete fail returns the expected `409 invalid_task_dispatch_transition`

This proves bounded task closure and bounded object lifecycle truth.

### 5. Public growth readbacks are real but limited in what they prove

The following public readbacks succeeded:

- public market
- public universe
- universe search
- universe network summary

Repeated claimant writes also changed public-market counts.

This proves that surfaced writes can influence surfaced public readbacks. It does **not** by itself prove a self-sustaining opportunity, proof, or reconciliation closure loop.

## What is still not proven

The remaining blockers are not “we did not try enough.” They are the current points where fresh route-level evidence stops proving deeper closure.

### 1. Approval-to-opportunity continuation is still not self-proving on the surfaced lane

Fresh runs reached business-entry materialization feedback with:

- `recommended_next_step = handoff_to_operator_for_matching`

That is a real surfaced result, but it is also the current stop line.

The ordinary claimant lane still does not prove that approval/matching/opportunity emergence continues inside the platform without explicit external handoff or caller-known identifiers.

### 2. Opportunity emergence/readback is not yet proven as a canonical surfaced continuation

After the above handoff point, claimant/account-plane readbacks for deeper opportunity state did not close:

- `GET /runtime/account/agents/:agentId/execution/opportunities/:opportunityId/status`
  returned `opportunity_not_found`
- `GET /runtime/account/agents/:agentId/execution/opportunities/:opportunityId/end-state`
  returned `business_universe_end_state_not_found`

This leaves a real certification gap:

- either surfaced opportunity emergence is not yet happening on the ordinary lane,
- or the surfaced continuation contract still depends on external/operator-known ids that the client cannot honestly infer.

Either way, the client must stay fail-closed here.

### 3. End-state / proof closure is not yet route-level proven

The current local-docker evidence does not prove a full surfaced chain for:

- opportunity closure
- provider-proof-closed progression
- reconciliation-required progression
- stable end-state visibility after deeper commercial continuation

Because these steps are not fresh-proven on the ordinary lane, the client should not imply that bounded task closure equals commercial-universe closure.

### 4. Authorization projection still has a distinct unresolved seam

Even when account-plane continuation succeeds, governed reads may still remain blocked by `active_role_binding_required`.

The current safe interpretation remains:

- keep dispatch-authority review closure separate from
- authorization projection / account-session-org repair / role-binding realization

If this gate remains after the account-plane continuation and operator review steps already succeeded, the unresolved seam appears Core-owned rather than claimant-owned.

### 5. Runtime identity evidence is incomplete at `/healthz`

`/healthz.version_markers.*` remains empty.

That means the runtime currently cannot self-identify the exact deployed commit/build markers during local certification. This is not a claimant-lifecycle blocker, but it weakens operational confidence and traceability for regression packets.

## Core-facing conclusions

### What should no longer be treated as open blockers

The latest fresh evidence overturns older concerns that implied the claimant surface was broadly non-functional.

The following should no longer be reported as current blockers:

- claimant operational package unavailable
- claimant business-entry unavailable
- operator intervention readback unstable

### What remains the real Core-side gap

The remaining gap is more specific:

1. the ordinary surfaced lane proves bounded onboarding, continuation, operational execution, business entry, and minimal task closure;
2. it does **not** yet prove deeper operator-matching to opportunity emergence to end-state/proof closure on the same honest surfaced path;
3. some of that continuation still appears to rely on explicit handoff or caller-known identifiers rather than a fully surfaced discovery/readback chain.

## Client impact rule

Until the above gaps are resolved upstream, the client should continue to do all of the following:

- center claimant truth on the account-owned continuation and `execution/*` surfaces that are now proven
- keep opportunity/end-state/proof packaging explicitly bounded and fail-closed
- keep lane selection explicit: ordinary surfaced lane versus proof-lane/admin-session
- avoid turning route existence into product closure claims

## Requested upstream follow-up

The most valuable Core-side clarifications or fixes would be:

1. make the approval/matching -> opportunity emergence chain discoverable on an honest surfaced lane, without requiring client-side inference;
2. expose stable surfaced readback for opportunity status and end-state closure once the platform has progressed those objects;
3. clarify whether authorization projection after successful continuation is expected to be synchronous, delayed, or repaired through a separate surfaced mechanism;
4. populate `/healthz.version_markers.*` so certification packets can bind observations to a concrete runtime identity.

## Current certification result

The current platform state supports **bounded task closure and bounded commercial entry** on the ordinary surfaced lane.

It does **not yet provide enough fresh route-level evidence to certify** that large-scale agent and external-user onboarding can already expand the commercial universe through a fully surfaced, self-proving task/dispatch/opportunity/proof closure loop.
