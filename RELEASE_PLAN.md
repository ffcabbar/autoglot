# autoglot — release plan

> Single source of truth for getting this repo from "private folder on disk" to "1k+ stars on GitHub." Read this before you ship.

## 1. What we're competing with

[Languine](https://languine.ai) is the incumbent we're displacing. It's:

- **License:** AGPL-3.0 (non-commercial OK; commercial use requires a paid license).
- **Shape:** CLI + GitHub Action + brand-voice/glossary features.
- **Formats:** 15+ (JSON, YAML, .strings, Android XML, MD).
- **Positioning:** "Localization infrastructure for fast-paced startups."
- **Repo:** [`languine-ai/languine`](https://github.com/languine-ai/languine), ~3k stars.

Other prior art in the space:
- [`i18n-ai-translate`](https://github.com/taahamahdi/i18n-ai-translate) — multi-provider, more flags, no GitHub-Action-as-a-bot story.
- Lokalise, Crowdin, Phrase, Transifex — closed-source SaaS, per-key pricing.

**Where we win:**
- **MIT, not AGPL.** No legal friction for commercial users.
- **Single-file, zero deps.** Auditable in 30 minutes.
- **Bot-on-PR ritual built in.** The action commits the JSON back and posts a cost summary.
- **No SaaS, no signup.** Your API key, your repo.

**Where we don't try to win:**
- 15-format support. We do JSON only (covers `next-intl`, `react-i18next`, `vue-i18n`, `i18next`, basically all JS apps).
- Glossy dashboard. There isn't one.

## 2. Name decision: `autoglot`

Checked npm and GitHub on 2026-05-06. Available in both. Reasoning:

| Criterion | Result |
|---|---|
| npm collision | None (`registry.npmjs.org/autoglot` → 404) |
| GitHub collision | No popular repo named `autoglot` |
| SEO | Excellent — ranks for "auto i18n," "automatic i18n," "i18n automation" |
| Pronounceability | "auto eye-eighteen-en" or "auto-i18n" — same as the well-known abbreviation |
| Brand-neutrality | Doesn't lock to Claude (we want OpenAI/Gemini in v0.2) |
| Trademark risk | None known |

Other strong candidates we evaluated and rejected:
- `localebot` — good fallback, slightly less SEO.
- `rosettai` — clever (Rosetta AI), but pronunciation friction.
- `claude-i18n` — ties to one provider; bad for v0.2.
- `lokalize` / `lokalise` — collides with Lokalise SaaS; legal risk.

## 3. SEO and "get a lot of stars"

The name is ~5% of the outcome. These are the other 95%:

### Must-have before launch
- **README first 2 lines** mention `i18n`, `GitHub Action`, `Claude`, `alternative to Languine/Lokalise/Crowdin`. ← already done.
- **GitHub topics** (set in repo settings):
  ```
  i18n l10n localization translation github-action anthropic claude
  ai automation cli developer-tools next-intl react-i18next vue-i18n
  i18next languine-alternative lokalise-alternative crowdin-alternative
  open-source mit
  ```
- **Hero image / logo / social card** (`og:image`). Repos without one underperform measurably on share sites.
- **30-second demo GIF** in the README, above the fold.
- **Comparison table** (autoglot vs Languine vs Lokalise vs Crowdin vs i18n-ai-translate).
- **Real `examples/basic/` working out of the box** — already done.

### Launch day playbook
1. **Show HN** Tuesday or Wednesday morning ET (9–10 am). Title:
   > *Show HN: autoglot – AI translation bot for your i18n JSON, MIT, single-file*

   First comment yourself: origin story (extracted from a private monorepo, replaced Languine, costs ~$0.001/PR).
2. **Reddit**: r/webdev, r/javascript, r/nextjs (`next-intl` users), r/reactjs.
3. **Submit aggregators** the same week:
   - [openalternative.co](https://openalternative.co) — already lists Languine; submit yours as the MIT/JSON/single-file alt.
   - [fossalternative.com](https://fossalternative.com)
   - [`oh-jon-paul/awesome-i18n`](https://github.com/oh-jon-paul/awesome-i18n) — open a PR
   - `awesome-claude` lists
4. **Twitter/Bluesky thread** with the screenshot of the bot's PR cost-summary comment. That comment IS the marketing.
5. **DEV.to / Hashnode post**: "I replaced Languine with a 500-line script. Here's the diff."

### What to expect
- Day 1: 30–80 stars if Show HN catches.
- Week 1: 100–300 stars if you make GitHub Trending (~50 stars in 24h is the threshold).
- Month 1: 500–1500 stars if comparison content ranks on Google.
- Year 1: 2k–5k is realistic for a focused single-purpose dev tool that solves a real recurring pain.

## 4. Monetization — the honest answer

You asked: sponsorship vs SaaS. Read this fully before deciding.

### Option A — Pure OSS + GitHub Sponsors (recommended for v0.1)

- **Mechanism:** `.github/FUNDING.yml`, "Sponsor" button on the repo page, optional Polar.sh for issue bounties.
- **Realistic income:** $0–$50/mo for the first 6 months. $100–$500/mo if you hit ~3k stars. >$1k/mo is rare for solo dev tools without active marketing.
- **Effort:** ~2 hours setup (GitHub Sponsors profile via Stripe), ~0 ongoing.
- **Pros:** zero conflict with the "no SaaS" pitch, builds your reputation, no tax/legal overhead, no support obligation.
- **Cons:** won't replace a salary.

### Option B — SaaS (NOT recommended)

- **Mechanism:** host the bot, store users' API keys (or use yours and bill per key), build a dashboard.
- **Realistic income:** $0 for 6+ months until you have a paying customer. $1k–$10k MRR possible after 12+ months of active sales.
- **Effort:** months of work — auth, billing, infra, support, GDPR, security.
- **Why it's a bad fit here:**
  - Your entire pitch is "no SaaS, your API key, your repo." Launching a SaaS guts the differentiator.
  - Languine already runs that play. You'd be a worse-funded clone of them.
  - A solo dev SaaS is a full-time job. You said this is "evenings."
- **Verdict:** skip.

### Option C — Open core ("Pro" features behind a license key)

- **Mechanism:** OSS stays MIT and free. A paid tier ($5–$20/mo per repo, license key in env) unlocks:
  - Glossary auto-mining from past PRs
  - Multi-provider fallback (Claude → GPT → Gemini)
  - Translation review UI for non-devs (a static HTML page generated locally, no SaaS)
  - Priority support
- **Realistic income:** $200–$2k MRR after ~6 months IF the OSS hits 2k+ stars first.
- **Effort:** 2–4 weeks to build license-check + 1 pro feature.
- **Pros:** doesn't break the "no SaaS" pitch (still your repo, your API key). Income scales with adoption.
- **Cons:** open-core invites debate ("why is X paywalled?"). Some users will hard-fork.

### Option D — Hosted GitHub App (Level 3 from `docs/distribution.md`)

- **Mechanism:** real bot avatar + GitHub App + one-click installation. OSS still works without it; the App is a paid convenience tier.
- **Realistic income:** $5–$10/mo per repo × ~50–500 repos after a year = $250–$5000 MRR.
- **Effort:** ~1 week to ship the App + billing wire (Polar.sh handles the latter).
- **Pros:** users get a "real bot" with a logo. You get recurring revenue. Doesn't conflict with OSS — they can self-host as before.
- **Cons:** App approval, security review for token handling, support load.

### My recommendation (in order)

1. **Now (v0.1):** Option A — pure OSS + GitHub Sponsors. Don't think about money for the first 6 months. Optimize for stars and PRs.
2. **At ~2k stars:** add Polar.sh for issue bounties. Companies fund specific bug fixes / feature requests at $50–$500 per issue. Zero support obligation, real money.
3. **At ~5k stars or active commercial users:** Option D — Hosted GitHub App with a $5/mo "managed bot" tier. Keep OSS first-class.
4. **Never** Option B (full SaaS) for this product. It contradicts the pitch.

If you absolutely want to make money sooner, take a consulting gig with a company that needs custom i18n tooling — that pays $5k–$50k for a week of work, dwarfing anything OSS donations will return in year 1.

## 5. Release sequence — exact steps

### Pre-flight (do this in order, in this repo)
- [x] Pick the name → `autoglot` (done)
- [x] Rename in source → done in this commit
- [x] Replace README with launch-grade version → done
- [ ] **Rename the local folder**: `mv ~/Desktop/autoglot ~/Desktop/autoglot`. Claude can't do this safely while it's the working directory.
- [ ] **Generate images** for `.github/assets/` (see `.github/assets/README.md` for prompts)
- [ ] **Verify tests pass**: `npm test`
- [ ] **Smoke-test against `examples/basic/`**: `cd examples/basic && node ../../bin/translate.mjs --dry-run`

### Going public (you do this — Claude can't push to GitHub or npm)
- [ ] `gh auth login` (if not already)
- [ ] `gh repo create ffcabbar/autoglot --public --source=. --push --description "AI-powered i18n translation bot. MIT alternative to Languine."`
- [ ] Set repo topics on github.com (see list above)
- [ ] Set repo social card image (Settings → Options → Social preview)
- [ ] `git tag v0.1.0 && git tag v1 && git push origin v0.1.0 v1`
- [ ] `npm login`
- [ ] `npm publish --access public`
- [ ] Smoke-test the published package: `npx autoglot@latest --dry-run` in a scratch repo with `messages/en.json`
- [ ] **Marketplace listing**: GitHub repo → Releases → Draft a release for `v0.1.0` → tick "Publish this Action to GitHub Marketplace" → category: DevOps. Approval: 1–2 days.
- [ ] **GitHub Sponsors profile**: github.com/sponsors → onboard → verify Stripe → confirm `Sponsor` button shows on the repo page.
- [ ] (Optional) Set up Polar.sh and connect to the repo for issue bounties.

### Launch day (after Marketplace approval)
- [ ] Show HN post (title in §3 above)
- [ ] Reddit posts: r/webdev, r/javascript, r/nextjs, r/reactjs
- [ ] Submit to openalternative.co, fossalternative.com
- [ ] PR to `awesome-i18n` and `awesome-claude`
- [ ] DEV.to / Hashnode launch post
- [ ] Twitter/Bluesky thread with PR-comment screenshot

## 6. What's deliberately deferred
- **TypeScript split into modules.** Single `.mjs` is a feature, not a bug.
- **Real GitHub App with bot avatar.** Ship Level 1 (`github-actions[bot]`); upgrade to Level 3 only if there's demand. See `docs/distribution.md`.
- **Multi-provider (OpenAI/Gemini).** v0.2. Provider abstraction should exist in v0.1 internally, but only Anthropic is exposed.
- **YAML / .strings / Android XML formats.** Not until 1k+ stars say they want it.
- **Hosted SaaS.** Not happening.

## 7. Reference: file inventory (post-rename)

```
autoglot/
├── bin/
│   ├── translate.mjs        # main entry, single file, zero deps
│   └── helpers.mjs          # pure helpers, unit-tested
├── tests/
│   └── helpers.test.mjs     # node:test suite
├── examples/basic/
│   ├── messages/en.json
│   ├── translate.config.json
│   └── .github/workflows/translate.yml
├── .github/
│   ├── FUNDING.yml          # GitHub Sponsors
│   └── assets/              # logo, hero, demo GIF, social card (you create these)
│       └── README.md        # prompts for each image
├── docs/distribution.md     # publishing playbook (npm + Marketplace + Sponsors levels)
├── action.yml               # composite GitHub Action
├── package.json
├── README.md                # public face — must look good
├── RELEASE_PLAN.md          # this file
├── CLAUDE.md                # agent context
├── CHANGELOG.md
└── LICENSE                  # MIT
```
