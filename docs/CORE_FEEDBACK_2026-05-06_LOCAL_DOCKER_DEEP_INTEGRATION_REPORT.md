# Core Feedback — 2026-05-06 Local-Docker Deep Integration Report

## 目的

这份报告面向 Core 一侧，记录本轮基于 `bidvia-agent-client` 最新工作树与 `http://127.0.0.1:8787` 本地 docker Core 的**深度联调结果**。

报告重点不是“有没有 200”，而是：

1. 当前 ordinary claimant lane 已经真实跑通到哪里；
2. 哪些 deeper slices 仍然只能按 bounded / operator-only / proof-lane 解释；
3. 当前 Core 与 client 之间还存在哪些**真实问题**；
4. 每个问题都附带**请求方式、请求内容、返回内容**与归因证据。

---

## 环境与方法

- client worktree: `client-complete-optimization`
- local docker Core: `http://127.0.0.1:8787`
- health baseline:
  - `GET /healthz` -> `200`
  - `GET /readyz` -> `200`
- current fresh runtime identity markers:
  - `source_main_commit_marker = 79f5bd0`
  - `runtime_reported_version_marker = 79f5bd0`
  - `bootstrap_package_version_marker = 1.0.0`
  - `scenario_package_version_marker = 1.0.0`
  - `review_record_path = docs/org/review-records/2026-05-06_self_hosted_pg_recovery_review.md`
  - `runtime_identity_state = identity_complete`
  - `release_closure_state = terminal-envelope-bounded`
- machine-readable evidence:
  - `.sisyphus/evidence/client-bounded-matrix-20260506T161741.json`
  - `.sisyphus/evidence/client-bounded-matrix-latest.json`
  - `.sisyphus/evidence/client-live-rerun-20260506T090535Z.json`

本报告中的敏感 token / session header 已按需要做最小脱敏，但保留了足够的请求/响应结构用于复现与排查。

---

## 总结结论

### 已证明成立的 bounded slices

本轮 fresh live rerun 已经证明：

1. **账户 / session / org context**
2. **external agent onboarding / claim**
3. **account-plane continuation**
4. **dispatch-authority request + operator/admin closure**
5. **external binding**
6. **self-service capability / participation / task acceptance 写路径本身可达**
7. **materialization spine 的 bounded readback**
8. **integration ownership / eligibility bounded readback**
9. **public proof / terminal summary bounded reading**
10. **seeded proof-lane V10 readback**

### 当前仍未证明闭环的 slices

1. **claimant 从 dispatch-ready 自然进入 live task-plane execution**
2. **bounded governed-work closure 的 fresh live 证据**
3. **ordinary claimant lane 下的 deeper opportunity continuation**
4. **V11 launch observability 在当前 claimant/account-plane context 下可读**

其中第 1 项当前已经可以定性为 **Core hard defect**，不是 claimant 还缺前置动作。

---

## 已成功验证的请求链路（节选）

### 1. local-docker admin 登录成功

**Request**

```http
POST /runtime/admin/sessions/sign-in
Content-Type: application/json

{
  "email": "ops-admin@example.com",
  "password": "pw-admin-ops",
  "now": "2026-05-06T08:47:28Z"
}
```

**Response**

```json
{
  "admin_session": {
    "admin_session_id": "admin-session-<redacted>",
    "admin_account_id": "admin-seeded-super-admin"
  },
  "admin_account": {
    "email": "ops-admin@example.com",
    "role": "super_admin",
    "status": "active"
  }
}
```

### 2. admin invitation issuance 成功

**Request**

```http
POST /runtime/admin/invitations/issue
Content-Type: application/json
x-bidvia-admin-session-id: admin-session-<redacted>

{
  "invitation_type": "ENTERPRISE_ACCOUNT",
  "target_tenant_id": "tenant-a",
  "target_org_id": null,
  "target_role": null,
  "expires_at": "2026-05-07T08:48:22Z",
  "now": "2026-05-06T08:48:22Z"
}
```

