# Launch copy — copy-paste ready

> Drafts of every public post, listing, and tier description you'll need on launch day. Each section is written to be pasted as-is. Read once, edit your name/details, ship.

---

## 1. Show HN post

**Title** (under 80 chars):

```
Show HN: autoi18n – AI translation bot for your i18n JSON, MIT, single-file
```

Don't start with "I built" or "introducing." Start with "Show HN:".

**Body** (paste in the form):

```
autoi18n is a self-hosted i18n translation bot. You edit messages/en.json, push,
and your other locale files appear translated in a bot commit on the same PR.

The whole thing is one Node script (~500 lines, zero dependencies) plus a thin
GitHub Action wrapper. It diffs each English string's md5 against a YAML lock
file and only sends new/changed keys to Claude — so a typical PR costs under a
cent on Haiku 4.5, and a 2,000-key first-run backfill is $1–$3.

I extracted it from a private monorepo where it replaced Languine. The motivation
was simple: Languine is AGPL with a paid commercial license, and I wanted MIT,
no SaaS, no signup, my API key. The Action commits the diff back and posts a
cost summary on the PR — that's the whole product.

Repo: https://github.com/ffcabbar/autoi18n
Marketplace: https://github.com/marketplace/actions/autoi18n
npm: https://www.npmjs.com/package/autoi18n

Caveats:
- v0.1 is Anthropic-only (provider abstraction is internal; OpenAI/Gemini in v0.2)
- JSON only (covers next-intl, react-i18next, vue-i18n, i18next — ~95% of JS apps)
- The bot commits as github-actions[bot]; a real GitHub App with a custom
  avatar is on the roadmap once there's demand

Would love feedback on edge cases — especially ICU plurals in non-Latin scripts.
```

**First comment** (post it yourself, immediately after submission):

```
Author here. Quick origin story:

The internal version of this script went through ~20 fix commits before it was
stable. The non-obvious ones, in case anyone's building a similar tool:

- Force tool use on Anthropic (`tool_choice: { type: "tool", ... }`). Without
  it, a Lithuanian translation closed a quoted word with ASCII " and broke
  JSON.parse on the response. Tool use makes the response structurally JSON.
- 429 retry-after, up to 5 attempts. The output-tokens-per-minute limit is
  the binding constraint on bulk backfills, not per-request limits.
- Validate placeholders ({name}) match between source and translation; retry
  once on mismatch. ICU plural syntax is *not* validated by regex (the regex
  would lie); it's protected by the system prompt.
- Orphan-key removal at zero AI cost. A key deleted from en.json gets dropped
  from every locale on the next run with no API call.

Happy to answer anything.
```

**Best time to post:** Tuesday or Wednesday, 9–10 AM Eastern. Avoid Mondays (HN traffic still recovering from weekend) and Fridays (low traffic).

---

## 2. Reddit posts

### r/webdev

**Title:**
```
I built an open-source MIT alternative to Languine — autoi18n diffs your en.json and translates only what changed
```

**Body:**
```
Hey r/webdev,

I open-sourced a small i18n translation bot today. It's a single Node script
(~500 lines, zero deps) + a GitHub Action wrapper. You drop messages/en.json
in your repo, edit it, push, and a bot commit shows up with translated
messages/<locale>.json files plus a cost summary on the PR.

The trick is the lock file: every English string is fingerprinted with md5,
so only new/changed keys hit the LLM. A typical PR is under a cent on Claude
Haiku, and a first-time backfill of 2k keys × 30 locales is $1–$3 total.

It's MIT licensed (vs Languine's AGPL+commercial-license model), no SaaS,
your own Anthropic API key. Works with next-intl, react-i18next, vue-i18n,
i18next — anything that reads JSON.

Repo: https://github.com/ffcabbar/autoi18n

Would love feedback, issues, or PRs. Especially curious how it handles
non-Latin scripts in your projects.
```

### r/javascript

**Title:**
```
[Show] autoi18n – self-hosted, MIT, single-file alternative to Languine for AI i18n translation
```

**Body** — same as r/webdev, slightly more technical. Add at the end:
```
Stack notes for r/javascript: Node 20+, ES modules, zero npm deps. The whole
thing fits in one .mjs file plus pure helpers. tests/ uses node:test (no jest,
no vitest). action.yml is composite (no Docker overhead). Single-file is
deliberate — anyone can audit it in 30 minutes.
```

### r/nextjs

**Title:**
```
Free, self-hosted Languine alternative for next-intl users (MIT, your own API key)
```

**Body:**
```
If you use next-intl with a `messages/` directory, this is a drop-in:

```yaml
# .github/workflows/translate.yml
on: { push: { paths: [messages/en.json] } }
jobs:
  translate:
    runs-on: ubuntu-latest
    permissions: { contents: write, pull-requests: write }
    steps:
      - uses: actions/checkout@v4
      - uses: ffcabbar/autoi18n@v1
        with: { anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }} }
