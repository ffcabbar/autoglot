# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