**Response**

```json
{
  "invitation": {
    "invitation_id": "invite-ca32e13d-dc47-4a0a-99ad-38aa08b9fa0c",
    "invitation_token": "<redacted-active-token>",
    "invitation_type": "ENTERPRISE_ACCOUNT",
    "status": "ACTIVE"
  }
}
```

### 3. 刷新后的安装态 client 完成 enterprise sign-up / sign-in / account-me

**Command / Request semantics**

```bash
bidvia sign-up-enterprise --input '{"email":"task9-live-...@example.com","password":"secret-live-1","invitationToken":"<redacted>","companyName":"Task9 Live Co","now":"..."}'
bidvia sign-in --input '{"email":"task9-live-...@example.com","password":"secret-live-1","now":"..."}'
bidvia account-me
```

**Key Response facts**

```json
{
  "account": {
    "account_id": "acct-a6e9a957-343e-49b6-8e9b-3352b378491f",
    "account_type": "enterprise",
    "tenant_id": "tenant-public"
  },
  "session": {
    "session_id": "sess-c568541c-bce7-4c45-926e-4e8933c9ba40",
    "tenant_id": "tenant-public"
  },
  "memberships": [
    {
      "role": "enterprise_admin",
      "status": "active"
    }
  ],
  "agent_onboarding_allowed": true
}
```

### 4. provisional create / query / claim 成功

**Request chain**

```bash
bidvia create-provisional-agent --provisional-agent-ref prov-task9-1778057398
bidvia query-provisional-agent --provisional-agent-ref prov-task9-1778057398
bidvia claim-provisional-agent --provisional-agent-ref prov-task9-1778057398 --claim-token <redacted>
```

**Claim Response 关键字段**

```json
{
  "registration": {
    "agent_registration_id": "areg-b027e8a0-990e-440b-b78b-28faf98455a7",
    "agent_id": "prov-task9-1778057398",
    "principal_id": "claimed:prov-task9-1778057398",
    "status": "registered"
  },
  "recommended_next_step": "use_account_agent_surface",
  "official_runtime_surface": "/runtime/account/agents/:agentId"
}
```

### 5. dispatch-authority request + operator/admin closure 成功

**Request 1**

```bash
bidvia account-agent-dispatch-authority-request --agent-id prov-task9-1778057398
```

**Response 1**

```json
{
  "request": {
    "dispatch_authority_activation_request_id": "daar-da5a7048-250c-4cb8-a5a1-20e3eafb11e1",
    "status": "OPEN"
  }
}
```

**Request 2**

```http
POST /operator/dispatch-authority-requests/daar-da5a7048-250c-4cb8-a5a1-20e3eafb11e1/decision?tenant_id=tenant-public
Content-Type: application/json
x-bidvia-admin-session-id: admin-session-<redacted>
x-authorized-tenant-id: tenant-public

{
  "decision": "APPROVE",
  "resolution_reason": "task9-live-approval",
  "now": "2026-05-06T08:55:57Z"
}
```

**Response 2**

```json
{
  "request": {
    "dispatch_authority_activation_request_id": "daar-da5a7048-250c-4cb8-a5a1-20e3eafb11e1",
    "status": "APPROVED",
    "resolution_reason": "task9-live-approval"
  },
  "authority_profile": {
    "authority_profile_id": "authp-1778057757835",
    "authorized_action_scopes": ["EXTERNAL_WRITE"],
    "status": "active"
  }
}
```

### 6. external binding 成功

**Request**

```http
POST /runtime/account/agents/prov-task9-1778057398/external-account-bindings?tenant_id=tenant-public
Content-Type: application/json
x-bidvia-session-id: sess-<redacted>

{
  "system_type": "wms",
  "system_name": "task9-live-wms",
  "external_account_ref": "task9-live-ext-1",
  "now": "2026-05-06T08:59:53Z"
}
```

