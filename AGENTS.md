# AGENTS.md
This file guides coding agents working in `bidvia-agent-client`.
It is grounded in the current repository state and should not be treated as generic TypeScript guidance.

## Repository Identity
- Governed TypeScript SDK/CLI for connecting agents to the Bidvia platform
- Not a frontend repo; no React, CSS, or UI-component conventions exist here today
- Current implementation is execution-layer focused even though the broader product direction is larger

## Instruction Sources
Follow instructions in this order:
1. Direct user or task instructions
2. This file
3. Existing repository code and tests
4. `README.md` and files under `docs/`

If a convention is not supported by the repo, do not invent it.

## Existing Editor/Agent Rules
At the time this file was created, none of these existed:
- root `AGENTS.md`
- `.cursorrules`
- `.cursor/rules/`
- `.github/copilot-instructions.md`

If any are added later, treat them as additional repo instructions.

## Project Layout
- `src/client.ts` — main client class and request helpers
- `src/contracts.ts` — request/response/context contracts
- `src/config.ts` — base URL resolution helpers
- `src/heartbeat.ts`, `src/sync.ts`, `src/evidence.ts`, `src/proposals.ts` — focused builder helpers
- `src/cli.ts` — CLI entrypoint
- `src/index.ts` — barrel exports
- `test/` — contract and config tests
- `scripts/validate-contract.ts` — contract validation script
- `examples/` — usage examples

## Package Manager and Runtime
- Use `npm` (`package-lock.json` is present)
- The package is ESM (`"type": "module"`)
- TypeScript uses `NodeNext`
- Development/test scripts use `tsx`
- `tsconfig.json` has `strict: true`

## Canonical Commands
Run commands from the repo root.
- Install: `npm install`
- Build: `npm run build`
- Typecheck: `npm run typecheck`
- Full test suite: `npm test`
- Current test script: `tsx --test test/**/*.test.ts`
- Single test file: `npx tsx --test test/config.test.ts`
- Example single file: `npx tsx --test test/client-contract.test.ts`
- Single test by name: `npx tsx --test --test-name-pattern="resolveBidviaBaseUrl" test/config.test.ts`
- Contract validation: `npm run validate`
- Examples: `npm run example`, `npm run example:internal`, `npm run example:seed`

## Linting Status
There is currently no lint script in `package.json`, and no ESLint/Prettier/Biome config was found at the repo root.
Do not claim lint is available unless you added it yourself.

## Code Style
### Imports
- Put imports at the top of the file
- Use `import type` for type-only imports
- Use explicit internal `.js` specifiers in TypeScript source files
- Keep imports simple and direct
Do not introduce extensionless internal imports.

### Types
- Preserve strict typing
- Prefer `interface` for object-shaped contracts
- Use small union types for constrained string domains when needed
- Avoid `any`; prefer `unknown` or a named type
- Keep API-facing contracts explicit

### Naming
- `PascalCase` for classes, interfaces, and exported types
- `camelCase` for variables, functions, and methods
- Lowercase, domain-oriented file names like `client.ts` and `config.ts`
- Use `require...` names for guard helpers that enforce required context
- Use builder names like `buildHeartbeatInput` for focused helper creators

### Boundary naming
Use `camelCase` in TypeScript code.
Translate to `snake_case` only at API boundaries where the external contract requires it.

### Formatting
- 2-space indentation
- Semicolons
- Single quotes
- Trailing commas in multiline structures when local code uses them
- Preserve local wrapping style instead of reformatting unrelated code
Line wrapping is slightly mixed across files, so match the file you are editing.

## Module Patterns
Follow the existing shape of the repo:
- one main client class for transport and route helpers
- small focused domain modules for pure builders
- barrel exports through `src/index.ts`
- flat test files in `test/`
Prefer a small focused helper module over expanding `src/client.ts` with unrelated logic.

## Error Handling
- Prefer fail-fast guard checks with `throw new Error(...)`
- Use direct error messages for missing required context
- Do not swallow errors
- Do not add empty `catch` blocks
Current code uses simple precondition guards, not elaborate custom error hierarchies.

## Async Style
- Prefer `async`/`await`
- Keep sequential flow when request order matters
- Use `void main();` for CLI-style top-level async invocation
- Avoid promise chains when `await` is clearer

## Testing Conventions
- Tests use `node:test`
- Assertions use `node:assert/strict`
- Tests are flat `test('...', ...)` calls, not nested suites
- Test names are long and behavior-oriented
- Test doubles are simple local stubs, not heavy mocking frameworks
- Assertions are explicit, usually `assert.equal` or `assert.deepEqual`
Match the style in `test/client-contract.test.ts` and `test/config.test.ts`.

## Change Strategy
- Make the smallest change that fully satisfies the task
- Preserve the governed-contract framing described in `README.md`
- Do not invent new platform-authoritative behavior in this repo
- Avoid unrelated refactors during focused fixes or additions

## Verification Expectations
Before claiming completion, run the commands that match the change.
Typical baseline:
- `npm test`
- `npm run typecheck`
- `npm run build`
- If contract validation is relevant, also run `npm run validate`
For fast iteration, start with a single test file or `--test-name-pattern`, then finish with broader verification.

## What Not to Do
- Do not add frontend-specific conventions that the repo does not use
- Do not replace `node:test` with Jest/Vitest-style APIs in isolated changes
- Do not remove `.js` specifiers from internal TypeScript imports
- Do not introduce `any` where a proper type or `unknown` will work
- Do not convert required wire-format `snake_case` fields to `camelCase`
- Do not claim a lint step exists when it does not

## Practical Workflow
1. Read the target module and the nearest related test
2. Add or update a focused test when behavior changes
3. Implement the minimal code change in local style
4. Run a targeted test command
5. Run broader verification before finishing
This repository is small and fairly consistent; matching existing patterns closely is usually the right move.
