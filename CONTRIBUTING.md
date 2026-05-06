# Contributing to autoi18n

Thanks for considering it. The codebase is intentionally tiny so PRs are easy to review.

## Quick start

```bash
git clone https://github.com/ffcabbar/autoi18n
cd autoi18n
npm test                                                      # offline, ~100ms
cd examples/basic && node ../../bin/translate.mjs --dry-run   # offline smoke test
```

There is no build step. The script runs straight from source.

## Where the code lives

- **`bin/translate.mjs`** — the entry point and main loop. About 500 lines, top-to-bottom.
- **`bin/helpers.mjs`** — pure helpers (`flatten`, `mergeOrdered`, `extractPlaceholders`, `parseLockYaml`, `dumpLockYaml`, `pLimit`, etc.). No I/O. Easy to test.
- **`tests/helpers.test.mjs`** — `node:test` suite for the helpers. Runs offline.
- **`action.yml`** — composite GitHub Action that wraps the CLI.

## Principles (please read before opening a PR)

1. **Zero npm dependencies.** This is a feature. If you need a third-party package, propose it in an issue first.
2. **Don't break the lock file format.** Users have committed `translate.lock` to their repos. If you must change the format, ship a migration alongside.
3. **Pure helpers go in `helpers.mjs`** with a corresponding test in `helpers.test.mjs`. I/O and orchestration stay in `translate.mjs`.
4. **Readability over cleverness.** The whole point is that anyone can audit this in 30 minutes.
5. **No new providers without tests.** Each LLM provider's tool-use semantics are subtle. If you add OpenAI/Gemini support, ship test fixtures with the PR.

## Running tests

```bash
npm test
```

For a real end-to-end test with the API, set `ANTHROPIC_API_KEY` and run `node bin/translate.mjs` against a small fixture. The example under `examples/basic/` is a good starting point — it costs about half a cent per run on Haiku.

## Reporting issues

Use the issue templates. Always include:

- autoi18n version (`npx autoi18n --version` once that flag exists, or check `package.json`)
- Node version (`node -v`)
- The exact command you ran and the output
- Your `translate.config.json` (redact secrets)

## Licensing

By contributing, you agree your contribution will be licensed under the [MIT License](./LICENSE).
