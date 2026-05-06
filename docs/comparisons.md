# autoi18n vs the alternatives

Plain-English comparison so people choosing between tools can pick fast. Pasteable into a marketing site (Vercel free tier) when you're at Stage 3+ and want SEO traffic for "autoi18n vs X" queries.

---

## autoi18n vs Languine

**Short version:** Same idea, different license and footprint. autoi18n is MIT and ~500 lines; Languine is AGPL-3.0 with a separate commercial license and supports more file formats.

| | **autoi18n** | **Languine** |
|---|---|---|
| License | MIT | AGPL-3.0 + commercial |
| Source size | ~500 LoC, single file | thousands of LoC, multi-package |
| npm dependencies | 0 | many |
| File formats | JSON only | 15+ (JSON, YAML, .strings, Android XML, MD, ...) |
| Lock file | YAML md5 fingerprints | similar |
| Provider | Anthropic (v0.2: + OpenAI/Gemini) | OpenAI / Anthropic / DeepSeek / others |
| GitHub Action | yes | yes |
| Bot commits + PR comment | yes | yes |
| Hosted dashboard | none | optional |
| Migration path | `npx autoi18n --import-languine` | n/a |
| Best for | JS/TS apps, MIT-only stacks, evenings-only maintainers | teams that need many file formats and don't mind AGPL/commercial licensing |

**Pick autoi18n if:** you're a Next.js / React / Vue / SvelteKit shop, you ship JSON locale files, and AGPL-or-pay friction matters to you.

**Pick Languine if:** you have iOS/Android native apps, .strings/Android XML files, or your team wants a more polished CLI with more options.

---

## autoi18n vs Lokalise / Crowdin / Phrase / Transifex

**Short version:** SaaS i18n platforms charge per key, per seat, or both, and require a hosted account. autoi18n is one Node script in your CI, no account, no SaaS markup.

| | **autoi18n** | Lokalise / Crowdin / Phrase / Transifex |
|---|---|---|
| Pricing model | $0 + Anthropic API at cost | Per-key, per-seat, per-feature; $50–$1500/mo typical |
| Account required | no | yes |
| Hosted dashboard | none | required |
| Source code visible | yes (MIT) | no (proprietary) |
| Translation memory | lock file in your repo | hosted database |
| Translator UI for non-devs | not yet (planned for autoi18n Team) | yes (their core feature) |
| Vendor lock-in | none — your JSON, your repo | high — moving off requires export, format conversion, glossary migration |
| Cost for 30 locales × 2k keys | < $5 first run, < $0.01 per PR | $200–$2000/month |
| Setup time | 5 minutes | hours to days |

**Pick autoi18n if:** translations are part of your code review workflow, you trust LLM output for ~95% of strings, and you want zero SaaS spend.

**Pick a SaaS platform if:** you need a polished UI for human translators, you have non-technical team members managing translations, or you have compliance requirements around translation memory residency.

**Hybrid play (Stage 4+ for autoi18n):** the planned **Team tier** of autoi18n's GitHub App will ship a static HTML review portal — non-devs get a per-PR page where they can approve/reject suggested translations before merge. No SaaS account, but a SaaS-like reviewer UX. Best of both worlds.

---

## autoi18n vs i18n-ai-translate

**Short version:** Both are MIT and CLI-based. i18n-ai-translate has more providers and flags out of the box; autoi18n is more focused and has the GitHub-Action-as-a-bot flow built in.

| | **autoi18n** | **i18n-ai-translate** |
|---|---|---|
| License | MIT | MIT |
| Providers | Anthropic (v0.2: +OpenAI, +Gemini) | ChatGPT, Gemini, DeepSeek, Llama, Claude, Ollama (local) |
| GitHub Action with bot commits | yes (built-in) | not built-in |
| PR cost summary | yes | no |
| Lock file diffing | yes | similar |
| File formats | JSON | i18next-style JSON |
| Dependencies | 0 | several |
| Setup | one workflow file | a workflow plus per-provider config |

**Pick autoi18n if:** you specifically want the "edit en.json, push, get a bot commit" workflow with cost reporting on PRs.

**Pick i18n-ai-translate if:** you need to use a non-Anthropic provider today, including local Ollama, and you don't need the GitHub Action commit-back ritual.

---

## autoi18n vs DIY scripts

**Short version:** A lot of teams write their own version of this. autoi18n exists because doing it well takes longer than people think.

The non-obvious things you'll spend a weekend on if you DIY:

- **Tool use vs freeform JSON** — non-Latin scripts will eventually break `JSON.parse`. Force structured output.
- **Lock file format** — md5? sha256? hash-per-locale or hash-per-source-key? Get this wrong and orphan removal corrupts your locales.
- **429 retry-after** — bulk backfills hit Anthropic's output-tokens-per-minute before you expect.
- **Placeholder validation** — `{name}` tokens need to round-trip; ICU plurals can't be regex-validated.
- **Concurrency control** — naive parallel-locale loops will rate-limit you. autoi18n caps at 8.
- **Orphan-key removal** — keys deleted from `en.json` need to disappear from every locale, ideally without an LLM call.
- **Glossary / brand terms** — feeding these to the model correctly is non-trivial.

If your i18n is small and stable (< 50 keys, 1–2 locales), DIY is fine. Beyond that, autoi18n has already solved these problems and ships with tests.

---

## SEO meta (for the marketing site at Stage 3)

**Page title:**
```
autoi18n vs Languine — open-source i18n translation bot comparison
```

**Meta description:**
```
autoi18n is a MIT-licensed, single-file alternative to Languine. JSON, GitHub Action, Anthropic, $0/month + API at cost. 5-minute setup.
```

Repeat this pattern for each comparison page (`vs-lokalise`, `vs-crowdin`, etc.) at Stage 3. These pages rank for buying-intent queries.
