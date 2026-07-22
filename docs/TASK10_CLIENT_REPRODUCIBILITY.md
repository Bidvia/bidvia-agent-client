# Task 10 Client Reproducibility

This runbook is the owner-only, copyable, security-safe audit path for the frozen Task 10 client reproducibility handoff for attempt 007. Use it to confirm the frozen authority set, prepare clean disposable roots, run the client-side coordinator, and review the resulting package without leaking private evidence.

## Scope and boundary

This runbook is for owner audit and review packaging only. The conclusion is client-owned, review-only, and not Core-authored. It does not create a second source of Core truth, does not infer a Core `passed` result, and does not authorize any publication of private evidence bytes.

The historical attempt-2026-07-18-task10-postmerge-002 package remains the preserved historical record and is not superseded by this attempt-007 runbook. This document does not rewrite, republish, or operationalize the old attempt-002 package.

## Immediate caveats

- Use four distinct disposable checkout roots: Core runtime main, Client main, Site main, and detached Core evidence.
- External absolute private roots are valid when they stay outside all repositories, distinct/non-overlapping/non-symlinked, owner-only 0700, and empty before the run starts.
- Keep the selected source packet repo-relative. Do not rewrite it as an absolute local path.
- Set `BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN` separately in the environment. Check only that it is present. Never print, publish, archive, or inline its value.
- The current frozen expectation is `passed`, but it is never forced. Only the client evaluator and package validation may decide `passed` or `blocked`.
- If the current probe blocks before producer launch, no Compose resources should exist because no Core command ran.

## 1. Frozen authority

Frozen authority and immutable values for attempt 007:

- Attempt id: `attempt-2026-07-20-task10-postmerge-007`
- Core runtime SHA: `0b3f266f2c087fb7d808bb3f0ddb57ce86173cc9`
- Client SHA: `31195b898a6794e78518bb9b71833ecaaf5e563e`
- Site SHA: `f0198caf349fad367c016d7ff333172ec71a55be`
- Core evidence publication commit: `5ab02058491960c305162091316d65e1ffa97347`
- Core execution evidence path: `docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/core-execution-evidence.json`
- Core execution evidence SHA: `c68a783433f8d58c59949a2ab496fc9e3ca1b42fd0b0f0318ebfb81576dc3980`
- Bundle manifest path: `docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/bundle-manifest.json`
- Bundle manifest SHA: `8141b41945e79bd0dec4eb48cb4db34cbebb3bd810476d7b8863b591336e8b41`
- Preflight path: `docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/preflight-artifact.json`
- Preflight SHA: `45139bf82f6ba33793855d03442fbd939e7dbe82f565e5b5ac6a30e8150f27bf`
- Reusable packet wrapper path: `docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-inputs/reusable-packet.json`
- Reusable packet wrapper file SHA: `96d04e1e77f895db916c94170ee34216bf63422c62711cb06130f30a173b92f1`
- Reusable packet embedded artifact hash: `0ba97954370ef8f2e362f77dcb5abac5c24d8c8eef83116a2e783307f0cd6210`
- Reusable packet source ref: `core:0b3f266f2c087fb7d808bb3f0ddb57ce86173cc9:docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json:53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093`
- Exact selected reusable refs: `business-method-atom:method-1`, `lineage-unit:c1-method-1-publish-lineage`, `rules_template:chemical-match-rule-baseline`, `evidence-shape:success-001`
- Selected source packet path: `docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json`
- Selected source packet SHA: `53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093`
- Package identities: `bidvia-d2-ws6-t1-runtime@0.0.0`, `@bidvia/client@1.0.0`, `bidvia-site@0.1.0`
- Plain lock hashes: `504007a7fb70616df1409eb2e003a3470ea6e23d990ea61d8eea195a0a1fce62`, `92544096de62a366c66ba7c307ed6fa3ab9d2890bd7a6d6220adb4a0d7f627c6`, `a0ef0825f04cd9c06bba396f8eff1bda32a557cf77f3c69ecd01ecb99b026732`
- Source marker: `0b3f266f2c087fb7d808bb3f0ddb57ce86173cc9`
- Runtime marker: `task10-runtime-0b3f266`
- Bootstrap marker: `task10-bootstrap-0b3f266`
- Scenario marker: `task10-scenario-0b3f266`
- Provider protocol version: `task10-local-http-v1`
- Provider fixture identity: `provider-fixture:haisi-wms:task10`
- Ports: `59625`, `59626`, `59627`, `59628`
- Compose project: `bidvia-task10-attempt-2026-07-20-task10-postmerge-007`
- Container identities: `bidvia-task10-attempt-2026-07-20-task10-postmerge-007-runtime`, `bidvia-task10-attempt-2026-07-20-task10-postmerge-007-postgres`, `bidvia-task10-attempt-2026-07-20-task10-postmerge-007-fixture`, `bidvia-task10-attempt-2026-07-20-task10-postmerge-007-operator`
- Network identity: `bidvia-task10-attempt-2026-07-20-task10-postmerge-007_default`
- Archive recipe: `git archive --format=tar.gz --prefix=bidvia-core-task10-postmerge-007/ 5ab02058491960c305162091316d65e1ffa97347 docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-inputs docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output`
- Archive SHA: `90360fc749b6df227b2935ea115021f0d60e9f0afce6b3eb7169d2dcd90b0563`

