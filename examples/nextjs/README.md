# Autoglot + Next.js App Router

Field Notes is a small nature journal landing page with English and Spanish routes. Next.js renders both routes from the JSON catalogs in `messages/`. The app runs with the committed translations and needs no API key.

## Run locally

Use Node.js 20.9 or later. From the repository root, run:

```sh
cd examples/nextjs
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The home page opens in English at `/en`. Select **Español** to visit the same page at `/es` and **English** to switch back.

## Preview a translation

In a separate terminal in `examples/nextjs`, run `npm run translate:check`. The starter catalogs and lock are in sync, so the command exits with code 0.

In [messages/en.json](./messages/en.json), change `guide.title` from “Make time for a walk.” to “Make time for a sunset walk.” The English page updates immediately in dev mode. The Spanish page still uses the committed Spanish title. Run:

```sh
npm run translate:dry-run
npm run translate:check
```

Autoglot 0.3.4 reports one changed source key and plans one translation for `es`. The check exits with code 1 because the translation is pending. Both commands run offline and leave the Spanish catalog and lock untouched. Restore the original English title to return to a passing check.

To generate and write the Spanish update, run `npm run translate` with your own `ANTHROPIC_API_KEY` set in the shell. With pending changes, this sends a paid request to Anthropic and updates `messages/es.json` and `translate.lock`.
