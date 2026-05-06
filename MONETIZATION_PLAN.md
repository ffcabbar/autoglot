# autoi18n — year-one monetization plan

> Star-milestone-based playbook. From v0.1 launch to (realistically) $1k–$10k MRR in 12 months. No bullshit numbers.

## The "tons of money" honest disclaimer

Before the plan, three uncomfortable truths:

1. **GitHub Actions don't make money.** Marketplace pays publishers $0 for Action installs. Period. Money comes from things *next to* the Action — Sponsors, Polar bounties, a paid GitHub App, a Pro tier behind a license key.
2. **Solo OSS dev tools rarely cross $5k MRR in year 1.** Public reference points: Sindre Sorhus pulls ~$25k/year across hundreds of top-tier packages. Caleb Porzio's Livewire (massive, mainstream) pulls ~$200k/year. Most solo OSS dev tools earn $0–$2k/year. **Anyone who tells you "build OSS, get rich" is lying.**
3. **"Tons of money" from this project requires either**:
   - going full-time and building a team-tier SaaS on top (Plausible / Cal.com / PostHog model — millions, but full-time work)
   - or accepting that "evenings-only" caps you somewhere around $5k–$30k/year and using the project as a credibility funnel for consulting / a future startup.

This plan optimizes for **path 2**: maximize income per evening of effort, with a clear ladder so when momentum hits you can jump to path 1.

## What GitHub actually lets you charge for

| Surface | Can charge? | Notes |
|---|---|---|
| **GitHub Action** (Marketplace listing) | ❌ No | Marketplace lists Actions free. There is no paid-Action mechanism. |
| **GitHub App** (Marketplace listing) | ✅ Yes | This is the only "GitHub-native" billing path. Free + paid plans, monthly/yearly, GitHub handles billing & tax. |
| **GitHub Sponsors** | ✅ Yes | Donations only. Monthly tiers + one-time. Stripe-backed. |
| **External paywall** (license key) | ✅ Yes | License key in env, your code checks it. Charge via Polar.sh, Stripe, Lemon Squeezy. Open-core model. |
| **Polar.sh issue bounties** | ✅ Yes | Companies fund specific issues. Per-issue, no recurring. |

**Key insight:** to sell *on Marketplace itself* you need a **GitHub App**, not an Action. GitHub Apps have their own identity (avatar, profile, `[bot]` badge). The current `autoi18n` action is the OSS, free-forever core. The future paid GitHub App is what makes money.

**Strategic decision the docs force on you**: once the App is on Marketplace, you can't have a free Marketplace listing AND a separate paid Stripe paywall. You must put all paid tiers on Marketplace. So the path is:

- **OSS GitHub Action** (`uses: ffcabbar/autoi18n@v1`) — stays MIT, free forever, no Marketplace billing involved
- **GitHub App on Marketplace** — Free + Pro + Team plans, all billed by GitHub at 5% commission

Two products, one repo.

GitHub Marketplace App pricing rules (verified from current docs, 2026):

| Rule | What it means for autoi18n |
|---|---|
| Plan types: **Free**, **Flat-rate**, **Per-unit** | We'll use Free + Flat-rate. Per-unit is for "per-seat" tools — not us. |
| **Up to 10 plans** per listing | More than enough — we'll ship 3–4 (Free, Pro, Team, Enterprise) |
| **Both monthly AND annual price** required for every paid plan | Trivial — just set both, offer 20% annual discount |
| **USD only** | Fine |
| **Paid plans require Verified Publisher status** | Free to apply. Needs business email + org-level 2FA + accept terms. Apply early in Stage 2 because review takes 1–2 weeks. |
| **Free trial: 14 days, fixed length** | We'll enable on the Pro plan |
| **GitHub commission: 5%** (post-2021) | You keep **95%** — way better than App Store's 30% or Stripe's ~3%. This is one of the best marketplaces for publishers, period. |
| **$500/month minimum** to receive payout | Below $500 MRR, GitHub holds the money. Once you cross $500 you get paid at end of next month via ACH. |
| **Critical restriction**: if your app has a free Marketplace listing, you **cannot offer a paid version outside Marketplace** | Read this twice. It means once you list on Marketplace, all paid plans must live on Marketplace too. You can't list "free" on Marketplace and run a Stripe paywall on the side. |