Exact authority URLs:

- `https://github.com/Bidvia/bidvia-agent-client/issues/8#issuecomment-5020392826`
- `https://github.com/Bidvia/bidvia-main/blob/8957aaff35436621439f9a62a741c522e95423c8/docs/runbooks/merged-main-reproducibility-client-handoff.md`
- `https://github.com/Bidvia/bidvia-main/blob/5ab02058491960c305162091316d65e1ffa97347/docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/core-execution-evidence.json`
- `https://github.com/Bidvia/bidvia-main/blob/5ab02058491960c305162091316d65e1ffa97347/docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/bundle-manifest.json`
- `https://github.com/Bidvia/bidvia-main/blob/5ab02058491960c305162091316d65e1ffa97347/docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/preflight-artifact.json`
- `https://github.com/Bidvia/bidvia-main/blob/5ab02058491960c305162091316d65e1ffa97347/docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-inputs/reusable-packet.json`
- `https://github.com/Bidvia/bidvia-main/blob/5ab02058491960c305162091316d65e1ffa97347/docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json`

The frozen bundle manifest contract is exact. `manifest.files must contain exactly 14 entries`.

## 2. Clean producer root preparation

Prepare four disposable roots. The implementation worktree is not a producer root. There is no `.sisyphus` dependency.

Create the private roots and the external publication root first as owner-only 0700 directories. This owner runbook assumes macOS and uses `stat -f '%Lp'` for the exact Darwin mode check. External absolute private roots are valid when they stay outside all repositories, outside Git work trees, distinct/non-overlapping/non-symlinked, owner-only 0700, and initially empty. The selected source packet stays repo-relative.

