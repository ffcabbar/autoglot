import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePaths } from "../../bin/config.mjs";

const overrides = {
  source: process.env.AUTOGLOT_SOURCE,
  "messages-dir": process.env.AUTOGLOT_MESSAGES_DIR,
  "lock-file": process.env.AUTOGLOT_LOCK_FILE,
  config: process.env.AUTOGLOT_CONFIG,
  model: process.env.AUTOGLOT_MODEL,
};

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

if (process.argv[2] === "stage") {
  const { source, messagesDir, lockFile } = resolvePaths(overrides);
  const files = existsSync(messagesDir)
    ? readdirSync(messagesDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => join(messagesDir, entry.name))
      .filter((path) => path !== source)
    : [];
  run("git", ["--literal-pathspecs", "add", "--", lockFile, ...files]);
}

const args = Object.entries(overrides)
  .filter(([, value]) => value)
  .map(([key, value]) => `--${key}=${value}`);
args.push(`--summary-path=${process.env.SUMMARY_PATH}`);

const version = process.env.AUTOGLOT_PACKAGE_VERSION;
if (version) run("npx", ["--yes", "--package", `autoglot@${version}`, "--", "autoglot", ...args]);

run(process.execPath, [fileURLToPath(new URL("../../bin/cli.mjs", import.meta.url)), ...args]);
