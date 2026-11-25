// Framework-agnostic templates: workflow, config, example messages.
// Pure functions returning strings. No I/O.

/**
 * Generate the GitHub Actions workflow.
 * @param {{ messagesDir?: string }} [opts]
 */
export function workflow(opts = {}) {
  const messagesDir = opts.messagesDir || "messages";
  return `name: translate
on:
  push:
    branches: ["**"]
    paths:
      - ${messagesDir}/en.json
      - translate.config.json

concurrency:
  group: translate-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  translate:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: ffcabbar/autoglot@v1
        with:
          anthropic-api-key: \${{ secrets.ANTHROPIC_API_KEY }}
`;
}

/**
 * Generate translate.config.json for the project.
 * @param {{ source?: string, messagesDir?: string, model?: string, glossary?: string[] }} [opts]
 */
export function translateConfig(opts = {}) {
  const cfg = {
    source: opts.source || "messages/en.json",
    messagesDir: opts.messagesDir || "messages",
    lockFile: opts.lockFile || "translate.lock",
    model: opts.model || "claude-haiku-4-5",
    glossary: opts.glossary || [],
  };
  return JSON.stringify(cfg, null, 2) + "\n";
}

/**
 * The example en.json that init scaffolds.
 */
export function exampleEnJson() {
  return JSON.stringify(
    {
      common: {
        appName: "MyApp",
      },
      home: {
        title: "Welcome",
        cta: "Get started",
      },
    },
    null,
    2,
  ) + "\n";
}

export function emptyLocale() {
  return "{}\n";
}

export function localeImportName(locale) {
  return `locale_${locale.replace(/[^a-zA-Z0-9_$]/g, "_")}`;
}
