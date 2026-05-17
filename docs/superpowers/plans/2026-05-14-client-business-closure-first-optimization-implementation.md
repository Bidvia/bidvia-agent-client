# Client Business-Closure-First Optimization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the client’s real business-closure coverage by fixing blocker-grade defects in already-proven claimant flows, productizing the missing bounded task progression package, and then widening the product surface around proven operator/deeper readback and integration lifecycle slices.

**Architecture:** Execute in three waves. P0 is strictly blocker-removal for already-proven closure slices. P1 productizes proven closure capability into stable SDK/CLI/MCP/evidence surfaces. P2 consolidates surface governance and truth expression so the widened closure surface does not fragment again. Every phase must map to rerunnable local-docker evidence and must preserve bounded/later-wave honesty.

**Tech Stack:** TypeScript, node:test, existing `BidviaClient` transport layer, CLI/MCP dispatch surfaces, discovery catalog, local-docker validation against current Core truth, npm verification commands.

---

## Global execution rules

### Evidence-first rule
- Every task must name the exact live or bounded-readback slice it extends.
- No task is complete until it has a rerunnable verification path.
- Preserve explicit bounded-stop semantics; do not soften later-wave or read-only boundaries into success wording.

### Planning rule
- P0 contains blocker-only work.
- P1 contains closure-expansion work already proven enough to consume.
- P2 contains governance/cleanup that supports P0/P1 but is not required to unlock them.

### Required verification baseline after each chunk
- targeted tests for the chunk
- `npm test`
- `npm run typecheck`
- `npm run build`
- if the chunk touches claimant/operator closure behavior: rerun the relevant local-docker probe(s)

### Evidence artifacts to reuse
- `docs/CORE_FEEDBACK_2026-05-06_LOCAL_DOCKER_DEEP_INTEGRATION_REPORT.md`
- local bounded matrix and diagnostic bundle artifacts under `/var/folders/.../opencode/` during implementation sessions as needed

### Reproducible local-docker bootstrap recipe
When a step below says “rerun the live probe,” do not rely on prior session memory or temp files. Recreate a fresh claimant/admin baseline using these exact steps or an equivalent checked-in script created during implementation:

1. Sign in as seeded admin on local docker:
   - `POST /runtime/admin/sessions/sign-in`
   - email: `ops-admin@example.com`
   - password: `pw-admin-ops`
2. Issue a fresh enterprise invitation via `POST /runtime/admin/invitations/issue` with:
   - `invitation_type: ENTERPRISE_ACCOUNT`
   - `target_tenant_id: tenant-a`
   - `target_org_id: null`
   - `target_role: null`
   - `expires_at`
   - `now`
3. Use an isolated state file, for example:
   - `BIDVIA_STATE_PATH=/var/folders/.../opencode/<plan-run>-state.json`
4. Run claimant bootstrap through the CLI:
   - `sign-up-enterprise`
   - `sign-in`
   - `account-me`
5. Create and claim a provisional agent through the CLI:
   - `create-provisional-agent`
   - `query-provisional-agent`
   - `claim-provisional-agent`
6. Request dispatch authority, approve it through operator/admin, then complete claimant self-repair and external binding as already documented in `docs/CORE_FEEDBACK_2026-05-06_LOCAL_DOCKER_DEEP_INTEGRATION_REPORT.md`.

Expected bootstrap outcome:
- real `sessionId`
- real `agentId`
- real `principalId`
- real `registrationId`
- real approved dispatch-authority state
- real external binding

Any live verification step in this plan must either:
- use that reproducible bootstrap recipe directly, or
- replace it with a checked-in helper script that performs the same sequence from scratch.

---

## Files to modify across the plan

### P0 files
- Modify: `src/client.ts`
- Modify: `src/cli.ts`
- Modify: `src/mcp.ts`
- Modify: `src/discovery-catalog.ts`
- Modify: `src/capabilities.ts`
- Modify: `src/core-payload-contract-matrix.ts` (only if route/state metadata is now stale relative to shipped support)
- Modify: `src/enterprise-integration-plane.ts`
- Modify: `src/contracts.ts`
- Test: `test/client-account-plane-continuation.test.ts`
- Test: `test/cli-task-plane-execution.test.ts`
- Test: `test/cli-account-plane-continuation.test.ts`
- Test: `test/discovery-catalog.test.ts`
- Test: `test/mcp.test.ts`
- Test: `test/client-contract.test.ts`

