import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  isLikelyUserFacing,
  extractCandidates,
  suggestKey,
  setNested,
  getNested,
  mergeKeys,
  lineFromOffset,
} from "../bin/extract-helpers.mjs";
import { parseExtractArgs } from "../bin/extract.mjs";

describe("isLikelyUserFacing", () => {
  test("phrases with whitespace are kept", () => {
    assert.equal(isLikelyUserFacing("Welcome to MyApp"), true);
    assert.equal(isLikelyUserFacing("Get started"), true);
    assert.equal(isLikelyUserFacing("Click here"), true);
  });

  test("single capitalized word is kept", () => {
    assert.equal(isLikelyUserFacing("Submit"), true);
    assert.equal(isLikelyUserFacing("Cancel"), true);
    assert.equal(isLikelyUserFacing("Save"), true);
  });

  test("identifier-like (lowercase, kebab/snake/camel) is rejected", () => {
    assert.equal(isLikelyUserFacing("flex-center"), false);
    assert.equal(isLikelyUserFacing("submitBtn"), false);
    assert.equal(isLikelyUserFacing("my_value"), false);
    assert.equal(isLikelyUserFacing("foo"), false);
  });

  test("numeric / monetary strings are rejected", () => {
    assert.equal(isLikelyUserFacing("123"), false);
    assert.equal(isLikelyUserFacing("$5.99"), false);
    assert.equal(isLikelyUserFacing("1,000.00"), false);
  });

  test("URLs and paths are rejected", () => {
    assert.equal(isLikelyUserFacing("https://example.com"), false);
    assert.equal(isLikelyUserFacing("/api/users"), false);
    assert.equal(isLikelyUserFacing("./config"), false);
  });

  test("filenames are rejected", () => {
    assert.equal(isLikelyUserFacing("logo.svg"), false);
    assert.equal(isLikelyUserFacing("config.json"), false);
    assert.equal(isLikelyUserFacing("page.tsx"), false);
  });

  test("ALL_CAPS constants are rejected", () => {
    assert.equal(isLikelyUserFacing("USER_TOKEN"), false);
    assert.equal(isLikelyUserFacing("API_URL"), false);
  });

  test("empty / very short / pure punctuation rejected", () => {
    assert.equal(isLikelyUserFacing(""), false);
    assert.equal(isLikelyUserFacing("a"), false);
    assert.equal(isLikelyUserFacing("→"), false);
    assert.equal(isLikelyUserFacing("&copy;"), false);
  });
});

describe("extractCandidates", () => {
  test("finds JSX text content", () => {
    const code = `
      function Page() {
        return (
          <div>
            <h1>Welcome</h1>
            <p>Get started today</p>
          </div>
        );
      }
    `;
    const out = extractCandidates(code);
    const texts = out.map((c) => c.text);
    assert.ok(texts.includes("Welcome"));
    assert.ok(texts.includes("Get started today"));
  });

  test("finds string-valued props", () => {
    const code = `<input placeholder="Enter your email" aria-label="Email field" />`;
    const out = extractCandidates(code);
    const texts = out.map((c) => c.text);
    assert.ok(texts.includes("Enter your email"));
    assert.ok(texts.includes("Email field"));
  });

  test("ignores JSX with expressions inside", () => {
    const code = `<h1>Hello {name}</h1>`;
    const out = extractCandidates(code);
    assert.deepEqual(out, []);
  });

  test("ignores className and other dev props", () => {
    const code = `<div className="flex items-center gap-2"></div>`;
    const out = extractCandidates(code);
    assert.deepEqual(out, []);
  });

  test("ignores URLs in href / src", () => {
    const code = `<a href="https://example.com">Click here</a>`;
    const out = extractCandidates(code);
    const texts = out.map((c) => c.text);
    assert.ok(texts.includes("Click here"));
    assert.ok(!texts.includes("https://example.com"));
  });

  test("reports correct 1-based line numbers", () => {
    const code = "line1\nline2\n<h1>Hi there</h1>\nline4";
    const out = extractCandidates(code);
    assert.equal(out[0].line, 3);
  });

  test("dedupes same string on same line", () => {
    const code = `<><span>Save</span><span>Save</span></>`;
    const out = extractCandidates(code);
    // Both on the same line — dedup keeps one entry per (line, text) tuple.
    assert.equal(out.length, 1);
  });
});

