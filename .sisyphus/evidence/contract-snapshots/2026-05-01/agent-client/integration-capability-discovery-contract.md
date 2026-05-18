# Integration Capability Discovery Contract

## Purpose

Freeze the first account-plane integration capability discovery and bounded invocation-eligibility model so `bidvia-agent-client` can discover configured connected capabilities without inventing availability or actor-family semantics.

## Canonical endpoints

- `GET /runtime/account/integration-capabilities`
- `GET /runtime/account/agents/:agentId/integrations/:integrationCode/eligibility`

## Frozen reading rules

- capability discovery is installation-scoped and only exposes approved + active + configured integration truth for the active org context
- capability discovery does **not** by itself imply invocation ownership
- eligibility payloads, not discovery alone, decide whether a given account-owned agent can invoke the bounded connected capability path
- current bounded write invocation ownership remains Core-owned metadata for account-owned `platform_managed` agents on the supported path, but this client keeps the route fail-closed until Core freezes an open-client request body

## Minimum payload semantics

- discovery items must include:
  - `integration_code`
  - `installation_id`
  - `connection_id`
  - `availability_state`
  - `declared_capabilities`
- discovery `availability_state` is now frozen to a readiness ladder that may include:
  - `discovered_not_installed`
  - `installation_pending_configuration`
  - `configured`
- eligibility payload must include:
  - `actor_family`
  - `eligible`
  - `readiness_state`
  - `reason_codes`
  - `recommended_next_step`
  - `next_step_kind`
  - `can_self_resolve`
  - `invocation_route`

## Current boundary

- ordinary external agents may discover connected capabilities and read eligibility truth
- current bounded write invocation path is intentionally narrower than a full open integration marketplace and remains governed by Core-owned eligibility truth
- platform-managed invocation ownership remains bounded Core-owned metadata in this wave rather than an open-client surfaced helper
- ordinary external agents must not infer direct write invocation authority from discovery alone
