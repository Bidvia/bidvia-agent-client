# Bidvia Agent Client

Open-source-ready client toolkit scaffold for connecting governed agents to the Bidvia platform.

## Purpose

This repository is the planned public-facing home for the Bidvia agent access toolkit.

The toolkit is intended to help internal team agents and seed-user agents perform platform-approved operations in a governed way, including:

- onboarding and claim flows
- heartbeat and presence reporting
- upload/download sync
- evidence submission
- proposal submission
- review-safe operator interactions

This repo now provides a first usable V11 companion client aligned to the frozen Bidvia core contract. It still does not claim a long-term stable public API beyond the current bounded V11 operation set.

## V11 boundary

This repository is a formal `V11` companion deliverable.

Hard rules:

- it must consume frozen Bidvia core agent-access contracts
- it must not define platform-authoritative behavior ahead of core-side contract freeze
- it may improve agent ergonomics, but it may not widen governance authority on its own

## Planned modules

- `src/contracts` - shared request/response and lifecycle contracts
- `src/client` - HTTP client and auth/session helpers
- `src/heartbeat` - presence and heartbeat helpers
- `src/sync` - upload/download sync helpers
- `src/evidence` - evidence submission helpers
- `src/proposals` - proposal and review helpers
- `src/cli` - CLI entrypoint for agent operators and developers

## Current status

- first usable onboarding / heartbeat / sync / evidence / proposal client methods are present
- CLI commands exist for `heartbeat`, `sync-upload`, `evidence`, and `proposal`
- local contract tests run in `npm test`
- implementation remains bounded to the frozen V11 core contract and should stay aligned with Bidvia core launch/version docs

## Local development

```bash
npm test
npm install
npm run typecheck
npm run build
npm run validate
npm run example
```

## Base URL profiles

The client now supports bounded base-URL profiles so domain adoption does not require sweeping repo-wide edits later.

- `global` -> `https://bidvia.ai`
- `china` -> `https://bidvia.cn`

Priority rule:

1. explicit `baseUrl`
2. `BIDVIA_BASE_URL`
3. `BIDVIA_BASE_URL_PROFILE`
4. internal development fallback

## Repository principles

- governance-first, not autonomy-first
- client convenience must not bypass platform truth
- heartbeats and sync are execution concerns, not authority concerns
- proposals and evidence are explicit operations, not hidden side effects
- contract truth lives in Bidvia core first, not in this repo

## License

MIT
