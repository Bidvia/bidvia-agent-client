# Roadmap

## Current delivered slice

The repo now includes a first usable V11 companion-client wave:

1. frozen core-aligned onboarding / query / claim request formation
2. frozen registration-bound heartbeat / sync / evidence / proposal request formation
3. runnable CLI commands for the bounded V11 operation set
4. contract tests plus a stubbed local example flow

## Planned next layers

1. frozen client-side contracts aligned to Bidvia core
2. CLI flows for onboarding, claim, heartbeat, sync, evidence, and proposal actions
3. SDK helpers for internal team agents and seed-user agents
4. local validation and sandbox tooling
5. operator-facing documentation and examples

## V11 rule

The first real implementation wave in this repo belongs to `V11` and must follow frozen core-side agent access contracts before adding CLI or SDK behavior.

Required V11 direction:

1. consume frozen onboarding / claim / heartbeat / sync / evidence / proposal contracts from core
2. provide first usable CLI and SDK helpers for those allowed operations only
3. provide examples and local validation tooling for internal team agents and seed-user agents
4. do not widen into marketplace, autonomous governance, or unfrozen agent powers

## Authority split

- `Bidvia` core owns route truth, fail-close behavior, authority boundaries, and durable state
- `Bidvia-agent-client` owns tooling ergonomics, examples, local validation, and onboarding guidance

## Non-goals for the initial scaffold

- production-ready SDK guarantees
- frozen public API guarantees
- full MCP/A2A bridge implementation
- marketplace or autonomous governance tooling
