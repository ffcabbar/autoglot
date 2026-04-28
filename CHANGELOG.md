# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial extraction from internal monorepo.
- CLI: `--check`, `--dry-run`, `--locales`, `--model`, `--source`, `--messages-dir`, `--lock-file`, `--config`, `--import-languine`.
- GitHub Action wrapper (`action.yml`) with commit + PR comment steps.
- Anthropic provider with forced tool use (structured output).
- Rate-limit handling (429 retry-after, up to 5 attempts).
- Placeholder validation (`{name}`); retry on mismatch.
- Languine lock file importer.
