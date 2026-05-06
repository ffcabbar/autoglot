# Image asset manifest

Drop the generated images here. The README references them by relative path; once the files exist, the README renders correctly.

All assets should look at home next to **Linear / Vercel / Resend / Stripe** branding: minimal, geometric, monochrome with a single purple accent (`#8b5cf6`). No 3D, no AI-generated glow effects, no stock photography.

**Brand color:** `#8b5cf6` (Tailwind `violet-500`)
**Dark accent:** `#1a0b2e`
**Font:** Inter or Geist Sans

---

## 1. `hero.png` — README hero banner + GitHub social card

- **Size:** 1280 × 640 (2:1 ratio)
- **Used in:** top of README, GitHub repo Settings → Social preview
- **Prompt:**
  > A minimal, modern banner for an open-source dev tool called **autoi18n**. Centered wordmark in a clean geometric sans-serif (Inter / Geist), with a small globe-and-translation glyph to the left of the wordmark. Background: subtle diagonal gradient from `#1a0b2e` to `#4c1d95`. White text. Tagline below the wordmark in a smaller weight: *"AI translation bot for your i18n JSON. MIT, single-file, your API key."* Flat, no 3D, no AI glow effects.

## 2. `logo.png` — square logo / favicon / npm avatar

- **Size:** 512 × 512
- **Used in:** GitHub Action Marketplace card, npm avatar, favicon (downscale to 32×32)
- **Prompt:**
  > A square monochrome logo for **autoi18n**. A stylized globe with two arrows wrapping around it (translate symbol). Single color: `#8b5cf6` on a transparent background. Geometric, sharp, looks crisp at 32×32. No text. Inspired by Feather icons / Phosphor icons.

## 3. `demo.gif` — 30-second product demo

- **Size:** 1280 × 720, ≤ 8 MB, ≤ 30 seconds
- **Used in:** README "above the fold" demo
- **How to make it:**
  1. Open a scratch repo with `examples/basic/` set up.
  2. QuickTime → New Screen Recording → record:
     - VS Code: edit `messages/en.json` (add a key)
     - Terminal: `git add . && git commit -m "feat: new copy" && git push`
     - Browser: GitHub Actions tab → workflow runs
     - Browser: PR page → bot commits + cost summary appears
  3. Convert to GIF: `ffmpeg -i recording.mov -vf "fps=12,scale=1280:-1" -loop 0 demo.gif`
     or use Gifski (better quality, smaller files).
  4. Trim to ≤ 8 MB; aim for ≤ 30 s.

## 4. `pr-comment.png` — bot's cost-summary comment screenshot

- **Size:** 1024 × ~600 (variable height)
- **Used in:** README "Why" section
- **How to make it:**
  - Run the bot once on a real PR.
  - Screenshot just the `## Translation run summary` comment on the PR page.
  - Crop to remove browser chrome.
  - This image *is* the marketing — make sure the cost line ("Cost: $0.0019") is legible.

## 5. `how-it-works.svg` — architecture diagram (optional)

- **Size:** 1024 × 320
- **Used in:** README "How it works" section
- **Prompt:**
  > A simple horizontal flowchart with 5 boxes connected by arrows:
  > **`en.json edit`** → **`diff vs lock file`** → **`Anthropic API (only changed keys)`** → **`merge into <locale>.json`** → **`bot commit + PR comment`**.
  > Monochrome dark theme, purple accent `#8b5cf6`. Looks like a Linear or Stripe docs diagram. Inter font. Each box has a tiny icon (pencil / hash / cloud / merge / git-commit). Export as SVG so it scales on Retina.

---

## Optional but nice

- **`og-card.png`** (1200 × 630) — Twitter/Bluesky/LinkedIn share card. Can be a crop of `hero.png` if you don't want a separate one.
- **Action Marketplace card image** — auto-generated from `action.yml` `branding` field (currently `globe` icon, `purple` color). No file needed unless we move to a custom GitHub App.

## Once images exist

- Set the GitHub social card: repo Settings → Options → Social preview → upload `hero.png` (or a 1280×640 crop of it).
- Verify the README renders by opening `README.md` on github.com.
- Tweet / Bluesky thread: lead with the PR-comment screenshot, not the logo.
