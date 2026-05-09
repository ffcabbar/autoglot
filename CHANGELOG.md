# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