### P1 files
- Modify: `src/client.ts`
- Modify: `src/cli.ts`
- Modify: `src/mcp.ts`
- Modify: `src/discovery-catalog.ts`
- Modify: `src/enterprise-integration-plane.ts`
- Modify: `src/business-universe/claimant.ts`
- Modify: `src/business-universe/operator.ts`
- Create: `scripts/live-probes/bootstrap-claimant-local-docker.ts`
- Create: `scripts/live-probes/run-p1-integration-lifecycle.ts`
- Create: `scripts/live-probes/run-p1-operator-deeper-chain.ts`
- Test: `test/client-account-owned-execution.test.ts`
- Test: `test/cli-claimant-product-entry.test.ts`
- Test: `test/operator-product-entry.test.ts`
- Test: `test/client-operator-workspace-contract.test.ts`
- Test: `test/enterprise-integration-plane.test.ts`
- Test: `test/client-contract.test.ts`

### P2 files
- Modify: `src/discovery-catalog.ts`
- Modify: `src/capabilities.ts`
- Modify: `src/mcp.ts`
- Modify: `src/cli.ts`
- Modify: `src/route-context-matrix.ts`
- Modify: `README.md`
- Modify: `docs/VALIDATION_LANES.md`
- Modify: `docs/CONTRACT_BOUNDARY.md`
- Test: `test/discovery-catalog.test.ts`
- Test: `test/runtime-capabilities.test.ts`
- Test: `test/public-release-shape.test.ts`

---

## Chunk 1: P0 — Fix account-plane task read correctness

**Why first:** This is the clearest client-owned defect blocking an already-proven claimant closure slice. The same live claimant thread can create dispatches but `task-dispatches` / `task-dispatch` fail with `session_context_missing`, strongly indicating wrong auth/header routing in the client.

**Files:**
- Modify: `src/client.ts`
- Test: `test/client-account-plane-continuation.test.ts`
- Test: `test/cli-account-plane-continuation.test.ts`
- Test: `test/mcp.test.ts`

- [ ] **Step 1: Write/extend failing SDK tests for account-plane task reads**

Add focused assertions proving `listTaskDispatches` and `getTaskDispatch` should behave like other session-bound account-plane reads.

Include exact expected paths and headers.

Run:
```bash
npx tsx --test test/client-account-plane-continuation.test.ts
```
Expected: FAIL on current header-family expectations or missing tests.

- [ ] **Step 2: Write/extend failing CLI/MCP routing tests**

Ensure CLI and MCP task reads route through the corrected session/account-plane semantics.

Run:
```bash
npx tsx --test test/cli-account-plane-continuation.test.ts
npx tsx --test test/mcp.test.ts
```
Expected: FAIL until the transport path is corrected.

- [ ] **Step 3: Implement the minimal transport fix in `src/client.ts`**

Update `listTaskDispatches` and `getTaskDispatch` to use the correct account-plane read posture for the route family.

Keep the change surgical:
- do not refactor unrelated task-plane methods
- do not change governed-read methods outside these routes unless tests prove the same defect exists there

- [ ] **Step 4: Re-run targeted tests**

Run:
```bash
npx tsx --test test/client-account-plane-continuation.test.ts
npx tsx --test test/cli-account-plane-continuation.test.ts
npx tsx --test test/mcp.test.ts
```
Expected: PASS


- [ ] **Step 5: Rerun the claimant local-docker task read probe from a fresh bootstrap**

Using the reproducible bootstrap recipe above, create a fresh claimant-owned dispatch thread and then rerun:
- `task-dispatches --agent-id <fresh-agent-id>`
- `task-dispatch --agent-id <fresh-agent-id> --task-dispatch-id <fresh-dispatch-id>`

Expected:
- no `session_context_missing`
- real task-plane read payloads return for the same freshly created dispatch thread

- [ ] **Step 6: Run full verification gate**

Run:
```bash
npm test && npm run typecheck && npm run build
```
Expected: PASS

---

## Chunk 2: P0 — Productize bounded claimant task progression writes

**Why now:** Current Core truth and the spec both treat these as part of the bounded claimant progression package, but the client still lacks surfaced support.

