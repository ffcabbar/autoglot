import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  isLikelyUserFacing,
  extractCandidates,
  suggestKey,
  setNested,
  getNested,
  mergeKeys,
  detectShapeConflict,
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

describe("isLikelyUserFacing — TS-heavy false positives (issue #6)", () => {
  test("rejects TS generic body splash", () => {
    // useState<T | null>(null) → regex catches "(null); const useFoo = useRef"
    assert.equal(isLikelyUserFacing("(null); const sessionElapsedRef = useRef"), false);
  });

  test("rejects bare type names", () => {
    assert.equal(isLikelyUserFacing("Promise"), false);
    assert.equal(isLikelyUserFacing("void"), false);
    assert.equal(isLikelyUserFacing("ReactNode"), false);
    assert.equal(isLikelyUserFacing("StyleProp"), false);
    assert.equal(isLikelyUserFacing("SharedValue"), false);
    assert.equal(isLikelyUserFacing("React.FunctionComponent"), false);
  });

  test("rejects comparison expressions", () => {
    assert.equal(isLikelyUserFacing("= 0 && index"), false);
    assert.equal(isLikelyUserFacing("= 13 && parsedAge"), false);
    assert.equal(isLikelyUserFacing("= sentences[i].startTime && position"), false);
  });

  test("rejects intersection / union type fragments", () => {
    assert.equal(isLikelyUserFacing("& React.FunctionComponent"), false);
    assert.equal(isLikelyUserFacing("; readonly cornerSmoothing?: number | SharedValue"), false);
    assert.equal(isLikelyUserFacing("void; width?: number | string; height?: number"), false);
  });

  test("keeps real user copy that contains common words", () => {
    assert.equal(isLikelyUserFacing("Get started"), true);
    assert.equal(isLikelyUserFacing("Welcome back"), true);
    assert.equal(isLikelyUserFacing("Please enter your email"), true);
    assert.equal(isLikelyUserFacing("Submit"), true);
  });

  test("rejects camelCase identifiers leaked from code", () => {
    // "submitBtn", "eStatusCompleted" — camelCase = code, not copy
    assert.equal(isLikelyUserFacing("submitBtn"), false);
    assert.equal(isLikelyUserFacing("eStatusCompleted"), false);
  });
});

describe("suggestKey — path sanitization (issue #8)", () => {
  test("strips Expo Router (group) parentheses", () => {
    // (onboarding)/age.tsx → onboarding.age.<word>
    assert.equal(suggestKey("How old are you?", "src/app/(onboarding)/age.tsx"), "onboarding.age.howOldAre");
  });

  test("strips _layout suffix (Expo Router)", () => {
    assert.equal(suggestKey("Back", "src/app/(auth)/_layout.tsx"), "auth.back");
  });

  test("dashed path segments become camelCase", () => {
    // services/journal-upload.ts → services.journalUpload.<word>
    assert.equal(suggestKey("Upload failed", "src/services/journal-upload.ts"), "journalUpload.uploadFailed");
  });

  test("digit-leading text gets _ prefix", () => {
    assert.equal(suggestKey("13 years old", "src/app/page.tsx"), "_13YearsOld");
  });

  test("namespace strips hooks/services/utils prefixes", () => {
    assert.equal(suggestKey("Profile", "src/hooks/useProfile.ts"), "useProfile.profile");
  });

  test("complex Expo path", () => {
    // (onboarding)/age.tsx with TS generic noise — should still produce clean key
    assert.equal(suggestKey("Enter your age", "src/app/(onboarding)/age.tsx"), "onboarding.age.enterYourAge");
  });
});

describe("detectShapeConflict (issue #7)", () => {
  test("returns null for free space", () => {
    assert.equal(detectShapeConflict({}, "a.b.c"), null);
    assert.equal(detectShapeConflict({ other: "x" }, "a.b"), null);
  });

  test("returns null when target already exists as a string (handled as 'skip')", () => {
    assert.equal(detectShapeConflict({ a: "value" }, "a"), null);
    assert.equal(detectShapeConflict({ a: { b: "val" } }, "a.b"), null);
  });

  test("detects leaf-vs-namespace (ancestor is string)", () => {
    // a is "leaf" string; writing a.b would replace string with object
    assert.equal(detectShapeConflict({ a: "leaf" }, "a.b"), "leaf-vs-namespace");
    assert.equal(detectShapeConflict({ a: { b: "leaf" } }, "a.b.c"), "leaf-vs-namespace");
  });

  test("detects namespace-vs-leaf (target is object)", () => {
    // The exact regression from issue #7: settings.language is an object,
    // candidate wants to write settings.language as a string.
    const existing = {
      settings: {
        language: { title: "Language", setTo: "Set to {name}" },
      },
    };
    assert.equal(detectShapeConflict(existing, "settings.language"), "namespace-vs-leaf");
  });
});

describe("mergeKeys — refuses shape collisions (issue #7)", () => {
  test("preserves existing namespace, reports conflict", () => {
    const existing = {
      settings: {
        language: {
          title: "Language",
          setTo: "Language set to {name}",
          updateFailed: "Failed to update language",
        },
      },
    };
    const { merged, added, conflicts } = mergeKeys(existing, [
      { key: "settings.language", text: "Language" },
    ]);
    // Crucial: existing object is intact, NOT replaced by "Language"
    assert.deepEqual(merged.settings.language, existing.settings.language);
    assert.equal(added.length, 0);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].kind, "namespace-vs-leaf");
  });

  test("blocks leaf-vs-namespace too", () => {
    const existing = { a: "leaf" };
    const { merged, added, conflicts } = mergeKeys(existing, [
      { key: "a.b", text: "would replace" },
    ]);
    assert.equal(merged.a, "leaf");
    assert.equal(added.length, 0);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].kind, "leaf-vs-namespace");
  });

  test("non-colliding candidates still write", () => {
    const existing = { settings: { language: { title: "Language" } } };
    const { merged, added, conflicts } = mergeKeys(existing, [
      { key: "settings.language", text: "Language" },     // conflict
      { key: "home.title", text: "Welcome" },              // ok
    ]);
    assert.equal(merged.home.title, "Welcome");
    assert.deepEqual(merged.settings.language, existing.settings.language);
    assert.equal(added.length, 1);
    assert.equal(conflicts.length, 1);
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
