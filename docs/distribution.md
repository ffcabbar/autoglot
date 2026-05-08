# Distribution playbook

Everything you need to know about publishing `autoglot` to the world.

## The 4 levels of "bot"

When users see the bot's commit on a PR, the visual presentation depends on how much we wire up. Pick the level you need.

### Level 1 — Do nothing (default)

GitHub Actions auto-commits as `github-actions[bot]` with the default rabbit avatar. Looks like:

> **github-actions[bot]** committed `chore(i18n): update translations` 2 minutes ago

Zero setup, zero work. This is what `action.yml` does today.

### Level 2 — Custom git author name (5 min)

Edit the `git config` lines in `action.yml`:

```yaml
git config user.name "autoglot"
git config user.email "autoglot@users.noreply.github.com"
```

PR shows:
> **autoglot** committed `chore(i18n): update translations`

But it's a "fake" author — no real GitHub user, no avatar, no profile. Clicking the name 404s. String-only change.

### Level 3 — Real GitHub App (1–2 days, "serious" bot)

What Languine, Dependabot, Renovate, Vercel-bot do. Steps:

1. github.com/settings/apps → "New GitHub App"
2. Set name: `autoglot`, upload an avatar PNG, write description, set permissions: `contents: write`, `pull-requests: write`
3. Get App ID + private key
4. In the action, mint a JWT and exchange it for an installation token
5. Users **install** the app on their repo (one-click via Marketplace)

PR shows:
> 🤖 **autoglot** committed `chore(i18n): update translations`
> *(orange "bot" badge, our avatar, clicking goes to the app's profile page)*

This is a "real" bot. Comments and commits carry our brand. But:
- Users must install the app manually
- Token rotation, JWT signing — more code in `action.yml`
- No backend required, but more moving parts

### Level 4 — Hosted SaaS

Server, dashboard, accounts, billing. **Don't.** This is what we're explicitly *not* building.

### Recommendation: Level 1 → upgrade to Level 3 only if there's demand

Ship v0.1 with Level 1. The script already works. After the first ~100 users, if there's interest, upgrade to Level 3 — that's when the avatar and brand identity matter. Doing it earlier is wasted effort.

## The 3 distribution channels

This isn't one product, it's three things in three places.

### 1. GitHub repo — `github.com/ffcabbar/autoglot`

- Source code
- README, issues, PRs
- License
- Without this, nothing else works
- **Action:** `git push` + make repo public

### 2. npm registry — `npmjs.com/package/autoglot`

- Where `npm install autoglot` and `npx autoglot` resolve to
- Separate from the repo (confusing but true)
- **Action:** `npm login`, then `npm publish --access public`
- Free
- Automate with a GitHub Action on release (changesets, release-please, etc.) once releases are happening regularly

### 3. GitHub Marketplace — `github.com/marketplace/actions/autoglot`

- Discoverable storefront for the composite Action
- "Browse listed actions" pulls from here
- **Action:**
  1. `action.yml` already has the required `name`, `description`, `branding` fields ✅
  2. Repo → "Releases" → "Draft a new release"
  3. Tag = `v0.1.0`, target = `main`
  4. Above the title: **"Publish this Action to the GitHub Marketplace"** checkbox ✅
  5. Pick category (DevOps / Code Quality), accept terms, publish
- Free, spam review takes 1–2 days for legit projects

**Important:** the Action works as `ffcabbar/autoglot@v1` whether it's listed on Marketplace or not. Marketplace is just a vitrin — gets you more traffic.

## Sponsorship — picking the right channel

For a JS dev tool, the ranking is clear:

### 1. **GitHub Sponsors** ⭐ (use this)

- Built into GitHub, "Sponsor" button appears on the repo page
- Monthly tiers + one-time payments
- Works for individuals or organizations
- GitHub sometimes matches sponsorships in the first year (free money)
- Setup: verify the GitHub Sponsors profile (Stripe), define tiers, drop `.github/FUNDING.yml`:

```yaml
github: ffcabbar
```

### 2. **OpenCollective**

- For company-backed OSS where transparent finances matter (every donor + expense visible)
- Vue, Babel, Webpack live here
- Overhead too heavy for a solo project. Skip.

### 3. **Polar.sh** (newer, interesting)

- Bounty-style funding on individual GitHub issues ("$50 → fix this bug")
- Sell "Pro tier" perks (priority support, etc.)
- Young but worth watching. Add alongside GitHub Sponsors when traffic justifies.

### 4. **Patreon**

- Built for content creators (YouTube, podcasts). Feels off for OSS. Skip.

### **Buy Me a Coffee / Ko-fi**

- One-off mini-tips ("hey, $5 thanks"). Light. Add as a secondary tip jar:

```yaml
github: ffcabbar
ko_fi: ffcabbar
```

### Recommendation for v0.1

```yaml
# .github/FUNDING.yml
github: ffcabbar
```

That's it. GitHub Sponsors covers 95% of cases. Add more channels when there's real signal.

## Realistic v0.1 user experience

When someone edits `messages/en.json` and pushes, they'll see this on their PR:

```
github-actions[bot] commented 30 seconds ago

## Translation run summary

Detected 1 new key in messages/en.json.

- Model: claude-haiku-4-5
- Locales: 3 processed, 0 skipped (up to date)
- Tokens: 142 in / 358 out
- Cost: $0.0019

| Locale | Keys | Input | Output | Cost     |
|--------|------|-------|--------|----------|
| de     | 1    | 142   | 358    | $0.00060 |
| es     | 1    | 142   | 358    | $0.00060 |
| fr     | 1    | 142   | 358    | $0.00060 |
```

Avatar: GitHub Actions rabbit. Author: `github-actions[bot]`. Style: minimal.

When the product is proven and we upgrade to Level 3, the same comment shows the autoglot avatar with the orange `[bot]` badge, brand colors, and a footer: `_powered by [autoglot](https://github.com/ffcabbar/autoglot)_`. But that day is not today.

## Step-by-step: v0.1 release

1. Pick name (done — `autoglot`)
2. `git push -u origin main` to `github.com/ffcabbar/autoglot` (public)
3. `npm login` once
4. `npm publish --access public` (publishes `autoglot@0.0.0`)
5. Bump to `0.1.0`, tag `v0.1.0`, push tag
6. Cut a v0.1.0 release on GitHub → check "Publish to Marketplace"
7. Set up GitHub Sponsors profile, verify `.github/FUNDING.yml` shows the Sponsor button
8. Smoke-test on a scratch repo: copy `examples/basic/`, set secret, push — bot should commit
9. Record a 30-second GIF of the bot at work; embed in README as the hero image
10. Soft launch: tweet, r/javascript, HN "Show HN: Languine but self-hosted, MIT, your API key"

Estimated total time: 1–2 days of focused work.
