#!/usr/bin/env node
// AI translation runner for i18n locale JSON files.
// Zero runtime deps. Uses Anthropic's messages API + a tiny YAML lock file.
//
// What it does
//   Reads <source> (your en.json), diffs it against <lock-file> (md5 per key),
//   translates new/changed keys with an LLM, and writes results into
//   <messages-dir>/<locale>.json for every target locale. Keys deleted
//   from the source are stripped from every locale at zero AI cost.
//   Drop-in replacement for Languine.
//
// Quickstart
//   1. Drop a translate.config.json next to your package.json:
//        {
//          "source": "messages/en.json",
//          "messagesDir": "messages",
//          "lockFile": "translate.lock"
//        }
//   2. Set ANTHROPIC_API_KEY in your env.
//   3. Run: npx <this-package>
//
// Flags
//   --check                     CI gate: exit 1 if lock != source.
//   --dry-run                   Show plan, no AI call, no writes.
//   --locales=de,fr             Restrict run to specific locales.
//   --model=<id>                Override the Anthropic model.
//   --config=<path>             Custom config file path.
//   --source=<path>             Override config.source.
//   --messages-dir=<path>       Override config.messagesDir.
//   --lock-file=<path>          Override config.lockFile.
//   --import-languine[=<path>]  Import a languine.lock to seed our lock file.

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import {
  parseArgs,
  flatten,
  mergeOrdered,
  extractPlaceholders,
  setsEqual,
  hash,
  chunk,
  parseLockYaml,
  dumpLockYaml,
  allowedTopLevelNamespaces,
  pickAllowedSource,
  pLimit,
} from "./helpers.mjs";
import { resolvePaths } from "./config.mjs";

// --- Constants ------------------------------------------------------------
const HELP_TEXT = `autoglot — AI-powered i18n translation bot

Usage
  npx autoglot [flags]

Flags
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
  -v, --version               Print version and exit.
  -h, --help                  Print this help and exit.

Environment
  ANTHROPIC_API_KEY           Required when sending translation requests.

Docs
  https://github.com/ffcabbar/autoglot
`;
const CHUNK_SIZE = 200;
const RATE_LIMIT_MAX_RETRIES = 5;
const LOCALE_CONCURRENCY = 8;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// USD per 1M tokens. Update when Anthropic pricing changes.
const PRICING = {
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-opus-4-7": { input: 5.0, output: 25.0 },
};

const LOCALE_DISPLAY = new Intl.DisplayNames(["en"], { type: "language" });

// --- CLI ------------------------------------------------------------------
const args = parseArgs(process.argv.slice(2));
const CWD = process.cwd();

if (args.version || args.v) {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  console.log(pkg.version);
  process.exit(0);
}

if (args.help || args.h) {
  console.log(HELP_TEXT);
  process.exit(0);
}

let __paths;
try {
  __paths = resolvePaths(args, CWD);
} catch (err) {
  console.error(`[translate] ${err.message}`);
  process.exit(1);
}
const CONFIG_PATH = __paths.configPath || resolvePath(args.config || "translate.config.json");
const config = __paths.config || { namespaces: {} };
const SOURCE_FILE = __paths.source;
const MESSAGES_DIR = __paths.messagesDir;
const LOCK_FILE = __paths.lockFile;
const LOCK_SOURCE = relative(dirname(LOCK_FILE), SOURCE_FILE).split(sep).join("/");
const SUMMARY_FILE = args["summary-path"]
  ? resolvePath(args["summary-path"])
  : join(tmpdir(), "translate-summary.md");
const STEP_SUMMARY = process.env.GITHUB_STEP_SUMMARY;
const MODEL = args.model || config.model || "claude-haiku-4-5";
// --quiet suppresses per-locale and per-chunk progress lines. The summary
// (totals + per-locale table) always prints. CI runs default to verbose so
// workflow logs stay actionable when something goes wrong.
const QUIET = args.quiet === true && !process.env.CI;
const verbose = (...m) => { if (!QUIET) console.log(...m); };

if (!PRICING[MODEL]) {
  console.error(`[translate] Unknown model '${MODEL}'. Known: ${Object.keys(PRICING).join(", ")}`);
  process.exit(1);
}

if ("import-languine" in args) {
  const src = typeof args["import-languine"] === "string"
    ? resolvePath(args["import-languine"])
    : resolvePath("languine.lock");
  importLanguineLock(src);
  process.exit(0);
}

await run();

