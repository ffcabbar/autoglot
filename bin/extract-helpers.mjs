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

// Code-shaped tokens that don't appear in real UI copy. The pattern that
// false-positives the most: regex catches text between `<...>` brackets,
// but TS generics (useRef<T>(null)) and intersection types look the same.
// If ANY of these substrings appear, reject.
const CODE_TOKEN_DENYLIST = [
  "=>", ";", "===", "!==", "&&", "||", "??",
  "const ", "let ", "var ", "function ", "return ", " as ",
  "useRef", "useState", "useEffect", "useMemo", "useCallback",
  "useSharedValue", "useDerivedValue", "useAnimatedRef", "useAnimatedStyle",
  "Math.", "JSON.", "Object.", "Array.",
  "props.", "this.", "<= ", ">= ", "== ", "!= ",
  "console.", "process.", "Promise.",
];

// Type names that show up bare between generic brackets. These aren't
// user-facing strings even when they pass other heuristics.
const BARE_TYPE_DENYLIST = new Set([
  "Promise", "void", "null", "undefined", "any", "never", "unknown",
  "Required", "Partial", "Record", "Pick", "Omit", "Readonly", "Exclude",
  "Map", "Set", "Array", "ReadonlyArray", "Iterable", "AsyncIterable",
  "ReactNode", "ReactElement", "ReactChild", "FunctionComponent",
  "StyleProp", "SharedValue", "DerivedValue", "AnimatedRef",
  "React.ReactNode", "React.ReactElement", "React.FunctionComponent",
  "React.FC", "React.ComponentType",
]);

/**
 * Heuristic: is this string something a user actually sees?
 * Conservative — better to miss a real one than flag 100 false positives.
 *
 * Keep:
 *   - Anything with a space that doesn't look like code ("Get started")
 *   - Single words starting with a capital letter ("Submit", "Cancel")
 *
 * Skip:
 *   - Empty / very short / pure punctuation
 *   - All-digit / pure numeric formatting
 *   - URLs, paths, file extensions
 *   - Identifier-like (lowercase with dashes/underscores, no spaces)
 *   - Code-shaped tokens (TS generics, comparison expressions, hook calls)
 *   - Bare type names (Promise, void, ReactNode, etc.)
 *   - Strings starting with `(`, `[`, `=`, `&`, `|`, `;`, `,`, `.`, `:`, `>` or a digit
 */
export function isLikelyUserFacing(text) {
  if (!text || text.length < 2) return false;
  if (text.length > 300) return false;                              // probably template / inline doc

  if (!/[a-zA-Z]/.test(text)) return false;                         // need at least one letter
  if (/^[\d.,$%\s+-]+$/.test(text)) return false;                   // pure numbers / monetary
  if (/^https?:\/\//i.test(text)) return false;                     // URLs
  if (/^\//.test(text) || /^\.\.?\//.test(text)) return false;      // paths
  if (/^[a-zA-Z][\w-]*\.(json|tsx?|jsx?|css|svg|png|jpg|gif|md|yml|yaml)$/i.test(text)) return false; // filenames

  // Doesn't start with a letter → likely a code fragment leaked from `<...>`.
  // (Real UI copy starts with a letter or with whitespace stripped to one.)
  if (!/^[A-Za-z]/.test(text)) return false;

  // Bare type names from TS generics.
  if (BARE_TYPE_DENYLIST.has(text)) return false;

  // Code-shaped tokens anywhere in the candidate.
  for (const tok of CODE_TOKEN_DENYLIST) {
    if (text.includes(tok)) return false;
  }

  // Has whitespace AND survived the code-token check → user copy.
  if (/\s/.test(text)) return true;

  // Single word: identifier pattern → reject.
  if (/^[a-z][\w-]*$/.test(text)) return false;

  // ALL_CAPS or SCREAMING_SNAKE_CASE → constants.
  if (/^[A-Z_]+$/.test(text)) return false;

  // camelCase / PascalCase with junk like "eStatusCompleted", "sCompleteonboardingConst"
  // → reject if last 1-3 chars look like a leaked TS suffix.
  // Conservative: only allow single-word candidates with no caps inside.
  // (i.e. "Submit" yes, "submitBtn" no.)
  if (/[A-Z]/.test(text.slice(1))) return false;

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
  p = p.replace(/^(?:src\/)?(?:app\/|components\/|pages\/|screens\/|hooks\/|services\/|lib\/|utils\/)?/, "");
  // Bracketed Next.js segments: drop them (e.g. [locale], [...slug])
  p = p.replace(/\[[^\]]+\]\/?/g, "");
  // Parenthesized Expo Router groups: strip the parens, keep the name
  // ("(onboarding)/age" → "onboarding/age")
  p = p.replace(/\(([^)]+)\)/g, "$1");
  // Drop trailing or whole-path "page" / "index" / "layout" / "_layout".
  p = p.replace(/(^|\/)(page|index|_?layout)$/, "");
  // Normalize each segment: dashes/underscores → camelCase, strip non-identifier
  p = p.split("/").filter(Boolean).map(sanitizeSegment).filter(Boolean).join(".");
  return p;
}

