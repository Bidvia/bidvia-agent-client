# Release Notes, Local-Only Next Version

## Version position

This release captures the completed next local-only version of `@bidvia/client`, with the installed CLI surface exposed as `bidvia`.

It strengthens the package as a client-owned SDK, CLI, and local stdio MCP surface for the frozen Bidvia Commercial Universe V1 / Core V12 handoff boundary. It does not turn the package into a hosted runtime, a hosted MCP service, a remote registry participant, or a source of Core-owned truth.

## What shipped in this version

### SDK transport hardening

The SDK transport layer is more dependable for local operator and integrator use. This version tightens timeout handling, abort behavior, and normalized transport errors so local request flows are easier to inspect and troubleshoot without changing the governed wire contracts.

### Auth and context provider seams, not login

This version adds clearer local auth and request-context provider seams so callers can supply headers and context in a more controlled way. That is packaging and transport hardening for local use, not shipped login, not hosted auth, and not Core-owned identity behavior.

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

### Expanded local stdio MCP surfaces

The local stdio MCP seam now exposes a broader, better-aligned bounded tool surface across review-safe and explicit execution tooling. This remains a local stdio server only. It should not be read as hosted MCP behavior or remote registry participation.

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
- expanded local stdio MCP surfaces
- aligned docs and examples for the local path

### Dependency-gated Core seams

Some seams are now better prepared on the client side, but they still depend on Bidvia Core for frozen truth before they can be treated as fully real. Those areas remain fail-closed and Core-deferred where appropriate. The client may expose the seam, but it does not own the truth behind it.

### Deferred areas

This release does not claim any of the following:

- login or broader Core-owned auth
- hosted runtime behavior
- hosted MCP service behavior
- remote registry behavior
- live remote capability negotiation
- client-owned platform authority
- general workflow-engine semantics beyond the current bounded slices

## Verification status

This local-only version is documented as a completed shipped package surface with aligned CLI, SDK, MCP, docs, examples, and validation framing. The package remains client-owned where it ships local operator value, and Core-deferred where frozen external truth is still required.

## Next-step notes

The next steps stay the same as the repo's public boundary:

- keep productizing the shipped local integration surface for external users, operators, and OpenClaw Gateway paths
- consume Core-owned truth only when Bidvia Core exposes frozen semantics for those seams
- defer hosted runtime, hosted MCP, remote registry, and broader runtime or control-plane claims until they are actually real
