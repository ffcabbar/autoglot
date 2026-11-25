#!/usr/bin/env node
// autoglot CLI dispatcher.
//
// Subcommands:
//   autoglot                  → run translation (default; reads translate.config.json)
//   autoglot init             → interactive scaffold for a new project
//   autoglot add <locale>     → add a new target locale
//   autoglot doctor           → health check of the current setup
//   autoglot --version | -v   → print version
//   autoglot --help | -h      → print help
//
// Anything that doesn't match a subcommand falls through to the
// translation engine, so action.yml's `npx -y autoglot --source=... --check`
// continues to work without changes.

import { readFileSync } from "node:fs";

const argv = process.argv.slice(2);
const first = argv[0];

const HELP = `autoglot — AI-powered i18n translation bot

Usage
  npx autoglot                       Run translation (uses translate.config.json)
  npx autoglot init                  Interactive setup for a new project
  npx autoglot add <locale>          Add an empty target locale file
  npx autoglot doctor                Health check of your autoglot setup
  npx autoglot extract               Scan source files for hardcoded strings
  npx autoglot --version | -v        Print version
  npx autoglot --help | -h           Print help

init flags
  --locales=de,fr             Scaffold these target locales without prompts.
  --install                   Install runtime i18n library after scaffolding.
  --no-install                Skip the interactive install prompt.
  --pm=npm|yarn|pnpm|bun      Override the auto-detected package manager.

extract flags
  --write                     Merge candidates into messages/en.json (existing
                              keys are never overwritten).
  --source=<path>             Override the configured source catalog.
  --config=<path>             Select an autoglot configuration.
  --root=<path>               Override the directory to scan.

Translation flags (when no subcommand given)
  --check                     Exit 1 if the lock or selected locales need updates.
  --dry-run                   Show the plan without calling AI or updating translations.
  --quiet                     Suppress per-locale progress (auto-disabled in CI).
  --locales=de,fr             Restrict run to specific locales.
  --model=<id>                Override the configured model (default: claude-haiku-4-5).
  --source=<path>             Override config.source (default: messages/en.json).
  --messages-dir=<path>       Override config.messagesDir (default: messages).
  --lock-file=<path>          Override config.lockFile (default: translate.lock).
  --config=<path>             Custom config file path (default: translate.config.json).
  --import-languine[=<path>]  Seed our lock file from a languine.lock and exit.
  --summary-path=<path>       Where to write the markdown summary.

Environment
  ANTHROPIC_API_KEY           Required when sending translation requests.

Docs
  https://github.com/ffcabbar/autoglot
`;

if (first === "--version" || first === "-v") {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  process.stdout.write(`${pkg.version}\n`);
  process.exit(0);
}

if (first === "--help" || first === "-h" || first === "help") {
  process.stdout.write(HELP);
  process.exit(0);
}

if (first === "init") {
  const m = await import("./init.mjs");
  await m.run(argv.slice(1));
} else if (first === "add") {
  const m = await import("./add.mjs");
  await m.run(argv.slice(1));
  process.exit(0);
} else if (first === "doctor") {
  const m = await import("./doctor.mjs");
  await m.run(argv.slice(1));
  process.exit(0);
} else if (first === "extract") {
  const m = await import("./extract.mjs");
  await m.run(argv.slice(1));
  process.exit(process.exitCode ?? 0);
} else if (first && !first.startsWith("-")) {
  process.stderr.write(`autoglot: unknown subcommand '${first}'.\n`);
  process.stderr.write(`Run \`autoglot --help\` for the list of subcommands.\n`);
  process.exit(2);
} else {
  await import("./translate.mjs");
}