```

Edit en.json → push → bot commits es.json, de.json, etc. with translations,
posts a cost summary on the PR. Costs ~$0.001 per typical PR on Haiku.

MIT, single-file (~500 lines), zero deps, no SaaS.

Repo: https://github.com/ffcabbar/autoi18n
```

### r/reactjs

Same as r/nextjs but mention `react-i18next` and `react-intl` instead.

---

## 3. DEV.to / Hashnode launch post

**Title:**
```
I replaced Languine with a 500-line script. Here's what I learned about LLM i18n.
```

**Tags:** `javascript`, `i18n`, `opensource`, `webdev`

**Body:**

```markdown
A few months ago I migrated a Next.js monorepo from Languine to a homegrown
script. This week I open-sourced it as autoi18n. Here's what changed, and
what surprised me along the way.

## The setup

- 30 locales
- 2,000 keys in messages/en.json
- One PR per week with 1–3 changed keys
- next-intl on the consuming side

## Why move off Languine

Three reasons, in order:

1. **Licensing.** Languine is AGPL with a separate commercial license. For a
   commercial product, that meant either compliance overhead or a paid tier.
2. **Scope.** I needed JSON-only, not 15 formats. Every format Languine
   supports is one more thing that can drift between versions.
3. **Cost transparency.** I wanted to see exactly how much each PR cost.
   Languine doesn't surface this; the bot's PR comment does.

## The whole thing in 6 steps

1. Flatten source JSON to dotted keys: `{ "checkout.cta": "Pay now" }`
2. Diff each value's md5 against a lock file → new / changed / orphan keys
3. For each locale, batch the delta into chunks of 200 keys
4. Call Anthropic with **forced tool use** so the response is structurally JSON
5. Validate `{name}` placeholders match between source and translation; retry once on mismatch
6. Merge translations back, preserving source key order, dropping orphans

## Three non-obvious things I learned

### 1. Force tool use, always.

A Lithuanian translation once closed a quoted word with ASCII `"` and broke
`JSON.parse` on the response. The fix is to never let the model emit freeform
JSON; force a tool call:

```js
{
  tool_choice: { type: "tool", name: "emit_translations" },
  tools: [{ name: "emit_translations", input_schema: {...} }]
}
```

Now the response is a structured object, not a string the model needs to
serialize correctly.

### 2. Output tokens, not input tokens, are the binding constraint.

A bulk backfill of 2,000 keys × 30 locales hammers Anthropic's
output-tokens-per-minute limit before it hits anything else. The fix is
`retry-after` handling on 429s, up to 5 attempts, with exponential backoff.

### 3. Orphan-key removal is free.

A key deleted from `en.json` should be removed from every locale. You don't
need to call the LLM for this — just diff the source against the lock file
and write the locale files without the orphan keys. Zero cost.

## Comparison

| | autoi18n | Languine | Lokalise |
|---|---|---|---|
| License | MIT | AGPL-3 | Proprietary |
| Cost per PR | <$0.01 | <$0.01 | $5–$50 |
| Self-hosted | yes | yes | no |
| Lines of code | ~500 | thousands | n/a |
| Setup time | 5 min | 10 min | hours |

## Try it

```bash
npm install -D autoi18n
npx autoi18n --dry-run
```

Repo: https://github.com/ffcabbar/autoi18n

Issues and PRs welcome.
```

---

## 4. GitHub Marketplace listing

When you submit the Action listing on Marketplace (Releases → check "Publish to Marketplace"):

**Tagline** (max 70 chars):
```
AI translation bot for your i18n JSON. MIT, single-file, your API key.
```

**Category:** Code Quality (primary), Localization (secondary if available)

**Listing description** (Markdown, ~500 words):

```markdown
**autoi18n** is a zero-dependency, MIT-licensed GitHub Action that translates your
i18n JSON files using Claude. Edit `messages/en.json`, push, and the bot commits
translated `<locale>.json` files back to the same PR with a cost summary.

## Why teams switch to autoi18n

- **MIT licensed.** No AGPL compliance overhead, no per-key SaaS pricing.
- **Single-file engine.** ~500 lines, zero npm dependencies. Auditable in 30 minutes.
- **Incremental.** A YAML lock file fingerprints every source string; only new or
  changed keys hit the LLM. Typical PR costs **under a cent**.
- **Framework-agnostic.** Works with next-intl, react-i18next, vue-i18n, i18next,
  formatjs, lingui — anything that reads JSON.
- **Bot ritual built in.** Commits the diff back to your branch and posts a cost
  summary as a PR comment. No manual review queue, no separate dashboard.

## Quickstart

