import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { detect } from "../bin/detect.mjs";
import { indexTs, files, runtimePackages, followupNotes } from "../bin/templates/expo.mjs";

describe("detect: Expo", () => {
  test("expo dep alone → expo", () => {
    const fw = detect({ dependencies: { expo: "52.0.0" } }, new Set());
    assert.equal(fw.key, "expo");
    assert.equal(fw.runtime, "react-i18next");
  });

  test("expo + react-native (Expo's normal shape) → expo (not react-native)", () => {
    const fw = detect(
      { dependencies: { expo: "52.0.0", "react-native": "0.76.0" } },
      new Set(),
    );
    assert.equal(fw.key, "expo");
  });

  test("react-native without expo stays react-native", () => {
    const fw = detect({ dependencies: { "react-native": "0.76.0" } }, new Set());
    assert.equal(fw.key, "react-native");
  });
});

describe("expo template", () => {
  test("indexTs imports expo-localization", () => {
    const code = indexTs({ defaultLocale: "en", locales: ["en", "es"] });
    assert.match(code, /from "expo-localization"/);
    assert.match(code, /getLocales\(\)/);
  });

  test("indexTs imports each locale", () => {
    const code = indexTs({ defaultLocale: "en", locales: ["en", "es", "de"] });
    assert.match(code, /import en from "\.\.\/\.\.\/messages\/en\.json"/);
    assert.match(code, /import es from "\.\.\/\.\.\/messages\/es\.json"/);
    assert.match(code, /import de from "\.\.\/\.\.\/messages\/de\.json"/);
  });

  test("indexTs uses compatibilityJSON v4 for RN/Expo", () => {
    const code = indexTs({ defaultLocale: "en", locales: ["en"] });
    assert.match(code, /compatibilityJSON: "v4"/);
  });

  test("indexTs falls back to defaultLocale when device locale unsupported", () => {
    const code = indexTs({ defaultLocale: "en", locales: ["en", "es"] });
    assert.match(code, /supported\.has\(initialLocale\) \? initialLocale : "en"/);
    assert.match(code, /fallbackLng: "en"/);
  });

  test("locale codes with dashes are sanitized for JS identifiers", () => {
    const code = indexTs({ defaultLocale: "en", locales: ["en", "zh-CN"] });
    assert.match(code, /import zh_CN from "\.\.\/\.\.\/messages\/zh-CN\.json"/);
    assert.match(code, /"zh-CN": \{ translation: zh_CN \}/);
  });

  test("files() returns src/i18n/index.ts", () => {
    const out = files({ defaultLocale: "en", locales: ["en"] });
    assert.equal(out.length, 1);
    assert.equal(out[0].path, "src/i18n/index.ts");
  });

  test("runtimePackages includes expo-localization", () => {
    assert.deepEqual(runtimePackages, ["i18next", "react-i18next", "expo-localization"]);
  });

  test("followupNotes mention Expo Router", () => {
    const notes = followupNotes();
    assert.ok(notes.some((n) => n.includes("Expo Router")));
    assert.ok(notes.some((n) => n.includes("expo-localization")));
  });
});
