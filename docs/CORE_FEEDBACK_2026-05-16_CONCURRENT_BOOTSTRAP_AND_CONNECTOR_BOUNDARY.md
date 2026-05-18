# Core Feedback — 2026-05-16 Concurrent Bootstrap and Connector Boundary Follow-up

## 目的

这份说明面向 Core 一侧，补充本轮 `client-integration-closure-hardening` 版本收尾后仍然保留的 **Core/runtime 协作问题**，供 Core 排查配合。

重点只覆盖两类内容：

1. **剩余 Core-side blocker 摘要**；
2. **最小复现步骤 + 证据路径**。

---

## 结论摘要

### 1. client 本轮已完成的修复

本轮 client 已完成以下 client-owned 修复：

- 清理 stale Pack B ordering；
- probe / workflow regression tests 补齐并通过；
- `diagnostic-bundle` 增加 rerun metadata / partial-failure taxonomy；
- `executionGuidance` 增加显式 `errorCategory`；
- `bootstrap-claimant-local-docker`：
  - 默认 bootstrap 标识不再依赖 `Date.now()`，避免并发碰撞；
  - downstream 返回异常 payload 时，不再 `TypeError` 崩溃，而是显式报出 bootstrap step 错误。

因此，**当前剩余问题不再是 client 自身崩溃或误判问题**。

### 2. 当前剩余 Core-side blocker

#### A. concurrent bootstrap 下的 runtime `internal_error`

在 **并发 bootstrap** 场景中，Core/runtime 仍可能在以下边界返回：

- dispatch-authority request
- dispatch-authority decision
- external binding 后续链路

返回形态为：

```json
{
  "error": {
    "code": "internal_error",
    "message": "internal server error"
  }
}
```

当前 client 已经把它显式 surfaced 为：

- `bootstrap dispatch-authority request failed: internal_error: internal server error`
- `bootstrap dispatch-authority decision failed: internal_error: internal server error`

这说明：

- **单次 bootstrap 正常**；
- **串行 rerun 正常**；
- **并发 bootstrap 仍可能触发 runtime 内部错误**。

按目前证据，这一剩余问题应归为 **Core/runtime-side concurrent bootstrap defect**，不是 client 继续解析出错。

#### B. connector boundary 仍然是明确 bounded-stop，而非 client 误调

在 `haisi-wms` same-org platform-managed handoff live report 中，ordinary external 与 platform-managed eligibility 都明确返回：

- `readiness_state = configured_not_invokable`
- `reason_codes = ["connector_inbound_not_supported"]`
- `invocation_route = null`

最终 inbound attempt 也返回：

```json
{
  "error": {
    "code": "connector_inbound_not_supported",
    "message": "bounded account-agent inbound invocation is only available for haisi-wms"
  }
}
```

这说明当前这里是 **Core 明确 fail-close / bounded-stop 语义**，不是 client 调错路由后自行失败。

---

## 对 Core 的最小复现步骤

### Repro A — 并发 bootstrap 导致 runtime `internal_error`

下面这个并发复现会同时发起两条 bootstrap 流，并记录 claim / dispatch-authority request / decision / external binding 的返回包：

```bash
node --input-type=module -e 'import { randomUUID } from "node:crypto"; const baseUrl="http://127.0.0.1:8787"; async function runFlow(label){ const now=new Date().toISOString(); const runSuffix=randomUUID(); const claimantEmail="bidvia-debug-"+runSuffix+"@example.com"; const claimantPassword="secret-live-1"; const provisionalAgentRef="prov-"+runSuffix; const externalSystemName="bootstrap-live-"+runSuffix; const externalAccountRef="ext-"+runSuffix; const adminSignIn=await (await fetch(baseUrl+"/runtime/admin/sessions/sign-in",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:"ops-admin@example.com",password:"pw-admin-ops",now})})).json(); const invitation=await (await fetch(baseUrl+"/runtime/admin/invitations/issue",{method:"POST",headers:{"content-type":"application/json","x-bidvia-admin-session-id":adminSignIn.admin_session.admin_session_id},body:JSON.stringify({invitation_type:"ENTERPRISE_ACCOUNT",target_tenant_id:"tenant-a",target_org_id:null,target_role:null,expires_at:new Date(Date.parse(now)+86400000).toISOString(),now})})).json(); await (await fetch(baseUrl+"/runtime/accounts/enterprise/sign-up",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:claimantEmail,password:claimantPassword,invitation_token:invitation.invitation.invitation_token,company_name:"Bidvia Debug Co",now})})).json(); const signIn=await (await fetch(baseUrl+"/runtime/sessions/sign-in",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:claimantEmail,password:claimantPassword,now})})).json(); const accountMe=await (await fetch(baseUrl+"/runtime/account/me",{method:"GET",headers:{"x-bidvia-session-id":signIn.session.session_id}})).json(); const provisionalCreate=await (await fetch(baseUrl+"/runtime/agents/provisional",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({provisional_agent_ref:provisionalAgentRef,now})})).json(); const returnedRef=provisionalCreate.provisional_agent?.provisional_agent_ref ?? provisionalCreate.provisional_agent_ref ?? provisionalAgentRef; const provisionalQuery=await (await fetch(baseUrl+"/runtime/agents/provisional?provisional_agent_ref="+encodeURIComponent(returnedRef),{method:"GET"})).json(); const claimToken=provisionalCreate.provisional_agent?.claim_token ?? provisionalCreate.claim_token ?? provisionalQuery.provisional_agent?.claim_token; const claim=await (await fetch(baseUrl+"/runtime/agents/provisional/claim",{method:"POST",headers:{"content-type":"application/json","x-bidvia-session-id":signIn.session.session_id},body:JSON.stringify({provisional_agent_ref:returnedRef,claim_token:claimToken,now})})).json(); const agentId=claim.registration?.agent_id; const dispatchAuthorityRequest=await (await fetch(baseUrl+"/runtime/account/agents/"+encodeURIComponent(agentId)+"/dispatch-authority-requests",{method:"POST",headers:{"content-type":"application/json","x-bidvia-session-id":signIn.session.session_id},body:JSON.stringify({requested_target:"bounded_dispatch_authority_activation",now})})).json(); const requestId=dispatchAuthorityRequest.request?.dispatch_authority_activation_request_id; const dispatchAuthorityDecision=await (await fetch(baseUrl+"/operator/dispatch-authority-requests/"+encodeURIComponent(requestId)+"/decision?tenant_id="+encodeURIComponent(accountMe.account.tenant_id),{method:"POST",headers:{"content-type":"application/json","x-bidvia-admin-session-id":adminSignIn.admin_session.admin_session_id,"x-authorized-tenant-id":accountMe.account.tenant_id},body:JSON.stringify({decision:"APPROVE",resolution_reason:"bootstrap-claimant-local-docker",now})})).json(); const externalBinding=await (await fetch(baseUrl+"/runtime/account/agents/"+encodeURIComponent(agentId)+"/external-account-bindings?tenant_id="+encodeURIComponent(accountMe.account.tenant_id),{method:"POST",headers:{"content-type":"application/json","x-bidvia-session-id":signIn.session.session_id},body:JSON.stringify({system_type:"wms",system_name:externalSystemName,external_account_ref:externalAccountRef,now})})).json(); return {label,claim,dispatchAuthorityRequest,dispatchAuthorityDecision,externalBinding}; } const results=await Promise.allSettled([runFlow("a"),runFlow("b")]); console.log(JSON.stringify({command:"concurrent-bootstrap-repro",generatedAt:new Date().toISOString(),baseUrl,results},null,2));'
```

