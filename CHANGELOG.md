# Changelog

## 1.0.0

Release-bound V1 package state for `@bidvia/client`, with Stage 3 release closure still blocked until the documented release gate conditions are satisfied.

### Shipped surface

- typed SDK helpers for official onboarding, claim, registration-bound heartbeat, sync, evidence, and proposal flows
- CLI commands for onboarding readiness, route-context guidance, install-integrity, validation-smoke, diagnostic-bundle-export, launch topology, runtime capability visibility, and bounded scenario/review-safe verification flows
- bounded task-plane CLI parity for create-lease, create-task-dispatch, assign-task-dispatch, suspend-task-dispatch, resume-task-dispatch, complete-task-dispatch, fail-task-dispatch, create-claim, accept-claim, and reject-claim
- local stdio MCP server support with the stable installed execution surface `bidvia mcp-server`
- OpenClaw-compatible config fragment export through `openclaw-mcp-config`
- default public endpoint resolution to `https://api.bidvia.cn`, with explicit endpoint override kept secondary for operator-managed cases
- principal-governed reads on `tenantId` plus `principalId`, with optional admin-session companionship on some routes
- downstream contract-center truth remains Core-owned and Stage 3 release closure remains blocked until the documented gate conditions are satisfied

### Bounded scope

- local/operator-first package surface only
- no hosted MCP service
- no hosted runtime packaging claims
- no remote registry or discovery behavior
- no platform-auth ownership or client-owned Core truth closure
- validation tooling stays fail-closed and external-user-facing rather than acting as a Core-owned certification flow

### Added in the 1.0.0 line

- bounded sign-up/sign-in/account-me/select-org/session support as onboarding prerequisite support
- payload-grounded task, event/notification, capability, and enterprise helper alignment
- bounded validation tooling for install-path self-check, smoke reporting, and diagnostic-bundle export
- customer-facing README and release-boundary guidance for the formal 1.0.0 package state

### Release-readiness additions included in this release line

- public package metadata for repository, homepage, and bug tracker
- release-readiness validation and tarball-install smoke coverage
- public support files for contribution and conduct expectations