```bash
umask 077
session_root="$(realpath "$(mktemp -d "${TMPDIR:-/tmp}/task10-client-reproducibility.XXXXXX")")"
private_input_root="$session_root/private-input"
private_output_root="$session_root/private-output"
private_log_root="$session_root/private-logs"
publication_root="$session_root/provider-proof-terminal-client-validation-artifacts"

mkdir -m 700 \
  "$private_input_root" \
  "$private_output_root" \
  "$private_log_root" \
  "$publication_root"

for root in \
  "$private_input_root" \
  "$private_output_root" \
  "$private_log_root" \
  "$publication_root"
do
  [[ "$root" = /* ]] || { print -u2 -- "root must be absolute: $root"; exit 1; }
  [[ -d "$root" ]] || { print -u2 -- "root must exist as a directory: $root"; exit 1; }
  [[ ! -L "$root" ]] || { print -u2 -- "root must not be a symlink: $root"; exit 1; }
  canonical_root="$(realpath "$root")" || exit 1
  [[ "$canonical_root" = "$root" ]] || { print -u2 -- "root must not traverse a symlink ancestor: $root"; exit 1; }
  [[ "$(stat -f '%Lp' "$root")" = "700" ]] || { print -u2 -- "root mode must be 700 on Darwin: $root"; exit 1; }
  [[ -z "$(find "$root" -mindepth 1 -maxdepth 1 -print -quit)" ]] || { print -u2 -- "root must start empty: $root"; exit 1; }
  if git -C "$root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    print -u2 -- "root must stay outside Git work trees: $root"
    exit 1
  fi
done

node --input-type=module -e 'import path from "node:path"; const roots = process.argv.slice(1); const nested = (value) => value !== "" && value !== "." && !value.startsWith("..") && !path.isAbsolute(value); for (let i = 0; i < roots.length; i += 1) { for (let j = i + 1; j < roots.length; j += 1) { if (roots[i] === roots[j]) { throw new Error(`roots must be distinct: ${roots[i]}`); } const forward = path.relative(roots[i], roots[j]); const backward = path.relative(roots[j], roots[i]); if (nested(forward) || nested(backward)) { throw new Error(`roots must not overlap: ${roots[i]} :: ${roots[j]}`); } } }' \
  "$private_input_root" \
  "$private_output_root" \
  "$private_log_root" \
  "$publication_root"
```

Those shell variables correspond to the coordinator placeholders `<absolute-empty-private-input-root>`, `<absolute-empty-private-output-root>`, `<absolute-private-log-root>`, and `<absolute-publication-root>`.

Producer roots must be clean disposable checkouts with these exact expectations:

- Core runtime root: HEAD `0b3f266f2c087fb7d808bb3f0ddb57ce86173cc9`, main branch, upstream `origin/main`, empty porcelain, lock hash `504007a7fb70616df1409eb2e003a3470ea6e23d990ea61d8eea195a0a1fce62`, package identity `bidvia-d2-ws6-t1-runtime@0.0.0`
- Client root: HEAD `31195b898a6794e78518bb9b71833ecaaf5e563e`, main branch, upstream `origin/main`, empty porcelain, lock hash `92544096de62a366c66ba7c307ed6fa3ab9d2890bd7a6d6220adb4a0d7f627c6`, package identity `@bidvia/client@1.0.0`
- Site root: HEAD `f0198caf349fad367c016d7ff333172ec71a55be`, main branch, upstream `origin/main`, empty porcelain, lock hash `a0ef0825f04cd9c06bba396f8eff1bda32a557cf77f3c69ecd01ecb99b026732`, package identity `bidvia-site@0.1.0`
- Core evidence root: detached HEAD `5ab02058491960c305162091316d65e1ffa97347`, null upstream, empty porcelain, bundle SHA `c68a783433f8d58c59949a2ab496fc9e3ca1b42fd0b0f0318ebfb81576dc3980`, manifest SHA `8141b41945e79bd0dec4eb48cb4db34cbebb3bd810476d7b8863b591336e8b41`, preflight SHA `45139bf82f6ba33793855d03442fbd939e7dbe82f565e5b5ac6a30e8150f27bf`

Run these checks in each of the three producer roots, then compare the output to the frozen values above:

```bash
git rev-parse HEAD
git branch --show-current
git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'
git status --porcelain
shasum -a 256 package-lock.json
node --input-type=module -e 'import fs from "node:fs"; const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")); console.log(`${pkg.name}@${pkg.version}`);'
```

Run these checks in the detached Core evidence root. The bundle, manifest, wrapper, selected packet, and preflight files must match exactly. The upstream check must stay null upstream because the checkout is detached.

```bash
git rev-parse HEAD
git branch --show-current
git status --porcelain
shasum -a 256 "docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/core-execution-evidence.json"
shasum -a 256 "docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/bundle-manifest.json"
shasum -a 256 "docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-inputs/reusable-packet.json"
shasum -a 256 "docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json"
shasum -a 256 "docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/preflight-artifact.json"
```