**Response 关键字段**

```json
{
  "surface_status": "account_scoped_binding_completed",
  "external_account_binding": {
    "external_account_binding_id": "eab-1778057993962-5112ba61-7a4c-48bb-bf99-de297dbec273",
    "status": "active"
  },
  "recommended_next_step": "continue_account_agent_closure",
  "next_step_kind": "account_plane_continuation"
}
```

### 7. materialization spine 的 bounded readback 成功

**Request chain**

```text
POST /runtime/account/agents/:agentId/execution/listings
POST /runtime/account/agents/:agentId/execution/listings/:listingId/activate
GET  /runtime/account/agents/:agentId/execution/listings/:listingId/status
GET  /runtime/account/agents/:agentId/execution/listings/:listingId/materialization-status
```

**materialization-status Response 关键字段**

```json
{
  "materialization_stage": "match_prerequisites_missing",
  "completion_class": "materialization-blocked",
  "blocked_by": [
    "candidate_category_or_sku_mismatch",
    "candidate_region_mismatch",
    "candidate_quantity_unit_mismatch",
    "candidate_quantity_out_of_tolerance"
  ],
  "recommended_next_step": "handoff_to_operator_for_match_repair",
  "next_step_kind": "handoff_to_operator",
  "next_claimant_readback_route": "/runtime/account/agents/:agentId/execution/opportunities/:opportunityId/status"
}
```

### 8. integration ownership / eligibility 的 bounded readback 成功

**Request chain**

```bash
bidvia account-integration-capabilities
bidvia account-agent-integration-eligibility --agent-id prov-task9-1778057398 --integration-code haisi-wms
```

**Eligibility Response 关键字段**

```json
{
  "eligibility": {
    "ownership_view": "eligibility_read",
    "invocation_ownership": "not_owned_by_current_actor",
    "eligible": false,
    "readiness_state": "discovered_not_installed",
    "reason_codes": ["integration_installation_missing"],
    "recommended_next_step": "install_integration_capability",
    "next_step_kind": "integration_installation"
  }
}
```

### 9. public proof / terminal summary bounded reading 成功

**Requests**

```http
GET /runtime/public/market
GET /runtime/public/universe
GET /runtime/public/universe/network-summary
GET /runtime/public/platform-stats
```

**Representative Response 关键字段**

```json
{
  "proof_boundary": "bounded_public_growth",
  "terminal_execution_convergence_state": "bounded-terminal-in-progress",
  "productization_reading": "upper_platform_growth_coherence"
}
```

### 10. V10 seeded proof-lane readback 成功

**Request**

```http
GET /runtime/v10/proof-lanes/opportunity-package-handoff?tenant_id=tenant-a&opportunity_id=opp-v10-proof-1&asset_id=rules_template%3Agoverned-asset-v10-proof-1&selected_subject_id=areg-v10-proof-ready
x-bidvia-admin-session-id: admin-session-<redacted>
```

**Response 关键字段**

```json
{
  "lane": {
    "opportunity_id": "opp-v10-proof-1",
    "package_id": "pkg-09fad087-5f68-46a8-944b-2f5af50604ff",
    "continuity_state": "external_handoff_queue_ready",
    "next_action": "manual_takeover",
    "provider_proof_state": "not_yet_completed"
  }
}
```

---

## 当前确认的 Core 问题

### 问题 1：task dispatch acceptance 写成功，但 authoritative readback 丢失（Core hard defect）

### 现象

claimant self-service 写请求当下返回成功，并且 response body 明确回显了：

```json
{
  "task_dispatch_acceptance": {
    "accepts_task_dispatches": true,
    "accepted_task_dispatch_scopes": ["COMMERCIAL_ACTION_REVIEW", "EXTERNAL_WRITE"]
  }
}
```

但随后三条 authoritative account-plane 读回 **一致** 返回：

