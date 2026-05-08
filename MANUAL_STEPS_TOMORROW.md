# Manual steps for tomorrow

> Everything Claude can't do — push, publish, list. Read top-to-bottom, work in this order. Estimated total: **2–3 hours of focused work.**
>
> Anything you can skip if you're short on time is marked **[OPTIONAL]**.

---

## Phase A — Local prep (15 min)

```bash
# 1. Rename the local folder (Claude couldn't do this while inside it)
mv ~/Desktop/lingobot ~/Desktop/autoglot
cd ~/Desktop/autoglot

# 2. Verify everything still works
npm test
cd examples/basic && node ../../bin/translate.mjs --dry-run && cd ../..
node bin/translate.mjs --version    # → 0.1.0
node bin/translate.mjs --help

# 3. Commit the rename + launch prep
git add -A
git status                          # eyeball the diff
git commit -m "feat: rename to autoglot, ship launch-ready scaffolding

- Renamed lingobot → autoglot project-wide
- Launch-grade README with hero, badges, comparison table, FAQ
- Placeholder SVG assets (hero, logo, how-it-works, pr-comment) so
  README renders before real images are produced
- CI workflow (test matrix: node 20+22 × ubuntu/macos/windows)
- Community files: CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, dependabot,
  issue + PR templates
- --version / --help flags on the CLI
- RELEASE_PLAN.md, MONETIZATION_PLAN.md, LAUNCH_COPY.md, docs/comparisons.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

## Phase B — Generate the brand images [OPTIONAL but high-impact] (30–60 min)

The repo currently uses placeholder SVGs. They look fine, but real PNGs/GIFs convert better.

**Priority order** (biggest impact first):

1. **`hero.png`** (1280×640) — the README hero, also your GitHub social card. Use the prompt in `.github/assets/README.md` with Midjourney / DALL·E / Ideogram. Output PNG.
2. **`logo.png`** (512×512) — single square logo for npm avatar and the future GitHub App. Same source.
3. **`pr-comment.png`** — replace the placeholder SVG with a real screenshot **after Phase E** (once the bot has actually run on a real PR).
4. **`demo.gif`** — record this **after Phase E** when the bot is working live.
5. **`og-card.png`** (1200×630) — optional; can be a crop of `hero.png`.

When the PNGs exist, update `README.md`:
```bash
# In README.md, replace `.github/assets/hero.svg` → `.github/assets/hero.png`
# (the SVG fallback is fine; PNG just renders better on some platforms)
```

You can launch with the SVGs and replace later. Don't block on this.

## Phase C — GitHub repo (15 min)

```bash
cd ~/Desktop/autoglot

# 1. Make sure gh CLI is logged in
gh auth status      # if not logged in: gh auth login

# 2. Create the public repo + push
gh repo create ffcabbar/autoglot \
  --public \
  --source=. \
  --push \
  --description "AI-powered i18n translation bot. Edit en.json, push, watch a bot commit translated locale files. MIT alternative to Languine, Lokalise, Crowdin."

# 3. Set repo topics (one-time, paste this exactly)
gh repo edit ffcabbar/autoglot --add-topic i18n,l10n,localization,translation,github-action,github-actions,anthropic,claude,ai,automation,cli,developer-tools,next-intl,react-i18next,vue-i18n,i18next,languine-alternative,lokalise-alternative,crowdin-alternative,open-source

# 4. Tag v0.1.0 + v1 (the floating tag the action.yml@v1 ref resolves to)
git tag v0.1.0
git tag v1
git push origin v0.1.0 v1
```

**Then on github.com**:
- Settings → Options → **Social preview** → upload `hero.png` (or a 1280×640 crop) — this is the image that shows when the repo is shared on Twitter/Bluesky/LinkedIn/HN
- Settings → Features → enable **Discussions** (for general questions; the issue template config points there)
- Settings → General → set **homepage URL** to `https://www.npmjs.com/package/autoglot` (after Phase D)

## Phase D — npm publish (10 min)

```bash
# 1. Make sure you're logged in
npm whoami           # if not logged in: npm login

# 2. Publish
npm publish --access public

# 3. Verify
npx autoglot@latest --version   # → 0.1.0
npx autoglot@latest --help

# 4. Smoke-test the published package in a fresh dir
mkdir /tmp/autoglot-smoke && cd /tmp/autoglot-smoke
echo '{"hi":"Hello"}' > en.json
echo '{}' > es.json
mkdir messages && mv en.json es.json messages/
npx autoglot@latest --dry-run    # should show 1 new key, 1 locale, dry-run
cd ~/Desktop/autoglot
```

## Phase E — Real-world end-to-end test (30 min)

Before launching publicly, prove the GitHub Action works on a real repo.

```bash
# 1. Make a throwaway test repo
mkdir ~/Desktop/autoglot-demo && cd ~/Desktop/autoglot-demo
git init
mkdir messages
echo '{"greeting":"Hello, world!","cta":"Get started"}' > messages/en.json
echo '{}' > messages/es.json
echo '{}' > messages/de.json

# 2. Add the workflow
mkdir -p .github/workflows
cat > .github/workflows/translate.yml <<'EOF'
name: translate
on:
  push:
    branches: ["**"]
    paths:
      - messages/en.json
permissions:
  contents: write
  pull-requests: write
jobs:
  translate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ffcabbar/autoglot@v1
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
EOF

# 3. Push to GitHub (public is fine for the test)
gh repo create ffcabbar/autoglot-demo --public --source=. --push --description "live demo of autoglot"

# 4. Add ANTHROPIC_API_KEY as a repo secret
gh secret set ANTHROPIC_API_KEY --repo ffcabbar/autoglot-demo
# (paste your sk-ant-... key when prompted)

# 5. Open a PR by editing en.json on a branch
git checkout -b add-greeting
# Edit messages/en.json — add a new key
git add messages/en.json
git commit -m "feat: add greeting key"
git push -u origin add-greeting
gh pr create --fill

# 6. Watch the GitHub Actions tab — the bot should:
#    - run the translate job
#    - commit messages/es.json + messages/de.json + translate.lock
#    - post a "Translation run summary" comment on the PR
```

