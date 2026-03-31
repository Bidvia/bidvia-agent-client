# Changelog

## 0.1.0

First public package release for `@bidvia/client`.

### Shipped surface

- typed SDK helpers for official onboarding, claim, registration-bound heartbeat, sync, evidence, and proposal flows
- CLI commands for onboarding readiness, route-context guidance, launch topology, runtime capability visibility, and bounded scenario/review-safe verification flows
- local stdio MCP server support with the stable installed execution surface `bidvia mcp-server`
- OpenClaw-compatible config fragment export through `openclaw-mcp-config`
- default public endpoint resolution to `https://api.bidvia.ai`, with explicit endpoint override kept secondary for operator-managed cases

### Bounded scope

- local/operator-first package surface only
- no hosted MCP service
- no hosted runtime packaging claims
- no remote registry or discovery behavior
- no login or client-owned Core truth closure

### Release-readiness additions included in this release line

- public package metadata for repository, homepage, and bug tracker
- release-readiness validation and tarball-install smoke coverage
- public support files for contribution and conduct expectations