Use `npm ci` only in the three producer roots, then reassert HEAD, main branch, `origin/main`, empty porcelain, package identity, and package-lock SHA. Never install or modify the evidence checkout.

## 3. Private roots and token boundary

Set the token separately in the environment before any Core-owned producer execution. Name only `BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN`. This runbook documents a presence check only. It does not display the value.

```bash
if [[ -z "${BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN:-}" ]]; then
  print -u2 -- 'missing required rehearsal token'
  exit 1
fi
```

The token boundary is child-only producer injection boundary. The owner shell may hold the token, but only the child producer process receives it. The token must not appear in command blocks, manifests, archives, receipts, stdout, stderr, copied notes, or published package bytes.

Private input root, private output root, and private log root must stay outside Git, outside every checkout, outside publication, initially empty, owner-only 0700, and distinct. Keep publication root separate from all private roots. Keep all four roots free of nesting, overlap, and symlink behavior. Never relocate private evidence into the repo or modify Core to force pass.

## 4. Reconstructed Core producer command

The fully populated terminal command below is the frozen attempt-007 Core producer invocation contract. Use it as the executable authority-aligned handoff command.

Invoke it from the frozen Core root only when the coordinator delegates the producer path. The owner uses this template for audit, not a second competing execution.

```bash
npm run run:merged-main-reproducibility-producers -- \
  --core-root "<absolute-clean-core-main-root>" \
  --client-root "<absolute-clean-client-main-root>" \
  --site-root "<absolute-clean-site-main-root>" \
  --core-sha "0b3f266f2c087fb7d808bb3f0ddb57ce86173cc9" \
  --client-sha "31195b898a6794e78518bb9b71833ecaaf5e563e" \
  --site-sha "f0198caf349fad367c016d7ff333172ec71a55be" \
  --core-branch "main" \
  --client-branch "main" \
  --site-branch "main" \
  --core-upstream "origin/main" \
  --client-upstream "origin/main" \
  --site-upstream "origin/main" \
  --core-lockfile-hash "504007a7fb70616df1409eb2e003a3470ea6e23d990ea61d8eea195a0a1fce62" \
  --client-lockfile-hash "92544096de62a366c66ba7c307ed6fa3ab9d2890bd7a6d6220adb4a0d7f627c6" \
  --site-lockfile-hash "a0ef0825f04cd9c06bba396f8eff1bda32a557cf77f3c69ecd01ecb99b026732" \
  --core-package-identity "bidvia-d2-ws6-t1-runtime@0.0.0" \
  --client-package-identity "@bidvia/client@1.0.0" \
  --site-package-identity "bidvia-site@0.1.0" \
  --attempt-id "attempt-2026-07-20-task10-postmerge-007" \
  --input-evidence-root "<empty-private-input-root>" \
  --output-root "<empty-private-output-root>" \
  --selected-reusable-source-packet "docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json" \
  --selected-reusable-source-packet-sha256 "53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093" \
  --source-main-commit-marker "0b3f266f2c087fb7d808bb3f0ddb57ce86173cc9" \
  --runtime-reported-version-marker "task10-runtime-0b3f266" \
  --bootstrap-package-version-marker "task10-bootstrap-0b3f266" \
  --scenario-package-version-marker "task10-scenario-0b3f266" \
  --provider-protocol-version "task10-local-http-v1" \
  --postgres-port "59625" \
  --runtime-port "59626" \
  --operator-port "59627" \
  --fixture-port "59628" \
  --provider-fixture-identity "provider-fixture:haisi-wms:task10"
```

The three lock hashes above are plain lowercase 64-character hex values. They must remain plain and must not use any `sha256:` prefix.

## 5. Producer lifecycle and current attempt-007 execution truth

Startup, readiness `/readyz`, reset, success-001, recovery-001, success-002-reuse, restart/readback, and finally teardown is specified and owned by the frozen Core producer contract.

Frozen runtime identity for that automatic path:

