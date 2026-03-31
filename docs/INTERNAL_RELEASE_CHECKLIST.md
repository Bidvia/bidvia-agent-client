# Internal Release Checklist

This checklist is for the final human-triggered release gate only. It prepares the package for publication but does **not** perform `npm publish`.

## Pre-flight

1. Confirm the working tree is in the intended release state.
2. Run the current verification baseline:
   - `npm test`
   - `npm run typecheck`
   - `npm run build`
   - `npm run validate`
   - `npm run validate:release-readiness`
   - `npm run validate:release-gate`

## Tarball and install closure

1. Confirm `npm pack --dry-run` succeeds.
2. Confirm the temporary-directory tarball install smoke passes through `npm run validate:release-gate`.
3. Confirm the installed package exposes:
   - `bidvia-agent-client --help`
   - `bidvia-agent-client openclaw-mcp-config`
   - the stable installed MCP surface described as `bidvia-agent-client mcp-server`

## Metadata gate

Before any real publish, replace `releaseGate.pendingPublicMetadata` entries only with verified values.

Current unresolved fields are intentionally tracked here:

- `repository`
- `homepage`
- `bugs`

Do **not** invent or guess public URLs.

## Manual publish gate

Only after every step above is complete, a human may choose to:

1. fill the remaining verified public metadata
2. re-run the release checks
3. run `npm publish`

That final `npm publish` step is deliberately manual and outside this repository's automated release-prep scripts.
