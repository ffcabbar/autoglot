// Pure helpers for `autoglot extract`. No I/O. Easy to test.

import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

/**
 * Recursive walk that pushes matching files into `out`.
 * @param {string} dir
 * @param {Set<string>} exts allow-list of extensions (with leading dot)
 * @param {Set<string>} skipDirs directory basenames to skip
 * @param {string[]} out accumulator
 */
export function walk(dir, exts, skipDirs, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name.startsWith(".") && name !== ".") {
      // .vscode etc. — skip dotdirs except `.` itself
      if (name === ".gitkeep" || name === ".npmignore") continue;
    }
    if (skipDirs.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, exts, skipDirs, out);
    } else if (exts.has(extname(name))) {
      out.push(full);
    }
  }
}

/**
 * Find candidate user-facing strings in a source file.
 * Looks at:
 *   1. JSX text content between tags (>...<), no expressions inside
 *   2. Common string-valued props: placeholder, aria-label, title, alt, label
 *
 * Returns Array<{ text: string, line: number }>.
 *
 * @param {string} code the full file contents
 */
export function extractCandidates(code) {
  const out = [];

  // 1. JSX text content. Greedy on contents, lazy on whitespace at edges.
  //    The negative `[^<{}]` rules out JS expressions ({var}) and nested tags.
  const jsxText = />([^<>{}]{1,500})</g;
  let m;
  while ((m = jsxText.exec(code)) !== null) {
    const raw = m[1];
    const text = raw.replace(/\s+/g, " ").trim();
    if (isLikelyUserFacing(text)) {
      out.push({ text, line: lineFromOffset(code, m.index + 1) });
    }
  }

  // 2. Common string-valued props.
  const propRe = /\b(placeholder|aria-label|title|alt|label)\s*=\s*"([^"]{1,500})"/g;
  while ((m = propRe.exec(code)) !== null) {
    const text = m[2].trim();
    if (isLikelyUserFacing(text)) {
      out.push({ text, line: lineFromOffset(code, m.index) });
    }
  }

  return dedupe(out);
}

function dedupe(arr) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const key = `${item.line}::${item.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Compute 1-based line number from a byte offset. */
export function lineFromOffset(code, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < code.length; i++) {
    if (code[i] === "\n") line++;
  }
  return line;
}

/**
 * Heuristic: is this string something a user actually sees?
 * Conservative — better to miss a real one than flag 100 false positives.
 *
 * Keep:
 *   - Anything with a space ("Get started", "Click to continue")
 *   - Strings starting with a capital letter that look like a sentence/word
 *
 * Skip:
 *   - Empty / very short / pure punctuation
 *   - All-digit / pure numeric formatting
 *   - URLs, paths, file extensions
 *   - Identifier-like (lowercase with dashes/underscores, no spaces) — likely CSS classes / tokens
 *   - Pure symbol strings ("→", "&copy;")
 */
export function isLikelyUserFacing(text) {
  if (!text || text.length < 2) return false;
  if (text.length > 300) return false;                              // probably template / inline doc

  if (!/[a-zA-Z]/.test(text)) return false;                         // need at least one letter
  if (/^[\d.,$%\s+-]+$/.test(text)) return false;                   // pure numbers / monetary
  if (/^https?:\/\//i.test(text)) return false;                     // URLs
  if (/^\//.test(text) || /^\.\.?\//.test(text)) return false;      // paths
  if (/^[a-zA-Z][\w-]*\.(json|tsx?|jsx?|css|svg|png|jpg|gif|md|yml|yaml)$/i.test(text)) return false; // filenames

  // Has whitespace = almost certainly user-facing copy.
  if (/\s/.test(text)) return true;

  // Single word: must start with a letter (kicks out "&copy;", "→", "©2026", etc.)
  if (!/^[A-Za-z]/.test(text)) return false;

  // Identifier-pattern (lowercase + dashes/underscores/digits, no caps,
  // no whitespace) → likely a CSS class, token, or variable name.
  if (/^[a-z][\w-]*$/.test(text)) return false;

  // ALL_CAPS or SCREAMING_SNAKE_CASE → constants, not copy.
  if (/^[A-Z_]+$/.test(text)) return false;

  // Anything else starting with a letter (e.g. "Submit", "Welcome!", "Hi-five")
  // is likely user-facing single-word copy.
  return true;
}

/**
 * Suggest a dotted key path for a hardcoded string.
 *   namespace = file path with conventional prefixes stripped
 *   key       = camelCase of the first 1–3 words of the string
 *
 * @param {string} text the user-facing string
 * @param {string} relPath file path relative to project root, e.g. "src/app/dashboard/page.tsx"
 */
export function suggestKey(text, relPath) {
  const ns = pathToNamespace(relPath);
  const key = textToCamelKey(text);
  return ns ? `${ns}.${key}` : key;
}

function pathToNamespace(relPath) {
  // Strip extension
  let p = relPath.replace(/\.(tsx?|jsx?|vue|svelte)$/, "");
  // Strip conventional prefixes
  p = p.replace(/^(?:src\/)?(?:app\/|components\/|pages\/|screens\/)?/, "");
  // Bracketed Next.js segments: drop them (e.g. [locale])
  p = p.replace(/\[[^\]]+\]\/?/g, "");
  // Drop trailing or whole-path "page" / "index" / "layout".
  // Matches "page", "/page", "foo/page" — leaves "foo".
  p = p.replace(/(^|\/)(page|index|layout)$/, "");
  // Slashes → dots
  p = p.replace(/\/+/g, ".").replace(/^\.+|\.+$/g, "");
  return p;
}

function textToCamelKey(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);
  if (words.length === 0) return "key";
  return words[0] + words.slice(1).map((w) => w[0].toUpperCase() + w.slice(1)).join("");
}

/** Set a value at a dotted path on an object. Mutates `obj`. */
export function setNested(obj, dottedPath, value) {
  const parts = dottedPath.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (typeof cur[k] !== "object" || cur[k] === null || Array.isArray(cur[k])) {
      cur[k] = {};
    }
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
  return obj;
}
