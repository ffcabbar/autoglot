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

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join, resolve, isAbsolute } from "node:path";
import { tmpdir } from "node:os";

// --- Constants ------------------------------------------------------------
const CHUNK_SIZE = 200;
const RATE_LIMIT_MAX_RETRIES = 5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// USD per 1M tokens. Update when Anthropic pricing changes.
const PRICING = {
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-opus-4-7": { input: 15.0, output: 75.0 },
};

const LOCALE_DISPLAY = new Intl.DisplayNames(["en"], { type: "language" });

// --- CLI ------------------------------------------------------------------
const args = parseArgs(process.argv.slice(2));
const CWD = process.cwd();
const CONFIG_PATH = resolvePath(args.config || "translate.config.json");

const config = loadConfig(CONFIG_PATH);

const SOURCE_FILE = resolvePath(args.source || config.source || "messages/en.json");
const MESSAGES_DIR = resolvePath(args["messages-dir"] || config.messagesDir || "messages");
const LOCK_FILE = resolvePath(args["lock-file"] || config.lockFile || "translate.lock");
const SUMMARY_FILE = args["summary-path"]
  ? resolvePath(args["summary-path"])
  : join(tmpdir(), "translate-summary.md");
const STEP_SUMMARY = process.env.GITHUB_STEP_SUMMARY;
const MODEL = args.model || config.model || "claude-haiku-4-5";

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
  const targets = args.locales
    ? args.locales.split(",").map((s) => s.trim()).filter(Boolean)
    : discoverTargetLocales();

  const newDelta = [];
  const changedDelta = [];
  for (const key of Object.keys(sourceFlat)) {
    const h = hash(sourceFlat[key]);
    if (!lock.hashes[key]) newDelta.push(key);
    else if (lock.hashes[key] !== h) changedDelta.push(key);
  }

  console.log(`[translate] source: ${newDelta.length} new keys, ${changedDelta.length} modified (${newDelta.length + changedDelta.length} total delta)`);

  if (args.check) {
    if (newDelta.length + changedDelta.length === 0) {
      console.log("[translate] All target locales up to date.");
      process.exit(0);
    }
    console.log("[translate] Delta keys:", [...newDelta, ...changedDelta].join(", "));
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY && !args["dry-run"]) {
    console.error("[translate] ANTHROPIC_API_KEY is not set.");
    process.exit(1);
  }

  if (!existsSync(MESSAGES_DIR)) mkdirSync(MESSAGES_DIR, { recursive: true });

  const perLocale = [];
  let totalIn = 0, totalOut = 0, totalCost = 0, skipped = 0;

  for (const locale of targets) {
    const targetPath = join(MESSAGES_DIR, `${locale}.json`);
    const existing = existsSync(targetPath) ? readJSON(targetPath) : {};
    const existingFlat = flatten(existing);

    const allowedNs = allowedTopLevelNamespaces(source, locale, config);
    const isAllowed = (k) => allowedNs.has(k.split(".")[0]);

    const missing = Object.keys(sourceFlat).filter((k) => isAllowed(k) && !(k in existingFlat));
    const delta = [...newDelta, ...changedDelta].filter(isAllowed);
    const keysToTranslate = Array.from(new Set([...missing, ...delta]));

    const filteredSource = pickAllowedSource(source, allowedNs);
    const hasOrphans = Object.keys(existingFlat).some((k) => !(k in sourceFlat) || !isAllowed(k));

    if (keysToTranslate.length === 0) {
      if (!hasOrphans) {
        console.log(`[translate] ${locale.padEnd(6)} → up to date (skipped)`);
        skipped++;
        continue;
      }
      if (args["dry-run"]) {
        console.log(`[translate] ${locale.padEnd(6)} → would remove orphan keys (dry-run)`);
        perLocale.push({ locale, keys: 0, inTok: 0, outTok: 0, cost: 0 });
        continue;
      }
      const merged = mergeOrdered(filteredSource, existing, {});
      writeFileSync(targetPath, JSON.stringify(merged, null, 2) + "\n");
      console.log(`[translate] ${locale.padEnd(6)} → removed orphan keys`);
      perLocale.push({ locale, keys: 0, inTok: 0, outTok: 0, cost: 0 });
      continue;
    }

    if (args["dry-run"]) {
      console.log(`[translate] ${locale.padEnd(6)} → ${keysToTranslate.length} keys (dry-run)`);
      perLocale.push({ locale, keys: keysToTranslate.length, inTok: 0, outTok: 0, cost: 0 });
      continue;
    }

    const chunks = chunk(keysToTranslate, CHUNK_SIZE);
    const translations = {};
    let usageIn = 0, usageOut = 0;
    for (const [idx, keys] of chunks.entries()) {
      const payload = Object.fromEntries(keys.map((k) => [k, sourceFlat[k]]));
      if (chunks.length > 1) {
        console.log(`[translate] ${locale.padEnd(6)} → chunk ${idx + 1}/${chunks.length} (${keys.length} keys)`);
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
    console.log(`[translate] ${locale.padEnd(6)} → ${keysToTranslate.length} keys | in: ${usageIn} out: ${usageOut} | $${cost.toFixed(5)}`);
  }

  if (!args["dry-run"]) {
    for (const key of Object.keys(sourceFlat)) lock.hashes[key] = hash(sourceFlat[key]);
    for (const key of Object.keys(lock.hashes)) if (!(key in sourceFlat)) delete lock.hashes[key];
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
    dryRun: !!args["dry-run"],
    newKeys: newDelta.length,
    modifiedKeys: changedDelta.length,
  });
  console.log("[translate] ──────────────────────────────────────");
  console.log(summary.stdout);
  if (STEP_SUMMARY) writeFileSync(STEP_SUMMARY, summary.markdown, { flag: "a" });
  writeFileSync(SUMMARY_FILE, summary.markdown);
}

