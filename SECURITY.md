# Security policy

## Supported versions

The latest minor on the `0.x` line is the only supported version. Once `1.0.0` ships, the latest two minors are supported.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/ffcabbar/autoglot/security/advisories/new). Share a redacted report and omit credentials from logs and screenshots.

I'll acknowledge within 72 hours and keep you posted on a fix. Once a fix is shipped, I'll publish a GitHub Security Advisory and credit the reporter (unless you prefer to stay anonymous).

## Threat model

autoglot is a build-time dev tool. It runs in your CI or on your laptop with your `ANTHROPIC_API_KEY`. Things in scope:

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

## Maintainer credentials and CI

This public repository runs its test suite without provider credentials. For a live translation check, supply the Anthropic key through the local process environment. Keep local credentials out of Git and npm tarballs. If a credential is exposed, revoke or rotate it at the provider.

In repositories that use the Action, run translation on trusted branches. Use read-only permissions for tests of forked pull requests. Keep unreviewed fork code out of jobs that can access a provider key or write to the repository.