**Files:**
- Modify: `src/contracts.ts`
- Modify: `src/client.ts`
- Modify: `src/cli.ts`
- Modify: `src/mcp.ts`
- Modify: `src/discovery-catalog.ts`
- Modify: `src/capabilities.ts`
- Modify: `src/core-payload-contract-matrix.ts` (if metadata must be extended to match shipped surfaces)
- Test: `test/client-contract.test.ts`
- Test: `test/cli-task-plane-execution.test.ts`
- Test: `test/discovery-catalog.test.ts`
- Test: `test/mcp.test.ts`

- [ ] **Step 1: Add failing contract tests for the three missing writes**

Cover exact method shapes and route templates for:
- `outcomes`
- `evidence-bundles`
- `confirmation-cycles`

Run:
```bash
npx tsx --test test/client-contract.test.ts
```
Expected: FAIL because these helpers do not yet exist.

- [ ] **Step 2: Add failing CLI and MCP surface tests**

Add tests for:
- new CLI commands
- new MCP tool descriptors/dispatch paths
- discovery catalog entries

Run:
```bash
npx tsx --test test/cli-task-plane-execution.test.ts
npx tsx --test test/discovery-catalog.test.ts
npx tsx --test test/mcp.test.ts
```
Expected: FAIL until the surfaces are added.

- [ ] **Step 3: Add the shared contract types**

Define minimal request input types in `src/contracts.ts` using the current downstream contract wording:
- outcome write input
- evidence-bundle write input
- confirmation-cycle write input

Use only fields already described by current Core truth.

- [ ] **Step 4: Implement the SDK helpers in `src/client.ts`**

Add thin wrappers for the three routes with correct account-plane route construction and header families.

- [ ] **Step 5: Expose the surfaces through CLI, MCP, discovery, and capability metadata**

Update only the relevant sections:
- command parsing and required flags
- tool descriptor wiring
- capability/discovery metadata

- [ ] **Step 6: Re-run targeted tests**

Run:
```bash
npx tsx --test test/client-contract.test.ts
npx tsx --test test/cli-task-plane-execution.test.ts
npx tsx --test test/discovery-catalog.test.ts
npx tsx --test test/mcp.test.ts
```
Expected: PASS


- [ ] **Step 7: Run a live bounded progression probe from a fresh bootstrap**

Using a fresh claimant thread created from the reproducible bootstrap recipe, run:
1. create-task-dispatch
2. outcome write
3. evidence-bundle write
4. confirmation-cycle write
5. governed-work-closure readback

Expected:
- writes succeed or fail-close with stable bounded semantics
- governed-work-closure reflects the new canonical refs when those writes succeed

- [ ] **Step 8: Run full verification gate**

Run:
```bash
npm test && npm run typecheck && npm run build
```
Expected: PASS

---

## Chunk 3: P1 — Productize the integration-app lifecycle subset already proven enough to consume

**Why P1, not P0:** The integration ownership read slice is proven, but the broader lifecycle is not a direct blocker to already-proven claimant/operator closure. It is the highest-value expansion work after the blocker-grade task issues.

**Selected lifecycle subset for this chunk:**

This chunk targets the exact canonical lifecycle subset named by the current planning spec and current Core integration guidance:

1. `GET /runtime/public/integration-apps`
2. `POST /runtime/account/integration-apps`
3. `GET /runtime/account/integration-apps`
4. `POST /runtime/account/integration-installations`
5. `GET /runtime/account/integration-installations`
6. `POST /runtime/account/integration-installations/:integrationInstallationId/connection`
7. keep existing canonical reads in scope as the readback companions:
   - `GET /runtime/account/integration-capabilities`
   - `GET /runtime/account/agents/:agentId/integrations/:integrationCode/eligibility`

This chunk must keep the following explicitly out of the canonical subset:

- `POST /runtime/integrations/:integrationCode/onboarding-contract`
- `POST /runtime/integrations/haisi-wms/login`
- `GET /runtime/integrations/haisi-wms/warehouses`
- `POST /runtime/integrations/haisi-wms/inbound`

Those remain compatibility-only/provider seams unless current Core truth is updated in the same wave.

**Route-contract source requirement:**

Before adding SDK/CLI/MCP support for these routes, implementation must read the current Core route truth from the local main Core repo at `/Users/liujiao/develop/Bidvia/docs/downstream-contract-center/**` and capture the exact request/response fields needed for this subset.

If the current Core docs still do not expose exact request/response truth for one or more of these routes, do **not** guess. In that case, implementation must:

1. stop widening that specific route,
2. add or update a checked-in contract-gap note under `docs/` or an existing feedback artifact,
3. keep the route out of SDK/CLI/MCP product surfaces for this wave.

