# Canonical Route And Status Contract

> Purpose: give `bidvia-site` and `bidvia-agent-client` one downstream-safe reading of current Core route/status truth.

## Source precedence for this contract

1. `docs/README.md` authority stack
2. current Core route inventory in `src/app.ts` and maintained downstream-facing docs referenced by the contract center
3. higher-order governance manifests only when this center explicitly points upward

If this file conflicts with higher-order authority, higher-order authority wins and this file must be updated.

For the current platform productization program, also read:

- `platform-capability-maturity-matrix.md`
- `platform-capability-lifecycle-consumption-guide.md`
- `../../../org/Bidvia_Unified_Outward_Family_Map_v1.md`

before widening any route family from implemented seam into claimed product surface.

When route ownership and family lifecycle need to be read together:

- read canonical package roots and ownership here,
- read lifecycle state in `platform-capability-lifecycle-consumption-guide.md`,
- read predecessor seam downgrade in `seam-retirement-consumption-guide.md`.

## Status vocabulary

- `canonical`: the route/status reading downstream consumers should treat as current Core-owned truth
- `compatibility-only`: an older or bridge surface that may still exist but is not the preferred downstream contract
- `transitional`: a currently present family that is not yet stable enough to be treated as final downstream truth
- `historical`: retained only for predecessor understanding, not for current implementation decisions

## Current downstream-safe route families

## Ownership labels used in this contract

- `shared`: contract truth that both `bidvia-site` and `bidvia-agent-client` may consume
- `site-only consumer`: contract truth that only `bidvia-site` should consume directly
- `agent-client-only consumer`: contract truth that only `bidvia-agent-client` should consume directly
- `operator-only not downstream-facing`: route or truth family that exists in Core but must not be treated as downstream-consumable truth

### Canonical

- website/account subject truth (`shared`, with some site-primary presentation use):
  - `POST /runtime/invites`
  - `POST /runtime/invites/consume`
  - `POST /runtime/accounts/personal/sign-up`
  - `POST /runtime/accounts/enterprise/sign-up`
  - `POST /runtime/sessions/sign-in`
  - `POST /runtime/sessions/refresh`
  - `POST /runtime/sessions/revoke`
  - `GET /runtime/account/me`
  - `POST /runtime/account/select-org`
- bounded claimed-agent self-service family (`shared`):
  - `PATCH /runtime/account/agents/:agentId/self-service`
- official provisional/query/claim path (`shared`):
  - `POST /runtime/agents/provisional`
  - `GET /runtime/agents/provisional?provisional_agent_ref=<...>`
  - `POST /runtime/agents/provisional/claim`
- formal operator-agent onboarding path (`shared`):
  - `POST /runtime/account/agents/platform-managed-registrations`
- claimed-agent read family (`shared`):
  - `GET /runtime/account/agents`
  - `GET /runtime/account/agents/:agentId`
  - `GET /runtime/account/agent-bindings`
  - `GET /runtime/account/records`
- dispatch-authority activation family (`shared`):
  - `GET /runtime/account/agents/:agentId/dispatch-authority`
  - `POST /runtime/account/agents/:agentId/dispatch-authority-requests`
- closure repair and closure-state family (`shared`):
  - `GET /runtime/account/agents/:agentId/closure-status`
  - `POST /runtime/account/agents/:agentId/governed-runtime/authorization-refresh`
  - `POST /runtime/account/agents/:agentId/external-account-bindings`
  - claimant binding payload for that route uses `system_type`, `system_name`, `external_account_ref`, `now`
  - operator/admin binding payloads use different route-specific shapes and must not be inferred onto the claimant route
- V14 integration-center family (`shared`, with public directory subset site-primary):
  - `GET /runtime/public/integration-apps`
  - `POST /runtime/account/integration-apps`
  - `GET /runtime/account/integration-apps`
  - `POST /runtime/account/integration-installations`
  - `GET /runtime/account/integration-installations`
  - `POST /runtime/account/integration-installations/:integrationInstallationId/connection`
  - `GET /runtime/account/integration-capabilities`
  - `GET /runtime/account/agents/:agentId/integrations/:integrationCode/eligibility`
  - this account integration capability directory plus bounded eligibility read family is the canonical outward integration capability trunk for downstream consumption
  - `GET /runtime/account/integration-apps` is the owned-app view for the current active org, not a synonym for installation presence
  - `GET /runtime/account/integration-installations` is the owned-installation view for the current account + org context
  - eligibility readability and invocation ownership must remain distinct even when they share the same bounded capability trunk
- public read model (`site-only consumer`, with payload semantics frozen in `site/public-universe-market-platform-contract.md`):
  - `GET /runtime/public/market`
  - `GET /runtime/public/universe`
  - `GET /runtime/public/universe/nodes/:nodeId`
  - `GET /runtime/public/universe/search`
  - `GET /runtime/public/universe/network-summary`
  - `GET /runtime/public/platform-stats`
