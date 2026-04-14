# Release Notes, V1.0.0

## Version position

This release notes document captures the current `1.0.0` package state of `@bidvia/client`, with the installed CLI surface exposed as `bidvia`.

It strengthens the package as a client-owned SDK, CLI, and local stdio MCP surface for the frozen Bidvia Commercial Universe V1 / Core V12 handoff boundary. It does not turn the package into a hosted runtime, a hosted MCP service, a remote registry participant, or a source of Core-owned truth.

The current V1 boundary is agent-first but login-capable. Bounded account/session prerequisite support is now present, but it exists to help external users reach the governed agent path rather than to turn the package into a general account-admin or platform-auth product.

## What shipped in this version

### SDK transport hardening

The SDK transport layer is more dependable for local operator and integrator use. This version tightens timeout handling, abort behavior, and normalized transport errors so local request flows are easier to inspect and troubleshoot without changing the governed wire contracts.

### Auth and context provider seams plus bounded V1 login/session support

This version adds clearer local auth and request-context provider seams so callers can supply headers and context in a more controlled way. It also now ships bounded V1 sign-up/sign-in/account-me/select-org/session-refresh/session-revoke support so external users can establish context before the governed agent path continues. That remains prerequisite support only: it is not hosted auth and it is not Core-owned identity behavior implemented by this client.

### Bounded V1 account/session prerequisite support

This version now includes bounded sign-up, sign-in, account-me, select-org, session-refresh, and session-revoke support so an external user can establish context before the governed agent journey continues. Those commands and SDK calls are prerequisite support only; they do not replace the package's agent-first onboarding model.

### Route and tool tiering with risk metadata

The shipped local route and MCP surfaces now carry clearer tier and risk classification. That makes the local package easier to review, safer to gate operationally, and more legible for downstream operator tooling.

### Local execution commands with `--dry-run`

The CLI now gives operators explicit local execution commands for heartbeat, sync-upload, evidence, and proposal, with `--dry-run` support for payload preview before any request is sent. This is local execution ergonomics and reviewability, not expanded platform authority.

### Broader bounded orchestration

This version widens the repo's bounded orchestration support across the already-shipped scenario slices. The expansion stays honest about its limits and keeps the approval-to-opportunity boundary explicit instead of claiming a general workflow engine.

### Richer review-packet and verification output

Review-packet and verification output now carry richer operator-facing detail, including clearer route coverage, recorded-id detail, and stronger review structure. The result is more useful local review material without claiming signing, policy ownership, or remote verification authority.

### Richer CLI operator flows

The CLI is easier to use as a local operator surface. Grouped help, stronger preview flows, and clearer command organization make the current packaged surface easier to discover and safer to run.

### Frozen downstream truth-fetch alignment

This version aligns the public docs and release language to the frozen downstream families now visible in the SDK and CLI. That includes `GET /runtime/agents/registrations`, `GET /runtime/agents/:registrationId`, `GET /runtime/authority-profiles`, `GET /runtime/capability-profiles`, `GET /runtime/agents/:registrationId/capability-profile`, plus the shipped participation-state and task-dispatch wrappers. The singular per-registration capability profile is the canonical read surface. If taxonomy or lineage aliases are mentioned at all, treat them as transitional or non-final only.

### Helper-level payload matrix alignment

This version now describes V1 through the helper-level payload matrix rather than through blanket plane-wide blockage language. The current summary is: identity/session `packet-grounded-execution`, task `packet-grounded-execution`, capability `packet-grounded-read`, workflow-stage `blocked-pending-packet`, event-notification `packet-grounded-execution`, and enterprise-integration `packet-grounded-read`. Compatibility wrappers remain documented as `compatibility-only` instead of being confused with the canonical payload-grounded path.

### Principal-governed read posture, kept honest

The widened governed read surface now follows the principal-governed posture already adopted in the client. In practice, that means `tenantId` plus `principalId` are the primary requirement, with admin-session context only as an optional companion on some routes. Credential-less local or sim probes can prove wiring, transport behavior, reachability, or auth-guard posture only. They do not prove full governed semantics.

### Expanded local stdio MCP surfaces

The local stdio MCP seam now exposes a broader, better-aligned bounded tool surface across review-safe and explicit execution tooling. This remains a local stdio server only. It should not be read as hosted MCP behavior or remote registry participation. MCP also stays intentionally narrower than the SDK/CLI truth-fetch surface and remains mostly read-only.

### Docs and examples alignment

Package docs and examples now line up more closely with the shipped local path. That includes clearer operator guidance for local verification, dry-run execution, bounded review exports, the installed MCP entrypoint `bidvia mcp-server`, and the repo-local fallback `node dist/mcp-server.js`.

### UTF-8 MCP framing fix and validate-script alignment

This version fixes UTF-8 framing in the local MCP server so byte-length handling matches real framed stdio traffic. It also keeps the validation script aligned with the richer local review-packet contract so local verification stays trustworthy.

## Release boundary, kept honest

### Shipped local surfaces

This version ships real local value in the package itself:

- stronger SDK transport behavior
- clearer local auth and context seams
- route and tool tier and risk metadata
- explicit local execution commands with `--dry-run`
- broader but still bounded orchestration slices
- richer review-packet and verification output
- richer CLI operator flows
- frozen downstream truth-fetch alignment across docs and release language
- principal-governed read posture documented honestly
- expanded local stdio MCP surfaces
- aligned docs and examples for the local path

### Dependency-gated Core seams

Some seams are now better prepared on the client side, but they still depend on Bidvia Core for frozen truth before they can be treated as fully real. Those areas remain fail-closed and Core-deferred where appropriate. The client may expose the seam, but it does not own the truth behind it.

### Deferred areas

This release does not claim any of the following:

- broader Core-owned auth beyond the bounded shipped sign-up/sign-in/account/session prerequisite path
- platform-auth ownership
- hosted runtime behavior
- hosted MCP service behavior
- remote registry behavior
- live remote capability negotiation
- client-owned platform authority
- general workflow-engine semantics beyond the current bounded slices

## Verification status

This formal `1.0.0` package state is documented as the current shipped local package surface with aligned CLI, SDK, MCP, docs, examples, and validation framing. The package remains client-owned where it ships local operator value, and Core-deferred where frozen external truth is still required. The adopted frozen read families are documented as shipped SDK/CLI visibility, not as hosted runtime, platform-auth ownership, or client-owned authority. npm publication remains a separate final human step after this blocked Stage 3 gate package state.

Stage 3 release gate remains blocked in the current repo state. The final `1.0.0` publication still requires the validator suite below to stay green, and that validator evidence remains part of the formal release packet while workflow-stage and other packet-incomplete seams remain blocked pending Core-frozen payload truth:

```bash
npm test
npm run typecheck
npm run build
npm run validate
npm run validate:release-readiness
npm run validate:release-gate
```

Current downstream contract truth for future Stage 2 / Stage 3 adoption work lives in the Bidvia Core downstream contract center (`docs/downstream-contract-center/**` in the main Bidvia repo). This package should align to that center and fail closed whenever a frozen plane still lacks packet-complete payload truth.

## Next-step notes

The next steps stay the same as the repo's public boundary:

- keep productizing the shipped local integration surface for external users, operators, and OpenClaw Gateway paths
- consume Core-owned truth only when Bidvia Core exposes frozen semantics for those seams
- defer hosted runtime, hosted MCP, remote registry, and broader runtime or control-plane claims until they are actually real
