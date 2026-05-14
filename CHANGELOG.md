# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
