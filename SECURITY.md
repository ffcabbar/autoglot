# Security policy

## Supported versions

The latest minor on the `0.x` line is the only supported version. Once `1.0.0` ships, the latest two minors are supported.

## Reporting a vulnerability

Please **do not open a public issue** for security reports.

Email: `ffcabbar@gmail.com`. Use a subject line like `[autoi18n security] short description`.

I'll acknowledge within 72 hours and keep you posted on a fix. Once a fix is shipped, I'll publish a GitHub Security Advisory and credit the reporter (unless you prefer to stay anonymous).

## Threat model

autoi18n is a build-time dev tool. It runs in your CI or on your laptop with your `ANTHROPIC_API_KEY`. Things in scope:

- Anything that could **leak the API key** (logs, error messages, accidental commits)
- Anything that could **inject malicious content** into translated locale files (prompt injection through source strings, malformed tool-use responses)
- Anything that could **cause unexpected git operations** in CI (force-push, branch deletion, etc.)

Out of scope:

- The Anthropic API itself. Report there: <https://www.anthropic.com/security>.
- Your own infrastructure (CI runners, repo permissions).

## Hardening notes

- The `ANTHROPIC_API_KEY` is read from `process.env.ANTHROPIC_API_KEY`. It's never written to disk and never logged.
- The lock file is plain YAML (md5 hashes only — no source text).
- The composite GitHub Action commits with `github-actions[bot]`, not your user account.