- Compose project: `bidvia-task10-attempt-2026-07-20-task10-postmerge-007`
- Containers: `bidvia-task10-attempt-2026-07-20-task10-postmerge-007-runtime`, `bidvia-task10-attempt-2026-07-20-task10-postmerge-007-postgres`, `bidvia-task10-attempt-2026-07-20-task10-postmerge-007-fixture`, `bidvia-task10-attempt-2026-07-20-task10-postmerge-007-operator`
- Network identity: `bidvia-task10-attempt-2026-07-20-task10-postmerge-007_default`
- Fixture identity: `provider-fixture:haisi-wms:task10`
- Provider protocol version: `task10-local-http-v1`
- Ports: `59625`, `59626`, `59627`, `59628`

The client coordinator/adapter performs authority/checkout/private-root checks, delegates one Core command only if probe permits, validates returned artifacts, and does not implement or independently attest Docker teardown.

The current frozen expectation is `passed`, but it is never forced, only the client evaluator and package validation may decide `passed` or `blocked`.

Valid external private roots permit producer execution now. Invalid overlap or root-contract violations may still block before producer launch, including reportable `core-producer-private-root-contract-unsatisfied` outcomes when the coordinator detects an invalid root contract. External private roots outside every repository are valid when they stay distinct, non-overlapping, non-symlinked, 0700, and empty. Selected source packet remains the repo-relative frozen path.

Never relocate private evidence into the repo or modify Core to force pass.

After any launched producer, the owner must inspect Core producer evidence and verify teardown on the host before accepting the package.

```bash
runtime_container_query="$(docker ps -a --filter "name=^bidvia-task10-attempt-2026-07-20-task10-postmerge-007-runtime$" --format '{{.Names}}')" || {
  print -u2 -- 'docker query failed for runtime container absence check'
  exit 1
}
if [[ -n "$runtime_container_query" ]]; then
  print -u2 -- 'container still present: bidvia-task10-attempt-2026-07-20-task10-postmerge-007-runtime'
  exit 1
fi

postgres_container_query="$(docker ps -a --filter "name=^bidvia-task10-attempt-2026-07-20-task10-postmerge-007-postgres$" --format '{{.Names}}')" || {
  print -u2 -- 'docker query failed for postgres container absence check'
  exit 1
}
if [[ -n "$postgres_container_query" ]]; then
  print -u2 -- 'container still present: bidvia-task10-attempt-2026-07-20-task10-postmerge-007-postgres'
  exit 1
fi

fixture_container_query="$(docker ps -a --filter "name=^bidvia-task10-attempt-2026-07-20-task10-postmerge-007-fixture$" --format '{{.Names}}')" || {
  print -u2 -- 'docker query failed for fixture container absence check'
  exit 1
}
if [[ -n "$fixture_container_query" ]]; then
  print -u2 -- 'container still present: bidvia-task10-attempt-2026-07-20-task10-postmerge-007-fixture'
  exit 1
fi

operator_container_query="$(docker ps -a --filter "name=^bidvia-task10-attempt-2026-07-20-task10-postmerge-007-operator$" --format '{{.Names}}')" || {
  print -u2 -- 'docker query failed for operator container absence check'
  exit 1
}
if [[ -n "$operator_container_query" ]]; then
  print -u2 -- 'container still present: bidvia-task10-attempt-2026-07-20-task10-postmerge-007-operator'
  exit 1
fi

network_query="$(docker network ls --filter "name=^bidvia-task10-attempt-2026-07-20-task10-postmerge-007_default$" --format '{{.Name}}')" || {
  print -u2 -- 'docker query failed for network absence check'
  exit 1
}
if [[ -n "$network_query" ]]; then
  print -u2 -- 'network still present: bidvia-task10-attempt-2026-07-20-task10-postmerge-007_default'
  exit 1
fi

volume_query="$(docker volume ls --filter "label=com.docker.compose.project=bidvia-task10-attempt-2026-07-20-task10-postmerge-007" --format '{{.Name}}')" || {
  print -u2 -- 'docker query failed for compose-project-labeled volume absence check'
  exit 1
}
if [[ -n "$volume_query" ]]; then
  print -u2 -- 'compose-project-labeled volumes still present'
  exit 1
fi
```