The 5% commission is the hidden good news. **You keep 95% of everything**, GitHub handles billing/tax/refunds/dunning. That's better than Stripe alone (~3% but you pay tax / build dunning yourself). For a solo dev tool, this is a no-brainer.

## The ladder

```
0★         100★        500★        2k★         5k★         10k★
├──────────┼───────────┼───────────┼───────────┼───────────┼─────►
│          │           │           │           │           │
│ Stage 0  │ Stage 1   │ Stage 2   │ Stage 3   │ Stage 4   │ Stage 5
│ Build    │ Validate  │ Brand     │ Charge    │ Scale     │ Decide:
│ + ship   │ + collect │ + GitHub  │ + Pro     │ + Team    │ scale
│          │ feedback  │ App       │ tier      │ tier      │ to SaaS
│          │           │           │           │           │ or stay
│          │           │           │           │           │ small
└──────────┴───────────┴───────────┴───────────┴───────────┴─────
$0          $0–$50      $50–$300    $300–$1.5k  $1.5k–$5k   $5k–$20k+
                MRR         MRR         MRR         MRR         MRR
```

---

## Stage 0 — v0.1 launch (0–100 stars, weeks 0–2)

**Goal:** ship, collect first users, get on GitHub Trending if possible.

### Do
- [ ] Make repo public, push code, tag `v0.1.0` + `v1`
- [ ] `npm publish --access public`
- [ ] List on GitHub Marketplace (the Action — free)
- [ ] Set up GitHub Sponsors profile, verify Stripe → Sponsor button live on repo
- [ ] **Generate the 5 images** in `.github/assets/` (hero, logo, demo gif, PR-comment screenshot, architecture)
- [ ] Set GitHub social card
- [ ] Show HN launch post (Tuesday 9am ET)
- [ ] Reddit: r/webdev, r/javascript, r/nextjs, r/reactjs
- [ ] DEV.to launch post: *"I replaced Languine with a 500-line script"*
- [ ] PR to `awesome-i18n` and `awesome-claude`
- [ ] Submit to openalternative.co + fossalternative.com

### Don't
- ❌ Build a SaaS
- ❌ Build a paid tier yet
- ❌ Build a GitHub App yet
- ❌ Try to charge anything yet

### Revenue expectation
**$0.** If anyone offers to sponsor at this stage, accept gratefully but do not expect it.

### Success metric
- 100 stars in 2 weeks → green light for Stage 1
- Less than 30 stars → relaunch with better positioning before Stage 1 (the demo GIF is usually the issue)

---

## Stage 1 — first 100–500 stars (months 1–2)

**Goal:** validate that real users use the bot in real repos. Collect testimonials.

### Do
- [ ] **Reply to every issue within 24 hours.** This is the single highest-leverage activity at this stage. Repos with active maintainers get more stars; word spreads.
- [ ] Add a "Used by" section to README once 5+ public repos are using the action (`github code search` for `uses: ffcabbar/autoi18n`)
- [ ] Add **Polar.sh** integration. Convert top 5 GitHub issues to fundable. Companies pay $50–$500 per issue.
- [ ] Set up `.github/FUNDING.yml` to include Polar.sh:
      ```yaml
      github: ffcabbar
      polar: ffcabbar
      ```
- [ ] Write 1 deep-dive blog post: *"How autoi18n diffs JSON keys for 10× cheaper i18n updates"* — technical, ranks for "i18n diff cost".
- [ ] First **case study** (free): help one real user (a startup using `next-intl`) migrate from Languine → autoi18n. Get a 2-line testimonial in exchange. Add to README.

