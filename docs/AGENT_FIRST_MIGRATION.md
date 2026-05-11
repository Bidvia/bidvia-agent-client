# Agent-First Migration Guide

This guide maps **helper-first** usage onto the newer **role-stage** product entry surface.

## Why migrate

The repo now presents an agent-first operating entry organized around claimant, operator, platform-managed, and universe roles. The goal is to let an external agent reason in role/stage terms instead of memorizing route topology or stitching raw helpers by hand.

## Migration principles

- keep atomic helpers available for low-level integration and compatibility-only seams
- prefer role-stage product entry for ordinary claimant/operator flows
- keep blocked Core truth visible instead of wrapping it in optimistic local prose
- treat evidence output as additive packaging, not as a replacement for the default product result

## Common mappings

### Claimant readiness

- Old helper-first: `inspectClaimantReadiness(...)`
- New role-stage SDK: `client.claimant.readiness.inspect(...)`
- New role-stage CLI: `bidvia claimant-readiness-inspect --agent-id ...`

### Claimant readiness repair

- Old helper-first: `repairClaimantReadiness(...)`
- New role-stage SDK: `client.claimant.readiness.repair(...)`
- New role-stage CLI: `bidvia claimant-readiness-repair --agent-id ... --input ...`

### Operator handoff consume

- Old helper-first: `consumeOperatorHandoff(...)`
- New role-stage SDK: `client.operator.handoff.consume(...)`
- New role-stage CLI: `bidvia operator-handoff-consume --listing-id ...`

### Universe inspection

- Old helper-first explainer: `buildRouteContextMatrix(...)`
- New role-stage SDK: `client.universe.inspect(...)`
- New role-stage CLI: `bidvia universe inspect --input ...`

## Evidence output

When you need machine-consumable diagnostics, use the role-stage evidence output mode rather than inventing a second reporting shape. The product-facing CLI supports `--output evidence` on the role-stage surfaces that expose evidence mode, and productized MCP responses may include `evidencePacket` plus `resultTaxonomy` as additive fields.

## What does not change

- Core still owns downstream contract truth
- compatibility-only helpers remain compatibility-only
- blocked platform-managed truth does not become universality just because the role namespace exists
- default result output stays machine-readable even when evidence mode is available