- canonical unified account-owned agent plane (`shared`):
  - `/runtime/account/agents/:agentId/...` is the canonical client plane for both `ordinary_external_agent` and `platform_internal_operating_agent`
  - external agents enter this plane through the official provisional/query/claim path
  - operator agents enter this plane through `POST /runtime/account/agents/platform-managed-registrations`
  - bounded external-agent progression payloads may emit `progression_package = external_agent_dispatch_ready`
  - claimant heartbeat/presence first-wave operational package is frozen in `../agent-client/claimant-runtime-operational-package-contract.md`
  - account-scoped agent task plane now lives under `/runtime/account/agents/:agentId/...`
  - canonical task-dispatch / claim / lease family:
    - `GET /runtime/account/agents/:agentId/task-dispatches`
    - `GET /runtime/account/agents/:agentId/task-dispatches/:taskDispatchId`
    - `POST /runtime/account/agents/:agentId/claims`
    - `POST /runtime/account/agents/:agentId/claims/:claimId/accept`
    - `POST /runtime/account/agents/:agentId/claims/:claimId/reject`
    - `POST /runtime/account/agents/:agentId/leases`
    - `POST /runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/complete`
    - `POST /runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/fail`
    - `POST /runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/outcomes`
    - `POST /runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/evidence-bundles`
    - `POST /runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/confirmation-cycles`
    - `GET /runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/governed-work-closure`
    - minimum claimant payloads are route-specific: `outcomes` → `outcome_ref`, `reason`, `now`; `evidence-bundles` → minimum `now`; `confirmation-cycles` → `required_evidence_profile`, `started_at` (optional `sla_window_ref`)
    - canonical notification consumption family:
    - `GET /runtime/account/agents/:agentId/notifications`
    - `GET /runtime/account/agents/:agentId/notifications/:notificationId`
    - `POST /runtime/account/agents/:agentId/notifications/:notificationId/acknowledgements`
    - claimant execution package family decision record:
      - preferred package root: `/runtime/account/agents/:agentId/execution/*`
      - claimant runtime operational expansion routes:
        - `POST /runtime/account/agents/:agentId/execution/sync/upload`
        - `GET /runtime/account/agents/:agentId/execution/sync/download`
        - `POST /runtime/account/agents/:agentId/execution/evidence-submissions`
        - `POST /runtime/account/agents/:agentId/execution/proposals`
      - selected first-wave widened families are limited to claimant presence/online and listing create/update/activate subset
      - match-adjacent readiness remains a `later-wave stop` readback case in this wave, not a widened claimant matcher execution route
      - live commercial materialization readback family:
        - `GET /runtime/account/agents/:agentId/execution/listings/:listingId/materialization-status`
        - `GET /operator/execution/listings/:listingId/materialization-status?tenant_id=<authorized-tenant-id>&company_id=<authorized-company-id>`
        - this layer is canonical for reading whether the supported path is still blocked on match prerequisites, already has a real `match_id`, or has crossed into `opportunity_id` materialization
        - when no viable candidate survives generic matcher hard filters, this same layer must expose machine-readable `blocked_by` reasons rather than leaving downstream to infer silent matcher failure
        - current representative blocker literals include:
          - `candidate_category_or_sku_mismatch`
          - `candidate_region_mismatch`
          - `candidate_quantity_out_of_tolerance`

### Compatibility-only

- `POST /runtime/account/agents` remains a compatibility bridge and must not be treated as the canonical website entry path.

### Transitional

- continuation predecessor seams remain transitional and must not be mistaken for the canonical continuation owner.
- when a deeper opportunity-family read succeeds only through bounded residue recovery, that does not upgrade the family into normalized canonical truth by itself.
- opportunity continuation package family decision record:
  - preferred downstream operator package root: `/operator/opportunities/*`
  - preferred claimant readback root: `/runtime/account/agents/:agentId/execution/opportunities/:opportunityId/status`
  - lower-level `/runtime/opportunities/:opportunityId/control-plane*` routes remain supporting exact/internal seams rather than the preferred downstream package root
- end-state package family decision record:
  - preferred downstream operator package root: `/operator/end-state/*`
  - preferred claimant end-state readback root: `/runtime/account/agents/:agentId/execution/opportunities/:opportunityId/end-state`
- lower-level package-export and external-handoff seams remain supporting exact/runtime families rather than the preferred downstream package root
- canonical-semantic / governed-asset / template-proposal downstream route naming remains transitional where downstream alias drift is still open.

### Current bounded truth-class reading for opportunity-family residue