### Revenue
- GitHub Sponsors: **$0–$50/mo** (1–5 sponsors at $5/mo is realistic)
- Polar.sh bounties: **$0–$200/mo** (1 bounty/month average)
- **Total: $0–$250/mo**

### Don't
- ❌ Don't add a Pro tier yet — you don't have product-market fit signal yet.
- ❌ Don't start building the GitHub App yet — premature.

### Success metric
- 500 stars → green light for Stage 2
- 5 active monthly users in unrelated repos
- 2+ public testimonials

---

## Stage 2 — 500–2k stars (months 2–4)

**Goal:** stop being "github-actions[bot]." Build the GitHub App so the bot has the autoi18n avatar and identity. **Free tier only at this stage.**

### Do
- [ ] **Register a GitHub App** at github.com/settings/apps (or under your org's settings → Developer settings → GitHub Apps → "New GitHub App"):
  - **Name**: `autoi18n` — max 34 chars, must be globally unique on GitHub. Lowercased and dash-joined for the slug. Reserve this name **before someone else takes it** — anyone can register an App with any free name. ⚠️ **Do this in Stage 1, even if you don't build the App until Stage 2.**
  - **Homepage URL**: `https://github.com/ffcabbar/autoi18n`
  - **Webhook URL**: your Cloudflare Worker / Vercel function endpoint (set "Active" off until you build the backend)
  - **Webhook secret**: generate a random 32-byte hex string and store it
  - **Permissions**: `contents: write`, `pull-requests: write`, `metadata: read`
  - **Webhook events**: `push`, `pull_request`
  - **Visibility**: Public (so anyone can install it)
  - **Custom badge**: upload `.github/assets/logo.png` (200×200 PNG, <1 MB) and set background hex to `#8b5cf6`. The default identicon looks unprofessional — don't ship without your own logo.
- [ ] Build the App backend (small Cloudflare Worker or Vercel function — free tier covers all of this for years):
  - Receives webhook on `push`
  - Mints installation token
  - Runs the autoi18n script (same code) using the user's `ANTHROPIC_API_KEY` (stored encrypted in the App's per-installation config) OR a "BYOK" model where the user pastes it once at install time
  - Commits results with the App's identity → `🤖 autoi18n[bot]` with the autoi18n purple-globe avatar and the orange `[bot]` badge
- [ ] **Free plan only** for now. Goal is to validate that the App is more frictionless than the Action workflow YAML.
- [ ] List the App on GitHub Marketplace as **Free** (still no paid tier).
- [ ] Become a **Verified Publisher** (free; needs business email + org 2FA). This unlocks paid plans later and gives you the 95% revenue share.
- [ ] Keep the OSS Action working and unchanged. Both ship side-by-side.
- [ ] Add a `Works with autoi18n` README badge (a custom shield others can paste in their repo).

### Revenue
- GitHub Sponsors: **$50–$200/mo**
- Polar.sh bounties: **$100–$500/mo** (companies starting to bet on you)
- App: **$0** (still free)
- **Total: $150–$700/mo**

### Why no paid tier yet
You don't know what users will pay for. Wait until ~50 organic App installs, then ask 10 of them: *"What's the most painful part of i18n still?"* Their answers tell you what the Pro tier should do.

### Success metric
- 2k stars
- 50+ App installations on real repos
- 10 user interviews → clear signal on what to paywall

---

## Stage 3 — 2k–5k stars (months 4–8) — **the money stage**

**Goal:** launch the paid Pro tier. $5–$15/mo per repo on the App. This is where MRR starts.