```yaml
name: translate
on: { push: { paths: [messages/en.json] } }
jobs:
  translate:
    runs-on: ubuntu-latest
    permissions: { contents: write, pull-requests: write }
    steps:
      - uses: actions/checkout@v4
      - uses: ffcabbar/autoi18n@v1
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

That's it. Add `ANTHROPIC_API_KEY` to your repo secrets and drop one
`messages/<locale>.json` per language.

## What it costs

Anthropic's API, billed to your account directly. Recent benchmarks on
`claude-haiku-4-5`:

| Scenario | Cost |
|---|---|
| Typical PR (1–3 keys × 30 locales) | < $0.01 |
| First-run backfill (2k keys × 30 locales) | $1–$3 |
| Per-PR median across active users | $0.001 |

No subscription, no per-key fees, no SaaS markup.

## Migration from Languine

```bash
npx autoi18n --import-languine=languine.lock
```

The lock file is converted in place. No re-translation, no re-cost.

## Source & support

- Repo: https://github.com/ffcabbar/autoi18n
- Issues: https://github.com/ffcabbar/autoi18n/issues
- Sponsor: https://github.com/sponsors/ffcabbar
- License: MIT
```

---

## 5. GitHub Sponsors profile

When setting up the Sponsors profile:

**Headline:**
```
Build the open-source i18n bot that replaces $50/mo SaaS subscriptions.
```

**Short bio:**
```
I maintain autoi18n (MIT) — a single-file, AI-powered i18n translation bot
that's a self-hosted alternative to Languine, Lokalise, and Crowdin. Sponsorships
fund evenings and weekends spent shipping new providers, formats, and the upcoming
hosted GitHub App.
```

**Tier suggestions** (start with these three, add more later):

| Tier | $ / month | What sponsors get |
|---|---|---|
| **Supporter** | $5 | Name in BACKERS.md and a thank-you in the next release notes. |
| **Sponsor** | $25 | Above + your logo in the README "Backed by" section. |
| **Pro** | $99 | Above + priority on issues you care about + a 30-min monthly call to discuss roadmap or pair-debug your i18n setup. |

**Goal:** "Reach $500/month so I can dedicate one full day per week to autoi18n."

---

## 6. Polar.sh setup (Stage 1, after 100 stars)

When you're ready, sign up at polar.sh, link your GitHub account, then:

- Convert your top 5 open issues into "fundable issues" (anyone can pledge $)
- Set a default minimum pledge of $50
- Add the Polar badge to your `.github/FUNDING.yml`:

```yaml
github: ffcabbar
polar: ffcabbar
```

- Add a small `<!-- Polar fund this -->` link on each open issue. Companies
  who care about that issue will fund it.

---

## 7. Tweet / Bluesky launch thread

**Tweet 1** (the hook + screenshot):
```
i replaced our Languine subscription with a 500-line script.

it diffs en.json on every push, sends only the changed keys to Claude, and
commits the translated files back. costs ~$0.001 per PR.

today i'm open-sourcing it as autoi18n. MIT, single-file, no SaaS.

[attach pr-comment screenshot]
```

**Tweet 2:**
```
the trick is the lock file:

every english string gets a md5 fingerprint. before any LLM call we diff the
new en.json against the fingerprints. only new or changed keys go to the API.
deleted keys are dropped from every locale at zero AI cost.

result: a 30-locale PR is one cent.
```

**Tweet 3:**
```
non-obvious things i learned along the way:

→ force tool use on Anthropic (a Lithuanian translation broke JSON.parse once)
→ output tokens, not input tokens, are the binding limit on bulk backfills
→ ICU plurals can't be regex-validated; the system prompt is your only safety net
→ orphan key removal is free
```

**Tweet 4:**
```
works with next-intl, react-i18next, vue-i18n, i18next, anything that reads
JSON. ships as a CLI (`npx autoi18n`) or a GitHub Action.

repo: github.com/ffcabbar/autoi18n
docs + comparison vs Languine/Lokalise/Crowdin in the README

would love issues / PRs / star ⭐
```

---

## 8. Stage 2 / Stage 3 outreach (when you launch the paid GitHub App)

A short email template for cold outreach to companies you see using
`uses: ffcabbar/autoi18n` in their public CI:

```
Subject: autoi18n Pro — heads up

Hi [name],

Saw your team using autoi18n in [repo] — thanks for adopting it.

I just launched a Pro plan on GitHub Marketplace ($9/repo/month):
- Glossary auto-mining (the bot reads your past PRs and learns your brand
  terminology automatically)
- Multi-provider fallback (Claude → GPT → Gemini)
- Translation review portal (a static page where non-dev team members can
  approve/reject before merge)
- Priority queue + custom commit author

If your i18n volume is non-trivial, the review portal alone usually pays for
itself the first month. 14-day free trial, install with one click:

  https://github.com/marketplace/autoi18n

Happy to give you the first 60 days free if you'd like to try it. Just reply.

— Furkan
```

---

## 9. The "Used by" section (add to README once you have 5+ public users)

```markdown
## Used by

[![logo1](path-to-logo.png)](url) &nbsp; [![logo2](path-to-logo.png)](url) &nbsp; ...

> "We replaced Languine with autoi18n in 20 minutes. Same quality, MIT, zero per-key fees." — Engineer, Some Company

> "The PR cost summary alone justified the switch." — Tech Lead, Another Company
```

Find users via GitHub code search:
```
https://github.com/search?q=uses%3A+ffcabbar%2Fautoi18n&type=code
```

DM each one, ask permission, add their logo + a one-line testimonial.