- `truth_class = canonical` → first-class opportunity truth already exists
- `truth_class = recovered` → bounded readback is being reconstructed from maintained continuation/package lineage residue
- `truth_class = normalized` → reserved for an explicit governed normalization action; downstream must not infer it from recovered success alone

- `truth_normalization_state = not_applicable` means the current read is already native canonical truth
- `truth_normalization_state = recovery_only` means the read is bounded-safe but still sits on residue recovery rather than a governed normalization write

### Historical

- predecessor V11/V12 packets and older launch handoffs are historical unless this center explicitly points to them as compatibility appendix material.

### Operator-only not downstream-facing

- operator-console-only governance actions, unrestricted audit/admin paths, and any route family that requires operator-only truth must not be treated as downstream-consumable truth even if they exist in Core.
- registration-bound `/runtime/agents/:registrationId/...` routes remain operator/control-plane surfaces even when they expose real Core-owned registration or capability truth.
- those routes may still be documented for operator tooling and bounded deep-read interpretation, but they are not the canonical claimant continuation surface.
- registration-bound operational access decision record:
  - family:
    - `POST /runtime/agents/:registrationId/heartbeat`
    - `GET /runtime/agents/:registrationId/presence`
    - `POST /runtime/agents/:registrationId/sync/upload`
    - `GET /runtime/agents/:registrationId/sync/download`
    - `POST /runtime/agents/:registrationId/evidence-submissions`
    - `POST /runtime/agents/:registrationId/proposals`
  - ownership: `operator-only not downstream-facing`
  - claimant/account sessions must not treat this family as the post-closure continuation path
  - raw-principal access to this family is a separate authorization model and must not be treated as equivalent to claimant continuation truth
  - downstream-safe stop rule: return to `/runtime/account/agents/:agentId/...` for claimant continuation and treat deeper operational access as operator/internal or later-wave scope unless another maintained contract explicitly promotes it
- older tenant/operator task routes such as `/runtime/agents/:registrationId/...` and `/runtime/notifications/...` remain internal/operator surfaces even though they reuse the same underlying dispatch / claim / lease / notification state machine truth.
- operator-only dispatch-authority review closure family:
  - `GET /runtime/agents/:registrationId/dispatch-authority-requests`
  - `POST /runtime/agents/:registrationId/dispatch-authority-requests/:requestId/approve`
  - `POST /runtime/agents/:registrationId/dispatch-authority-requests/:requestId/reject`
  - this family is the internal operator review closure after claimant request creation; it is reachable through the admin-session-backed operator workspace bridge and must not be rewritten as claimant-facing canonical truth.
- operator execution package family decision record:
  - preferred downstream operator package root: `/operator/execution/*`
  - this package is the maintained downstream operator execution model for post-claimant operational and business execution families once implemented
  - lower-level exact runtime families remain supporting seams and must not be treated as the preferred downstream operator package by route existence alone
- business execution family decision record:
  - family:
    - `POST /runtime/listings`
    - `POST /runtime/listings/:id`
    - `POST /runtime/listings/:id/activate`
    - `POST /runtime/listings/:id/match-candidates`
  - ownership: `operator-only not downstream-facing`
  - current enterprise-admin account/session context is not the same thing as operator-console execution ownership for this family
  - downstream-safe stop rule: do not treat `/runtime/listings` and adjacent execution routes as the next claimant continuation step after account-plane closure; they remain operator/business-execution surfaces or later-wave productization scope until Core explicitly promotes a claimant-consumable continuation path
- legacy `POST /runtime/integrations/:integrationCode/onboarding-contract` and provider-specific Haisi/WMS connector paths remain compatibility-only enterprise integration seams rather than a co-equal outward product trunk beside the canonical V14 integration-center model.
- current bounded connected-capability write ownership rule:
  - ordinary external agents may read discovery and eligibility truth
  - platform_managed agents own the bounded canonical account-plane inbound invocation path frozen in this wave
  - emitted payloads may now distinguish `ownership_view = eligibility_read` from `invocation_ownership = owned_by_current_actor | not_owned_by_current_actor`
  - emitted payloads may also expose `ownership_package = connected_capability_ownership` as the package identity for this bounded ownership story
- current connected-capability readiness ladder:
  - `discovered_not_installed`
  - `installation_pending_configuration`
  - `configured_actor_ineligible`
  - `configured_invokable`
- current bounded higher-throughput task-governance fan-out route:
  - `POST /runtime/agents/:registrationId/task-dispatch-batches`
- `authority_class_not_dispatchable` for an ordinary external claimed agent is a pre-activation gate, not permanent ineligibility.
- The downstream-safe reading is: a formal dispatch-authority activation path exists and is request/approval based; `active_role_binding_required` remains a separate governed-runtime projection/continuation gate, and the current claimant-owned repair path is `POST /runtime/account/agents/:agentId/governed-runtime/authorization-refresh` rather than a second approval workflow.
