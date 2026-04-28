// Pure helpers extracted from translate.mjs so they can be unit-tested.
// No side effects, no I/O, no process.exit. Anything that touches fs,
// network, or process.* belongs in translate.mjs.

import { createHash } from "node:crypto";

export function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (!a.startsWith("--")) continue;
    const eq = a.indexOf("=");
    if (eq === -1) out[a.slice(2)] = true;
    else out[a.slice(2, eq)] = a.slice(eq + 1);
  }
  return out;
}

export function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

export function mergeOrdered(source, existing, translations) {
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

export function extractPlaceholders(s) {
  // Only validates plain {name} placeholders. ICU plural/select syntax is
  // preserved by the LLM per the system prompt; validating nested ICU
  // structure with a regex is unreliable (matches differ across languages).
  const set = new Set();
  const re = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  let m;
  while ((m = re.exec(s)) !== null) set.add(m[1]);
  return set;
}

export function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export function hash(s) {
  return createHash("md5").update(String(s)).digest("hex");
}

export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function parseLockYaml(raw, defaultSource = "") {
  const lock = { version: 1, source: defaultSource, hashes: {} };
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

export function dumpLockYaml(lock) {
  let out = `version: ${lock.version}\nsource: ${lock.source}\nhashes:\n`;
  for (const key of Object.keys(lock.hashes)) {
    out += `  ${key}: ${lock.hashes[key]}\n`;
  }
  return out;
}

export function allowedTopLevelNamespaces(source, locale, cfg) {
  const out = new Set();
  for (const ns of Object.keys(source)) {
    const restriction = cfg.namespaces?.[ns];
    if (!restriction || restriction.includes(locale)) out.add(ns);
  }
  return out;
}

export function pickAllowedSource(source, allowedNs) {
  const out = {};
  for (const k of Object.keys(source)) if (allowedNs.has(k)) out[k] = source[k];
  return out;
}

// pLimit — minimal zero-dep concurrency limiter.
// Returns a function that, when invoked with a thunk `() => Promise<T>`,
// queues it and resolves with the eventual value. At most `n` thunks
// run concurrently. Used in translate.mjs to parallelize the locale loop.
export function pLimit(n) {
  if (!Number.isFinite(n) || n < 1) throw new Error(`pLimit: invalid concurrency ${n}`);
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= n || queue.length === 0) return;
    active++;
    const { thunk, resolve, reject } = queue.shift();
    Promise.resolve().then(thunk).then(
      (v) => { active--; resolve(v); next(); },
      (e) => { active--; reject(e); next(); },
    );
  };
  return (thunk) => new Promise((resolve, reject) => {
    queue.push({ thunk, resolve, reject });
    next();
  });
}
