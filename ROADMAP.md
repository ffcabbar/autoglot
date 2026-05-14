# autoglot roadmap

Public plan for what's shipped, what's queued, and what we deliberately won't build. Issues and discussions welcome — [open one](https://github.com/ffcabbar/autoglot/issues).

## Now — v0.3.x ✅

- `autoglot` translation engine
  - Anthropic Claude with forced tool use (structured output)
  - 429 retry-after, placeholder validation + retry, parallel locales
  - Languine lock-file importer
- `autoglot init` — interactive scaffold for 6 frameworks (Next.js App + Pages Router, Expo, React Native, Vite + React, Vue / Nuxt)
- `autoglot init --install` — optional auto-install with package-manager auto-detect (npm / yarn / pnpm / bun)
- `autoglot add <locale>` — append target locale files
- `autoglot doctor` — read-only health check of config + workflow + secrets
- `autoglot extract` — find hardcoded user-facing strings; suggest keys
- `autoglot extract --write` — merge candidates into `messages/en.json` (existing keys protected)
- GitHub Action with auto-commit + PR comment

## Next — v0.4

- [ ] `--languages` flag for non-interactive `init` (CI / Codespaces / Replit scaffolding)
- [ ] Glossary auto-suggestion: scan extracted strings, propose frequent brand terms as glossary entries
- [ ] Richer PR comment — per-locale diff preview with copy-paste-friendly fences
- [ ] `autoglot lint` — detect unused keys in source code (inverse of `extract`)
- [ ] Multi-source workflows: translate `en+es` → `fr,de` in parallel (not just `en` → everything else)

## Soon — v0.5

- [ ] Provider abstraction (additive — Anthropic stays default)
  - OpenAI (Responses API with `json_schema` tool)
  - Gemini (function-calling)
- [ ] `autoglot bench --providers=anthropic,openai,gemini` — quality + cost comparison on a small sample
- [ ] Pluggable post-processors (profanity filter, brand voice, length cap for UI buttons)

## v1.0

- Public API stability commitment (CLI flags, config schema, lock file format)
- Lock file format frozen; migration tool ships for any future breaking change
- Semver guarantees on the npm package and `ffcabbar/autoglot@v1` action ref

## Out of scope

These are intentional non-goals — the product is the bot, not a service:

- Hosted SaaS / dashboard / web UI
- Sign-up, accounts, or any centralized user state
- Auto-modifying user's framework config files (`next.config.js`, `_app.tsx`, etc.) — we print explicit wiring instructions instead, so the user owns their config
- Vendor lock-in: lock files are plain YAML, messages are plain JSON, the action is a thin wrapper around the CLI

## Have an idea?

Open an [issue](https://github.com/ffcabbar/autoglot/issues) with the use case. The bar for inclusion: would a typical npm dev tool ship this? If yes, it's a candidate. If it requires running a backend on our side, no.