// --- Anthropic call -------------------------------------------------------
// Uses tool use (structured outputs) so the model can't corrupt the wire
// format with unescaped characters — the API returns `input` as a pre-parsed
// object, eliminating a whole class of JSON parse failures (e.g. a Lithuanian
// translation closing a quoted word with ASCII " instead of U+201D).
async function translate(locale, payload, attempt = 1, rateAttempt = 0) {
  const localeName = LOCALE_DISPLAY.of(locale) || locale;
  const namespaces = new Set(Object.keys(payload).map((k) => k.split(".")[0]));
  const nsCtx = [...namespaces]
    .map((n) => `- ${n}: ${(config.namespaceContext && config.namespaceContext[n]) || "application copy"}`)
    .join("\n");

  const glossary = Array.isArray(config.glossary) && config.glossary.length
    ? ` Keep these product names verbatim: ${config.glossary.join(", ")}.`
    : "";

  const system = `You are a professional localization engineer. Translate English values into ${localeName}. Preserve all placeholders like {name}, {count} exactly. Preserve ICU plural syntax verbatim ({count, plural, one {...} other {...}} — never translate one/other/few/many/zero or the # symbol).${glossary} Call the emit_translations tool with every input key mapped to its translated string — do not write prose outside the tool call.`;

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
      return translate(locale, payload, attempt, rateAttempt + 1);
    }
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }

  const body = await res.json();
  const toolUse = body.content?.find((c) => c.type === "tool_use");
  if (!toolUse || typeof toolUse.input !== "object" || toolUse.input === null) {
    if (attempt >= 2) throw new Error(`${locale}: no tool_use block in response\nRaw:\n${JSON.stringify(body.content)}`);
    console.warn(`[translate] ${locale} → missing tool_use block, retrying once`);
    return translate(locale, payload, attempt + 1);
  }
  const translations = toolUse.input;

  for (const key of Object.keys(payload)) {
    if (typeof translations[key] !== "string") {
      if (attempt < 2) return translate(locale, payload, attempt + 1);
      console.warn(`[translate] ${locale}: '${key}' omitted by model, using source value verbatim`);
      translations[key] = payload[key];
      continue;
    }
    const srcP = extractPlaceholders(payload[key]);
    const outP = extractPlaceholders(translations[key]);
    if (!setsEqual(srcP, outP)) {
      if (attempt >= 2) throw new Error(`${locale}: placeholder mismatch on '${key}'. source=[${[...srcP].join(",")}] got=[${[...outP].join(",")}]`);
      return translate(locale, payload, attempt + 1);
    }
  }

  return { translations, usage: body.usage };
}

// --- Helpers --------------------------------------------------------------
function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (!a.startsWith("--")) continue;
    const eq = a.indexOf("=");
    if (eq === -1) out[a.slice(2)] = true;
    else out[a.slice(2, eq)] = a.slice(eq + 1);
  }
  return out;
}

function resolvePath(p) {
  return isAbsolute(p) ? p : resolve(CWD, p);
}