All must be absent or empty after a launched producer.

## 6. Client-side six gates

Each gate depends on every earlier source index. Keep this exact dependency order:

1. `npm test`
2. `npm run typecheck`
3. `npm run build`
4. `npm run validate`
5. `npm run validate:release-readiness`
6. `npm run validate:release-gate`

If any gate exits nonzero, every later gate is skipped, the producer path does not run, and the coordinator may still assemble a valid blocked package. If authority verification is reportable-blocked, all six gate rows are skipped with the authority block reason.

The required scenario families stay fixed in this exact order:

- `session-access`
- `readiness`
- `dispatch`
- `replay-recovery`
- `result-submission`

The scenario matrix has seven rows across five scenario families:

- session-access: 1
- readiness: 2
- dispatch: 1
- replay-recovery: 2
- result-submission: 1

## 7. Coordinator command

Run the client-side coordinator from the Task 10 implementation worktree with this exact nine-flag command. The frozen Client checkout is passed only through `--client-checkout`; it remains a separate clean validation root and does not host the uncommitted coordinator implementation.

```bash
npm run validate:task10-client-reproducibility -- \
  --private-input "<absolute-empty-private-input-root>" \
  --private-output "<absolute-empty-private-output-root>" \
  --private-log-root "<absolute-private-log-root>" \
  --publication-root "<absolute-publication-root>" \
  --core-checkout "<absolute-clean-core-main-root>" \
  --core-evidence-checkout "<absolute-detached-core-evidence-root>" \
  --client-checkout "<absolute-clean-client-main-root>" \
  --site-checkout "<absolute-clean-site-main-root>" \
  --core-bundle "<absolute-detached-core-evidence-root>/docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/core-execution-evidence.json"
```

## 8. Result interpretation, package membership, and handoff

Exit 0 only after an immutable valid `passed` or `blocked` package.

The current owner expectation is `passed`, but the package may still end `blocked` when evaluator or package validation finds a reportable problem. Tooling failures exit nonzero and emit no success receipt. A `passed` conclusion is invalid unless the probe and every downstream check execute and pass.

The current outcome is client-owned, review-only, and not Core-authored.

Exact non-claims:

- `not production readiness`
- `not governed release acceptance`
- `not prd promotion`
- `not contract acceptance`
- `not purchase-order truth`
- `not payment or settlement finality`
- `not fulfillment or after-sales completion`
- `not dispute or arbitration completion`
- `not provider execution completion`
- `not human commercial acceptance`
- `not a Core-authored conclusion`

Approved package members:

- `README.md`
- `client-conclusion.json`
- `client-fingerprint.json`
- `command-log.json`
- `scenario-matrix.json`
- `secret-review.json`
- `SHA256SUMS.txt`

Review the archive and receipt checks before handoff. The package must bind the archive SHA, the conclusion SHA, the receipt, and the package membership verification results.

The sanitized stdout fields are: command, conclusion, packageName, packagePath, conclusionPath, conclusionSha256, archivePath, archiveSha256.

Private output contents, raw logs, raw matrix bodies, credentials, session IDs, generated account IDs, emails, and absolute local paths stay out of Git, publication, and sanitized stdout.

Only approved sanitized opaque SHA handles and attestations may cross the boundary.

Final clean and teardown verification:

- recheck each disposable checkout for HEAD, main branch or detached HEAD as applicable, `origin/main` or null upstream as applicable, and empty porcelain
- confirm the detached Core evidence root still matches the frozen bundle SHA, manifest SHA, reusable wrapper SHA, selected packet SHA, and preflight SHA
- confirm publication contains only the approved sanitized package members plus the bound archive and receipt outputs
- keep private input, private output, and private log root outside Git through audit retention
- cleanup after the owner retention policy allows it

Offline handoff and offline validation guidance:

