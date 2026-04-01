# OpenClaw Next-Version Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Productize the next `@bidvia/client` release as the official OpenClaw-compatible Bidvia path by keeping stdio MCP as the primary runtime, adding an OpenClaw bundle/bootstrap export, and exposing the already-shipped Bidvia capability families through a safer, more complete MCP surface.

**Architecture:** Keep Bidvia execution logic in the existing SDK/CLI + local stdio MCP runtime. Expand the MCP/discovery catalog to cover the already-shipped frozen capability families, then add an OpenClaw companion bundle export that points back to `bidvia mcp-server` and injects agent-facing guidance, context remediation, and honest local-only boundaries. Do not pivot to HTTP MCP or a native OpenClaw plugin runtime in this version.

**Tech Stack:** TypeScript, `node:test`, `tsx`, current `src/client.ts` wrappers, discovery catalog + MCP server, CLI exports, repo-local docs.

---

## Chunk 1: MCP surface parity and risk-tiered OpenClaw tooling

### Task 1: Expand discovery metadata for the already-shipped Bidvia route families

**Files:**
- Modify: `src/capabilities.ts`
- Modify: `src/discovery-catalog.ts`
- Modify: `src/contracts.ts`
- Test: `test/discovery-catalog.test.ts`
- Test: `test/route-capabilities.test.ts`
- Optional create: `test/openclaw-mcp-parity.test.ts`

- [ ] **Step 1: Write failing discovery tests for the missing OpenClaw-facing families**

Add or update tests that prove the local discovery catalog now includes MCP-facing metadata for these already-shipped helpers and route families:

- onboarding: `createProvisionalAgent`, `queryProvisionalAgent`, `claimProvisionalAgent`
- governed reads already in SDK/CLI: registration detail/readiness/summary, agent-capability-profile, participation-state list/detail, task-dispatch list/detail
- runtime writes already in SDK/CLI: `downloadSync`, `createParticipationState`, `createLease`, `createTaskDispatch`, `assignTaskDispatch`, `suspendTaskDispatch`, `resumeTaskDispatch`, `completeTaskDispatch`, `failTaskDispatch`, `createClaim`, `acceptClaim`, `rejectClaim`
- governed writes already in SDK/CLI: `postAgentAuthorityProfile`, `postAgentAuthorityLadder`, `postAgentCapabilityProfile`
- commercial helpers already shipped in the client: `createCommercialAction`, `requestCommercialActionApproval`, `executeCommercialAction`

- [ ] **Step 2: Run the targeted discovery tests to verify current gaps**

Run:
```bash
npx tsx --test test/discovery-catalog.test.ts
npx tsx --test test/route-capabilities.test.ts
```

Expected before implementation:
- failures showing empty or missing `mcpTools` entries for the widened families
- failures showing missing or outdated route-capability metadata for helpers that SDK/CLI already expose

- [ ] **Step 3: Implement the minimal discovery/capability metadata changes**

Update `src/capabilities.ts`, `src/discovery-catalog.ts`, and any shared contract types in `src/contracts.ts` so every newly promoted family has:

- exact helper-to-route mapping
- correct access context family
- honest required context keys
- correct local capability tier and risk tier
- consistent MCP tool naming and output mode

Rules:
- only expose families already implemented in the repo
- do not invent hosted or remote-discovery language
- keep naming aligned to current helper and CLI vocabulary

- [ ] **Step 4: Re-run the targeted discovery tests**

Run the same commands from Step 2.

Expected after implementation:
- discovery and route-capability tests pass with the widened parity metadata

- [ ] **Step 5: Commit**

```bash
git add src/capabilities.ts src/discovery-catalog.ts src/contracts.ts test/discovery-catalog.test.ts test/route-capabilities.test.ts test/openclaw-mcp-parity.test.ts
git commit -m "feat(openclaw): expand bidvia mcp discovery parity"
```

### Task 2: Expose the widened Bidvia families through the local stdio MCP dispatcher

**Files:**
- Modify: `src/mcp.ts`
- Modify: `src/mcp-server.ts`
- Modify: `src/operator-ergonomics.ts`
- Modify: `src/route-context-matrix.ts`
- Test: `test/mcp.test.ts`
- Test: `test/mcp-server.test.ts`
- Test: `test/operator-ergonomics.test.ts`
- Test: `test/route-context-matrix.test.ts`

- [ ] **Step 1: Write failing MCP tests for the widened tool catalog and dispatch behavior**

Add tests that prove:

- the MCP catalog now includes the widened onboarding / governance / runtime / participation / commercial families
- write-capable tools preserve honest risk tiers (`review-safe`, `runtime-execution`, or stricter if needed)
- missing Bidvia context returns tool-facing remediation that points to the next required context family or next CLI step
- no MCP descriptor claims hosted runtime or HTTP transport support

- [ ] **Step 2: Run the targeted MCP and ergonomics tests to confirm current failures**

Run:
```bash
npx tsx --test test/mcp.test.ts
npx tsx --test test/mcp-server.test.ts
npx tsx --test test/operator-ergonomics.test.ts
npx tsx --test test/route-context-matrix.test.ts
```

Expected before implementation:
- failures for missing tool descriptors, unsupported helper dispatch, or incomplete remediation language

- [ ] **Step 3: Implement the minimal MCP dispatch and remediation changes**

Update `src/mcp.ts`, `src/mcp-server.ts`, `src/operator-ergonomics.ts`, and `src/route-context-matrix.ts` so the widened tool surface can be exported and executed safely.

Implementation rules:
- keep stdio MCP as the only declared runtime transport
- preserve fail-closed behavior when context is missing
- ensure tool descriptions remain explicit about local-only and Core-owned truth boundaries
- do not flatten all tools into one undifferentiated execution class; preserve context family and risk-tier distinctions

