// `autoglot doctor` — health check.
//
// Verifies the setup is correct so launching CI for the first time doesn't
// fail at 2am. Read-only — never writes or modifies anything.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, basename } from "node:path";
import { ok, warn, err, info, step } from "./prompts.mjs";
import { resolvePaths, parseSharedFlags, findRepoRoot } from "./config.mjs";

export async function run(argv = []) {
  const { args } = parseSharedFlags(argv);
  const cwd = process.cwd();
  step("autoglot doctor");

  let warnings = 0;
  let errors = 0;

  function w(msg) { warn(msg); warnings++; }
  function e(msg) { err(msg); errors++; }

  let paths;
  try {
    paths = resolvePaths(args, cwd);
  } catch (errObj) {
    e(errObj.message);
    process.exit(1);
  }

  // 1. translate.config.json
  if (paths.configPath) {
    ok(`${relative(cwd, paths.configPath) || paths.configPath} found and parses.`);
  } else {
    w("translate.config.json not found — autoglot will use defaults. Consider `autoglot init`.");
  }

  // 2. Source file
  const sourceDisplay = relative(cwd, paths.source) || paths.source;
  if (existsSync(paths.source)) {
    try {
      const sourceObj = JSON.parse(readFileSync(paths.source, "utf8"));
      const keys = countLeafKeys(sourceObj);
      if (keys === 0) w(`${sourceDisplay} has no keys yet. Add your strings before running autoglot.`);
      else ok(`${sourceDisplay} parses with ${keys} key${keys === 1 ? "" : "s"}.`);
    } catch (errObj) {
      e(`${sourceDisplay} failed to parse: ${errObj.message}`);
    }
  } else {
    e(`Source file ${sourceDisplay} not found.`);
  }

  // 3. Target locales
  if (existsSync(paths.messagesDir) && statSync(paths.messagesDir).isDirectory()) {
    const sourceBase = basename(paths.source);
    const targets = readdirSync(paths.messagesDir)
      .filter((f) => f.endsWith(".json") && f !== sourceBase);
    if (targets.length === 0) {
      w(`No target locale files in ${relative(cwd, paths.messagesDir) || paths.messagesDir}/. Add some with \`autoglot add <locale>\`.`);
    } else {
      ok(`${targets.length} target locale${targets.length === 1 ? "" : "s"}: ${targets.map((f) => f.replace(".json", "")).join(", ")}`);
    }
  }

  // 4. Workflow — walk up to repo root, scan all .github/workflows/*.{yml,yaml}
  // for one that uses the action. Falls back to local .github/workflows/ if
  // not in a git repo.
  const workflowSearchRoot = findRepoRoot(cwd) || cwd;
  const workflowsDir = join(workflowSearchRoot, ".github/workflows");
  let foundWorkflow = null;
  if (existsSync(workflowsDir) && statSync(workflowsDir).isDirectory()) {
    const files = readdirSync(workflowsDir).filter((f) => /\.ya?ml$/.test(f));
    for (const f of files) {
      try {
        const txt = readFileSync(join(workflowsDir, f), "utf8");
        if (/\bffcabbar\/autoglot\b/.test(txt)) {
          foundWorkflow = { path: join(workflowsDir, f), content: txt };
          break;
        }
      } catch {/* skip unreadable */}
    }
  }

  if (foundWorkflow) {
    ok(`Workflow ${relative(cwd, foundWorkflow.path) || foundWorkflow.path} uses ffcabbar/autoglot.`);
    if (foundWorkflow.content.includes("ANTHROPIC_API_KEY")) {
      ok("Workflow references ANTHROPIC_API_KEY secret.");
    } else {
      w("Workflow doesn't reference ANTHROPIC_API_KEY. autoglot will fail without it.");
    }
  } else if (existsSync(workflowsDir)) {
    w(`No workflow in ${relative(cwd, workflowsDir) || workflowsDir}/ references ffcabbar/autoglot. Run \`autoglot init\` or add one manually.`);
  } else {
    w(`.github/workflows/ not found at ${relative(cwd, workflowSearchRoot) || workflowSearchRoot}. Run \`autoglot init\` to create one.`);
  }

  // 5. lock file format (if exists)
  if (existsSync(paths.lockFile)) {
    const txt = readFileSync(paths.lockFile, "utf8");
    if (/^version:\s*1\b/m.test(txt)) {
      ok("translate.lock has version 1 header.");
    } else {
      w("translate.lock exists but doesn't look like an autoglot lock file.");
    }
  }

  // 6. ANTHROPIC_API_KEY in env (only relevant for local runs)
  if (process.env.ANTHROPIC_API_KEY) {
    ok("ANTHROPIC_API_KEY set in current shell.");
  } else {
    info("ANTHROPIC_API_KEY not set in this shell — fine for CI; only needed for local runs.");
  }

  // Summary
  step("Summary");
  if (errors > 0) {
    err(`${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}.`);
    process.exit(1);
  } else if (warnings > 0) {
    warn(`${warnings} warning${warnings === 1 ? "" : "s"}, no errors. autoglot will run but you might want to address these.`);
  } else {
    ok("All clear. autoglot is healthy.");
  }
}

function countLeafKeys(obj) {
  if (typeof obj !== "object" || obj === null) return 1;
  if (Array.isArray(obj)) return 0;
  let n = 0;
  for (const k of Object.keys(obj)) n += countLeafKeys(obj[k]);
  return n;
}
