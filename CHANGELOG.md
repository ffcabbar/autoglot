# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased (0.4.0)

### Added

- Run `autoglot init --locales=de,pt-BR` for unattended setup with explicit target locales. Pass `--install` to opt into runtime dependency installation.
- Runnable [Next.js App Router](https://github.com/ffcabbar/autoglot/tree/main/examples/nextjs) and [Expo Android](https://github.com/ffcabbar/autoglot/tree/main/examples/expo-android) examples in the repository. Both include source and translated catalogs, a translation lock, and a keyless dry-run script.

## [0.3.4] - 2026-11-22

### Fixed

- Keep source changes pending when a run selects only some target locales. Check mode also detects missing translations, removed source keys, and orphaned locale keys.
- Validate that Claude returns each requested key, preserves placeholders and explicit line breaks, and leaves unrequested entries alone. Include provider retries in usage totals and use the published Opus 4.7 rate.
- Translate flat dotted catalogs, write portable source paths to version 1 locks, and import hashes only from the matching Languine catalog.
- Let dry runs print a plan without creating locale or lock files. An explicitly requested summary path still works.

## [0.3.3] - 2026-05-16

### Fixed

- **Action commit step: bash syntax error from leaked `\${{ ... }}` escape.** v0.3.2's `pull_request` fix included `\${{ github.head_ref }}` in two `echo "::error::..."` lines, meant to be a literal pointer to the right checkout config. The runner's template engine doesn't honor `\${{` as an escape inside `run:` blocks; it stripped the expression and left a stray `\` at the end of a double-quoted string (`"::error::      ref: \"`). Bash then saw an open string, kept reading subsequent lines, and choked on the next `(` it found — surfacing as `line 36: syntax error near unexpected token \`(\``. Fix: drop the literal `${{ ... }}` from echo output, point users at the README anchor instead.

## [0.3.2] - 2026-05-16

### Fixed

- **GitHub Action: `pull_request` event support.** The push step was hardcoded to use `GITHUB_REF_NAME`, which on `pull_request` events is a synthetic merge ref like `10/merge` that doesn't exist on the remote. Translations would succeed, the bot would commit locally, then push would fail with `fatal: couldn't find remote ref 10/merge`. Action now uses `GITHUB_HEAD_REF` (the PR's source branch) when present and falls back to `GITHUB_REF_NAME` for `push` events.
- **Detached-HEAD guard for `pull_request` workflows.** If `actions/checkout` runs with its default `ref` on a `pull_request` event, HEAD lands on the merge commit in detached state; pushing that would replace the PR branch with merge-commit garbage. The action now detects this and prints a clear error pointing to the fix (`ref: ${{ github.head_ref }}` in the checkout step).
- **`gh pr comment` step** also uses the resolved branch so PR comments find the right PR on `pull_request` runs.

### Documented

- README now includes a `pull_request` workflow example with the required `ref: ${{ github.head_ref }}` in `actions/checkout`.

## [0.3.1] - 2026-05-15

Bug-fix release driven by real-world testing on a monorepo (Expo app inside `apps/mobile/`). All six issues were reproduced against autoglot@0.3.0 and now ship with regression coverage.

### Fixed

- **Monorepo: `add` and `doctor` now accept `--source` / `--messages-dir` / `--lock-file` / `--config` flags** (#3). Previously only the translate path honored these, so app-directory invocations couldn't override paths.
- **Monorepo: config-file values resolve against the config file's directory, not CWD** (#4). A `translate.config.json` inside `apps/mobile/` saying `"source": "messages/en.json"` now means `apps/mobile/messages/en.json` regardless of where you invoke from. Mirrors how eslint, vitest, tsconfig, prettier behave. CLI flag overrides still resolve against CWD (POSIX convention).
- **Monorepo: `doctor` walks up to the repo root and scans every `.github/workflows/*.{yml,yaml}` for one that uses `ffcabbar/autoglot`** (#5). Previously only matched a workflow named exactly `translate.yml` at `CWD/.github/workflows/`, so monorepos with per-app workflows (`translate-mobile.yml`, `translate-web.yml`) were silently misdiagnosed.
- **`extract` no longer mis-reads TypeScript generics as JSX text** (#6). Added a code-token denylist (`useRef`, `useState`, `useSharedValue`, `=>`, `&&`, `||`, `=== `, etc.), a bare-type denylist (`Promise`, `void`, `ReactNode`, `StyleProp`, `SharedValue`, …), and stricter shape rules: candidates can't start with `(`, `[`, `=`, `&`, `|`, `;`, digits, etc. False-positive rate on TS/RN/Expo codebases drops dramatically. (AST-based extraction would eliminate it entirely; out of scope for v0.3 — zero deps stays.)
- **`extract --write` no longer silently corrupts existing namespaces** (#7). Detects two classes of shape conflict before writing:
  - `namespace-vs-leaf`: candidate `settings.language` would replace the existing `settings.language` object (and silently delete its children). REFUSED.
  - `leaf-vs-namespace`: candidate `a.b.c` when `a.b` is already a string. REFUSED.
  Both classes are surfaced in the user-facing summary alongside `added` and `skipped` counts.
- **`extract` produces cleaner keys** (#8). Expo Router `(group)` parentheses are stripped (`(onboarding)/age.tsx` → `onboarding.age.*`); dashed path segments become camelCase (`journal-upload` → `journalUpload`); `_layout`/`layout`/`index`/`page` segments are dropped; digit-leading keys get a `_` prefix to stay valid identifiers; `hooks/`/`services/`/`lib/`/`utils/` prefixes are stripped like `src/`/`app/`.

### Changed

- New shared module `bin/config.mjs` centralizes config loading, `findConfig` walk-up, and path resolution. `add.mjs`, `doctor.mjs`, and `translate.mjs` all use it now — no behavior drift across subcommands.

### Added

- 38 new unit tests covering all six fixes (full suite: 166/166 green).
- New integration smoke script (`tmp/autoglot-monorepo-smoke.sh`-style) verifying all six issues end-to-end in a simulated monorepo layout — 13/13 green, 0 regressions on the existing 82 framework smoke tests.

## [0.3.0] - 2026-05-14

### Added

- **Expo support** — first-class template alongside React Native. Detected when `expo` is in dependencies (takes precedence over `react-native`, which Expo also ships). Scaffolds `src/i18n/index.ts` with `expo-localization` for device-locale auto-detect.
- **`autoglot extract --write`** — merges discovered candidates directly into `messages/en.json`. Existing keys are **never overwritten** (extract is safe to re-run). Use `--source=<path>` to target a different file.
- **`ROADMAP.md`** — public plan for v0.3 / v0.4 / v0.5 / v1.0 plus explicit out-of-scope list.
- **`autoglot init --install`** — opt-in flag that installs the runtime i18n library after scaffolding, so users don't have to copy-paste a second command. Auto-detects the package manager from lockfiles (`bun.lockb` → bun, `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, otherwise npm). Override with `--pm=npm|yarn|pnpm|bun`.
- **Interactive install prompt.** When neither `--install` nor `--no-install` is passed, `init` asks ("Install runtime packages now?", default No) so the user is in the loop. Pass `--no-install` to skip the prompt entirely (useful in CI).
- **Graceful failure handling.** If the package manager exits non-zero (peer-dep clash, network error, etc.), `init` doesn't pretend it succeeded — it surfaces the exit code and prints the exact retry command in the "Next steps" section.
- New unit tests: 13 for `pm.mjs` (lockfile detection + install command construction), 7 for `parseInitArgs` (flag parsing, forward-compat for unknown flags). Full suite: 106/106 green.

### Changed

- `init` now accepts and parses flags (previously ignored). Existing flag-less invocations behave unchanged: no install runs unless the user opts in.
- The "Next steps" panel now uses the detected package manager's syntax in the install hint (e.g. `pnpm add next-intl` instead of always `npm install next-intl`).

## [0.2.2] - 2026-05-09

### Added

- **`autoglot extract`** — scans your source files (`.tsx/.jsx/.ts/.js/.vue/.svelte` under `src/`, `app/`, `pages/`, `components/`, `screens/`) for hardcoded user-facing strings and prints a report with suggested key paths.
  - Looks at: JSX text content between tags (skipping expressions like `{name}`) and common string-valued props (`placeholder`, `aria-label`, `title`, `alt`, `label`).
  - Conservative heuristics: rejects URLs, paths, filenames, identifier-like single words (lowercase + dashes/underscores/digits), ALL_CAPS constants, pure numeric/symbol strings, and HTML entities.
  - Suggests dotted key paths derived from file path conventions (e.g. `src/app/dashboard/page.tsx` → `dashboard.<word>`; bracketed segments like `[locale]` are dropped; trailing `page`/`index`/`layout` is stripped).
  - Read-only: never modifies source files. Prints a JSON tree ready to copy into `messages/en.json`.
- 27 new unit tests for `extract-helpers.mjs` (full suite: 86/86 green).

### Changed

- `cli.mjs` recognizes the new `extract` subcommand and lists it in `--help`.

## [0.2.1] - 2026-05-09

### Added

- **`autoglot init` now scaffolds 5 frameworks**, not just Next.js App Router:
  - **Next.js (Pages Router)** — recommends `next-i18next` and prints precise wiring steps for `next.config.js`, `_app.tsx`, and `getStaticProps`. We deliberately don't auto-modify those files.
  - **React Native** — scaffolds `src/i18n/index.ts` with `i18next` + `react-i18next`, includes `compatibilityJSON: "v4"` for RN's stricter Intl.
  - **Vite + React** — scaffolds `src/i18n.ts` with `i18next` + `react-i18next`.
  - **Vue / Nuxt** — scaffolds `src/i18n.ts` with `vue-i18n` Composition API mode.
- Locale codes containing dashes (`zh-CN`, `pt-BR`, etc.) are now sanitized into valid JS identifiers for the import bindings while preserving the original code as the resource key.
- Runtime install hint now lists *all* required packages (e.g. `npm install i18next react-i18next`), not just the headline runtime label.

### Changed

- `detect.mjs` no longer marks Pages Router / Vite / Vue as "ships in v0.2.x" — they're real now.

## [0.2.0] - 2026-05-09

### Added

- **`autoglot init`** — interactive scaffolder. Detects the framework (Next.js App Router / Pages Router, React Native, Vite + React, Vue / Nuxt, or generic), asks which target locales to translate into, writes `messages/en.json` with example keys, empty target locale files, `translate.config.json`, and `.github/workflows/translate.yml`. For Next.js + App Router it also scaffolds `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/middleware.ts`, and (if no `[locale]` segment exists) a starter `src/app/[locale]/layout.tsx` + `page.tsx`. Never overwrites existing files; prints a plan before writing.
- **`autoglot add <locale>`** — append new target locales (creates empty `messages/<locale>.json` files). Reads `messagesDir` from `translate.config.json` if present.
- **`autoglot doctor`** — read-only health check. Verifies the config parses, source file exists, target locales are present, workflow is wired correctly, and the `ANTHROPIC_API_KEY` secret is referenced.
- Zero-deps prompt helpers in `bin/prompts.mjs` (numbered-choice text UI; works in any terminal including dumb CI shells).
- Framework detection in `bin/detect.mjs` (pure helper, fully unit-tested).
- Template generators in `bin/templates/common.mjs` and `bin/templates/nextjs-app-router.mjs`.

### Changed

- The `bin` entry now points to `bin/cli.mjs`, a small dispatcher that routes subcommands to the right module. The default behavior (no subcommand) still runs the translation engine — `action.yml` and existing `npx autoglot --check` / `--dry-run` invocations are unchanged.

## [0.1.0] - 2026-04-28

### Added

- Initial extraction from internal monorepo.
- CLI: `--check`, `--dry-run`, `--locales`, `--model`, `--source`, `--messages-dir`, `--lock-file`, `--config`, `--import-languine`.
- GitHub Action wrapper (`action.yml`) with commit + PR comment steps.
- Anthropic provider with forced tool use (structured output).
- Rate-limit handling (429 retry-after, up to 5 attempts).
- Placeholder validation (`{name}`); retry on mismatch.
- Languine lock file importer.
- `--quiet` flag: suppresses per-locale/per-chunk progress lines. Ignored under `CI=*` so workflow logs stay verbose.
- Parallel locale processing (concurrency 8) via a zero-dep `pLimit` — 10–30× speedup on backfills.
- Pure helpers extracted to `bin/helpers.mjs`; `node:test` suite in `tests/` covers `flatten`, `mergeOrdered`, `extractPlaceholders`, `parseLockYaml`/`dumpLockYaml`, `pLimit`, and friends. `npm test` runs them.
- `--version` / `-v` and `--help` / `-h` flags.
- Renamed from `lingobot` → `autoglot` (project-wide).
- Multi-OS / multi-Node CI matrix (`.github/workflows/ci.yml`).
- Community files: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue templates, PR template, dependabot config.
- Placeholder SVG assets (`hero.svg`, `logo.svg`, `how-it-works.svg`, `pr-comment.svg`) so the README renders before real images are produced.