- `GET /runtime/account/agents/:agentId`
- `GET /runtime/account/agents/:agentId/closure-status`
- `GET /runtime/account/agents/:agentId/dispatch-authority`

它们都显示：

```json
{
  "task_dispatch_acceptance": {
    "accepts_task_dispatches": false,
    "accepted_task_dispatch_scopes": []
  },
  "dispatch_eligibility": {
    "allowed": false,
    "reason_codes": ["task_dispatch_opt_in_required"],
    "recommended_next_step": "complete_task_dispatch_opt_in",
    "next_step_kind": "self_service_patch"
  }
}
```

并且使用当前 main repo 已确认的正确 `task_kind = COMMERCIAL_ACTION_REVIEW` 之后，真实 task-plane 写路径仍被挡住：

**Request**

```http
POST /runtime/account/agents/:agentId/task-dispatches?tenant_id=tenant-public
Content-Type: application/json
x-bidvia-session-id: sess-<redacted>
x-authorized-company-id: acct-a6e9a957-343e-49b6-8e9b-3352b378491f
x-bidvia-principal-id: claimed:prov-task9-1778057398

{
  "task_kind": "COMMERCIAL_ACTION_REVIEW",
  "task_ref": "task://task9-dispatch-...",
  "reason": "task9 live task-plane validation after full claimant closure",
  "now": "2026-05-06T...Z"
}
```

**Response**

```json
{
  "error": {
    "code": "task_dispatch_opt_in_required",
    "message": "agent registration is not eligible for commercial_action_review dispatch"
  }
}
```

### 归因证据

主仓库当前代码链已经能把这个问题收敛到 **Core hard defect**：

1. self-service 写处理器会把：
   - `accepts_task_dispatches`
   - `accepted_task_dispatch_scopes`
   写回 registration
2. account-agent detail / dispatch-authority / task-plane eligibility 的 authoritative read 都从同一个 registration truth snapshot 读取这些字段
3. 但 Postgres `agent_registrations` 的 schema、insert/upsert、reload 路径当前**完全没持久化/重建这两个字段**

### 结论

这不是 claimant 还缺前置动作，而是：

> **Core 当前 local-docker 运行时在 task-dispatch acceptance 的持久化/重建链路上存在硬缺陷。**

---

### 问题 2：错误 `task_kind` 没有干净 fail-close，而是 500 internal_error

当请求体里使用错误 task kind（例如旧错误值 `notification-review`）时，当前 Core 没有返回明确 4xx validation failure，而是：

**Response**

```json
{
  "error": {
    "code": "internal_error",
    "message": "internal server error"
  }
}
```

结合主仓库代码可知：

- 当前 route 读取的是 `task_kind`
- 合法枚举是：
  - `COMMERCIAL_ACTION_REVIEW`
  - `GOVERNED_ASSET_REVIEW`
- 错误值没有被明确 validator 拦下，最后落成 generic 500

### 结论

> **Core 在 account-agent task-dispatch create 上，对错误 `task_kind` / body shape 的 fail-close 不充分。**

---

### 问题 3：authorization refresh 成功后，principal-governed reads 仍然被挡在 `active_role_binding_required`

**Request**

```http
POST /runtime/account/agents/:agentId/governed-runtime/authorization-refresh?tenant_id=tenant-public
Content-Type: application/json
x-bidvia-session-id: sess-<redacted>

{
  "now": "2026-05-06T10:36:34Z"
}
```

**Response 关键字段**

```json
{
  "surface_status": "governed_runtime_authorization_refreshed",
  "closure_stage": "governed_runtime_authorized",
  "progression_package": "external_agent_dispatch_ready"
}
```

但紧接着再读：

- `GET /runtime/agents/:registrationId/readiness`
- `GET /runtime/agents/:registrationId/summary`

都返回：

```json
{
  "error": {
    "code": "active_role_binding_required",
    "required_actor": "enterprise_admin",
    "recommended_next_step": "refresh_authorization_context",
    "next_step_kind": "org_context_authorization_refresh"
  }
}
```