function sanitizeSegment(seg) {
  // "journal-upload" → "journalUpload", "apple_intel" → "appleIntel"
  const parts = seg.split(/[-_]+/).filter(Boolean);
  if (parts.length === 0) return "";
  const head = parts[0].replace(/[^a-zA-Z0-9]/g, "");
  const tail = parts.slice(1).map((w) => {
    const clean = w.replace(/[^a-zA-Z0-9]/g, "");
    return clean ? clean[0].toUpperCase() + clean.slice(1) : "";
  }).join("");
  let out = head + tail;
  // Prefix `_` if digit-leading so it's a valid JS identifier.
  if (/^\d/.test(out)) out = "_" + out;
  return out;
}

function textToCamelKey(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);
  if (words.length === 0) return "key";
  let key = words[0] + words.slice(1).map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  // Prefix `_` if digit-leading so it's a valid JS identifier.
  if (/^\d/.test(key)) key = "_" + key;
  return key;
}

/**
 * Look up a value at a dotted path. Returns `undefined` if the path
 * doesn't fully exist or hits a non-object midway.
 */
export function getNested(obj, dottedPath) {
  const parts = dottedPath.split(".");
  let cur = obj;
  for (const k of parts) {
    if (cur === null || typeof cur !== "object" || Array.isArray(cur)) return undefined;
    cur = cur[k];
  }
  return cur;
}

/**
 * Merge new candidate keys into an existing messages object.
 * Returns { merged, added, skipped, conflicts }:
 *   - merged: the new object (does not mutate the input)
 *   - added: [{key, text}] entries that were newly written
 *   - skipped: [{key, existing, text}] entries that already had a value
 *   - conflicts: [{key, kind, text}] entries blocked by namespace/leaf shape
 *
 * Existing keys are NEVER overwritten — extract --write is meant to be
 * safe to run repeatedly without clobbering hand-curated translations.
 *
 * Shape conflicts (the #7 silent-corruption class) are detected and refused:
 *   - kind="leaf-vs-namespace": existing path `a.b` is a string but candidate
 *     wants to write `a.b.c` — would replace string with object.
 *   - kind="namespace-vs-leaf": existing path `a.b` is an object but candidate
 *     wants to write `a.b` as a string — would silently delete `a.b.*`.
 */
export function mergeKeys(existing, candidates) {
  const merged = structuredClone(existing ?? {});
  const added = [];
  const skipped = [];
  const conflicts = [];
  for (const cand of candidates) {
    const conflict = detectShapeConflict(merged, cand.key);
    if (conflict) {
      conflicts.push({ key: cand.key, kind: conflict, text: cand.text });
      continue;
    }
    const current = getNested(merged, cand.key);
    if (typeof current === "string") {
      skipped.push({ key: cand.key, existing: current, text: cand.text });
      continue;
    }
    setNested(merged, cand.key, cand.text);
    added.push({ key: cand.key, text: cand.text });
  }
  return { merged, added, skipped, conflicts };
}

/**
 * Check whether writing `dottedPath = <string>` into `obj` would clobber
 * a non-string node, in either direction.
 *
 * Returns null (safe), "leaf-vs-namespace" (an ancestor is already a
 * string), or "namespace-vs-leaf" (the target is already an object).
 */
export function detectShapeConflict(obj, dottedPath) {
  const parts = dottedPath.split(".");
  let cur = obj;
  // Walk ancestors. If we hit a non-object before reaching the leaf,
  // it's a leaf-vs-namespace conflict (existing string blocks a deeper key).
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const next = cur?.[k];
    if (next === undefined) return null;  // free space, fine
    if (typeof next !== "object" || next === null || Array.isArray(next)) {
      return "leaf-vs-namespace";
    }
    cur = next;
  }
  const leaf = cur?.[parts[parts.length - 1]];
  if (leaf === undefined) return null;
  if (typeof leaf === "string") return null;  // mergeKeys handles this as "skipped"
  // It's an object/array — writing a string here would delete its contents.
  return "namespace-vs-leaf";
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