describe("suggestKey", () => {
  test("namespaces a Next.js App Router page", () => {
    assert.equal(suggestKey("Welcome", "src/app/dashboard/page.tsx"), "dashboard.welcome");
  });

  test("strips trailing /page, /index, /layout", () => {
    assert.equal(suggestKey("Hi", "src/app/page.tsx"), "hi");
    assert.equal(suggestKey("Hi", "src/app/foo/index.tsx"), "foo.hi");
    assert.equal(suggestKey("Hi", "src/app/bar/layout.tsx"), "bar.hi");
  });

  test("drops [locale] and other bracketed segments", () => {
    assert.equal(suggestKey("Welcome back", "src/app/[locale]/dashboard/page.tsx"), "dashboard.welcomeBack");
  });

  test("camelCases first 1-3 words of the string", () => {
    assert.equal(suggestKey("Get started today", "src/app/page.tsx"), "getStartedToday");
    assert.equal(suggestKey("This sentence is quite long indeed", "src/app/page.tsx"), "thisSentenceIs");
  });

  test("strips conventional prefixes", () => {
    assert.equal(suggestKey("Welcome", "src/components/Header.tsx"), "Header.welcome");
    assert.equal(suggestKey("Welcome", "components/Header.tsx"), "Header.welcome");
    assert.equal(suggestKey("Welcome", "screens/Home.tsx"), "Home.welcome");
  });

  test("non-letter characters are stripped from key", () => {
    assert.equal(suggestKey("Save & exit!", "src/app/page.tsx"), "saveExit");
  });
});

describe("setNested", () => {
  test("creates nested objects", () => {
    const obj = {};
    setNested(obj, "a.b.c", "hello");
    assert.deepEqual(obj, { a: { b: { c: "hello" } } });
  });

  test("merges into existing nested objects", () => {
    const obj = { a: { x: 1 } };
    setNested(obj, "a.b", "y");
    assert.deepEqual(obj, { a: { x: 1, b: "y" } });
  });

  test("flat key works", () => {
    const obj = {};
    setNested(obj, "key", "value");
    assert.deepEqual(obj, { key: "value" });
  });

  test("overwrites primitive when path collides", () => {
    const obj = { a: "string" };
    setNested(obj, "a.b", "nested");
    assert.deepEqual(obj, { a: { b: "nested" } });
  });
});

describe("getNested", () => {
  test("returns nested string", () => {
    assert.equal(getNested({ a: { b: "x" } }, "a.b"), "x");
  });

  test("returns undefined for missing path", () => {
    assert.equal(getNested({ a: { b: "x" } }, "a.c"), undefined);
  });

  test("returns undefined when midway hits primitive", () => {
    assert.equal(getNested({ a: "leaf" }, "a.b"), undefined);
  });
});

describe("mergeKeys", () => {
  test("adds new keys", () => {
    const { merged, added, skipped } = mergeKeys({}, [
      { key: "home.title", text: "Welcome" },
      { key: "home.cta", text: "Get started" },
    ]);
    assert.deepEqual(merged, { home: { title: "Welcome", cta: "Get started" } });
    assert.equal(added.length, 2);
    assert.equal(skipped.length, 0);
  });

  test("skips existing string keys (never overwrites)", () => {
    const { merged, added, skipped } = mergeKeys(
      { home: { title: "Hoş geldin" } },
      [
        { key: "home.title", text: "Welcome" },        // would clobber → skip
        { key: "home.cta", text: "Get started" },      // new → add
      ],
    );
    assert.equal(merged.home.title, "Hoş geldin");
    assert.equal(merged.home.cta, "Get started");
    assert.equal(added.length, 1);
    assert.equal(skipped.length, 1);
    assert.equal(skipped[0].key, "home.title");
    assert.equal(skipped[0].existing, "Hoş geldin");
  });

  test("doesn't mutate input", () => {
    const input = { home: { title: "Hi" } };
    const snapshot = JSON.stringify(input);
    mergeKeys(input, [{ key: "home.cta", text: "Go" }]);
    assert.equal(JSON.stringify(input), snapshot);
  });

  test("handles null / undefined existing as empty", () => {
    const a = mergeKeys(null, [{ key: "x", text: "y" }]);
    assert.deepEqual(a.merged, { x: "y" });
    const b = mergeKeys(undefined, [{ key: "x", text: "y" }]);
    assert.deepEqual(b.merged, { x: "y" });
  });
});

describe("parseExtractArgs", () => {
  test("defaults", () => {
    assert.deepEqual(parseExtractArgs([]), { write: false, source: null });
  });

  test("--write turns write on", () => {
    assert.deepEqual(parseExtractArgs(["--write"]), { write: true, source: null });
  });

  test("--source= sets target file", () => {
    assert.deepEqual(parseExtractArgs(["--source=app/locales/en.json"]), {
      write: false,
      source: "app/locales/en.json",
    });
  });

  test("unknown flags are ignored", () => {
    assert.deepEqual(parseExtractArgs(["--future"]), { write: false, source: null });
  });
});

describe("lineFromOffset", () => {
  test("returns 1 for offset 0", () => {
    assert.equal(lineFromOffset("abc\ndef", 0), 1);
  });

  test("counts newlines correctly", () => {
    const code = "a\nb\nc\nd";
    assert.equal(lineFromOffset(code, 0), 1);   // 'a'
    assert.equal(lineFromOffset(code, 2), 2);   // 'b'
    assert.equal(lineFromOffset(code, 4), 3);   // 'c'
    assert.equal(lineFromOffset(code, 6), 4);   // 'd'
  });
});
