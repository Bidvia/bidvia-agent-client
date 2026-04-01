# OpenClaw Official Integration Next-Version Design

> Status: proposed next-version design

## Goal

Make the next `@bidvia/client` release the most reliable official OpenClaw-compatible Bidvia integration path without overstating hosted control-plane ownership, HTTP MCP support, or native-plugin maturity.

## Why this design exists

The current repo already ships a bounded local stdio MCP server, CLI guidance, and a much wider SDK/CLI capability surface than the current MCP catalog exposes. At the same time, official OpenClaw evidence shows three constraints that must shape the next version honestly:

1. OpenClaw officially supports external plugins and bundles from local paths, npm, and ClawHub-first installs; ClawHub is not mandatory.
2. Official docs and issue evidence do not justify HTTP MCP as a dependable runtime path today; the current safe overlap is stdio MCP.
3. Native OpenClaw plugins are officially supported but run in-process with a materially higher trust boundary than bundle/MCP-based integration.

That combination makes `stdio MCP-first` the correct next-version base, with `bundle/bootstrap` as the seamlessness layer and `thin native plugin` explicitly deferred.

## Design decision

### 1. Keep stdio MCP as the canonical OpenClaw execution plane

The next version should continue to treat:

- `bidvia mcp-server`
- `bidvia openclaw-mcp-config`

as the authoritative OpenClaw execution handoff.

The repo should not pivot its mainline to HTTP MCP or a native OpenClaw plugin runtime. The current product fit is still local-first, operator-visible, and bounded to Bidvia Core-owned truth.

### 2. Add an OpenClaw-facing bundle/bootstrap layer around the same stdio MCP runtime

The current handoff is operator-correct but not yet agent-natural. OpenClaw agents need more than raw tool availability. The next version should therefore add an exportable OpenClaw companion bundle that packages:

- a supported bundle marker and manifest
- `.mcp.json` pointing back to `bidvia mcp-server`
- OpenClaw-readable skill/bootstrap content for Bidvia tool use
- local-only boundary language and missing-context remediation hints

This keeps Bidvia logic in the existing client/MCP runtime while improving official OpenClaw installability and agent usability.

### 3. Close the MCP parity gap before inventing new surfaces

The next version should prioritize exposing already-shipped SDK/CLI capability families through MCP before creating new helper families. The main parity gaps are:

- onboarding and claim flow
- wider governed reads already present in SDK/CLI
- participation / lease / claim / task-dispatch lifecycle actions
- authority/capability profile writes
- commercial-action continuation helpers already shipped in the client

The OpenClaw-facing tool surface should be grouped and described by risk tier and context family, not as a flat bag of commands.

### 4. Add agent-facing context remediation instead of relying on operator intuition

The next version should make missing Bidvia context recoverable for an OpenClaw-run agent. Missing `tenantId`, `sessionId`, `registrationId`, `principalId`, `adminSessionId`, or `companyId` should yield tool-facing remediation that points to the next command, next context family, or next onboarding step.

### 5. Defer native plugin work to a later thin-glue stage

The next version should not make a native OpenClaw plugin the primary integration product. If native-plugin work is later justified, it should be a thin UX/configuration layer that still delegates substantive Bidvia behavior to the existing client + stdio MCP runtime.

## Next-version scope

In scope for the next version:

- MCP parity expansion across already-shipped Bidvia capability families
- OpenClaw bundle/bootstrap export around stdio MCP
- richer context remediation and tool-tier guidance
- docs and smoke guidance for official OpenClaw installation shapes
- packaging and release-shape validation for the new OpenClaw companion surface

Out of scope for the next version:

- HTTP MCP as a primary integration path
- hosted Bidvia runtime or hosted MCP claims
- native OpenClaw plugin as the main execution surface
- any new Core truth or authority semantics not already frozen downstream

## File and responsibility map

### Existing files to extend

- `src/discovery-catalog.ts` — MCP/discovery parity metadata
- `src/capabilities.ts` — canonical route capability source for new MCP families
- `src/mcp.ts` — Bidvia MCP tool exposure and dispatch behavior
- `src/mcp-server.ts` — stdio MCP runtime boundary
- `src/openclaw-config-export.ts` — OpenClaw handoff config export
- `src/operator-ergonomics.ts` — missing-context and risk-tier guidance
- `src/route-context-matrix.ts` — context-family progression and next-step hints
- `src/cli.ts` — new export and doctor/operator commands
- `docs/OPENCLAW_GATEWAY_ONBOARDING.md` — official operator install/onboarding story
- `docs/OPENCLAW_GATEWAY_SMOKE.md` — OpenClaw smoke catalogue for the widened next-version surface

### New files expected

- `src/openclaw-bundle-export.ts` — exports an OpenClaw-compatible local bundle around the existing stdio MCP server
- `test/openclaw-bundle-export.test.ts` — contract tests for the bundle export shape
- optional bundle template fixtures under `test/fixtures/openclaw-bundle/` if that keeps snapshot coverage clean

## Success criteria

The next version is successful when all of these are true:

1. An official OpenClaw user can install `@bidvia/client`, export a supported local OpenClaw handoff, and consume Bidvia through stdio MCP without reconstructing config manually.
2. The MCP layer exposes the shipped Bidvia capability families that matter for onboarding, governed reads, runtime execution, participation/task coordination, and commercial action follow-through.
3. The tool surface explains missing-context remediation well enough that an OpenClaw agent can recover from context gaps without human guesswork.
4. The repo still stays honest about being local-first, stdio-MCP-first, and Core-truth-consuming rather than Core-truth-owning.

## Release language for the next version

Describe the next version as:

- official OpenClaw-compatible local stdio MCP integration
- official bundle/bootstrap packaging for smoother OpenClaw installation and agent guidance
- widened OpenClaw-consumable Bidvia capability surface across already-shipped SDK/CLI families

Do not describe it as:

- hosted OpenClaw integration
- HTTP MCP distribution
- native OpenClaw plugin-first runtime
- client-owned governance or control-plane authority
