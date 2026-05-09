// `autoglot add <locale> [<locale>...]` — add new target locales.
//
// Creates an empty messages/<locale>.json. The next push to en.json will
// populate it. Idempotent: if the file already exists, we leave it alone.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { info, ok, warn, err, step, c } from "./prompts.mjs";

export async function run(args) {
  const positional = args.filter((a) => !a.startsWith("-"));
  if (positional.length === 0) {
    err("Usage: autoglot add <locale> [<locale>...]");
    err('Example: autoglot add tr ja zh');
    process.exit(1);
  }

  const cwd = process.cwd();
  step("autoglot add");

  // Try to read messagesDir from translate.config.json
  let messagesDir = "messages";
  const cfgPath = join(cwd, "translate.config.json");
  if (existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
      if (cfg.messagesDir) messagesDir = cfg.messagesDir;
    } catch {/* ignore */}
  } else {
    warn("translate.config.json not found — using default messages/ dir. Run `autoglot init` first if this is a new project.");
  }

  const sourcePath = join(cwd, messagesDir, "en.json");
  if (!existsSync(sourcePath)) {
    err(`Source file ${messagesDir}/en.json not found. Run \`autoglot init\` first.`);
    process.exit(1);
  }

  let added = 0;
  let already = 0;
  for (const code of positional) {
    if (!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(code)) {
      warn(`"${code}" doesn't look like an ISO locale code. Skipping.`);
      continue;
    }
    const localePath = join(cwd, messagesDir, `${code}.json`);
    if (existsSync(localePath)) {
      info(`${messagesDir}/${code}.json already exists — leaving it alone.`);
      already++;
      continue;
    }
    writeFileSync(localePath, "{}\n");
    ok(`${messagesDir}/${code}.json`);
    added++;
  }

  step("Next");
  if (added > 0) {
    info(`Push to a branch — autoglot will populate ${added} new file${added === 1 ? "" : "s"} on the next run.`);
  } else if (already > 0) {
    info("Nothing to do. All requested locales already exist.");
  }
}