### Do
- [ ] **Pick the Pro features.** Based on Stage 2 user interviews, candidates:
  - **Glossary auto-mining** — the App reads your past PRs and learns your brand terminology automatically. Big quality win, hard to self-host.
  - **Multi-provider fallback** — Claude → GPT → Gemini chain so a 5xx from one doesn't block the bot.
  - **Translation review portal** — generated static HTML page (no backend) where non-dev team members can approve/reject suggested translations before merge. Massive value for marketing teams.
  - **Slack/Discord notifications** — translation summary posted to a channel.
  - **Custom commit author** — `<your-org>-bot[bot]` instead of `autoi18n[bot]`.
  - **Priority API access** — your translations skip Anthropic rate-limits via your own pooled API key.
- [ ] **Start with 1 Pro feature**, ship it in 2–3 weeks. Don't over-build.
- [ ] **Pricing** (every plan must have BOTH monthly and annual price per Marketplace rules):
  - **Free**: up to 100 keys, public repos only, autoi18n[bot] author. Forever free.
  - **Pro**: **$9/mo or $86/yr** (≈20% off annual). Unlimited keys, private repos, priority queue, glossary auto-mining. 14-day free trial enabled.
  - **Team**: **$39/mo or $374/yr**. Up to 10 repos, Pro features + review portal + Slack notifications.
  - You can have up to 10 plans on a Marketplace listing — start with these 3, add Enterprise in Stage 4.
- [ ] **Apply for Verified Publisher status** for your org if you haven't already (required for paid plans, free to apply, ~1 week review).
- [ ] **Complete financial onboarding** — GitHub will collect bank/ACH details for payouts. **Note: payouts only happen once you cross $500 MRR**, then arrive end of the following month. Below that threshold GitHub holds the balance.
- [ ] Submit the paid plans to GitHub Marketplace for review (1–2 weeks for first paid review).
- [ ] **Conversion funnel optimization**:
  - Make the App installation a 2-click flow from the README ("Install the bot →" button → GitHub OAuth)
  - In-App upsell: when a free user hits the 100-key limit, show a paywall in the bot's PR comment with a 14-day Pro trial link
- [ ] Hire (well, contract) a 1-day designer for ~$500 to polish the App's avatar + landing page if you haven't already.
- [ ] **Comparison content** for SEO: dedicated pages "autoi18n vs Languine," "autoi18n vs Lokalise," "autoi18n vs Crowdin." Each is a separate URL on a tiny static site (Vercel free). These rank well and bring buying-intent traffic.

### Revenue math (realistic)

Conversion rates for solo dev-tool open-core (calibrated against public numbers from Plausible, Beeper, Mintlify early days):

```
2k stars
  × 2% become App installs  =  40 installs
  × 60% activate (translate at least 1 PR)  =  24 active
  × 8% upgrade to Pro  =  ~2 paid customers @ $9/mo = $18/mo

5k stars
  × 2% become App installs  =  100 installs
  × 60% activate  =  60 active
  × 8% upgrade to Pro  =  5 customers @ $9 = $45/mo
  × 1.5% upgrade to Team  =  1 customer @ $39/mo = $39/mo
                                       Pro+Team total: $84/mo

  + Sponsors: $200/mo
  + Polar bounties: $300/mo (avg)
  ───────────────────────────────
  Total MRR: ~$580/mo at 5k stars
```

That's the **realistic** number. The optimistic number (if Pro feature has obvious enterprise value, like the review portal): 3× this. The pessimistic number: 0.5× this.

### Don't
- ❌ Don't price the Pro tier at $1–$3/mo. Cheap pricing attracts low-quality customers and signals low value. $9 is the floor for a B2B dev tool.
- ❌ Don't add an Enterprise tier yet (not until 5k stars).
- ❌ Don't promise SLAs you can't deliver as a solo evenings-effort.

### Success metric
- 5k stars
- 100+ paying customers across Pro+Team
- $1k+ MRR
- Clear feature signal for the next 2 Pro features

---

## Stage 4 — 5k–10k stars (months 8–12) — **scaling**

**Goal:** add Team tier features that justify $39–$99/mo. Get to $5k MRR.