- [ ] **Step 4: Re-run the targeted MCP tests**

Run the same commands from Step 2.

Expected after implementation:
- widened MCP tool catalog and dispatch tests pass

- [ ] **Step 5: Commit**

```bash
git add src/mcp.ts src/mcp-server.ts src/operator-ergonomics.ts src/route-context-matrix.ts test/mcp.test.ts test/mcp-server.test.ts test/operator-ergonomics.test.ts test/route-context-matrix.test.ts
git commit -m "feat(openclaw): widen stdio mcp execution surface"
```

## Chunk 2: OpenClaw bundle/bootstrap productization

### Task 3: Add an OpenClaw companion bundle export that wraps the existing stdio MCP server

**Files:**
- Create: `src/openclaw-bundle-export.ts`
- Modify: `src/openclaw-config-export.ts`
- Modify: `src/cli.ts`
- Modify: `src/index.ts`
- Test: `test/openclaw-config-export.test.ts`
- Create: `test/openclaw-bundle-export.test.ts`
- Test: `test/package-distribution.test.ts`
- Test: `test/public-release-shape.test.ts`

- [ ] **Step 1: Write failing tests for the companion bundle export shape**

Cover an export that writes a local OpenClaw-compatible bundle directory containing at least:

- a supported bundle marker/manifest
- `.mcp.json` that points to `bidvia mcp-server`
- skill/bootstrap content that explains Bidvia tool tiers, local-only boundaries, and missing-context recovery
- no hosted or HTTP MCP assumptions

Also prove the existing `openclaw-mcp-config` export stays valid and aligned with the bundle export.

- [ ] **Step 2: Run the targeted export and package-shape tests to verify they fail**

Run:
```bash
npx tsx --test test/openclaw-config-export.test.ts
npx tsx --test test/openclaw-bundle-export.test.ts
npx tsx --test test/package-distribution.test.ts
npx tsx --test test/public-release-shape.test.ts
```

Expected before implementation:
- failures for missing bundle export helpers, missing CLI command, or missing packaged assets

- [ ] **Step 3: Implement the minimal bundle export and CLI wiring**

Add `src/openclaw-bundle-export.ts` and wire it through `src/cli.ts`, `src/openclaw-config-export.ts`, and `src/index.ts`.

Rules:
- bundle export must remain a thin packaging layer around the existing stdio MCP server
- keep the exported default command as `bidvia mcp-server`
- prefer generated/exported bundle content over turning the whole repo into an OpenClaw native plugin package in this version
- keep all content local-first and honest about required environment placeholders

- [ ] **Step 4: Re-run the targeted export and package-shape tests**

Run the same commands from Step 2.

Expected after implementation:
- bundle export tests pass and packaged public shape stays coherent

- [ ] **Step 5: Commit**

```bash
git add src/openclaw-bundle-export.ts src/openclaw-config-export.ts src/cli.ts src/index.ts test/openclaw-config-export.test.ts test/openclaw-bundle-export.test.ts test/package-distribution.test.ts test/public-release-shape.test.ts
git commit -m "feat(openclaw): add companion bundle export"
```

## Chunk 3: Docs, release posture, and full verification

### Task 4: Update operator docs and release language for the next OpenClaw-compatible version

**Files:**
- Modify: `README.md`
- Modify: `docs/OPENCLAW_GATEWAY_ONBOARDING.md`
- Modify: `docs/OPENCLAW_GATEWAY_SMOKE.md`
- Modify: `docs/CONTRACT_BOUNDARY.md`
- Modify: `docs/ROADMAP.md`
- Optional create: `docs/RELEASE_NOTES_OPENCLAW_NEXT_VERSION.md`
- Test: `test/cli.test.ts`
- Test: `test/cli-execution.test.ts`

- [ ] **Step 1: Write failing docs/CLI assertions for the next-version OpenClaw story**

Add or update tests so they prove:

- CLI help exposes the new OpenClaw bundle export surface
- docs and generated outputs describe stdio MCP as the primary OpenClaw path
- release language does not claim HTTP MCP, hosted runtime, or native-plugin-first behavior

- [ ] **Step 2: Run the targeted CLI and docs-adjacent tests to confirm drift**

Run:
```bash
npx tsx --test test/cli.test.ts
npx tsx --test test/cli-execution.test.ts
```

Expected before implementation:
- failures on missing command help or outdated OpenClaw guidance

- [ ] **Step 3: Update docs and release-language files**

Refresh the README and OpenClaw docs so an operator can:

1. install `@bidvia/client`
2. export the OpenClaw MCP config or bundle
3. understand required context families
4. smoke-test the widened Bidvia MCP surface
5. understand what remains local-first and what stays outside scope

Also add a short roadmap pointer that this is the next-version OpenClaw integration focus, without erasing the historical core-vnext alignment record.

- [ ] **Step 4: Run full repo verification**

Run:
```bash
npm test
npm run typecheck
npm run build
npm run validate
```

Expected after implementation:
- all checks pass

- [ ] **Step 5: Commit**

```bash
git add README.md docs/OPENCLAW_GATEWAY_ONBOARDING.md docs/OPENCLAW_GATEWAY_SMOKE.md docs/CONTRACT_BOUNDARY.md docs/ROADMAP.md docs/RELEASE_NOTES_OPENCLAW_NEXT_VERSION.md test/cli.test.ts test/cli-execution.test.ts
git commit -m "docs(openclaw): productize next-version operator path"
```

Plan complete and saved to `docs/superpowers/plans/2026-04-01-openclaw-next-version-integration.md`. Ready to execute?
