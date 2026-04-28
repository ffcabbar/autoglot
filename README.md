# lingobot

> Self-hosted, AI-powered i18n translation bot. Edit `en.json`, push, and your other locale files appear translated in a bot commit. Drop-in replacement for [Languine](https://languine.ai).

- **Zero npm dependencies.** Single Node 20+ script. Auditable in 30 minutes.
- **Incremental.** A YAML lock file fingerprints every English string; only changed/new keys are sent to the LLM.
- **Free, except for the API key.** No SaaS, no rate limits, no quota. You pay Anthropic directly — typical PR costs under a cent.
- **CI-native.** Ships as a GitHub Action. The bot commits the translated JSON back to your branch and posts a cost report on the PR.
- **Framework-agnostic.** Works with `next-intl`, `react-i18next`, `vue-i18n`, anything that reads a flat-or-nested JSON message catalog.

## Quickstart (GitHub Action)

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
      - uses: ffcabbar/lingobot@v1
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

That's it. Add `ANTHROPIC_API_KEY` to your repo secrets, drop a `messages/en.json` in your repo, and create one empty `messages/<locale>.json` per language you want. On the next push, the bot will:

1. Diff `en.json` against the lock file (`md5` per key).
2. Send only changed/new keys to Claude.
3. Write each locale's JSON file.
4. Commit `chore(i18n): update translations` and post a cost summary on the PR.

## Quickstart (CLI, no GitHub)

```bash
npm install -D lingobot
echo '{ "greeting": "Hello, world!" }' > messages/en.json
echo '{}' > messages/es.json
echo '{}' > messages/de.json

ANTHROPIC_API_KEY=sk-ant-... npx lingobot
```

After the first run, `messages/es.json` and `messages/de.json` are populated, and `translate.lock` records what was translated.

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
npx lingobot --import-languine=languine.lock
rm languine.json languine.lock
```

Then replace your Languine workflow with the one above. The lock file will be in sync — no re-translation, no re-cost.

## How it works

1. **Flatten** your source JSON to dotted keys: `{ "checkout.cta": "Pay now" }`.
2. **Diff** each value's md5 against the lock file → `new`, `changed`, `orphan` (deleted) keys.
3. **For each locale**: collect missing + changed keys, chunk into batches of 200, call Anthropic with forced [tool use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use) so the response is structured JSON (not freeform).
4. **Validate** placeholders (`{name}`) match between source and translation; retry on mismatch.
5. **Merge** translations back into the locale's JSON, preserving source key order, dropping orphan keys.
6. **Update** the lock file, write a markdown summary, exit.

In CI, the action then commits the diff and posts the cost summary on the PR.

## Why a self-hosted bot?

Hosted i18n SaaS tools either charge per-key, throttle your throughput, or both. This is a 500-line script. You own the bot, the lock file, the JSON, and the API key. There is nothing to outgrow.

## Sponsor

If `lingobot` saves you the cost of a Languine subscription, consider [sponsoring on GitHub](https://github.com/sponsors/ffcabbar). The whole project is one person's evenings.

## License

MIT.