Once you see the bot's PR comment, **screenshot it** and replace `.github/assets/pr-comment.svg` with `.github/assets/pr-comment.png` in `~/Desktop/autoglot` and update the README accordingly. This screenshot is your single best marketing asset.

If the GIF recorder is open, also screen-record steps 5–6 → `demo.gif` (1280×720, ≤ 30s). Use [Gifski](https://gif.ski/) for compression.

## Phase F — Marketplace listing (10 min + 1–2 days waiting)

On github.com:

1. Go to your repo → **Releases** → **Draft a new release**
2. Choose tag: `v0.1.0`
3. Release title: `v0.1.0 — initial public release`
4. Description: paste from `CHANGELOG.md` `## [0.1.0]` section
5. **Check the box: "Publish this Action to the GitHub Marketplace"**
6. Pick category: **DevOps** (primary). Optional secondary: **Code Quality**
7. Read & accept Marketplace terms
8. Click **Publish release**

GitHub reviews in 1–2 days. Once approved, your listing is live at `https://github.com/marketplace/actions/autoglot`.

## Phase G — GitHub Sponsors (15 min + ~1 day Stripe verification)

On github.com:

1. Go to https://github.com/sponsors
2. Click **Join the waitlist** (or **Set up sponsors profile** if available)
3. Verify Stripe (bank account, ID — takes ~1 day on the back end, you can finish the rest of the profile while waiting)
4. Set up **tiers** — copy from `LAUNCH_COPY.md` §5 (Supporter $5, Sponsor $25, Pro $99)
5. Add the **goal** ("$500/mo to dedicate one full day per week")
6. Add a **welcome message** for new sponsors
7. Save & publish

Verify the Sponsor button appears on `https://github.com/ffcabbar/autoglot` once Stripe is verified.

## Phase H — Reserve the GitHub App name (5 min — DO THIS EARLY)

Even though you won't build the GitHub App until Stage 2, the name `autoglot` is globally unique on GitHub. Reserve it now so no one else does.

1. Go to https://github.com/settings/apps → **New GitHub App**
2. **GitHub App name:** `autoglot`
3. **Homepage URL:** `https://github.com/ffcabbar/autoglot`
4. **Webhook URL:** `https://example.com/placeholder` (you'll change this in Stage 2)
5. **Webhook:** uncheck "Active" for now (no webhook server exists yet)
6. **Permissions:** leave at minimum. We'll edit later.
7. Click **Create GitHub App**
8. **Upload the badge:** edit the App → "Display information" → upload `.github/assets/logo.svg` (or convert to 200×200 PNG first if SVG isn't accepted) → set background hex `#8b5cf6`
9. **DO NOT** publish to Marketplace yet. Just leave it private under your account.

You've now squatted your own brand name. Cost: 5 min, value: irreplaceable.

## Phase I — Launch on Show HN + Reddit (60 min, on the right day)

**Best day:** Tuesday or Wednesday, 9–10 AM Eastern. Avoid Mondays and Fridays.

In `LAUNCH_COPY.md` you have ready-to-paste:
- Show HN title + body + first comment
- r/webdev, r/javascript, r/nextjs, r/reactjs posts
- DEV.to / Hashnode article
- Twitter/Bluesky 4-tweet thread

**Sequence on launch day:**

```
09:00 ET — Submit Show HN
09:01 ET — Post your own first-comment (the "non-obvious things I learned" one)
09:15 ET — Post r/webdev
09:30 ET — Post r/javascript
09:45 ET — Post r/nextjs + r/reactjs
10:00 ET — Tweet/Bluesky thread
10:30 ET — Post DEV.to article
11:00 ET — Submit to openalternative.co (manual form), fossalternative.com
12:00 ET — PR to oh-jon-paul/awesome-i18n
```

For the rest of the day: **reply to every comment within 15 minutes**. The first 4 hours decide whether you make HN front page. After 4 hours, traffic goes wherever it goes.

## Phase J — Day +1 to day +7

- [ ] Read every comment, reply to every issue. Maintainer responsiveness is the #1 driver of stars in week 1.
- [ ] Watch GitHub Insights → Traffic for the referrer breakdown. Double down on whichever channel sent the most clicks.
- [ ] If you're at 100+ stars by day 7, unlock **Stage 1** in `MONETIZATION_PLAN.md`.
- [ ] If you're at <30 stars, the demo asset (the bot PR comment screenshot or GIF) is probably the bottleneck. Reshoot it and relaunch in 2–3 weeks with a stronger title.

---

## Quick reference

- **Plan files**:
  - `RELEASE_PLAN.md` — overall release plan, SEO, monetization summary, file inventory
  - `MONETIZATION_PLAN.md` — year-one ladder, star milestones, Marketplace pricing rules
  - `LAUNCH_COPY.md` — copy-paste posts, listings, tiers
  - `docs/comparisons.md` — vs Languine / vs Lokalise / vs i18n-ai-translate / vs DIY
  - `.github/assets/README.md` — image manifest with prompts
- **What Claude already did**: rename, launch-grade README, placeholder SVGs, CI workflow, community files, --version/--help, monetization plan grounded in current GitHub Marketplace docs
- **What's left for you**: rename folder, generate real images, push to GitHub, npm publish, Marketplace, Sponsors, GitHub App name reservation, launch posts

Good luck. Don't skip Phase E (the real-world test) — you only get to launch once.
