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

## 2. Metadata confirmation

Confirm `package.json` still matches the intended public release shape:

- `name: bidvia-agent-client`
- `version` matches the intended release tag/version
- `repository.url: https://github.com/Bidvia/bidvia-agent-client.git`
- `homepage: https://github.com/Bidvia/bidvia-agent-client`
- `bugs.url: https://github.com/Bidvia/bidvia-agent-client/issues`
- `releaseGate.npmPublished: false`

Do **not** continue if any metadata value has drifted or become contradictory.

## 3. Changelog and release-note confirmation

1. Read `CHANGELOG.md` before publication.
2. Confirm the current release entry accurately reflects the shipped surface:
   - typed SDK helpers for onboarding and registration-bound operations
   - CLI readiness, route-context, visibility, and bounded review/verification flows
   - the stable installed MCP surface `bidvia-agent-client mcp-server`
   - OpenClaw-compatible config export through `openclaw-mcp-config`
3. Confirm the changelog does **not** overclaim hosted runtime, hosted MCP, remote registry/discovery, login, or Core truth closure.

## 4. Package smoke confirmation

1. Confirm `npm pack --dry-run` succeeds.
2. Confirm `npm run validate:release-gate` succeeds.
3. Confirm the tarball-install smoke in `validate:release-gate` covers the current public install story:
   - `bidvia-agent-client --help`
   - `bidvia-agent-client openclaw-mcp-config`
   - `bidvia-agent-client mcp-server`
4. Confirm the release gate still treats repo-local `node dist/mcp-server.js` only as the developer fallback, not the primary public install story.

## 5. Final manual publish gate

Only after every step above is complete, a human may choose to:

1. re-run any verification that changed during the final review window
2. perform the final human metadata/changelog sanity check
3. run `npm publish`

That final `npm publish` step is deliberately manual and outside this repository's automated release-prep scripts.
