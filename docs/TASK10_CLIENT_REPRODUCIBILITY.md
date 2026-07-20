# Task 10 Client Reproducibility

This runbook is the owner-only, copyable, security-safe audit path for the frozen Task 10 client reproducibility handoff. Use it to reconstruct the public review procedure, confirm the frozen authority set, prepare clean disposable roots, run the client-side coordinator, and interpret the current expected blocked outcome without leaking private evidence.

## Scope and boundary

This runbook is for owner audit and review packaging only. The conclusion is client-owned, review-only, and not Core-authored. It does not create a second source of Core truth, does not infer a Core `passed` result, and does not authorize any publication of private evidence bytes.

## Immediate caveats

- Use four distinct disposable checkout roots: Core runtime main, Client main, Site main, and detached Core evidence.
- Keep private input, private output, private log root, and publication root outside Git, outside all checkouts, initially empty, owner-only 0700, and separate with no nesting, overlap, or symlink.
- Set `BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN` separately in the environment. Do not prefix publishable command blocks with a literal assignment or a placeholder assignment.
- The current frozen expectation is blocked before spawn. External private roots fail repo-relative validation, and internal roots fail non-overlap.
- No Compose resources should be created in the current frozen blocked path.

## 1. Frozen authority

Frozen authority and immutable values:

- Core SHA: `97e2fbe3934ea821daf654afa0adaef2c3e16077`
- Client SHA: `31195b898a6794e78518bb9b71833ecaaf5e563e`
- Site SHA: `f0198caf349fad367c016d7ff333172ec71a55be`
- Core evidence publication commit: `8d2692fea8a450225717c067628bbc0b372c7536`
- Attempt id: `attempt-2026-07-18-task10-postmerge-002`
- Bundle path: `docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/core-execution-evidence.json`
- Bundle SHA: `e438232e982722fd4ec431260053eafe369723f93659070688f961a5c740b3db`
- Preflight path: `docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/preflight-artifact.json`
- Preflight SHA: `1eee8a5d6de9a34486b287be425b6f747f155c8c83ef436c448e13baf08ad685`
- Reusable packet path: `docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json`
- Reusable packet SHA: `53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093`
- Package identities: `bidvia-d2-ws6-t1-runtime@0.0.0`, `@bidvia/client@1.0.0`, `bidvia-site@0.1.0`
- Plain lock hashes: `504007a7fb70616df1409eb2e003a3470ea6e23d990ea61d8eea195a0a1fce62`, `92544096de62a366c66ba7c307ed6fa3ab9d2890bd7a6d6220adb4a0d7f627c6`, `a0ef0825f04cd9c06bba396f8eff1bda32a557cf77f3c69ecd01ecb99b026732`

## 2. Clean producer root preparation

Prepare four disposable roots. The implementation worktree is not a producer root. There is no `.sisyphus` dependency.

Create the private and publication roots first as owner-only 0700 directories. This owner runbook assumes macOS and uses `stat -f '%Lp'` for the exact Darwin mode check.

