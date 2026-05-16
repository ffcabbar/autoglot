<!-- HERO BANNER
  File:   .github/assets/hero.png
  Size:   1280x640 (2:1) — also used as GitHub social card (Settings → Social preview)
  Prompt: "A minimal, modern banner for an open-source dev tool called 'autoglot'.
           Centered wordmark in a clean geometric sans-serif (Inter / Geist), with
           a small globe-and-translation glyph to the left. Background: subtle
           purple-to-near-black diagonal gradient (#1a0b2e → #4c1d95). White text.
           Tagline below the wordmark in a smaller weight: 'AI translation bot for
           your i18n JSON. MIT, single-file, your API key.' Flat, no 3D, no AI
           glow effects. Looks at home next to Vercel/Resend/Linear branding."
-->
<p align="center">
  <img src=".github/assets/hero.svg" alt="autoglot — AI-powered i18n translation bot" width="820">
</p>

<h1 align="center">autoglot</h1>

<p align="center">
  <strong>AI-powered i18n translation bot.</strong> Edit <code>en.json</code>, push, and your other locale files appear translated in a bot commit.<br>
  MIT alternative to <a href="https://languine.ai">Languine</a>, Lokalise, and Crowdin.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/autoglot"><img src="https://img.shields.io/npm/v/autoglot.svg?color=8b5cf6&label=npm" alt="npm"></a>
  <a href="https://www.npmjs.com/package/autoglot"><img src="https://img.shields.io/npm/dm/autoglot.svg?color=8b5cf6" alt="downloads"></a>
  <a href="https://github.com/ffcabbar/autoglot/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/autoglot.svg?color=8b5cf6" alt="license MIT"></a>
  <a href="https://github.com/marketplace/actions/autoglot"><img src="https://img.shields.io/badge/marketplace-autoglot-8b5cf6?logo=githubactions&logoColor=white" alt="GitHub Marketplace"></a>
  <a href="https://github.com/ffcabbar/autoglot/stargazers"><img src="https://img.shields.io/github/stars/ffcabbar/autoglot?style=flat&color=8b5cf6" alt="stars"></a>
  <a href="https://github.com/sponsors/ffcabbar"><img src="https://img.shields.io/badge/sponsor-%E2%9D%A4-ec4899" alt="Sponsor"></a>
</p>

<p align="center">
  <a href="#quickstart-github-action">Quickstart</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#vs-the-alternatives">vs. Languine / Lokalise</a> ·
  <a href="#configuration">Config</a> ·
  <a href="#models-and-cost">Cost</a> ·
  <a href="#faq">FAQ</a>
</p>

---

<!-- DEMO GIF — record after the first real PR run.
     File: .github/assets/demo.gif (1280x720, ≤ 8 MB, ≤ 30 s)
     Drop the file in and uncomment the <p> tag below.
<p align="center">
  <img src=".github/assets/demo.gif" alt="autoglot in action: edit en.json, push, watch the bot translate and commit." width="820">
</p>
-->

## What it is (and isn't)

autoglot **fills in your missing locale files**. You write `messages/en.json`. autoglot writes `messages/es.json`, `messages/de.json`, etc. by calling Claude on every push.

It is **not** a runtime i18n library. You still need [`next-intl`](https://next-intl.dev/), [`react-i18next`](https://react.i18next.com/), [`vue-i18n`](https://vue-i18n.intlify.dev/), or similar to read those JSON files in your app and resolve `t("...")` calls. autoglot is the translator; your i18n library is the reader.

## Why

- **Zero npm dependencies.** Single Node 20+ script. Auditable in 30 minutes.
- **Incremental.** A YAML lock file fingerprints every English string; only changed/new keys are sent to the LLM.
- **Free, except for the API key.** No SaaS, no rate limits, no quota. You pay Anthropic directly — typical PR costs **under a cent**.
- **CI-native.** Ships as a GitHub Action. The bot commits the translated JSON back to your branch and posts a cost report on the PR.
- **Framework-agnostic.** Works with `next-intl`, `react-i18next`, `vue-i18n`, `i18next`, anything that reads a flat-or-nested JSON message catalog.

<!-- PR COMMENT — placeholder mockup. Replace with a real screenshot once you have one.
     File: .github/assets/pr-comment.png (1024x600). Until you do, the .svg mockup is fine. -->
<p align="center">
  <img src=".github/assets/pr-comment.svg" alt="The bot posts a cost summary as a PR comment" width="720">
</p>

## Quickstart — `npx autoglot init` (30 seconds)

Inside any project:

```bash
npx autoglot init
```

That's it. The CLI:

- detects your framework (see table below) and picks the right runtime i18n library to recommend
- asks which target locales to support (interactive multi-select)
- scaffolds `messages/en.json`, empty `messages/<locale>.json` per language, `translate.config.json`, the `.github/workflows/translate.yml` workflow, and framework-specific glue
- never overwrites existing files (skips them and prints a clear plan before writing)

### Supported frameworks

| Framework | Runtime library | What `init` scaffolds |
|---|---|---|
| **Next.js (App Router)** | `next-intl` | `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/middleware.ts`, plus a starter `src/app/[locale]/layout.tsx` + `page.tsx` if no `[locale]` segment exists |
| **Next.js (Pages Router)** | `next-i18next` | Messages + workflow only; prints precise wiring steps (next.config.js i18n block, `appWithTranslation` HOC, `serverSideTranslations` in pages) |
| **Expo** | `i18next` + `react-i18next` + `expo-localization` | `src/i18n/index.ts` with device-locale auto-detect on app start |
| **React Native (bare)** | `i18next` + `react-i18next` | `src/i18n/index.ts` with all locales registered |
| **Vite + React** | `i18next` + `react-i18next` | `src/i18n.ts` |
| **Vue / Nuxt** | `vue-i18n` | `src/i18n.ts` (Composition API mode) |
| **Generic / unknown** | (your choice) | Messages + workflow only — pair with any i18n library that reads JSON |

After init, three things to finish:

```bash
# 1. Install the runtime i18n library — or let init do it:
npx autoglot init --install            # detects npm/yarn/pnpm/bun automatically
# (or run manually, e.g.: npm install next-intl)

# 2. Add your Anthropic API key as a repo secret
gh secret set ANTHROPIC_API_KEY

# 3. Edit messages/en.json with real strings, then push.
```

Push → GitHub Action runs → bot commits `messages/<locale>.json` translations + cost summary on the PR.

## Other commands

```bash
npx autoglot                     # run translation (the default; same as before)
npx autoglot init                # interactive scaffold (above)
npx autoglot init --install      # …and auto-install runtime libs (--pm=pnpm to override)
npx autoglot add tr ja zh        # add new target locales (creates empty JSON files)
npx autoglot doctor              # health check the setup
npx autoglot extract             # scan source for hardcoded strings and suggest keys
npx autoglot extract --write     # …and merge them into messages/en.json (existing keys protected)
npx autoglot --help              # full flag list
```

### Monorepo

All commands work from any subdirectory. Drop a `translate.config.json` next to the app whose messages you want translated (e.g. `apps/mobile/translate.config.json`) — paths inside the config resolve against the config file's directory, like eslint/vitest/tsconfig. `autoglot doctor` walks up to the repo root to find your workflow regardless of its filename (`translate.yml`, `translate-mobile.yml`, etc.).

## Quickstart — GitHub Action (manual setup)

If you'd rather skip `init` and write the workflow yourself:

```yaml
# .github/workflows/translate.yml
name: translate
on:
  push:
    branches: ["**"]
    paths:
      - messages/en.json
      - translate.config.json

concurrency:
  group: translate-${{ github.ref }}
  cancel-in-progress: true

jobs:
  translate:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: ffcabbar/autoglot@v1
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

Add `ANTHROPIC_API_KEY` to your repo secrets, drop a `messages/en.json`, create one empty `messages/<locale>.json` per language. On every push the bot will diff, translate, commit the diff back, and post a cost summary.

## Quickstart — CLI (no GitHub)

```bash
npm install -D autoglot
ANTHROPIC_API_KEY=sk-ant-... npx autoglot
```

Works in any CI (GitLab, CircleCI, Jenkins) or on your laptop.

## vs. the alternatives

| | **autoglot** | Languine | Lokalise / Crowdin / Phrase | i18n-ai-translate |
|---|:---:|:---:|:---:|:---:|
| License | **MIT** | AGPL-3.0 | Proprietary | MIT |
| SaaS account required | **No** | No (CLI) | **Yes** | No |
| Hosted dashboard | None | Optional | Required | None |
| GitHub Action | **Yes (built-in)** | Yes | Plugin | No |
| Bot commits the diff back | **Yes** | Yes | Manual | No |
| Cost per ~1k-key PR | **<$0.01** | <$0.01 | $5–$50 | <$0.01 |
| Dependencies | **0** | many | n/a (SaaS) | several |
| Multi-provider | v0.2 | Yes | n/a | Yes |
| Formats | JSON | 15+ | 15+ | JSON |
| Self-hosted | **Yes** | Yes | No | Yes |

## Configuration

`translate.config.json` (optional — sensible defaults):

```json
{
  "source": "messages/en.json",
  "messagesDir": "messages",
  "lockFile": "translate.lock",
  "model": "claude-haiku-4-5",
  "glossary": ["MyApp", "Stripe", "API"],
  "namespaceContext": {
    "checkout": "Payment checkout form copy.",
    "dashboard": "Merchant dashboard navigation and forms."
  },
  "namespaces": {
    "dashboard": ["es", "de"]
  }
}
```

| Field | Default | What it does |
|---|---|---|
| `source` | `messages/en.json` | Path to your source-of-truth locale file. |
| `messagesDir` | `messages` | Where the other `<locale>.json` files live. |
| `lockFile` | `translate.lock` | Where to store md5 fingerprints. Commit it. |
| `model` | `claude-haiku-4-5` | Anthropic model. Haiku is recommended; quality is excellent. |
| `glossary` | `[]` | Product/brand names the model must keep verbatim. |
| `namespaceContext` | `{}` | Hint the model about each top-level namespace. Improves quality. |
| `namespaces` | `{}` | Deny-list. Listed namespaces are restricted to listed locales; unlisted namespaces translate to all locales. |

## CLI flags

```
--check                  CI gate: exit 1 if lock != source. No AI call.
--dry-run                Show plan, no AI call, no writes.
--quiet                  Suppress per-locale and per-chunk progress. CI keeps verbose logs.
--locales=de,fr          Restrict run to specific locales.
--model=<id>             Override the configured model.
--source=<path>          Override config.source.
--messages-dir=<path>    Override config.messagesDir.
--lock-file=<path>       Override config.lockFile.
--config=<path>          Custom config file path.
--import-languine[=path] Seed our lock file from a `languine.lock`.
-v, --version            Print version and exit.
-h, --help               Print help and exit.
```

## Models and cost

| Model | Cost (per 1M tokens) | When to use |
|---|---|---|
| `claude-haiku-4-5` *(default)* | $1 in / $5 out | Everything. |
| `claude-sonnet-4-6` | $3 in / $15 out | A specific locale where Haiku quality slips. |
| `claude-opus-4-7` | $15 in / $75 out | You almost certainly don't need this. |

Typical PR (1–3 changed keys × 30 locales) costs under a cent on Haiku. A first-run backfill of ~2,000 keys × 30 locales is around $1–$3.

## Migrating from Languine

```bash
npx autoglot --import-languine=languine.lock
rm languine.json languine.lock
```

Then replace your Languine workflow with the one above. The lock file will be in sync — no re-translation, no re-cost.

## How it works

<!-- ARCHITECTURE DIAGRAM (optional)
  File:   .github/assets/how-it-works.svg
  Prompt: "A simple horizontal flowchart with 5 boxes connected by arrows:
           [en.json edit] → [diff vs lock file] → [Anthropic API: only changed keys]
           → [merge into <locale>.json files] → [bot commit + PR comment].
           Monochrome dark theme, purple accent (#8b5cf6). Looks like a Linear
           or Stripe docs diagram. Inter font."
-->
<p align="center">
  <img src=".github/assets/how-it-works.svg" alt="autoglot architecture: diff → translate → merge → commit" width="1100">
</p>

1. **Flatten** your source JSON to dotted keys: `{ "checkout.cta": "Pay now" }`.
2. **Diff** each value's md5 against the lock file → `new`, `changed`, `orphan` (deleted) keys.
3. **For each locale**: collect missing + changed keys, chunk into batches of 200, call Anthropic with forced [tool use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use) so the response is structured JSON (not freeform).
4. **Validate** placeholders (`{name}`) match between source and translation; retry on mismatch.
5. **Merge** translations back into the locale's JSON, preserving source key order, dropping orphan keys.
6. **Update** the lock file, write a markdown summary, exit.

In CI, the action then commits the diff and posts the cost summary on the PR.

## FAQ

<details>
<summary><strong>Does it work with my framework?</strong></summary>

Yes. `npx autoglot init` has explicit support for **Next.js (App Router & Pages Router)**, **Expo**, **React Native (bare)**, **Vite + React**, and **Vue / Nuxt** — it scaffolds the right runtime setup for each. For anything else (Astro, SvelteKit, Solid, plain HTML, native mobile, server-side, ...) `init` runs in generic mode and just creates the messages + workflow; pair with whichever i18n library you already use that reads JSON.

</details>

<details>
<summary><strong>What about ICU plurals, dates, gender?</strong></summary>

ICU syntax (`{count, plural, one {# day} other {# days}}`) is preserved by the system prompt to Claude. The placeholder validator covers `{name}` tokens; for ICU we rely on the model — in practice Haiku 4.5 handles it correctly. If you spot a regression, open an issue.

</details>

<details>
<summary><strong>Why JSON only?</strong></summary>

JSON covers ~95% of JS app i18n. Adding YAML / `.strings` / Android XML triples the test surface. We'd rather do JSON well than 15 formats badly. v0.3+ if there's demand.

</details>

<details>
<summary><strong>Why not OpenAI / Gemini?</strong></summary>

Coming in v0.2. Anthropic's tool use is the most stable for structured output today, which is why v0.1 ships Anthropic-only. Each provider's tool semantics differ subtly; we'd rather wait until we have tests for all three.

</details>

<details>
<summary><strong>Is the bot a "real" GitHub bot with an avatar?</strong></summary>

Not yet. v0.1 commits as `github-actions[bot]` (the default rabbit avatar). A real GitHub App with the autoglot logo is on the roadmap — see `docs/distribution.md` for the four levels of bot identity and why we chose Level 1 to start.

</details>

<details>
<summary><strong>Can I run it without GitHub?</strong></summary>

Yes. `npx autoglot` works in any CI (GitLab, CircleCI, Jenkins, your laptop). The GitHub Action is just a thin wrapper that adds the `git commit` + `gh pr comment` ritual.

</details>

<details>
<summary><strong>How do I keep brand names from being translated?</strong></summary>

Add them to `glossary` in `translate.config.json`. They'll be passed to Claude with explicit instruction to leave them verbatim.

</details>

## Roadmap

- [x] **v0.1** — Anthropic, JSON, GitHub Action, Languine importer, parallel locales, lock file
- [ ] **v0.2** — Multi-provider (OpenAI, Gemini), provider-fallback chain
- [ ] **v0.3** — YAML / `.strings` / Android XML formats (gated on demand)
- [ ] **v0.4** — Hosted GitHub App (real bot avatar, one-click install) — paid tier, OSS still first-class

See [`RELEASE_PLAN.md`](./RELEASE_PLAN.md) for the full plan.

## Contributing

Issues, PRs, and bug reports welcome. The codebase is intentionally tiny:

- `bin/translate.mjs` (≈ 500 lines) — the entire engine
- `bin/helpers.mjs` — pure helpers
- `tests/helpers.test.mjs` — `node:test` suite, runs offline

```bash
git clone https://github.com/ffcabbar/autoglot
cd autoglot
npm test                                    # offline
cd examples/basic && node ../../bin/translate.mjs --dry-run
```

## Sponsor

If `autoglot` saves you the cost of a Languine subscription, consider [sponsoring on GitHub](https://github.com/sponsors/ffcabbar). The whole project is one person's evenings.

## License

[MIT](./LICENSE) © ffcabbar

---

<p align="center">
  <sub>If autoglot helped you, a ⭐ on the repo is the best way to say thanks.</sub>
</p>
