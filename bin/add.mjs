// `autoglot add <locale> [<locale>...]` — add new target locales.
//
// Creates an empty messages/<locale>.json. The next push to en.json will
// populate it. Idempotent: if the file already exists, we leave it alone.

import { writeFileSync, existsSync } from "node:fs";
import { join, relative, basename } from "node:path";
import { info, ok, warn, err, step } from "./prompts.mjs";
import { resolvePaths, parseSharedFlags } from "./config.mjs";

export async function run(argv = []) {
  const { args, positional } = parseSharedFlags(argv);
  if (positional.length === 0) {
    err("Usage: autoglot add <locale> [<locale>...]");
    err("Example: autoglot add tr ja zh");
    process.exit(1);
  }

  const cwd = process.cwd();
  step("autoglot add");

  let paths;
  try {
    paths = resolvePaths(args, cwd);
  } catch (e) {
    err(e.message);
    process.exit(1);
  }
  if (!paths.config) {
    warn("translate.config.json not found — using default messages/ dir. Run `autoglot init` first if this is a new project.");
  }

  if (!existsSync(paths.source)) {
    err(`Source file ${relative(cwd, paths.source) || paths.source} not found. Run \`autoglot init\` first.`);
    process.exit(1);
  }

  let added = 0;
  let already = 0;
  for (const code of positional) {
    if (!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(code)) {
      warn(`"${code}" doesn't look like an ISO locale code. Skipping.`);
      continue;
    }
    const localePath = join(paths.messagesDir, `${code}.json`);
    const displayPath = relative(cwd, localePath) || localePath;
    if (existsSync(localePath)) {
      info(`${displayPath} already exists — leaving it alone.`);
      already++;
      continue;
    }
    writeFileSync(localePath, "{}\n");
    ok(displayPath);
    added++;
  }

  step("Next");
  if (added > 0) {
    info(`Push to a branch — autoglot will populate ${added} new file${added === 1 ? "" : "s"} on the next run.`);
  } else if (already > 0) {
    info("Nothing to do. All requested locales already exist.");
  }
}