```bash
umask 077
session_root="$(realpath "$(mktemp -d "${TMPDIR:-/tmp}/task10-client-reproducibility.XXXXXX")")"
private_input_root="$session_root/private-input"
private_output_root="$session_root/private-output"
private_log_root="$session_root/private-logs"
publication_root="$session_root/publication"

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

Those shell variables correspond to the coordinator placeholders `<absolute-empty-private-input-root>`, `<absolute-empty-private-output-root>`, `<absolute-private-log-root>`, and `<absolute-publication-root>`. Keep the token assignment separate from this block.

Reconfirm each private root is outside Git and initially empty. Publication root is included in the same empty and safe checks. Private output contents, raw logs, raw matrix bodies, credentials, session IDs, generated account IDs, emails, and absolute local paths stay out of Git, publication, and sanitized stdout. Only approved sanitized opaque SHA handles and attestations may cross the boundary.

Producer roots must be clean disposable checkouts with these exact expectations:

- Core runtime root: HEAD `97e2fbe3934ea821daf654afa0adaef2c3e16077`, main branch, upstream `origin/main`, empty porcelain, lock hash `504007a7fb70616df1409eb2e003a3470ea6e23d990ea61d8eea195a0a1fce62`, package identity `bidvia-d2-ws6-t1-runtime@0.0.0`
- Client root: HEAD `31195b898a6794e78518bb9b71833ecaaf5e563e`, main branch, upstream `origin/main`, empty porcelain, lock hash `92544096de62a366c66ba7c307ed6fa3ab9d2890bd7a6d6220adb4a0d7f627c6`, package identity `@bidvia/client@1.0.0`
- Site root: HEAD `f0198caf349fad367c016d7ff333172ec71a55be`, main branch, upstream `origin/main`, empty porcelain, lock hash `a0ef0825f04cd9c06bba396f8eff1bda32a557cf77f3c69ecd01ecb99b026732`, package identity `bidvia-site@0.1.0`
- Core evidence root: detached HEAD `8d2692fea8a450225717c067628bbc0b372c7536`, null upstream, empty porcelain, bundle SHA `e438232e982722fd4ec431260053eafe369723f93659070688f961a5c740b3db`, preflight SHA `1eee8a5d6de9a34486b287be425b6f747f155c8c83ef436c448e13baf08ad685`

Run these checks in each of the three producer roots, then compare the output to the frozen values above:

```bash
git rev-parse HEAD
git branch --show-current
git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'
git status --porcelain
shasum -a 256 package-lock.json
node --input-type=module -e 'import fs from "node:fs"; const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")); console.log(`${pkg.name}@${pkg.version}`);'
```

Run these checks in the detached Core evidence root. The bundle and preflight files must match exactly, and the upstream check must stay null upstream because the checkout is detached:

```bash
git rev-parse HEAD
git branch --show-current
git status --porcelain
shasum -a 256 "docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/core-execution-evidence.json"
shasum -a 256 "docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/preflight-artifact.json"
```

Use npm ci only in the three producer roots, then reassert HEAD, main branch, `origin/main`, empty porcelain, package identity, and package-lock SHA. Never install or modify the evidence checkout.

## 3. Private roots and token boundary

Set the token separately in the environment before any Core-owned producer execution. Name only `BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN`. Do not print, publish, archive, or inline its value.

Private input root, private output root, and private log root must stay outside Git, outside every checkout, outside publication, initially empty, owner-only 0700, and distinct. Keep publication root separate from all private roots. Keep all four roots free of nesting, overlap, and symlink behavior. Never relocate private evidence into the repo or modify Core to force pass.

## 4. Reconstructed Core producer command

The fully populated terminal command is **reconstructed from the authoritative frozen Core CLI contract because no exact PR #51 terminal transcript was published**.

Invoke it from the frozen Core root only when the coordinator delegates the producer path. The owner uses this template for audit, not a second competing execution.

```bash
npm run run:merged-main-reproducibility-producers -- \
  --core-root "<absolute-clean-core-main-root>" \
  --client-root "<absolute-clean-client-main-root>" \
  --site-root "<absolute-clean-site-main-root>" \
  --core-sha "97e2fbe3934ea821daf654afa0adaef2c3e16077" \
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
  --attempt-id "attempt-2026-07-18-task10-postmerge-002" \
  --input-evidence-root "<empty-private-input-root>" \
  --output-root "<empty-private-output-root>" \
  --selected-reusable-source-packet "docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json" \
  --selected-reusable-source-packet-sha256 "53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093" \
  --source-main-commit-marker "97e2fbe3934ea821daf654afa0adaef2c3e16077" \
  --runtime-reported-version-marker "task10-runtime-97e2fbe" \
  --bootstrap-package-version-marker "task10-bootstrap-97e2fbe" \
  --scenario-package-version-marker "task10-scenario-97e2fbe" \
  --provider-protocol-version "task10-local-http-v1" \
  --postgres-port "58925" \
  --runtime-port "58926" \
  --operator-port "58927" \
  --fixture-port "58928" \
  --provider-fixture-identity "provider-fixture:haisi-wms:task10"
```

The three lock hashes above are plain lowercase 64-character hex values. They must remain plain and must not use any `sha256:` prefix.

## 5. Producer lifecycle and current blocked expectation

Startup, readiness `/readyz`, reset, success-001, recovery-001, success-002-reuse, restart/readback, and finally teardown is specified and owned by the frozen Core producer contract.

Frozen runtime identity for that automatic path:

- Compose project: `bidvia-task10-attempt-2026-07-18-task10-postmerge-002`
- Containers: `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-runtime`, `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-postgres`, `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-fixture`, `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-operator`
- Fixture identity: `provider-fixture:haisi-wms:task10`
- Provider protocol version: `task10-local-http-v1`
- Ports: `58925`, `58926`, `58927`, `58928`

The client coordinator/adapter performs authority/checkout/private-root checks, delegates one Core command only if probe permits, validates returned artifacts, and does not implement or independently attest Docker teardown.

Current pre-spawn blocked path proves no Core command was launched and therefore no Compose resources should exist. The current frozen expectation is blocked before spawn because external private roots fail repo-relative validation while internal roots fail non-overlap.

Never relocate private evidence into the repo or modify Core to force pass. The correct current public interpretation is a blocked contract probe, not a hidden local workaround.

If a future probe permits execution, the owner must independently inspect Core producer evidence and the host for finally teardown before accepting the package.

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
  --core-bundle "<absolute-detached-core-evidence-root>/docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/core-execution-evidence.json"
```

## 8. Result interpretation, package membership, and handoff

Exit 0 only after an immutable valid `passed` or `blocked` package. The current expected result is a valid blocked package with `core-producer-private-root-contract-unsatisfied`.

Tooling failures exit nonzero and emit no success receipt. A `passed` conclusion is invalid unless the probe and every downstream check execute and pass.

The current outcome is client-owned and review-only. It is blocked, not passed. It is not Core-authored.

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
- confirm the detached Core evidence root still matches the frozen bundle SHA and preflight SHA
- confirm publication contains only the approved sanitized package members plus the bound archive and receipt outputs
- keep private input, private output, and private log root outside Git through audit retention
- cleanup after the owner retention policy allows it

Offline handoff guidance:

- hand off the sanitized blocked package, archive SHA, conclusion SHA, and receipt only
- do not hand off private output contents, raw logs, raw matrix bodies, credentials, session IDs, generated account IDs, emails, or absolute local paths
- do not add commit or push steps to this runbook without separate authorization
