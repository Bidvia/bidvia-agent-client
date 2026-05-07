# Enterprise Integration Plane Contract

## Purpose

Freeze the enterprise integration plane so `bidvia-agent-client` can participate in governed enterprise/system integration without inventing its own payload semantics.

For the V14 redesign direction, this plane must be read as a transitional contract surface on the way to a platform-owned **Integration App** model rather than as the permanent canonical shape for provider-specific onboarding.

## Frozen scope

- enterprise integration semantics
- identity mapping semantics
- resource attachment contract
- media contract
- document contract
- evidence contract
- visibility boundaries

V14 direction now assumes:

- third-party systems are modeled as **Integration Apps**
- platform approval before activation is required
- user installation before use is required
- public display is valid only for approved + opted-in systems
- public integration directory is the public-facing read model for approved + opted-in Integration Apps

## Canonical endpoints

- V14 integration-center and enterprise integration route family where frozen by Core

This plane belongs to the **integration capability family** in the platform-level outward family map.
The outward product story is the V14 Integration App model, not a long-term coexistence of provider-shaped and platform-shaped integration entry models.

In Wave 1 bounded ecosystem closure, this plane maps to the:

- `integration ownership and invocation slice`

When the question is about current Core-side downstream-support status rather than route semantics alone, read:

- `../shared/verified-ecosystem-slice-classification.md`

Current canonical endpoints in this plane include:

- `GET /runtime/public/integration-apps`
- `POST /runtime/account/integration-apps`
- `GET /runtime/account/integration-apps`
- `POST /runtime/account/integration-installations`
- `GET /runtime/account/integration-installations`
- `POST /runtime/account/integration-installations/:integrationInstallationId/connection`
- `GET /runtime/account/integration-capabilities`
- `GET /runtime/account/agents/:agentId/integrations/:integrationCode/eligibility`

Legacy onboarding-contract and provider-specific Haisi/WMS endpoints remain compatibility-only support seams and must not be treated as co-equal outward integration product roots.

Current bounded connected-capability rule in this wave:

- account/session consumers may discover configured integration capabilities through the account integration capability directory,
- account-owned agents may read bounded invocation eligibility,
- bounded connected-capability inbound invocation ownership remains Core-owned metadata for account-owned `platform_managed` agents and stays fail-closed here until Core freezes an open-client request body,
- ordinary external agents may discover and read eligibility truth, but that does not imply direct write-capability ownership.

Current emitted view-reading rule:

- `view_kind = owned_integration_apps` → owned app-definition view for the active org
- `view_kind = owned_integration_installations` → owned installation attachment/configuration view for the current account + active org
- `ownership_view = eligibility_read` → readiness/eligibility interpretation only; check `invocation_ownership` before treating the current actor as the bounded invocation owner
- `ownership_package = connected_capability_ownership` → package identity for the bounded connected-capability ownership story across capability directory, eligibility, and bounded invocation surfaces

### Connected-capability lifecycle reading

This wave freezes the bounded lifecycle distinctions for connected capability invocation as:

1. `discovered_not_installed`
2. `installation_pending_configuration`
3. `configured_actor_ineligible`
4. `configured_invokable`

These states are lifecycle readings, not interchangeable status labels.
They must be used to keep discovery, installation, configuration, eligibility, and invocation ownership distinct.

Current bounded connected-capability rule in this wave:

- account/session consumers may discover configured integration capabilities through the account integration capability directory,
- account-owned agents may read bounded invocation eligibility,
- only account-owned `platform_managed` agents currently own the bounded connected-capability inbound invocation path frozen here,
- ordinary external agents may discover and read eligibility truth, but that does not imply direct write-capability ownership.

Unsupported helper surfaces on current main:

- `GET /runtime/file-resources` is not frozen on current main
- `GET /runtime/targets/:target_ref/attachment-bindings` (`target-attachment-bindings`) is not frozen on current main
- downstream consumers must use the current supported route families instead: `document-artifacts`, `media-assets`, `evidence-assets`, `attachment-bindings`, and `bound-objects/:ref/...`