// --- Main -----------------------------------------------------------------
async function run() {
  if (!existsSync(SOURCE_FILE)) {
    console.error(`[translate] Source file not found: ${SOURCE_FILE}`);
    console.error(`[translate] Set "source" in ${CONFIG_PATH} or pass --source=<path>.`);
    process.exit(1);
  }

  const source = readJSON(SOURCE_FILE);
  const sourceFlat = flatten(source);
  const lock = loadLock();
  const discovered = discoverTargetLocales();
  const targets = args.locales === undefined
    ? discovered
    : typeof args.locales === "string"
      ? [...new Set(args.locales.split(",").map((s) => s.trim()).filter(Boolean))]
      : [];
  if (args.locales !== undefined && targets.length === 0) {
    console.error("[translate] --locales requires a comma-separated list of target locale codes.");
    process.exit(1);
  }
  for (const locale of targets) {
    try {
      if (join(MESSAGES_DIR, `${locale}.json`).toLowerCase() === SOURCE_FILE.toLowerCase()) {
        throw new Error("matches the source file");
      }
      Intl.getCanonicalLocales(locale);
    } catch {
      console.error(`[translate] Invalid target locale '${locale}'. Use a locale code different from the source locale file.`);
      process.exit(1);
    }
  }

  const newDelta = [];
  const changedDelta = [];
  for (const key of Object.keys(sourceFlat)) {
    const h = hash(sourceFlat[key]);
    if (!Object.hasOwn(lock.hashes, key)) newDelta.push(key);
    else if (lock.hashes[key] !== h) changedDelta.push(key);
  }
  const delta = new Set([...newDelta, ...changedDelta]);
  const removed = Object.keys(lock.hashes).filter((key) => !Object.hasOwn(sourceFlat, key));
  const plans = targets.map((locale) => {
    const targetPath = join(MESSAGES_DIR, `${locale}.json`);
    const existing = existsSync(targetPath) ? readJSON(targetPath) : {};
    const existingFlat = flatten(existing);
    const allowed = allowedTopLevelNamespaces(source, locale, config);
    const filteredSource = pickAllowedSource(source, allowed);
    const allowedFlat = flatten(filteredSource);
    const keysToTranslate = Object.keys(allowedFlat).filter((key) => delta.has(key) || !Object.hasOwn(existingFlat, key));
    const hasOrphans = Object.keys(existingFlat).some((key) => !Object.hasOwn(allowedFlat, key));
    return { locale, targetPath, existing, filteredSource, keysToTranslate, hasOrphans };
  });

  console.log(`[translate] source: ${newDelta.length} new keys, ${changedDelta.length} modified (${newDelta.length + changedDelta.length} total delta)`);
  if (targets.length === 0) {
    console.log("[translate] No target locales found — drop a <locale>.json into messagesDir.");
  }

  if (args.check) {
    if (delta.size > 0) console.log("[translate] Delta keys:", [...delta].join(", "));
    if (removed.length > 0) console.log("[translate] Removed source keys:", removed.join(", "));
    const pending = plans.filter(({ keysToTranslate, hasOrphans }) => keysToTranslate.length || hasOrphans);
    if (pending.length > 0) {
      console.log("[translate] Locales needing updates:", pending.map(({ locale }) => locale).join(", "));
    }
    if (delta.size || removed.length || pending.length) process.exit(1);
    console.log("[translate] All selected locales up to date.");
    return;
  }

  const dryRun = Boolean(args["dry-run"]);
  if (!dryRun && plans.some(({ keysToTranslate }) => keysToTranslate.length) && !process.env.ANTHROPIC_API_KEY) {
    console.error("[translate] ANTHROPIC_API_KEY is not set.");
    process.exit(1);
  }

  if (!dryRun && targets.length) mkdirSync(MESSAGES_DIR, { recursive: true });

  // Per-locale work runs in parallel up to LOCALE_CONCURRENCY. Each locale
  // writes its own file, so there's no contention. Aggregation into
  // perLocale/totals happens at synchronous points (push, +=) which are
  // safe in single-threaded JS.
  const perLocale = [];
  let totalIn = 0, totalOut = 0, totalCost = 0, skipped = 0;
  const limit = pLimit(LOCALE_CONCURRENCY);

  async function processLocale({ locale, targetPath, existing, filteredSource, keysToTranslate, hasOrphans }) {
    if (keysToTranslate.length === 0) {
      if (!hasOrphans) {
        verbose(`[translate] ${locale.padEnd(6)} → up to date (skipped)`);
        skipped++;
        return;
      }
      if (dryRun) {
        verbose(`[translate] ${locale.padEnd(6)} → would remove orphan keys (dry-run)`);
        perLocale.push({ locale, keys: 0, inTok: 0, outTok: 0, cost: 0 });
        return;
      }
      const merged = mergeOrdered(filteredSource, existing, {});
      writeFileSync(targetPath, JSON.stringify(merged, null, 2) + "\n");
      verbose(`[translate] ${locale.padEnd(6)} → removed orphan keys`);
      perLocale.push({ locale, keys: 0, inTok: 0, outTok: 0, cost: 0 });
      return;
    }

    if (dryRun) {
      verbose(`[translate] ${locale.padEnd(6)} → ${keysToTranslate.length} keys (dry-run)`);
      perLocale.push({ locale, keys: keysToTranslate.length, inTok: 0, outTok: 0, cost: 0 });
      return;
    }

    const chunks = chunk(keysToTranslate, CHUNK_SIZE);
    const translations = {};
    let usageIn = 0, usageOut = 0;
    for (const [idx, keys] of chunks.entries()) {
      const payload = Object.fromEntries(keys.map((k) => [k, sourceFlat[k]]));
      if (chunks.length > 1) {
        verbose(`[translate] ${locale.padEnd(6)} → chunk ${idx + 1}/${chunks.length} (${keys.length} keys)`);
      }
      const { translations: t, usage } = await translate(locale, payload);
      Object.assign(translations, t);
      usageIn += usage.input_tokens;
      usageOut += usage.output_tokens;
    }

    const merged = mergeOrdered(filteredSource, existing, translations);
    writeFileSync(targetPath, JSON.stringify(merged, null, 2) + "\n");

    const cost = (usageIn / 1e6) * PRICING[MODEL].input + (usageOut / 1e6) * PRICING[MODEL].output;
    totalIn += usageIn;
    totalOut += usageOut;
    totalCost += cost;
    perLocale.push({ locale, keys: keysToTranslate.length, inTok: usageIn, outTok: usageOut, cost });
    verbose(`[translate] ${locale.padEnd(6)} → ${keysToTranslate.length} keys | in: ${usageIn} out: ${usageOut} | $${cost.toFixed(5)}`);
  }

  await Promise.all(plans.map((plan) => limit(() => processLocale(plan))));
  // Sort perLocale alphabetically so the summary table is stable across runs
  // (parallel completion order would otherwise scramble it).
  perLocale.sort((a, b) => a.locale.localeCompare(b.locale));

  if (!dryRun) {
    // A shared hash can only advance after every applicable existing locale has caught up.
    const selected = new Set(targets);
    const pending = new Set();
    for (const locale of discovered.filter((locale) => !selected.has(locale))) {
      const allowed = allowedTopLevelNamespaces(source, locale, config);
      for (const key of Object.keys(flatten(pickAllowedSource(source, allowed)))) pending.add(key);
    }
    if (targets.length > 0) {
      for (const key of Object.keys(sourceFlat)) {
        if (!pending.has(key)) lock.hashes[key] = hash(sourceFlat[key]);
      }
    }
    for (const key of removed) delete lock.hashes[key];
    lock.source = LOCK_SOURCE;
    mkdirSync(dirname(LOCK_FILE), { recursive: true });
    writeFileSync(LOCK_FILE, dumpLockYaml(lock));
  }

  const summary = renderSummary({
    model: MODEL,
    processed: perLocale.length,
    skipped,
    totalIn,
    totalOut,
    totalCost,
    perLocale,
    dryRun,
    newKeys: newDelta.length,
    modifiedKeys: changedDelta.length,
  });
  console.log("[translate] ──────────────────────────────────────");
  console.log(summary.stdout);
  if (STEP_SUMMARY && !dryRun) writeFileSync(STEP_SUMMARY, summary.markdown, { flag: "a" });
  if (!dryRun || args["summary-path"]) writeFileSync(SUMMARY_FILE, summary.markdown);
}