- hand off the sanitized package, archive SHA, conclusion SHA, and receipt only
- keep the copied package directory, archive, and receipt as byte-for-byte copy outputs with the same basename
- verify/recompute hashes, not rewrite `SHA256SUMS.txt` contents
- revalidate the copied package and archive before relying on it
- never rewrite receipt paths
- do not hand off private output contents, raw logs, raw matrix bodies, credentials, session IDs, generated account IDs, emails, or absolute local paths
- do not add commit or push steps to this runbook without separate authorization

Set the publication inputs for offline verification:

```bash
EXTERNAL_PUBLICATION_ROOT="<absolute-external-publication-root>/provider-proof-terminal-client-validation-artifacts"
PACKAGE_NAME="<package-name>"
```

Run offline validation directly against the external publication root. All four checks must stay true: `archiveVerified: true`, `receiptVerified: true`, `internalManifestVerified: true`, and `secretScanVerified: true`.

```bash
npx tsx -e 'import { createDefaultTask10ArchiveDependencies, validateOfflinePublication } from "./scripts/task10/publication.ts"; void (async () => { const publicationRoot = process.argv[1]; const packageName = process.argv[2]; if (!publicationRoot || !packageName) throw new Error("publication root and package name are required"); const result = await validateOfflinePublication({ packageDirectoryPath: `${publicationRoot}/${packageName}`, archivePath: `${publicationRoot}/${packageName}.tar.gz`, receiptPath: `${publicationRoot}/${packageName}.publication.json`, archive: createDefaultTask10ArchiveDependencies(), publicationRootNameForReceipt: "provider-proof-terminal-client-validation-artifacts" }); if (!(result.checks.archiveVerified && result.checks.receiptVerified && result.checks.internalManifestVerified && result.checks.secretScanVerified)) throw new Error("offline validation checks must all be true"); console.log(JSON.stringify(result.checks, null, 2)); })();' -- "$EXTERNAL_PUBLICATION_ROOT" "$PACKAGE_NAME"
```

Copy only the package directory, archive, and receipt from the external publication root into the repo-local handoff directory. Preserve the same basename under `$PWD/provider-proof-terminal-client-validation-artifacts`. The staged copy must be fail-no-overwrite, must validate before promotion, and must never rewrite receipt paths.