## Request fields

- request fields for enterprise integration and identity mapping are frozen only as declared by Core

Minimum request field expectations in this plane:

- identity mapping fields must be Core-owned and validated before integration onboarding can succeed
- integration action requests may not bypass Core-owned identity mapping and visibility boundaries
- integration usage requests must still resolve through installation before use and installation-scoped connection/config boundaries

Required identity mapping fields:

- `source.principal_id`
- `source.scope_id`
- `source.capability_codes`
- `target.integration_subject_ref`
- `target.capability_map`
- `metadata.mapping_version`
- `metadata.mapping_status`

## Response fields

- response fields for enterprise integration, identity mapping, attachment/media/document/evidence visibility, and governed responses are Core-owned payload truth

Minimum response field expectations in this plane:

- enterprise integration responses preserve Core-owned query result or governed-dispatch payloads
- attachment/media/document/evidence visibility responses preserve visibility boundaries rather than implied display permissions
- enterprise integration responses may include `governed-dispatch outcomes` where Core turns an integration action into governed execution truth
- public directory responses may expose public-safe Integration App fields only; installation/private connection state is not public output
- account capability directory responses expose installation-scoped configured capability truth rather than raw provider code assumptions
- account agent eligibility responses expose bounded `eligible / reason_codes / recommended_next_step / next_step_kind / invocation_route` truth owned by Core
- account capability directory responses expose installation-scoped configured capability truth rather than raw provider code assumptions
- account agent eligibility responses expose bounded `eligible / reason_codes / recommended_next_step / next_step_kind / invocation_route` truth owned by Core

Displayable only when explicitly frozen:

- `document_artifact_refs`
- `media_asset_refs`
- `evidence_asset_refs`

## Enum/status vocabulary

- enterprise integration enum/status vocabulary must remain exactly as frozen by Core

Current vocabulary includes integration identity mapping validity and governed-dispatch acceptance/failure semantics as emitted by Core.

Identity mapping failure vocabulary may include stable error semantics such as `MAPPING_ABSENT`, `MAPPING_REVOKED`, and `MAPPING_STALE` where emitted by Core.

Required identity mapping fields:

- `source.principal_id`
- `source.scope_id`
- `source.capability_codes`
- `target.integration_subject_ref`
- `target.capability_map`
- `metadata.mapping_version`
- `metadata.mapping_status`

## Lifecycle/transition rules

- enterprise integration lifecycle, mapping validity, and governed submission transitions must not be inferred by the client beyond frozen Core semantics

- the client must not convert integration success into official truth; it remains governed input, evidence, or execution result unless Core says otherwise

## Freshness/invalidation rules

- enterprise integration truth may be cached locally only within Core-frozen freshness/invalidation rules

- stale mapping or capability assumptions must be invalidated when Core returns refreshed integration or identity-mapping truth

## Compatibility window

- historical or alias integration paths remain compatibility-only until explicitly removed by Core

- provider-specific convenience wrappers remain compatibility-only if not frozen here as canonical interfaces
- V14 must not keep `haisi-wms`-shaped login/warehouse/inbound routes as the canonical enterprise integration truth once the Integration App and installation model is frozen

## Required downstream action

- the client must preserve Core-owned visibility boundaries for resource attachment, media, document, and evidence payloads

- the client must treat enterprise integration as a governed plane, not a direct path to official truth publication
- the client must not infer runtime legitimacy from raw provider code alone; it must eventually resolve through an approved Integration App plus an installed/configured user adoption boundary
- the client must not treat capability discovery as proof that every actor family may invoke the same connected capability; invocation ownership still follows the frozen eligibility payload
- the client must not treat capability discovery as proof that every actor family may invoke the same connected capability; invocation ownership still follows the frozen eligibility payload

- ordinary external agents may read eligibility truth without thereby owning the bounded invocation path
- only the actor family explicitly returned by the frozen eligibility/invocation rules may treat `configured_invokable` as execution ownership in this wave

## Core rule

The client may submit and consume enterprise integration truth only within the frozen integration and visibility boundaries owned by Core.