function readJSON(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function loadLock() {
  if (!existsSync(LOCK_FILE)) return { version: 1, source: SOURCE_FILE, hashes: {} };
  return parseLockYaml(readFileSync(LOCK_FILE, "utf8"));
}

function loadConfig(p) {
  if (!existsSync(p)) return { namespaces: {} };
  try {
    const parsed = JSON.parse(readFileSync(p, "utf8"));
    return {
      ...parsed,
      namespaces: parsed.namespaces || {},
    };
  } catch (err) {
    console.error(`[translate] Failed to parse ${p}: ${err.message}`);
    process.exit(1);
  }
}

function allowedTopLevelNamespaces(source, locale, cfg) {
  const out = new Set();
  for (const ns of Object.keys(source)) {
    const restriction = cfg.namespaces[ns];
    if (!restriction || restriction.includes(locale)) out.add(ns);
  }
  return out;
}

function pickAllowedSource(source, allowedNs) {
  const out = {};
  for (const k of Object.keys(source)) if (allowedNs.has(k)) out[k] = source[k];
  return out;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function parseLockYaml(raw) {
  const lock = { version: 1, source: SOURCE_FILE, hashes: {} };
  let inHashes = false;
  for (const rawLine of raw.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line || /^\s*#/.test(line)) continue;
    if (!inHashes) {
      let m = line.match(/^version:\s*(\d+)\s*$/);
      if (m) { lock.version = Number(m[1]); continue; }
      m = line.match(/^source:\s*(.+?)\s*$/);
      if (m) { lock.source = m[1]; continue; }
      if (/^hashes:\s*$/.test(line)) { inHashes = true; continue; }
    } else {
      const m = line.match(/^\s{2}(\S+):\s*(\S+)\s*$/);
      if (m) lock.hashes[m[1]] = m[2];
      else if (!/^\s/.test(line)) inHashes = false;
    }
  }
  return lock;
}

function dumpLockYaml(lock) {
  let out = `version: ${lock.version}\nsource: ${lock.source}\nhashes:\n`;
  for (const key of Object.keys(lock.hashes)) {
    out += `  ${key}: ${lock.hashes[key]}\n`;
  }
  return out;
}

function discoverTargetLocales() {
  if (!existsSync(MESSAGES_DIR)) return [];
  const sourceBasename = SOURCE_FILE.split("/").pop();
  return readdirSync(MESSAGES_DIR)
    .filter((f) => f.endsWith(".json") && f !== sourceBasename)
    .map((f) => f.slice(0, -5))
    .sort();
}

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

function mergeOrdered(source, existing, translations) {
  const out = {};
  for (const k of Object.keys(source)) {
    if (source[k] && typeof source[k] === "object" && !Array.isArray(source[k])) {
      out[k] = mergeOrdered(source[k], existing[k] || {}, translationsPrefix(translations, k));
    } else {
      out[k] = pickTranslation(translations, existing, k);
    }
  }
  return out;
}

function translationsPrefix(translations, prefix) {
  const out = {};
  const p = `${prefix}.`;
  for (const k of Object.keys(translations)) {
    if (k === prefix) out[""] = translations[k];
    else if (k.startsWith(p)) out[k.slice(p.length)] = translations[k];
  }
  return out;
}

function pickTranslation(translations, existing, key) {
  if (key in translations) return translations[key];
  if (existing && key in existing) return existing[key];
  return "";
}

function extractPlaceholders(s) {
  // Only validates plain {name} placeholders. ICU plural/select syntax is
  // preserved by the LLM per the system prompt; validating nested ICU
  // structure with a regex is unreliable (matches differ across languages).
  const set = new Set();
  const re = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  let m;
  while ((m = re.exec(s)) !== null) set.add(m[1]);
  return set;
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function hash(s) {
  return createHash("md5").update(String(s)).digest("hex");
}

function importLanguineLock(srcPath) {
  if (!existsSync(srcPath)) {
    console.error(`[translate] ${srcPath} not found.`);
    process.exit(1);
  }
  const raw = readFileSync(srcPath, "utf8");
  const hashes = {};
  let inFile = false;
  for (const line of raw.split("\n")) {
    if (/^files:/.test(line)) continue;
    if (/^\s{2}\S.*\.json:/.test(line)) { inFile = true; continue; }
    if (/^\s{2}\S/.test(line)) { inFile = false; continue; }
    if (!inFile) continue;
    const m = line.match(/^\s{4}([^:]+):\s*(\S+)\s*$/);
    if (m) hashes[m[1].trim()] = m[2].trim();
  }
  const lock = { version: 1, source: SOURCE_FILE, hashes };
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
