// `autoglot doctor` — health check.
//
// Verifies the setup is correct so launching CI for the first time doesn't
// fail at 2am. Read-only — never writes or modifies anything.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ok, warn, err, info, step, c } from "./prompts.mjs";

export async function run() {
  const cwd = process.cwd();
  step("autoglot doctor");

  let warnings = 0;
  let errors = 0;

  function pass(msg) { ok(msg); }
  function w(msg) { warn(msg); warnings++; }
  function e(msg) { err(msg); errors++; }

  // 1. translate.config.json
  let cfg = null;
  const cfgPath = join(cwd, "translate.config.json");
  if (existsSync(cfgPath)) {
    try {
      cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
      pass("translate.config.json found and parses.");
    } catch (err) {
      e(`translate.config.json failed to parse: ${err.message}`);
    }
  } else {
    w("translate.config.json not found — autoglot will use defaults. Consider \`autoglot init\`.");
  }

  // 2. Source file
  const messagesDir = cfg?.messagesDir || "messages";
  const sourcePath = cfg?.source || join(messagesDir, "en.json");
  if (existsSync(join(cwd, sourcePath))) {
    let sourceObj;
    try {
      sourceObj = JSON.parse(readFileSync(join(cwd, sourcePath), "utf8"));
      const keys = countLeafKeys(sourceObj);
      if (keys === 0) w(`${sourcePath} has no keys yet. Add your strings before running autoglot.`);
      else pass(`${sourcePath} parses with ${keys} key${keys === 1 ? "" : "s"}.`);
    } catch (err) {
      e(`${sourcePath} failed to parse: ${err.message}`);
    }
  } else {
    e(`Source file ${sourcePath} not found.`);
  }

  // 3. Target locales
  const messagesFull = join(cwd, messagesDir);
  if (existsSync(messagesFull) && statSync(messagesFull).isDirectory()) {
    const sourceBase = sourcePath.replace(`${messagesDir}/`, "").replace(".json", "");
    const targets = readdirSync(messagesFull)
      .filter((f) => f.endsWith(".json") && f !== `${sourceBase}.json`);
    if (targets.length === 0) {
      w(`No target locale files in ${messagesDir}/. Add some with \`autoglot add <locale>\`.`);
    } else {
      pass(`${targets.length} target locale${targets.length === 1 ? "" : "s"}: ${targets.map((f) => f.replace(".json", "")).join(", ")}`);
    }
  }

  // 4. Workflow
  const workflowPath = join(cwd, ".github/workflows/translate.yml");
  if (existsSync(workflowPath)) {
    const workflow = readFileSync(workflowPath, "utf8");
    if (workflow.includes("ffcabbar/autoglot")) {
      pass(".github/workflows/translate.yml uses ffcabbar/autoglot.");
    } else {
      w(".github/workflows/translate.yml exists but doesn't reference ffcabbar/autoglot.");
    }
    if (workflow.includes("ANTHROPIC_API_KEY")) {
      pass("Workflow references ANTHROPIC_API_KEY secret.");
    } else {
      w("Workflow doesn't reference ANTHROPIC_API_KEY. autoglot will fail without it.");
    }
  } else {
    w(".github/workflows/translate.yml not found. Run \`autoglot init\` to create one, or add the workflow manually.");
  }

  // 5. lock file format (if exists)
  const lockPath = join(cwd, cfg?.lockFile || "translate.lock");
  if (existsSync(lockPath)) {
    const txt = readFileSync(lockPath, "utf8");
    if (/^version:\s*1\b/m.test(txt)) {
      pass("translate.lock has version 1 header.");
    } else {
      w("translate.lock exists but doesn't look like an autoglot lock file.");
    }
  }

  // 6. ANTHROPIC_API_KEY in env (only relevant for local runs)
  if (process.env.ANTHROPIC_API_KEY) {
    pass("ANTHROPIC_API_KEY set in current shell.");
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
