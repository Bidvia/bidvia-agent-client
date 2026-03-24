# Product Positioning

## One-sentence position

`Bidvia-agent-client` is the agent-side operating kit for using the Bidvia platform in a governed way.

## What it is not

It is not only:

- a thin HTTP SDK
- a pile of route wrappers
- a developer-only helper package

Those are parts of the repo, but not the full product definition.

## What it is meant to become

The long-term target shape is an agent operating kit with six layers:

1. **Guide layer**
   - onboarding and usage guidance
   - platform rules and boundaries
   - real-world scenario guidance

2. **Context layer**
   - local context handling
   - profile handling for development and controlled execution
   - session / admin-session / operator-context preparation

3. **Execution layer**
   - official route helpers
   - SDK functions
   - fail-close context checks

4. **Scenario layer**
   - scenario envelopes
   - source/evidence carrying objects
   - scenario-aware helper composition

5. **Verification layer**
   - verification bundles
   - review packet exports
   - verification-safe packaging

6. **Adapter layer**
   - CLI commands
   - future tool/adaptor surfaces for agent runtimes

## Current implemented slice

The current V11 implementation mostly covers the execution layer, plus a thin verification export helper and part of the adapter layer.

Already implemented:

- onboarding / claim helpers
- heartbeat / sync / evidence / proposal helpers
- commercial-action helper family
- listing / match / connection / approval / package helper slices
- typed verification bundle export helper
- CLI examples and local validation

Not yet complete:

- scenario envelopes as first-class objects
- a richer verification layer beyond one export helper
- broader agent operating guide beyond onboarding
- richer orchestration helpers
- adapter/runtime surfaces beyond the current CLI

## Why this matters

The production verification waves showed that agents do not only need route helpers.
They need a coherent way to understand:

- which context to use
- which production route chain matches which business scenario
- how to keep evidence and trace continuity together
- how to package verification results for later review

That is why the repo should be presented publicly as an operating kit target, while still being described honestly as a partial V11 execution-layer slice today.