**Files:**
- Modify: `src/contracts.ts`
- Modify: `src/client.ts`
- Modify: `src/cli.ts`
- Modify: `src/mcp.ts`
- Modify: `src/discovery-catalog.ts`
- Modify: `src/enterprise-integration-plane.ts`
- Test: `test/enterprise-integration-plane.test.ts`
- Test: `test/client-contract.test.ts`
- Test: `test/discovery-catalog.test.ts`
- Test: `test/mcp.test.ts`

- [ ] **Step 1: Write a route/support matrix in tests first**

Add failing tests that name the selected lifecycle subset we are productizing, separating:
- canonical integration lifecycle surfaces listed above
- compatibility-only Haisi/provider seams

Also add a small checked-in matrix comment or fixture in the test describing the exact route list above so later steps do not have to infer the target subset.

Run:
```bash
npx tsx --test test/enterprise-integration-plane.test.ts
npx tsx --test test/client-contract.test.ts
```
Expected: FAIL until the surface matrix is updated.


- [ ] **Step 2: Add only the lifecycle subset justified by current evidence**

Implement SDK helpers only for the exact lifecycle subset listed above.

Do not widen compatibility-only Haisi seams into canonical lifecycle helpers.

If one or more routes lack exact Core request/response truth in the checked local downstream docs, convert those routes into explicit out-of-scope gaps for this wave and continue only with the routes that are contract-complete.

- [ ] **Step 3: Expose the selected lifecycle subset via CLI/MCP/discovery**

Add only the commands/tools justified by the selected lifecycle subset.

- [ ] **Step 4: Re-run targeted tests**

Run:
```bash
npx tsx --test test/enterprise-integration-plane.test.ts
npx tsx --test test/client-contract.test.ts
npx tsx --test test/discovery-catalog.test.ts
npx tsx --test test/mcp.test.ts
```
Expected: PASS


- [ ] **Step 5: Run local-docker integration lifecycle probes from a fresh bootstrap**

Using the reproducible bootstrap recipe above, rerun:
- existing ownership/capability reads
- the new integration-app catalog/install/connection lifecycle steps in the selected subset

Implement and use a checked-in helper script:
- `scripts/live-probes/run-p1-integration-lifecycle.ts`

That script must:
1. create or reuse a fresh claimant bootstrap through the reproducible bootstrap recipe,
2. call each in-scope lifecycle route in order,
3. print machine-readable JSON for every step,
4. mark any route withheld for contract-gap reasons explicitly as `not-implemented-for-contract-gap`.

Expected:
- newly added lifecycle surfaces either succeed or fail-close with explicit bounded-stop semantics
- no new surface quietly falls back to stale compatibility behavior

- [ ] **Step 6: Run full verification gate**

Run:
```bash
npm test && npm run typecheck && npm run build
```
Expected: PASS

---

## Chunk 4: P1 — Stabilize claimant deeper readback and operator deeper chain productization

**Why this chunk matters:** The live evidence already proves the deeper operator-owned chain and the claimant deeper readbacks. This chunk turns those into stable product surfaces rather than ad hoc direct SDK/script usage.

**Files:**
- Modify: `src/client.ts`
- Modify: `src/cli.ts`
- Modify: `src/mcp.ts`
- Modify: `src/discovery-catalog.ts`
- Modify: `src/business-universe/claimant.ts`
- Modify: `src/business-universe/operator.ts`
- Create: `scripts/live-probes/run-p1-operator-deeper-chain.ts`
- Test: `test/client-account-owned-execution.test.ts`
- Test: `test/cli-claimant-product-entry.test.ts`
- Test: `test/operator-product-entry.test.ts`
- Test: `test/client-operator-workspace-contract.test.ts`

- [ ] **Step 1: Write or extend failing tests for claimant deeper readback surfaces**

Cover:
- opportunity status readback
- end-state readback
- materialization readback semantics

Run:
```bash
npx tsx --test test/cli-claimant-product-entry.test.ts
npx tsx --test test/client-account-owned-execution.test.ts
```
Expected: FAIL where surface consistency is missing.

- [ ] **Step 2: Write or extend failing tests for the operator deeper chain surfaces**

Cover:
- match
- connection
- approval
- package export
- commercial-action run/inspect

