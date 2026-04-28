# lingobot — agent context

> Self-contained brief for any AI agent picking up this repo cold. Read this first, then the README.

## What this repo is

`lingobot` is a self-hosted, AI-powered i18n translation bot. It diffs a source locale file (`messages/en.json`) against a YAML lock file on every push, sends only changed/new keys to Anthropic Claude, and writes translated `<locale>.json` files back. Drop-in replacement for [Languine](https://languine.ai).

It ships as **two artifacts from one repo**:

1. **CLI / npm package** (`npx lingobot`) — works locally and in any CI.
2. **GitHub Action** (`ffcabbar/lingobot@v1`) — wraps the CLI plus a `git commit / push / gh pr comment` ritual.

There is no SaaS, no hosted dashboard, no backend. Just a 508-line zero-deps Node script + a composite Action.

## Where it came from

Extracted from a private monorepo (`pugpay-monorepo`, ticket CRE-414) where it replaced Languine for the `apps/frontend/messages/` directory. The internal version was Creem-specific (hardcoded paths, glossary, namespace context). This public version is genericized — all of those moved into config.

The internal script went through ~20 fix commits before it was stable. Highlights:

- **Tool use forced** (`tool_choice: { type: "tool", name: "emit_translations" }`) after a Lithuanian translation closed a quoted word with ASCII `"` and broke `JSON.parse`. Non-negotiable. See `bin/translate.mjs:269–277`.
- **Placeholder validation + retry-once.** `extractPlaceholders` (`bin/translate.mjs:444`) checks `{name}` tokens match between source and translation; on mismatch it retries once with `attempt + 1`. ICU plural syntax is *not* validated — the regex would lie. It's protected by the system prompt only.
- **429 retry-after.** When Anthropic rate-limits during a bulk backfill (output-tokens-per-minute is the binding constraint), we sleep `retry-after` seconds and retry up to 5 times. See `bin/translate.mjs:282–287`.
- **Orphan-key removal at zero AI cost.** A key deleted from `en.json` is dropped from every locale on the next run via `mergeOrdered` (`bin/translate.mjs:416`). No API call.
- **Languine importer.** `--import-languine=<path>` reads a `languine.lock` and converts it to our format so users can migrate without re-translating.

## Repo layout

```
lingobot/
├── bin/translate.mjs      # the entire engine (508 lines, zero deps)
├── action.yml             # composite GitHub Action wrapping the CLI
├── examples/basic/        # working demo: en.json + es/de.json + workflow + config
├── docs/distribution.md   # publishing playbook (npm + Marketplace + Sponsors + bot levels)
├── package.json           # name: "lingobot", bin: { lingobot: ./bin/translate.mjs }
├── README.md              # public pitch + quickstart + flag reference
├── CLAUDE.md              # this file
├── CHANGELOG.md
├── LICENSE                # MIT
└── .github/FUNDING.yml    # GitHub Sponsors button
```

## How the script works (algorithm)

1. **Flatten** source JSON to dotted keys: `{ "checkout.cta": "Pay now" }`.
2. **Diff** each value's md5 against the lock file → `new`, `changed`, `orphan` keys.
3. **For each target locale** (every `*.json` in `messagesDir` except the source):
   a. Compute `keysToTranslate = (NEW ∪ CHANGED ∪ MISSING) ∩ allowedNamespaces`.
   b. Chunk into batches of 200 keys (output token budget = 8192).
   c. POST to Anthropic with forced tool use → structured object response.
   d. Validate placeholders, retry once on mismatch.
   e. `mergeOrdered(filteredSource, existing, translations)` preserves source key order, drops orphans.
   f. Write `<locale>.json`.
4. **Update the lock file** with current hashes (deletes orphans).
5. **Emit summary** to stdout, `$GITHUB_STEP_SUMMARY`, and `<tmpdir>/translate-summary.md`.

In CI, `action.yml` then `git commit / pull --rebase / push` (3-attempt retry on race) and `gh pr comment` with the summary.

## Local development

```bash
# Smoke test against the example fixture (no API key needed for dry-run/check):
cd examples/basic
node ../../bin/translate.mjs --dry-run
node ../../bin/translate.mjs --check    # exits 1 because lock is empty

# Real run (costs a few cents):
ANTHROPIC_API_KEY=sk-ant-... node ../../bin/translate.mjs
```

There are **no tests yet** and **no build step**. The script runs straight from source.

## What's done and what's pending

### Done in v0.1 (this initial commit)

- [x] Lifted the script from internal monorepo and genericized
- [x] Composite GitHub Action wrapper (`action.yml`)
- [x] Working example fixture under `examples/basic/`
- [x] README with quickstart, flag reference, Languine migration
- [x] MIT LICENSE
- [x] Smoke-tested `--dry-run` and `--check` against the example
- [x] `.github/FUNDING.yml` for GitHub Sponsors

### Pending — pick up in this order

1. **Push to GitHub.** Create `github.com/ffcabbar/lingobot` (public), `git remote add origin`, `git push -u origin main`.
2. **`npm publish`.** `npm login`, then `npm publish --access public` from the repo root. The `name` field is `lingobot`, version starts at `0.0.0`.
3. **Tag `v0.1.0`** so the action ref `ffcabbar/lingobot@v0.1.0` resolves. Also create a `v1` floating tag pointing at it (convention).
4. **List on GitHub Marketplace.** Repo → Releases → Draft → check "Publish this Action to the GitHub Marketplace" → category: DevOps. Reviewer takes 1–2 days.
5. **Try it on a real test repo.** Create a tiny scratch repo, drop `examples/basic/` content into root, set `ANTHROPIC_API_KEY` secret, push. Watch the bot commit translations. This is the demo.
6. **Add tests.** Golden-file tests on the pure helpers in `bin/translate.mjs`: `flatten`, `mergeOrdered`, `extractPlaceholders`, `parseLockYaml`, `dumpLockYaml`. None need network. ~1–2 hours of work; do this before public users file issues.
7. **Parallelize the locale loop.** `bin/translate.mjs:144` is a serial `for (const locale of targets)`. Wrap with `pLimit(8)` (or hand-rolled equivalent — keep zero-dep). 10–30× speedup on backfills. ~30 LOC.
8. **`--quiet` mode** so non-CI users aren't spammed. Default to verbose when `process.env.CI` is set.
9. **Multi-provider (v0.2).** Add `src/providers/openai.ts` and `gemini.ts`. The provider abstraction should *exist* in v0.1 (Anthropic-only), so v0.2 is purely additive.

### Deliberately deferred

- **TypeScript split into modules.** Single `.mjs` file is fine for now. Refactor when there's a real reason (multi-provider, tests, contributors).
- **GitHub App ("real" bot with avatar + brand).** v0.1 ships using `github-actions[bot]` as commit author. Upgrade only if there's actual demand. See `docs/distribution.md`.
- **Hosted SaaS dashboard.** Not happening. The product is the bot.

## Naming conventions

- **`lingobot`** is the package name (npm), repo name, and Action ref.
- **Bot identity** in v0.1 is the default `github-actions[bot]` (no work required). Don't fake the git author name to look like a real bot — it confuses people who click and find a 404.

## Branding

There is no logo yet. If we make one: keep it simple, monochrome, looks fine in 24×24 favicon. Theme color = `purple` (already set in `action.yml` branding for the Marketplace card).

## Distribution channels — in plain language

Three separate places this lives:

| Channel | URL | What it does |
|---|---|---|
| **GitHub repo** | `github.com/ffcabbar/lingobot` | Source of truth, issues, README |
| **npm registry** | `npmjs.com/package/lingobot` | `npm install` / `npx lingobot` |
| **GitHub Marketplace** | `github.com/marketplace/actions/lingobot` | Discoverability for the Action |

Repo is mandatory. npm is needed for the CLI to work via `npx`. Marketplace is optional but worth doing — free traffic. Full playbook in `docs/distribution.md`.

## Sponsorship

Configured in `.github/FUNDING.yml`. GitHub Sponsors is the primary channel; the "Sponsor" button appears on the repo page once a GitHub Sponsors profile is set up at [github.com/sponsors](https://github.com/sponsors/accounts).

For a JS dev tool, GitHub Sponsors > everything else. Patreon, OpenCollective, Polar, Ko-fi are alternatives with niche cases — see `docs/distribution.md`.

## Don't do these things

1. **Don't add npm dependencies** without a strong reason. "Zero deps" is a feature — it's the second bullet of the README. `pLimit` is small enough to inline.
2. **Don't break the lock file format.** Users have committed `translate.lock` to their repos. Bumping the format means re-translating everything, which means burning their money. If you must change the format, write a migration in `--import-languine` style.
3. **Don't ship multi-provider without tests.** Each provider's tool-use semantics are subtly different. The Anthropic implementation went through 5+ fixes before it was stable. Repeat that without tests and you'll regress on every PR.
4. **Don't add a "sign up" or "register" step.** The product's whole pitch is "your API key, your repo, no SaaS." Anything that requires creating an account on our side is product-suicide.
5. **Don't change the default model without measuring.** `claude-haiku-4-5` is the sweet spot (quality + cost). If a user wants Sonnet they pass `--model=`. Don't make the default opinion for them.

## When in doubt

- **Behavior questions** → run the script against `examples/basic/` and observe.
- **Architecture questions** → `bin/translate.mjs` is one file, top-to-bottom. Read it.
- **Distribution / publishing questions** → `docs/distribution.md`.
- **What was I going to do next** → "Pending" list above.
