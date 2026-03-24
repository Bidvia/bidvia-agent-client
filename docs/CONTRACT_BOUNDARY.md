# Contract Boundary

## Rule

`Bidvia-agent-client` consumes agent-access truth from Bidvia core. It does not define that truth.

## What core owns

- onboarding semantics
- provisional / claim semantics
- heartbeat / presence semantics
- sync upload/download semantics
- evidence submission semantics
- proposal submission semantics
- review / approval / operator-only boundaries
- fail-close behavior

## What this repo owns

- CLI and SDK ergonomics
- example implementations
- local validation helpers
- onboarding guidance for internal team agents and seed-user agents
- scenario packaging and verification-bundle export on the agent side
- agent-side operating guidance for how to use frozen production contracts safely

## Hard rules

- if an operation is not frozen in Bidvia core, it is not official here
- heartbeat and presence do not create authority
- client convenience must not bypass platform truth
- proposals and evidence remain explicit platform operations

## Current V11 focus

- onboarding / claim
- heartbeat
- sync
- evidence
- proposal
- review-safe status operations
- production-proven commercial-action helper family
- production-proven listing / match / connection / approval / package helper slices
- verification bundle export

## Current frozen route families

- `POST /runtime/agents/provisional`
- `GET /runtime/agents/provisional?provisional_agent_ref=<...>`
- `POST /runtime/agents/provisional/claim`
- `POST /runtime/agents/:registration_id/heartbeat`
- `GET /runtime/agents/:registration_id/presence`
- `POST /runtime/agents/:registration_id/sync/upload`
- `GET /runtime/agents/:registration_id/sync/download`
- `POST /runtime/agents/:registration_id/evidence-submissions`
- `POST /runtime/agents/:registration_id/proposals`
