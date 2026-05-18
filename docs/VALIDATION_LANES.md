# Validation Lanes

This package supports multiple validation modes. Agents should choose the lane that matches the question they are trying to answer, instead of assuming one environment proves everything.

Use one surface taxonomy across these lanes: executable, review-safe, and compatibility-only.

## 1. Default local docker

Use the default local docker lane when you want to verify real surfaced runtime behavior against a running local Bidvia Core.

This lane is the primary path for:

- onboarding and session establishment
- provisional create -> query -> claim
- bounded membership lifecycle support
- bounded dispatch-authority read/request support
- account-scoped task and notification surfaces when the required subject state already exists
- self-generated business-universe closure, where the agent creates the needed runtime objects itself

This lane does **not** prove that every deterministic fixture or proof-lane object already exists.

For bounded local-first tooling on this lane, start with:

```bash
bidvia install-integrity
bidvia validation-smoke
bidvia diagnostic-bundle-export --output ./bidvia-diagnostic-bundle
bidvia public-runtime-interpretation-probe
```

Those commands stay fail-closed. `install-integrity` is the local install-path self-check, `validation-smoke` is the bounded external-user validation lane, `diagnostic-bundle-export` packages bounded smoke evidence into shareable artifacts, and `public-runtime-interpretation-probe` reads live `/healthz` and `/readyz` to produce bounded runtime-baseline interpretation evidence only. None of them turns this lane into a Core-owned certification flow. For role-stage regression checks, also run `npx tsx scripts/validate-agent-first-business-universe.ts`.

When you need a deeper local-docker artifact that exercises the checked-in live probes instead of only bounded smoke checks, run:

```bash
npx tsx scripts/verify-client-bounded-matrix.ts --base-url http://127.0.0.1:8787 --output ./bidvia-bounded-matrix.json
```

This bounded matrix is still review-safe rather than a hosted certification surface. It may return a mix of `pass`, `bounded-stop`, `contradiction`, and `blocked` scenario classes, because the honest output is to show which proven slices executed, which ones hit known bounded platform stops, which ones remain blocked, and which ones would indicate contradictory surfaced truth.

## 2. Proof-lane / admin-session validation

Use the proof-lane when the validation target is a deterministic walkthrough that depends on admin-session access or seeded proof data.

This lane is appropriate for:

- admin-session-only proof routes
- deterministic walkthroughs that are documented as proof-lanes
- seeded proof anchors that are not the default external-user path

Proof-lane validation is real platform behavior, but it is **not** the same thing as the default local docker business path for an ordinary external agent.

## 3. Seeded versus runtime-generated object validation

Prefer **runtime-generated objects** when you want to prove that surfaced business flows close under normal platform logic.

Examples:

- create supply + demand listings yourself
- activate them
- use the returned activation event id
- generate a real persisted match
- continue with the returned match / approval / opportunity ids downstream

Do **not** assume fixed proof ids are present in default local docker unless you are intentionally validating a seeded or proof-lane path.

## 4. Task-write-ready progression is its own surfaced path

Task-write-ready progression is a distinct surfaced path, not an implied side effect of claim.

It is bounded task closure, not full business closure.

A claimed external agent may still be blocked by readiness or authority gates even when routes exist. When this happens, the client should surface the gate honestly and explain whether the next step belongs to:

- the current agent
- an operator/admin actor
- a proof-lane/admin-session validation lane
- or an unresolved Core-owned progression gap

Keep the concrete progression explicit on the ordinary surfaced lane: self-service patch -> dispatch-authority request -> operator/admin review closure -> external binding check -> post-step verification of task-write-ready and dispatch-eligibility truth. The external claimed agent owns the self-service patch and bounded dispatch-authority request, operator/admin owns review closure, and the latest surfaced runtime now proves that claimant/account-scoped and operator/admin binding writes use different body contracts. The current repo now ships a first-class account-plane external binding write helper together with the account-agent binding read surface for visibility, but that external binding step remains fail-closed whenever the current lane does not already have an explicit Core-owned route/body contract. If the verification reads still do not confirm runnable truth, remain fail-closed.

If account-plane continuation is already succeeding but governed reads still return `active_role_binding_required`, keep that gate separate from dispatch-authority review. The safe downstream interpretation is authorization projection / account-session-org repair on the same account-owned plane; if the gate still remains after those repairs, treat it as an unresolved Core-owned projection issue.

## 5. How to choose a lane

- Use **default local docker** to answer: “Does the real surfaced runtime behavior work with normal user-facing flows?”
- Use **proof-lane / admin-session** to answer: “Does a deterministic admin-scoped walkthrough still work?”
- Use **runtime-generated objects** to answer: “Can I close the business-universe chain without relying on fixed fixtures?”

For claimant/account-plane continuation checks in any lane, prefer `agentId` as the canonical account-plane identifier. Treat `registrationId` on that plane as compatibility only.

If a flow needs admin/operator context, say so explicitly. If a flow needs self-generated runtime data instead of fixed ids, say so explicitly. If a flow remains blocked by a Core-owned progression gap, keep that gap visible rather than faking success.

## 6. Role-stage evidence output

The agent-first role-stage surface may emit **evidence output** when you need machine-consumable diagnostics instead of the default business result. Use that mode when you need a frozen evidence packet plus stable result taxonomy for claimant, operator, platform-managed, or universe outputs without rewriting the result by hand.

This lane stays bounded and local-first: evidence output does not turn the client into a hosted certification service, and it does not override the normal role-stage result. It simply packages the same role-stage truth into a machine-readable evidence shape.