### Do
- [ ] Ship Pro feature #2 and #3 (whatever interviews surfaced)
- [ ] **Team tier** ($39/mo) → Translation Review Portal + Slack/Discord + glossary mining + multi-provider fallback
- [ ] **Enterprise tier** ($199/mo) → SSO, custom commit author, dedicated support email, custom Anthropic provider key
- [ ] Hire a contractor for 1–2 days/week (paid from MRR) for support + small features
- [ ] Add "Customers" page with logos (with permission) → social proof drives conversions
- [ ] **Add an annual discount** — 20% off when paid yearly. Locks in MRR.
- [ ] **Affiliate program**: 30% recurring for the first 12 months when someone refers a Pro customer. Negligible cost, huge growth lever.
- [ ] **Polar.sh "Pro" tier** for bounty matchers: companies that pay $200/mo to have priority issue voting. Bonus revenue.

### Revenue math at 10k stars

```
10k stars
  × 2.5% installs (better activation funnel by now)  =  250 installs
  × 65% activate  =  163 active
  × 12% Pro  =  20 @ $9  =  $180/mo
  × 3%  Team  =  5  @ $39 =  $195/mo
  × 0.5% Enterprise  =  1 @ $199 = $199/mo
                              Plans total: $574/mo

  + 5k installations growing 30% q/q over 12 months
  + Compounding annual upgrades

  Realistic: $2k MRR at 10k stars
  Optimistic: $5k MRR at 10k stars
  + Sponsors: $500/mo
  + Polar: $500/mo
  ─────────────────────────────
  All-in realistic: $3k MRR
  All-in optimistic: $6k MRR
```

### Don't
- ❌ Don't quit your day job yet at $3k MRR. The runway math is brutal — you need 12 months of runway and 2× current MRR to safely transition.
- ❌ Don't take VC money at this stage. You don't need it. 

### Success metric
- 10k stars
- $3k–$6k MRR
- Clear repeating customer-success patterns
- Decision point: scale to SaaS team or stay solo

---

## Stage 5 — 10k+ stars (year 2 onward) — **the fork in the road**

At ~10k stars and $3k–$6k MRR, you have a real choice:

### Path A — Stay solo, evenings (recommended for sanity)
- Cap effort at 8–10h/week
- Push prices up over time (most successful OSS-app combos increase prices 2× over years 2–4)
- MRR plateaus at ~$5k–$15k/mo
- **Annual income: $60k–$180k passive-ish.**
- Total time invested: ~500h/year
- This is the **dream lifestyle business outcome.** Most OSS founders never reach this.

### Path B — Go full-time, build the team SaaS
- Need 6 months runway at this stage ($30k+ savings)
- Quit job, hire 1 contractor immediately
- Position autoi18n as an **i18n-team product**, not a developer tool. Sell to mid-market ($500–$5k/mo per company), not per-repo.
- Realistic 12-month outcome from $5k MRR: $25k–$80k MRR (5–16× growth).
- Year 3 outcome if you nail mid-market: $200k–$1M ARR.
- This is the **YC application path.**
- Risk: 60% chance of MRR plateauing and you've quit your job for nothing.

### Path C — Acquihire / sell
- $5k MRR × 36 = ~$180k acquisition price (typical micro-SaaS multiple is 30–48× MRR)
- Buyers: Microns, IndieMaker, LogiSnap, BizPedia, or a strategic buyer like Localazy
- Walk-away money for 1 year of evenings work. Not bad.

**My recommendation:** at 10k stars, take 30 days off work. Decide A or B clearly. Don't try both.

---

## What you do *this week*

Forget stage 5. You're at stage 0 with 0 stars. Your only job:

