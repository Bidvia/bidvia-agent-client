# Website First Access Handoff

## Purpose

This document is the handoff contract for the website team. It captures the shipped Phase A first-access journey language from the CLI and docs so the website can explain the same product surface without inventing new runtime claims.

This repo does not implement website code in this phase. The website team owns website execution separately.

Stage 1 is complete on the client side, but website wording must keep that statement narrow: the package now has a real local runtime core and local accumulation layer behind CLI and MCP execution, while Core still owns platform truth and the website remains spec-only in this repo.

The V1 boundary is agent-first but login-capable. Website copy may mention bounded account/session prerequisite support, but it must keep the package promise centered on the governed agent path rather than on a general account or platform-auth product story.

## Release boundary

The website copy must stay inside the current shipped boundary:

- local-first package
- Core owns truth
- stdio MCP first for OpenClaw
- `openclaw-bundle-export` is additive packaging around the same local stdio MCP path
- no hosted runtime claims
- no HTTP MCP claims
- no native-plugin-first claims
- no login, browser auth, or client-owned auth ownership claims
- no platform-auth ownership claims
- no claim that the website owns or replaces the local runtime flow

## Public journey vocabulary

Use this exact journey language across website pages and supporting copy:

1. Learn
2. Public Provisional create -> query -> claim
3. Governed Run

The CLI is the current public source of truth for this journey.

Bounded prerequisite support that may be mentioned before or around Learn when context is missing:

- `bidvia sign-up-personal --input ...`
- `bidvia sign-up-enterprise --input ...`
- `bidvia sign-in --input ...`
- `bidvia account-me`
- `bidvia select-org --input ...`

Those commands support the same V1 journey. They do not replace the visible agent-first Learn -> Public Provisional create -> query -> claim -> Governed Run framing.

## Source-of-truth command map

### Learn

These are the first commands the website should present for a new user:

```bash
bidvia onboard
bidvia context show
bidvia whoami
bidvia doctor
```

Meaning:

- `bidvia onboard` is the visible first-run entry point
- `bidvia context show` explains what local context exists and where it came from
- `bidvia whoami` gives a local identity summary without claiming platform login
- `bidvia doctor` stays visible, but website copy should describe it as a governed-run diagnostic once enough context is present
- if prerequisite context is still missing, the website may point users to bounded support commands such as `sign-up-personal`, `sign-up-enterprise`, `sign-in`, or `select-org` without changing the agent-first framing

`bidvia onboarding-readiness` still exists, but it is now supporting reference material, not the primary first-run entry point.

### Public Provisional create -> query -> claim

The website should keep the provisional onboarding chain explicit:

```bash
bidvia create-provisional-agent --provisional-agent-ref ...
bidvia query-provisional-agent --provisional-agent-ref ...
bidvia claim-provisional-agent --provisional-agent-ref ... --claim-token ...
```

Meaning:

- the package does not hide onboarding behind a browser flow
- the website should not collapse this stage to Create/Claim when query is part of the official chain
- users can rerun these steps safely
- claim is session-bound and is the bridge from public provisional onboarding into governed runtime
- Stage 1 completion means the runtime path behind these commands is now local-runtime-backed, not that the website or the client owns Core identity truth

### Governed Run

When the user has enough context, the next bounded runtime steps are:

```bash
bidvia route-context-matrix
bidvia registration-lifecycle-plan
bidvia registered-agent-operations-plan
```

Meaning:

- `route-context-matrix` is the bridge from Public Provisional into Governed Run
- `registration-lifecycle-plan` is the first bounded success path
- `registered-agent-operations-plan` is the next visible post-registration step
- CLI and MCP execution now write local accumulation through the runtime core while preserving operator-facing outputs

Keep `doctor`, `route-context-matrix`, and `registration-lifecycle-plan` on the Governed Run side of the story. They should not be presented as if they are part of the official public provisional create -> query -> claim chain.

## OpenClaw website copy boundary

When the website mentions OpenClaw, keep this order:

```bash
bidvia openclaw-mcp-config
bidvia openclaw-bundle-export --output ./bidvia-openclaw-bundle
bidvia route-context-matrix
```

Copy requirements:

- describe stdio MCP as the primary OpenClaw path
- describe `openclaw-bundle-export` as additive packaging around the same local server
- keep `bidvia mcp-server` as the installed runtime command behind that handoff
- treat `node dist/mcp-server.js` as the repo-local development fallback only

## Claims the website must not make

Do not describe this package as:

- a hosted runtime
- an HTTP MCP path
- a native-plugin-first OpenClaw runtime
- a login or auth product
- a platform-auth product
- a remote registry participant
- a source of Core authority
- a website-driven onboarding flow that replaces the CLI
- proof that Stage 2 or Stage 3 are already complete

## Suggested website page shape

The website team can adapt the layout, but the information architecture should stay close to this shape:

1. Hero: local-first Bidvia CLI and SDK
2. First run: `bidvia onboard`
3. Learn section: `context show`, `whoami`, `doctor`
4. Public Provisional section: create, query, claim commands
5. Governed Run section: route matrix and bounded plans
6. OpenClaw section: stdio MCP first, bundle export additive
7. Scope boundary section: what is deferred and not claimed

## Documentation alignment checklist

Before website copy ships, confirm it still matches:

- `README.md`
- `docs/ONBOARDING.md`
- `docs/OPENCLAW_GATEWAY_ONBOARDING.md`
- `docs/OPENCLAW_GATEWAY_SMOKE.md`

If those docs change, update website copy to match the shipped CLI and docs rather than creating a parallel story.
