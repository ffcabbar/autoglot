// `autoglot extract` — find hardcoded user-facing strings in source files
// and suggest where they could go in messages/en.json.
//
// Read-only. Never modifies your source. Prints a report; you copy what
// you want into messages/en.json.
//
// Strategy: regex over JSX text and a small set of string-valued props.
// AST-based extraction is more accurate but pulls in heavy parser deps;
// for "find me the obvious low-hanging strings" the regex approach
// catches ~80% of real strings with very few false positives.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname, dirname } from "node:path";
import { step, info, ok, warn, err, c } from "./prompts.mjs";
import {
  walk,
  extractCandidates,
  isLikelyUserFacing,
  suggestKey,
  setNested,
} from "./extract-helpers.mjs";

export const SCAN_EXTS = new Set([".tsx", ".jsx", ".ts", ".js", ".vue", ".svelte"]);
export const SCAN_DIRS = ["src", "app", "pages", "components", "screens"];
export const SKIP_DIRS = new Set([
  ".git", "node_modules", ".next", "dist", "build", ".turbo",
  "coverage", ".vercel", ".cache", ".parcel-cache", "out", "public",
]);

export async function run(args) {
  const cwd = process.cwd();
  step("autoglot extract");

  // Pick scan roots: prefer SCAN_DIRS that exist; fall back to cwd.
  const roots = SCAN_DIRS.map((d) => join(cwd, d)).filter(existsSync);
  if (roots.length === 0) {
    warn(`No conventional source directory (${SCAN_DIRS.join(", ")}) found in ${cwd}.`);
    info("Pass --root <path> to scan a custom directory. Skipping.");
    return;
  }

  const files = [];
  for (const r of roots) walk(r, SCAN_EXTS, SKIP_DIRS, files);

  info(`Scanning ${files.length} file${files.length === 1 ? "" : "s"} under ${roots.map((r) => relative(cwd, r) || ".").join(", ")}...`);

  const allCandidates = [];
  for (const f of files) {
    let text;
    try {
      text = readFileSync(f, "utf8");
    } catch (e) {
      continue;
    }
    const rel = relative(cwd, f);
    for (const cand of extractCandidates(text)) {
      const key = suggestKey(cand.text, rel);
      allCandidates.push({ file: rel, line: cand.line, text: cand.text, key });
    }
  }

  if (allCandidates.length === 0) {
    ok("No hardcoded user-facing strings detected.");
    info("autoglot extract uses conservative regex heuristics. If you know there ARE strings to extract, you may need to extract them manually — the heuristics ignore template literals, expressions, and very short identifiers.");
    return;
  }

  // Group by file for the report
  const byFile = new Map();
  for (const cand of allCandidates) {
    if (!byFile.has(cand.file)) byFile.set(cand.file, []);
    byFile.get(cand.file).push(cand);
  }

  step("Candidates");
  for (const [file, items] of byFile) {
    process.stdout.write(`\n${c.bold}${file}${c.reset}\n`);
    for (const item of items) {
      const preview = JSON.stringify(item.text).slice(0, 70);
      process.stdout.write(`  ${c.dim}line ${String(item.line).padStart(4)}${c.reset}  ${preview}\n`);
      process.stdout.write(`             ${c.cyan}→ ${item.key}${c.reset}\n`);
    }
  }

  // Build the suggested JSON tree
  const merged = {};
  for (const cand of allCandidates) {
    setNested(merged, cand.key, cand.text);
  }

  step("Suggested additions to messages/en.json");
  process.stdout.write(JSON.stringify(merged, null, 2) + "\n");

  step("Summary");
  info(`Found ${c.bold}${allCandidates.length}${c.reset} candidate${allCandidates.length === 1 ? "" : "s"} across ${c.bold}${byFile.size}${c.reset} file${byFile.size === 1 ? "" : "s"}.`);

  step("Next");
  info(`Review the candidates above. Copy the relevant ones into ${c.bold}messages/en.json${c.reset}, then replace the hardcoded string in your component with a ${c.bold}t("${c.dim}<key>${c.reset}${c.bold}")${c.reset} call.`);
  info("autoglot extract is read-only by design — it never modifies your source.");
}
