# Internal Release Checklist

This checklist is for the final human-triggered release gate only. It prepares the package for publication but does **not** perform `npm publish`.

## 1. Final verification sequence

1. Confirm the working tree is in the intended release state.
2. Run the verification baseline in this order:
   - `npm test`
   - `npm run typecheck`
   - `npm run build`
   - `npm run validate`
   - `npm run validate:release-readiness`
   - `npm run validate:release-gate`
3. Stop the release packet immediately if any command above fails.
4. If any Stage 3 gate surface still reports blocked, stop the release packet and do not describe `1.0.0` closure as complete.

## 2. Metadata confirmation

Confirm `package.json` still matches the intended public release shape:

- `name: @bidvia/client`
- `version` matches the intended release tag/version
- `repository.url: git+https://github.com/Bidvia/bidvia-agent-client.git`
- `homepage: https://github.com/Bidvia/bidvia-agent-client`
- `bugs.url: https://github.com/Bidvia/bidvia-agent-client/issues`
- `releaseGate.npmPublished: false`

Do **not** continue if any metadata value has drifted or become contradictory.

## 3. Changelog and release-note confirmation

1. Read `CHANGELOG.md` before publication.
2. Confirm the current release entry accurately reflects the shipped surface:
    - typed SDK helpers for onboarding and registration-bound operations
    - widened SDK/CLI truth-fetch visibility for agent registrations, authority profiles, capability profiles, the singular per-registration capability profile, and the shipped participation/task family
    - CLI readiness, route-context, visibility, and bounded review/verification flows
    - the stable installed MCP surface `bidvia mcp-server`
    - OpenClaw-compatible config export through `openclaw-mcp-config`
     - the principal-governed read posture, `tenantId` plus `principalId`, with optional admin-session companionship on some routes
     - the boundary that credential-less local or sim probes prove wiring, transport behavior, reachability, or auth-posture only
     - the bounded validation tooling story through `install-integrity`, `validation-smoke`, `diagnostic-bundle-export`, and `public-runtime-interpretation-probe`
     - the bounded task-plane CLI parity story through `create-lease`, `create-task-dispatch`, `assign-task-dispatch`, `suspend-task-dispatch`, `resume-task-dispatch`, `complete-task-dispatch`, `fail-task-dispatch`, `create-claim`, `accept-claim`, and `reject-claim`
     - the current Bidvia Core downstream contract center (`docs/downstream-contract-center/**` in the main Bidvia repo) remains the frozen source of downstream truth for any Stage 2 / Stage 3 claims
3. Confirm the changelog does **not** overclaim hosted runtime, hosted MCP, remote registry/discovery, login, or Core truth closure.

## 4. Package smoke confirmation

1. Confirm `npm pack --dry-run` succeeds.
2. Confirm `npm run validate:release-gate` succeeds.
3. Confirm the tarball-install smoke in `validate:release-gate` currently covers the core installed-command baseline:
   - `bidvia --help`
   - `bidvia openclaw-mcp-config`
   - `bidvia mcp-server`
4. Separately confirm the bounded validation tooling commands remain documented and runnable in the current worktree or installed-package smoke lane:
   - `bidvia install-integrity`
   - `bidvia validation-smoke`
   - `bidvia diagnostic-bundle-export --output ...`
   - `bidvia public-runtime-interpretation-probe`
5. Confirm the release gate still treats repo-local `node dist/mcp-server.js` only as the developer fallback, not the primary public install story.
6. Confirm `bidvia runtime-capabilities`, `bidvia route-context-matrix`, and `bidvia operator-discovery` still agree on the same blocked-or-complete Stage 3 release gate status.
7. Confirm docs and help keep the unchanged fail-closed boundary lines explicit: the validation tooling is external-user-facing and local-first, not a Core-owned certification flow.

## 5. Final manual publish gate

Only after every step above is complete, a human may choose to:

1. re-run any verification that changed during the final review window
2. perform the final human metadata/changelog sanity check
3. run `npm publish`

That final `npm publish` step is deliberately manual and outside this repository's automated release-prep scripts.