### 结论

这至少说明：

> **当前 local-docker 上 authorization refresh 成功，并不等于 principal-governed read 已经被同步打开。**

当前更稳妥的分类是：

- **Core semantics ambiguity / projection gap**

因为从 claimant 侧看，refresh 已经完成，但 governed read gating 没有收敛。

---

## 更深边界验证结果（不是 bug，但必须明确）

### V10 proof-lane 是 seeded / admin-session gated

我们用最新 main repo 提供的 seeded 参数和 admin session 实际读到了：

```http
GET /runtime/v10/proof-lanes/opportunity-package-handoff?tenant_id=tenant-a&opportunity_id=opp-v10-proof-1&asset_id=rules_template%3Agoverned-asset-v10-proof-1&selected_subject_id=areg-v10-proof-ready
```

返回 `200`，且带：

```json
{
  "lane": {
    "continuity_state": "external_handoff_queue_ready",
    "next_action": "manual_takeover",
    "provider_proof_state": "not_yet_completed"
  }
}
```

### V11 launch observability 不是 claimant natural-flow surface

1. 只带 admin session：

```json
{
  "error": {
    "code": "principal_context_missing"
  }
}
```

2. 带当前 claimant principal：

```json
{
  "error": {
    "code": "active_role_binding_required"
  }
}
```

3. `GET /runtime/opportunities` / `GET /runtime/opportunities?tenant_id=...` 当前直接 `404 not_found`

### 结论

> V10/V11 这层当前都仍是 bounded / operator-principal gated observability seam，不能被误读为 ordinary claimant continuation root。

---

## Core 一侧建议动作

### P0：修 task-dispatch acceptance 持久化 / 重建链路

请检查并修复：

- `agent_registrations` schema
- insert / upsert
- reload / reconstruction path

确保以下字段被 durably persisted and reloaded：

- `accepts_task_dispatches`
- `accepted_task_dispatch_scopes`

这是当前 ordinary surfaced lane 上最明确的 Core hard defect。

### P1：为 account-agent task-dispatch create 增加明确的 4xx validation

对于错误 body 或错误 `task_kind`：

- 不应再返回 `500 internal_error`
- 应返回明确的 validation / invalid_request 级别错误

### P1：明确 authorization refresh 与 principal-governed reads 的一致性语义

需要明确当前期望到底是哪一种：

1. refresh 成功后，principal-governed reads 应立即打开；
2. refresh 只是 account-plane repair，governed reads 还需要另一条显式 continuation；
3. 当前 local-docker 投影链路有延迟或缺陷。

### P2：继续把 deeper opportunity / proof surfaces 的 boundary 说清楚

当前验证已经确认：

- V10 seeded proof-lane 可读
- V11 launch observability 仍 gated
- `/runtime/opportunities` 没有 public list root

如果这些都是设计如此，那么建议在 maintained downstream docs 里把它们再写得更明确，避免 client 侧把它们当 ordinary lane 继续根。

---

## 附件

- machine-readable bounded matrix
  - `.sisyphus/evidence/client-bounded-matrix-20260506T161741.json`
  - `.sisyphus/evidence/client-bounded-matrix-latest.json`
- machine-readable fresh live rerun
  - `.sisyphus/evidence/client-live-rerun-20260506T090535Z.json`
- 当前总结性 evidence packet
  - `docs/CORE_FEEDBACK_2026-04-30_LOCAL_DOCKER_CLOSURE.md`

---

## 一句话结论

> 当前 client 已把 ordinary claimant/account-plane、bounded materialization、integration ownership/eligibility、public proof reading 以及 seeded proof-lane observability 推进到了 Core 当前支持边界；继续无法前进的关键 stop-line 已经收敛为具体 Core 问题，其中最明确的是 task-dispatch opt-in 持久化/重建缺陷。 
