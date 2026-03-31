# Contributing

## Local development

Install dependencies and build the package before opening a change:

```bash
npm install
npm run build
```

## Verification

Run the relevant tests for your change, then finish with the baseline checks:

```bash
npm test
npm run typecheck
npm run build
npm run validate
npm run validate:release-readiness
```

## Scope discipline

Keep changes focused, prefer additive updates, and avoid inventing hosted or published behavior that the repository has not explicitly verified yet.
