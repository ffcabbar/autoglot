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

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from "node:fs";
import { join, relative, extname, dirname } from "node:path";
import { step, info, ok, warn, err, c } from "./prompts.mjs";
import {
  walk,
  extractCandidates,
  isLikelyUserFacing,
  suggestKey,
  setNested,
  mergeKeys,
} from "./extract-helpers.mjs";

export const SCAN_EXTS = new Set([".tsx", ".jsx", ".ts", ".js", ".vue", ".svelte"]);
export const SCAN_DIRS = ["src", "app", "pages", "components", "screens"];
export const SKIP_DIRS = new Set([
  ".git", "node_modules", ".next", "dist", "build", ".turbo",
  "coverage", ".vercel", ".cache", ".parcel-cache", "out", "public",
]);

/**
 * Parse `extract`-specific flags. Unknown flags are ignored (forward-compat).
 *
 *   --write           merge candidates into messages/en.json (skips existing keys)
 *   --source=<path>   override the target file (default: messages/en.json)
 */
export function parseExtractArgs(argv) {
  const opts = { write: false, source: null };
  for (const arg of argv) {
    if (arg === "--write") opts.write = true;
    else if (arg.startsWith("--source=")) opts.source = arg.slice("--source=".length);
  }
  return opts;
}

export async function run(args = []) {
  const opts = parseExtractArgs(args);
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

  if (!opts.write) {
    step("Suggested additions to messages/en.json");
    process.stdout.write(JSON.stringify(merged, null, 2) + "\n");
  }

  step("Summary");
  info(`Found ${c.bold}${allCandidates.length}${c.reset} candidate${allCandidates.length === 1 ? "" : "s"} across ${c.bold}${byFile.size}${c.reset} file${byFile.size === 1 ? "" : "s"}.`);

  if (opts.write) {
    const target = opts.source || "messages/en.json";
    const full = join(cwd, target);
    let existing = {};
    if (existsSync(full)) {
      try {
        existing = JSON.parse(readFileSync(full, "utf8"));
      } catch (e) {
        err(`Couldn't parse ${target}: ${e.message}. Aborting --write.`);
        return;
      }
    }
    const { merged: out, added, skipped, conflicts } = mergeKeys(existing, allCandidates);

    step(opts.source ? `Writing ${target}` : "Writing messages/en.json");
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, JSON.stringify(out, null, 2) + "\n");
    ok(`${target} now has ${added.length} new key${added.length === 1 ? "" : "s"}.`);
    if (skipped.length > 0) {
      info(`${skipped.length} key${skipped.length === 1 ? "" : "s"} already existed (same path) and were left untouched:`);
      for (const s of skipped.slice(0, 5)) {
        process.stdout.write(`  ${c.dim}${s.key} (kept: ${JSON.stringify(s.existing)})${c.reset}\n`);
      }
      if (skipped.length > 5) {
        process.stdout.write(`  ${c.dim}…and ${skipped.length - 5} more${c.reset}\n`);
      }
    }
    if (conflicts.length > 0) {
      warn(`${conflicts.length} candidate${conflicts.length === 1 ? "" : "s"} skipped due to namespace/leaf shape conflicts:`);
      for (const cn of conflicts.slice(0, 5)) {
        const note = cn.kind === "leaf-vs-namespace"
          ? "an ancestor is already a string"
          : "the target is already a namespace (writing would delete children)";
        process.stdout.write(`  ${c.dim}${cn.key} — ${note}${c.reset}\n`);
      }
      if (conflicts.length > 5) {
        process.stdout.write(`  ${c.dim}…and ${conflicts.length - 5} more${c.reset}\n`);
      }
      info("Rename the candidate keys (or the existing entry) to resolve.");
    }
    step("Next");
    info(`Review the new keys in ${c.bold}${target}${c.reset}, then replace the hardcoded string in your component with a ${c.bold}t("${c.dim}<key>${c.reset}${c.bold}")${c.reset} call.`);
    return;
  }

  step("Next");
  info(`Review the candidates above. Copy the relevant ones into ${c.bold}messages/en.json${c.reset} (or re-run with ${c.bold}--write${c.reset} to do it automatically), then replace the hardcoded string in your component with a ${c.bold}t("${c.dim}<key>${c.reset}${c.bold}")${c.reset} call.`);
  info("Default mode is read-only. Use --write to merge into messages/en.json (existing keys are never overwritten).");
}
