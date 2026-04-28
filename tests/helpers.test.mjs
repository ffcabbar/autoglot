import { test } from "node:test";
import { strict as assert } from "node:assert";
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
} from "../bin/helpers.mjs";

test("parseArgs: bare flags become true, --k=v parses value", () => {
  const a = parseArgs(["--dry-run", "--locales=de,fr", "--model=claude-haiku-4-5", "junk"]);
  assert.equal(a["dry-run"], true);
  assert.equal(a.locales, "de,fr");
  assert.equal(a.model, "claude-haiku-4-5");
  assert.equal(a.junk, undefined);
});

test("parseArgs: empty value after = stays empty string, not boolean", () => {
  const a = parseArgs(["--import-languine="]);
  assert.equal(a["import-languine"], "");
});

test("flatten: nested objects produce dotted keys", () => {
  const flat = flatten({ a: { b: { c: 1 } }, d: 2 });
  assert.deepEqual(flat, { "a.b.c": 1, d: 2 });
});

test("flatten: arrays are treated as leaf values, not descended into", () => {
  const flat = flatten({ a: [1, 2, 3], b: { c: [4] } });
  assert.deepEqual(flat, { a: [1, 2, 3], "b.c": [4] });
});

test("flatten: empty object yields empty result", () => {
  assert.deepEqual(flatten({}), {});
});

test("mergeOrdered: source key order is preserved even when translations come in any order", () => {
  const source = { a: "A", b: "B", c: "C" };
  const existing = {};
  const translations = { c: "Cx", a: "Ax", b: "Bx" };
  const out = mergeOrdered(source, existing, translations);
  assert.deepEqual(Object.keys(out), ["a", "b", "c"]);
});

test("mergeOrdered: translations win over existing, existing wins over empty", () => {
  const source = { a: "A", b: "B", c: "C" };
  const existing = { a: "old-A", b: "old-B" };
  const translations = { a: "new-A" };
  const out = mergeOrdered(source, existing, translations);
  assert.deepEqual(out, { a: "new-A", b: "old-B", c: "" });
});

test("mergeOrdered: orphan keys in existing are dropped (not in source = gone)", () => {
  const source = { a: "A" };
  const existing = { a: "x", obsolete: "should-disappear" };
  const out = mergeOrdered(source, existing, {});
  assert.deepEqual(out, { a: "x" });
  assert.equal("obsolete" in out, false);
});

test("mergeOrdered: nested structure is preserved with prefix-aware translation routing", () => {
  const source = {
    checkout: { cta: "Pay now", err: { card: "Declined" } },
    home: { hi: "Hello" },
  };
  const existing = {};
  const translations = {
    "checkout.cta": "Payer",
    "checkout.err.card": "Carte refusée",
    "home.hi": "Salut",
  };
  const out = mergeOrdered(source, existing, translations);
  assert.deepEqual(out, {
    checkout: { cta: "Payer", err: { card: "Carte refusée" } },
    home: { hi: "Salut" },
  });
});

test("extractPlaceholders: finds {name}-style tokens, returns a Set", () => {
  const set = extractPlaceholders("Hello {name}, you have {count} items");
  assert.equal(set.size, 2);
  assert.equal(set.has("name"), true);
  assert.equal(set.has("count"), true);
});

test("extractPlaceholders: ICU plural syntax does NOT yield false placeholders for 'one'/'other'", () => {
  // Inside ICU plural, `{count, plural, one {# item} other {# items}}`,
  // there is no `{one}` or `{other}` token — those are syntax keywords
  // followed by `{...}` braces. Our regex should only match the `{count}`-
  // style identifier-only braces, so it picks up `count` here.
  const set = extractPlaceholders("{count, plural, one {# item} other {# items}}");
  assert.deepEqual([...set].sort(), []);
  // Note: `count, plural...` doesn't match because the regex requires the
  // brace to close right after the identifier. This is the documented limit
  // of placeholder validation — ICU is protected by the system prompt.
});

test("setsEqual: same elements regardless of insertion order", () => {
  assert.equal(setsEqual(new Set(["a", "b"]), new Set(["b", "a"])), true);
  assert.equal(setsEqual(new Set(["a"]), new Set(["a", "b"])), false);
  assert.equal(setsEqual(new Set(), new Set()), true);
});

test("hash: deterministic md5 of stringified value", () => {
  assert.equal(hash("hello"), hash("hello"));
  assert.notEqual(hash("hello"), hash("hello!"));
  // md5("hello") = 5d41402abc4b2a76b9719d911017c592
  assert.equal(hash("hello"), "5d41402abc4b2a76b9719d911017c592");
});