Run:
```bash
npx tsx --test test/operator-product-entry.test.ts
npx tsx --test test/client-operator-workspace-contract.test.ts
```
Expected: FAIL if product surfaces are incomplete or inconsistent.

- [ ] **Step 3: Implement the minimum CLI/MCP/discovery exposure needed to make the proven chain reusable**

Use the already-proven SDK routes as the base; do not invent new route semantics.

- [ ] **Step 4: Re-run targeted tests**

Run:
```bash
npx tsx --test test/cli-claimant-product-entry.test.ts
npx tsx --test test/client-account-owned-execution.test.ts
npx tsx --test test/operator-product-entry.test.ts
npx tsx --test test/client-operator-workspace-contract.test.ts
```
Expected: PASS


- [ ] **Step 5: Re-run the canonical deeper live chain from scratch**

Starting from a fresh operator/admin bootstrap plus fresh operator-owned source/candidate listings, the live probe should produce:
- operator listing -> match -> connection -> approval -> opportunity -> package -> commercial action
- claimant readback of the returned `opportunityId`

Implement and use a checked-in helper script:
- `scripts/live-probes/run-p1-operator-deeper-chain.ts`

That script must execute, in order:
1. admin sign-in
2. operator source listing create/activate in canonical `tenant-public/company-public` scope
3. operator candidate listing create/activate in canonical `tenant-public/company-public` scope
4. operator `match-candidates`
5. operator `listOperatorMatches`
6. operator connection create
7. operator approval decision
8. operator opportunity package export
9. operator commercial-action create/policy-check/request-approval/execute/status/receipt/audit
10. claimant opportunity status readback
11. claimant opportunity end-state readback

The script must print one machine-readable JSON object containing all returned ids and all key claimant/operator readbacks.

Expected:
- same-object traceability across claimant and operator outputs
- claimant surfaces still show bounded handoff semantics, not overclaimed ownership

- [ ] **Step 6: Run full verification gate**

Run:
```bash
npm test && npm run typecheck && npm run build
```
Expected: PASS

---

## Chunk 5: P2 — Surface governance and truth-expression consolidation

**Why last:** This is important, but it should happen after the real closure-expansion work is landed and validated.

**Files:**
- Modify: `src/discovery-catalog.ts`
- Modify: `src/capabilities.ts`
- Modify: `src/mcp.ts`
- Modify: `src/cli.ts`
- Modify: `src/route-context-matrix.ts`
- Modify: `README.md`
- Modify: `docs/VALIDATION_LANES.md`
- Modify: `docs/CONTRACT_BOUNDARY.md`
- Test: `test/discovery-catalog.test.ts`
- Test: `test/runtime-capabilities.test.ts`
- Test: `test/public-release-shape.test.ts`

- [ ] **Step 1: Write failing metadata/wording tests first**

Target the current drift explicitly:
- executable vs review-safe vs compatibility-only vs later-wave-stop labeling
- discovery/capability duplication for the newly added surfaces

Run:
```bash
npx tsx --test test/discovery-catalog.test.ts
npx tsx --test test/runtime-capabilities.test.ts
npx tsx --test test/public-release-shape.test.ts
```
Expected: FAIL until metadata and wording are aligned.

- [ ] **Step 2: Consolidate critical surface metadata**

Reduce duplication only where it now harms the closure families touched in P0/P1.

- [ ] **Step 3: Update product-facing boundary docs**

Align:
- README
- validation lanes
- contract boundary wording

with the actual closure scopes proven and productized by the implementation.

- [ ] **Step 4: Re-run targeted tests**

Run:
```bash
npx tsx --test test/discovery-catalog.test.ts
npx tsx --test test/runtime-capabilities.test.ts
npx tsx --test test/public-release-shape.test.ts
```
Expected: PASS

- [ ] **Step 5: Run full verification gate**

Run:
```bash
npm test && npm run typecheck && npm run build
```
Expected: PASS

---

## Final implementation handoff checks

- [ ] Confirm each completed chunk has:
  - passing targeted tests
  - passing repo-wide verification
  - rerunnable evidence where required
- [ ] Confirm no chunk widened a later-wave or compatibility-only family beyond current Core truth
- [ ] Confirm the final product surface still distinguishes:
  - proven closure slice
  - bounded stop
  - later-wave stop
  - compatibility-only seam

---

## Plan completion

Plan complete and saved to `docs/superpowers/plans/2026-05-14-client-business-closure-first-optimization-implementation.md`. Ready to execute?