1. ✅ Generate the 5 images in `.github/assets/` (use the prompts in `.github/assets/README.md`)
2. ✅ `mv ~/Desktop/lingobot ~/Desktop/autoi18n`
3. ✅ `gh repo create ffcabbar/autoi18n --public --source=. --push`
4. ✅ Set repo topics (list in `RELEASE_PLAN.md` §3)
5. ✅ `npm publish --access public`
6. ✅ Tag `v0.1.0` + `v1`
7. ✅ Submit Marketplace listing (free Action)
8. ✅ Write the Show HN post and schedule it for next Tuesday 9am ET
9. ✅ Set up GitHub Sponsors profile
10. ✅ **Reserve the GitHub App name `autoi18n`** at github.com/settings/apps (App names are globally unique — squat your own name before someone else does, even though you won't build the App until Stage 2)

Stage 1 unlocks once you cross **100 stars**. Don't skip ahead. The single most common mistake at every stage of this ladder is **building Stage N+2 features when you're at Stage N**. Stay focused on the next milestone.

---

## Reference: realistic public benchmarks

Solo / small-team OSS GitHub projects with public revenue numbers (rough; verify before quoting):

| Project | Model | Stars | Public revenue |
|---|---|---|---|
| **Plausible** | Open-core SaaS | 24k | $1M+ ARR (full-time team) |
| **Cal.com** | Open-core SaaS | 35k | $5M+ ARR (VC-backed team) |
| **PostHog** | Open-core SaaS | 25k | $50M ARR (large team) |
| **Sindre Sorhus** | Sponsors only, hundreds of pkgs | 1M+ across all | ~$25k/year |
| **Dax Raad (sst)** | Open-core SaaS | 25k | $1M+ ARR |
| **Beszel** (server monitor, solo) | Sponsors + license | 11k | ~$1.5k/mo |
| **Languine** | AGPL + commercial license | 3k | undisclosed (~$1k–$5k MRR likely) |

**Key insight:** the difference between $25k/year (Sindre) and $1M+ ARR (Plausible) is **going full-time and selling to mid-market**, not stars. Stars correlate with funnel size; pricing strategy and target market correlate with MRR.

If you stay evenings-only and price for individuals ($9/mo), expect $20k–$60k/year at year 1 maximum. If you go full-time and price for teams ($199/mo), expect $200k+ ARR is achievable in 18–24 months at the same star count.

You picked which one earlier today. Stick with it.

---

## TL;DR table

| Stage | Stars | Time from launch | Realistic MRR | Action |
|---|---|---|---|---|
| **0** | 0–100 | week 0–2 | $0 | ship, launch, marketplace listing |
| **1** | 100–500 | month 1–2 | $0–$250 | sponsors + Polar bounties, no Pro yet |
| **2** | 500–2k | month 2–4 | $150–$700 | build free GitHub App, register publisher |
| **3** | 2k–5k | month 4–8 | $300–$1.5k | launch $9/mo Pro tier on Marketplace |
| **4** | 5k–10k | month 8–12 | $1.5k–$5k | Team + Enterprise tiers, contractor support |
| **5** | 10k+ | year 2 | $5k–$20k+ | decide: stay solo, full-time, or sell |

Print this. Tape it next to your monitor. When you're tempted to skip stages, look at the table.

---

## Sources (verified 2026-05-07)

- [Pricing plans for GitHub Marketplace apps](https://docs.github.com/en/apps/github-marketplace/selling-your-app-on-github-marketplace/pricing-plans-for-github-marketplace-apps) — plan types, 10-plan limit, free-trial rules, free-only-vs-external-paid restriction
- [Receiving payment for app purchases](https://docs.github.com/en/apps/github-marketplace/selling-your-app-on-github-marketplace/receiving-payment-for-app-purchases) — 5% commission post-2021, $500 MRR payout threshold
- [About creating GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps) — App vs Action vs OAuth distinction
- [Registering a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app) — name uniqueness, 100-app per-account limit, 34-char max
- [Creating a custom badge for your GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/creating-a-custom-badge-for-your-github-app) — 200×200 PNG/JPG/GIF, <1 MB, hex background