test("chunk: splits array into batches of <= size", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 10), []);
  assert.deepEqual(chunk([1], 10), [[1]]);
});

test("parseLockYaml + dumpLockYaml: round-trip preserves version, source, hashes", () => {
  const original = {
    version: 1,
    source: "messages/en.json",
    hashes: {
      "greeting": "5d41402abc4b2a76b9719d911017c592",
      "checkout.cta": "abc123def456",
      "checkout.errors.cardDeclined": "deadbeef",
    },
  };
  const dumped = dumpLockYaml(original);
  const parsed = parseLockYaml(dumped);
  assert.equal(parsed.version, original.version);
  assert.equal(parsed.source, original.source);
  assert.deepEqual(parsed.hashes, original.hashes);
});

test("parseLockYaml: preserves key order from the YAML body", () => {
  const yaml = `version: 1
source: messages/en.json
hashes:
  zzz.last: aaa
  aaa.first: zzz
  middle: bbb
`;
  const parsed = parseLockYaml(yaml);
  assert.deepEqual(Object.keys(parsed.hashes), ["zzz.last", "aaa.first", "middle"]);
});

test("parseLockYaml: comments and blank lines are ignored", () => {
  const yaml = `# header comment
version: 1

source: x.json
hashes:
  # this is a hash
  k: v
`;
  const parsed = parseLockYaml(yaml);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.source, "x.json");
  assert.deepEqual(parsed.hashes, { k: "v" });
});

test("parseLockYaml: missing source falls back to defaultSource arg", () => {
  const yaml = `version: 1
hashes:
  k: v
`;
  const parsed = parseLockYaml(yaml, "fallback.json");
  assert.equal(parsed.source, "fallback.json");
});

test("allowedTopLevelNamespaces: unrestricted namespace included for all locales", () => {
  const source = { common: {}, dashboard: {} };
  const cfg = { namespaces: {} };
  const allowed = allowedTopLevelNamespaces(source, "es", cfg);
  assert.equal(allowed.has("common"), true);
  assert.equal(allowed.has("dashboard"), true);
});

test("allowedTopLevelNamespaces: restricted namespace gated to locales in the list", () => {
  const source = { common: {}, dashboard: {} };
  const cfg = { namespaces: { dashboard: ["es", "de"] } };
  assert.equal(allowedTopLevelNamespaces(source, "es", cfg).has("dashboard"), true);
  assert.equal(allowedTopLevelNamespaces(source, "fr", cfg).has("dashboard"), false);
  assert.equal(allowedTopLevelNamespaces(source, "fr", cfg).has("common"), true);
});

test("pickAllowedSource: returns only the namespaces in the allowed set", () => {
  const source = { a: { x: 1 }, b: { y: 2 }, c: { z: 3 } };
  const allowed = new Set(["a", "c"]);
  assert.deepEqual(pickAllowedSource(source, allowed), { a: { x: 1 }, c: { z: 3 } });
});

test("pLimit: never runs more than N concurrent thunks", async () => {
  const limit = pLimit(3);
  let active = 0;
  let peak = 0;
  const tasks = Array.from({ length: 12 }, (_, i) =>
    limit(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return i;
    })
  );
  const out = await Promise.all(tasks);
  assert.deepEqual(out, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(peak <= 3, true, `peak concurrency was ${peak}, expected <= 3`);
});

test("pLimit: a rejected thunk does not block subsequent thunks", async () => {
  const limit = pLimit(2);
  const results = await Promise.allSettled([
    limit(async () => { throw new Error("boom"); }),
    limit(async () => "ok-1"),
    limit(async () => "ok-2"),
  ]);
  assert.equal(results[0].status, "rejected");
  assert.equal(results[1].status, "fulfilled");
  assert.equal(results[1].value, "ok-1");
  assert.equal(results[2].status, "fulfilled");
  assert.equal(results[2].value, "ok-2");
});

test("pLimit: concurrency of 1 == serial execution", async () => {
  const limit = pLimit(1);
  const order = [];
  const tasks = [10, 5, 1].map((delay, i) =>
    limit(async () => {
      await new Promise((r) => setTimeout(r, delay));
      order.push(i);
    })
  );
  await Promise.all(tasks);
  assert.deepEqual(order, [0, 1, 2]);
});

test("pLimit: invalid concurrency throws", () => {
  assert.throws(() => pLimit(0));
  assert.throws(() => pLimit(-1));
  assert.throws(() => pLimit(NaN));
});