// --- Anthropic call -------------------------------------------------------
// Uses tool use (structured outputs) so the model can't corrupt the wire
// format with unescaped characters — the API returns `input` as a pre-parsed
// object, eliminating a whole class of JSON parse failures (e.g. a Lithuanian
// translation closing a quoted word with ASCII " instead of U+201D).
async function translate(locale, payload, attempt = 1, rateAttempt = 0, usage = { input_tokens: 0, output_tokens: 0 }) {
  const localeName = LOCALE_DISPLAY.of(locale) || locale;
  let sourceLanguage = "the source language";
  try {
    sourceLanguage = LOCALE_DISPLAY.of(basename(SOURCE_FILE, ".json"));
  } catch { /* the source file can have a name other than a locale code */ }
  const namespaces = new Set(Object.keys(payload).map((k) => k.split(".")[0]));
  const nsCtx = [...namespaces]
    .map((n) => `- ${n}: ${(config.namespaceContext && config.namespaceContext[n]) || "application copy"}`)
    .join("\n");

  const glossary = Array.isArray(config.glossary) && config.glossary.length
    ? ` Keep these product names verbatim: ${config.glossary.join(", ")}.`
    : "";

  const system = `You are a professional localization engineer. Translate values from ${sourceLanguage} into ${localeName}. Preserve all placeholders like {name}, {count} exactly. Preserve ICU plural syntax verbatim ({count, plural, one {...} other {...}} — never translate one/other/few/many/zero or the # symbol). Preserve line breaks as actual newline characters, not literal backslash-n sequences.${glossary} Call the emit_translations tool with every input key mapped to its translated string — do not write prose outside the tool call.`;

  const user = `Target locale: ${localeName} (${locale}).\nNamespace context:\n${nsCtx}\n\nTranslate:\n${JSON.stringify(payload, null, 2)}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      temperature: 0,
      system,
      messages: [{ role: "user", content: user }],
      tools: [{
        name: "emit_translations",
        description: `Emit ${localeName} translations keyed by the exact input dotted keys.`,
        input_schema: {
          type: "object",
          additionalProperties: { type: "string" },
        },
      }],
      tool_choice: { type: "tool", name: "emit_translations" },
    }),
  });

  if (!res.ok) {
    if (res.status === 429 && rateAttempt < RATE_LIMIT_MAX_RETRIES) {
      const retryAfterSec = Number(res.headers.get("retry-after")) || 60;
      console.warn(`[translate] ${locale}: rate limited (429), sleeping ${retryAfterSec}s (retry ${rateAttempt + 1}/${RATE_LIMIT_MAX_RETRIES})`);
      await sleep(retryAfterSec * 1000 + 500);
      return translate(locale, payload, attempt, rateAttempt + 1, usage);
    }
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }

  const body = await res.json();
  usage.input_tokens += body.usage?.input_tokens ?? 0;
  usage.output_tokens += body.usage?.output_tokens ?? 0;
  const toolUse = body.content?.find((c) => c.type === "tool_use" && c.name === "emit_translations");
  if (!toolUse || typeof toolUse.input !== "object" || toolUse.input === null) {
    if (attempt >= 2) throw new Error(`${locale}: no tool_use block in response\nRaw:\n${JSON.stringify(body.content)}`);
    console.warn(`[translate] ${locale} → missing tool_use block, retrying once`);
    return translate(locale, payload, attempt + 1, rateAttempt, usage);
  }
  const translations = toolUse.input;

  for (const key of Object.keys(payload)) {
    if (!Object.hasOwn(translations, key) || typeof translations[key] !== "string") {
      if (attempt < 2) return translate(locale, payload, attempt + 1, rateAttempt, usage);
      throw new Error(`${locale}: model omitted a translation for '${key}'`);
    }
    const srcP = extractPlaceholders(payload[key]);
    const outP = extractPlaceholders(translations[key]);
    if (!setsEqual(srcP, outP)) {
      if (attempt >= 2) throw new Error(`${locale}: placeholder mismatch on '${key}'. source=[${[...srcP].join(",")}] got=[${[...outP].join(",")}]`);
      return translate(locale, payload, attempt + 1, rateAttempt, usage);
    }
    const sourceBreaks = String(payload[key]).match(/\n/g)?.length ?? 0;
    const translatedBreaks = translations[key].match(/\n/g)?.length ?? 0;
    if (sourceBreaks > 0 && sourceBreaks !== translatedBreaks) {
      if (attempt < 2) return translate(locale, payload, attempt + 1, rateAttempt, usage);
      throw new Error(`${locale}: newline mismatch on '${key}'`);
    }
  }

  return { translations: Object.fromEntries(Object.keys(payload).map((key) => [key, translations[key]])), usage };
}

// --- Helpers --------------------------------------------------------------
function resolvePath(p) {
  return isAbsolute(p) ? p : resolve(CWD, p);
}

function readJSON(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function loadLock() {
  if (!existsSync(LOCK_FILE)) return { version: 1, source: LOCK_SOURCE, hashes: {} };
  return parseLockYaml(readFileSync(LOCK_FILE, "utf8"), LOCK_SOURCE);
}

// loadConfig moved to ./config.mjs (shared with add/doctor; resolves
// config-relative paths so monorepo invocations work from any subdir).

function discoverTargetLocales() {
  if (!existsSync(MESSAGES_DIR)) return [];
  const sourceBasename = basename(SOURCE_FILE);
  return readdirSync(MESSAGES_DIR)
    .filter((f) => f.endsWith(".json") && f !== sourceBasename)
    .map((f) => f.slice(0, -5))
    .sort();
}

function importLanguineLock(srcPath) {
  if (!existsSync(srcPath)) {
    console.error(`[translate] ${srcPath} not found.`);
    process.exit(1);
  }
  const raw = readFileSync(srcPath, "utf8");
  const hashes = {};
  let inFiles = false;
  let inFile = false;
  let matchedFile = false;
  for (const line of raw.split("\n")) {
    if (/^files:\s*$/.test(line)) { inFiles = true; continue; }
    if (/^\S/.test(line)) inFiles = false;
    if (!inFiles) continue;
    const file = line.match(/^ {2}(\S.*\.json):\s*$/)?.[1];
    if (/^ {2}\S/.test(line)) {
      inFile = Boolean(file) && [dirname(srcPath), CWD].some((base) => resolve(base, file) === SOURCE_FILE);
      matchedFile ||= inFile;
      continue;
    }
    if (!inFile) continue;
    const m = line.match(/^ {4}(.+):\s*([0-9a-f]{32})\s*$/i);
    if (m) hashes[m[1].trim().replaceAll("\\.", ".")] = m[2].toLowerCase();
  }
  if (!matchedFile) {
    console.error(`[translate] No entry in ${srcPath} matches ${SOURCE_FILE}. Check --source or --config.`);
    process.exit(1);
  }
  const lock = { version: 1, source: LOCK_SOURCE, hashes };
  mkdirSync(dirname(LOCK_FILE), { recursive: true });
  writeFileSync(LOCK_FILE, dumpLockYaml(lock));
  console.log(`[translate] Imported ${Object.keys(hashes).length} hashes from ${srcPath} → ${LOCK_FILE}`);
}

function renderSummary({ model, processed, skipped, totalIn, totalOut, totalCost, perLocale, dryRun, newKeys, modifiedKeys }) {
  const stdout = [
    `[translate] Model:    ${model}${dryRun ? " (dry-run)" : ""}`,
    `[translate] Locales:  ${processed} processed, ${skipped} skipped`,
    `[translate] Tokens:   ${totalIn.toLocaleString()} in / ${totalOut.toLocaleString()} out`,
    `[translate] Cost:     $${totalCost.toFixed(4)}`,
  ].join("\n");

  const rows = perLocale.map((r) => `| \`${r.locale}\` | ${r.keys} | ${r.inTok} | ${r.outTok} | $${r.cost.toFixed(5)} |`).join("\n");
  const markdown = [
    "## Translation run summary",
    "",
    describeDelta(newKeys, modifiedKeys),
    "",
    `- **Model:** \`${model}\`${dryRun ? " (dry-run)" : ""}`,
    `- **Locales:** ${processed} processed, ${skipped} skipped (up to date)`,
    `- **Tokens:** ${totalIn.toLocaleString()} in / ${totalOut.toLocaleString()} out`,
    `- **Cost:** $${totalCost.toFixed(4)}`,
    "",
    "| Locale | Keys | Input tokens | Output tokens | Cost |",
    "|---|---|---|---|---|",
    rows || "| _none_ | | | | |",
    "",
  ].join("\n");

  return { stdout, markdown };
}

function describeDelta(newKeys, modifiedKeys) {
  if (!newKeys && !modifiedKeys) return "No source changes detected — backfill only.";
  const parts = [];
  if (newKeys) parts.push(`**${newKeys} new ${newKeys === 1 ? "key" : "keys"}**`);
  if (modifiedKeys) parts.push(`**${modifiedKeys} modified ${modifiedKeys === 1 ? "key" : "keys"}**`);
  return `Detected ${parts.join(" and ")} in source.`;
}