```bash
set -euo pipefail
final_root="$PWD/provider-proof-terminal-client-validation-artifacts"
final_package_dir="$final_root/$PACKAGE_NAME"
final_archive="$final_root/$PACKAGE_NAME.tar.gz"
final_receipt="$final_root/$PACKAGE_NAME.publication.json"
promoted_package_dir=0
promoted_archive=0
promoted_receipt=0

if [[ -e "$final_root/$PACKAGE_NAME" || -e "$final_root/$PACKAGE_NAME.tar.gz" || -e "$final_root/$PACKAGE_NAME.publication.json" ]]; then
  print -u2 -- 'final package targets already exist'
  exit 1
fi

staging_parent="$(mktemp -d "$PWD/.task10-publication-copy.XXXXXX")"
staging_root="$staging_parent/provider-proof-terminal-client-validation-artifacts"
staged_package_dir="$staging_root/$PACKAGE_NAME"
staged_archive="$staging_root/$PACKAGE_NAME.tar.gz"
staged_receipt="$staging_root/$PACKAGE_NAME.publication.json"

cleanup_staging() {
  if [[ "$promoted_receipt" = 1 && -e "$final_receipt" ]]; then
    rm -f -- "$final_receipt"
  fi
  if [[ "$promoted_archive" = 1 && -e "$final_archive" ]]; then
    rm -f -- "$final_archive"
  fi
  if [[ "$promoted_package_dir" = 1 && -e "$final_package_dir" ]]; then
    rm -rf -- "$final_package_dir"
  fi
  if [[ -e "$staging_parent" ]]; then
    rm -rf -- "$staging_parent"
  fi
}

trap cleanup_staging EXIT

mkdir -p "$staging_root"
mkdir -p "$final_root"
cp -R "$EXTERNAL_PUBLICATION_ROOT/$PACKAGE_NAME" "$staging_root/$PACKAGE_NAME"
cp "$EXTERNAL_PUBLICATION_ROOT/$PACKAGE_NAME.tar.gz" "$staging_root/$PACKAGE_NAME.tar.gz"
cp "$EXTERNAL_PUBLICATION_ROOT/$PACKAGE_NAME.publication.json" "$staging_root/$PACKAGE_NAME.publication.json"

npx tsx -e 'import { createDefaultTask10ArchiveDependencies, validateOfflinePublication } from "./scripts/task10/publication.ts"; void (async () => { const publicationRoot = process.argv[1]; const packageName = process.argv[2]; if (!publicationRoot || !packageName) throw new Error("publication root and package name are required"); const result = await validateOfflinePublication({ packageDirectoryPath: `${publicationRoot}/${packageName}`, archivePath: `${publicationRoot}/${packageName}.tar.gz`, receiptPath: `${publicationRoot}/${packageName}.publication.json`, archive: createDefaultTask10ArchiveDependencies(), publicationRootNameForReceipt: "provider-proof-terminal-client-validation-artifacts" }); if (!(result.checks.archiveVerified && result.checks.receiptVerified && result.checks.internalManifestVerified && result.checks.secretScanVerified)) throw new Error("offline validation checks must all be true"); console.log(JSON.stringify(result.checks, null, 2)); })();' -- "$staging_root" "$PACKAGE_NAME"

mkdir "$final_root/$PACKAGE_NAME"
promoted_package_dir=1
cp -R "$staging_root/$PACKAGE_NAME/." "$final_root/$PACKAGE_NAME"
ln "$staging_root/$PACKAGE_NAME.tar.gz" "$final_root/$PACKAGE_NAME.tar.gz"
promoted_archive=1
ln "$staging_root/$PACKAGE_NAME.publication.json" "$final_root/$PACKAGE_NAME.publication.json"
promoted_receipt=1

npx tsx -e 'import { createDefaultTask10ArchiveDependencies, validateOfflinePublication } from "./scripts/task10/publication.ts"; void (async () => { const publicationRoot = process.argv[1]; const packageName = process.argv[2]; if (!publicationRoot || !packageName) throw new Error("publication root and package name are required"); const result = await validateOfflinePublication({ packageDirectoryPath: `${publicationRoot}/${packageName}`, archivePath: `${publicationRoot}/${packageName}.tar.gz`, receiptPath: `${publicationRoot}/${packageName}.publication.json`, archive: createDefaultTask10ArchiveDependencies(), publicationRootNameForReceipt: "provider-proof-terminal-client-validation-artifacts" }); if (!(result.checks.archiveVerified && result.checks.receiptVerified && result.checks.internalManifestVerified && result.checks.secretScanVerified)) throw new Error("offline validation checks must all be true"); console.log(JSON.stringify(result.checks, null, 2)); })();' -- "$PWD/provider-proof-terminal-client-validation-artifacts" "$PACKAGE_NAME"
if ! cmp -s "$EXTERNAL_PUBLICATION_ROOT/$PACKAGE_NAME.tar.gz" "$PWD/provider-proof-terminal-client-validation-artifacts/$PACKAGE_NAME.tar.gz"; then
  print -u2 -- 'archive mismatch after staged copy'
  exit 1
fi
if ! cmp -s "$EXTERNAL_PUBLICATION_ROOT/$PACKAGE_NAME/client-conclusion.json" "$PWD/provider-proof-terminal-client-validation-artifacts/$PACKAGE_NAME/client-conclusion.json"; then
  print -u2 -- 'client-conclusion.json mismatch after staged copy'
  exit 1
fi
if ! cmp -s "$EXTERNAL_PUBLICATION_ROOT/$PACKAGE_NAME/SHA256SUMS.txt" "$PWD/provider-proof-terminal-client-validation-artifacts/$PACKAGE_NAME/SHA256SUMS.txt"; then
  print -u2 -- 'SHA256SUMS.txt mismatch after staged copy'
  exit 1
fi

rm -rf -- "$staging_parent"
promoted_package_dir=0
promoted_archive=0
promoted_receipt=0
trap - EXIT
```