#### 预期观察

- 至少一条 flow 可能成功；
- 另一条 flow 可能在 `dispatchAuthorityRequest` / `dispatchAuthorityDecision` / `externalBinding` 边界返回 `internal_error`；
- 这不是 client 空指针，而是 runtime 直接返回的 error payload。

### Repro B — 顺序 rerun 证明 client-side stale-state 问题已不再是主因

顺序执行以下命令，使用不同 `state-path` / `output`：

```bash
npx tsx scripts/live-probes/run-pack-b-task-progression.ts --base-url http://127.0.0.1:8787 --state-path "/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/chunk3-pack-b-state-seq-a.json" --output "/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/chunk3-pack-b-report-seq-a.json"

npx tsx scripts/live-probes/run-p1-integration-lifecycle.ts --base-url http://127.0.0.1:8787 --state-path "/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/chunk3-integration-state-seq-a.json" --output "/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/chunk3-integration-report-seq-a.json"

npx tsx scripts/live-probes/run-pack-b-task-progression.ts --base-url http://127.0.0.1:8787 --state-path "/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/chunk3-pack-b-state-seq-b.json" --output "/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/chunk3-pack-b-report-seq-b.json"

npx tsx scripts/live-probes/run-p1-integration-lifecycle.ts --base-url http://127.0.0.1:8787 --state-path "/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/chunk3-integration-state-seq-b.json" --output "/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/chunk3-integration-report-seq-b.json"
```

#### 预期观察

- 顺序 rerun 成功；
- `state-path` / `outputPath` 分离后，没有 stale-state contamination；
- 说明当前 remaining blocker 不是 client 本地状态污染，而是并发 bootstrap 情况下的 runtime/internal behavior。

---

## 证据文件路径

### Core-side concurrent bootstrap evidence

- `/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/core-concurrent-bootstrap-repro.json`
  - 并发 bootstrap 双 flow 结果；
  - 至少一条成功，另一条可能在 dispatch-authority decision / external binding 边界返回 `internal_error`。

### Sequential rerun success evidence

- `/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/chunk3-pack-b-state-seq-a.json`
- `/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/chunk3-pack-b-report-seq-a.json`
- `/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/chunk3-pack-b-state-seq-b.json`
- `/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/chunk3-pack-b-report-seq-b.json`
- `/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/chunk3-integration-state-seq-a.json`
- `/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/chunk3-integration-report-seq-a.json`
- `/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/chunk3-integration-state-seq-b.json`
- `/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/chunk3-integration-report-seq-b.json`

### Phase-marker / bounded-stop evidence

- `/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/chunk3-integration-phase-check-report.json`
  - 证明 probe 已输出 machine-readable phase markers：
    - `bootstrap -> pass`
    - `bounded-stop -> blocked`

### Platform-managed honest bounded-stop evidence

- `/var/folders/6k/66kf75292rsdn03pwrjw203c0000gn/T/opencode/final-platform-report.json`
  - ordinary external eligibility: `configured_not_invokable`
  - platform-managed eligibility: `configured_not_invokable`
  - inbound attempt: `connector_inbound_not_supported`

---

## Core 排查建议边界

这份反馈**不主张 runtime 内部根因**，只建议 Core 优先排查以下边界：

1. concurrent bootstrap 下 dispatch-authority request / decision 是否存在共享状态或竞争窗口；
2. 同一时段多条 claimant bootstrap 流是否在 operator review / authority profile activation / external binding 路径上触发 runtime internal error；
3. `haisi-wms` 当前 inbound boundary 的 `configured_not_invokable` / `connector_inbound_not_supported` 是否为当前预期 fail-close 语义，还是仍需进一步 contract clarification。

当前 client 行为边界已经是：**不再崩溃，只显式暴露 Core 返回的错误或 bounded-stop truth**。
