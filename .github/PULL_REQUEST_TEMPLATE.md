<!-- Thanks for the PR! Keep it small and focused. -->

## What

<!-- One paragraph: what does this change? -->

## Why

<!-- One paragraph: why does this need to change? Link to an issue if there is one. -->

## How to verify

<!-- Concrete steps a reviewer can run. e.g.:
     - cd examples/basic && node ../../bin/translate.mjs --dry-run
     - npm test -->

## Checklist

- [ ] `npm test` passes locally
- [ ] No new npm dependencies added (zero-deps is a feature)
- [ ] If user-facing: README / CHANGELOG updated
- [ ] If config-shape changes: `--import-languine` and existing lock files still parse
