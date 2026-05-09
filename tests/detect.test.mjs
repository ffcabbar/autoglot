import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { detect } from "../bin/detect.mjs";

describe("detect", () => {
  test("React Native takes precedence over Next", () => {
    const fw = detect(
      { dependencies: { "react-native": "0.74.0", next: "15.0.0" } },
      new Set(["src/app"]),
    );
    assert.equal(fw.key, "react-native");
    assert.equal(fw.runtime, "react-i18next");
  });

  test("Next.js with src/app is App Router", () => {
    const fw = detect(
      { dependencies: { next: "15.5.9" } },
      new Set(["src/app"]),
    );
    assert.equal(fw.key, "nextjs-app");
    assert.equal(fw.runtime, "next-intl");
  });

  test("Next.js with only src/pages is Pages Router", () => {
    const fw = detect(
      { dependencies: { next: "14.0.0" } },
      new Set(["src/pages"]),
    );
    assert.equal(fw.key, "nextjs-pages");
  });

  test("Next.js with neither src/app nor src/pages defaults to App Router", () => {
    const fw = detect({ dependencies: { next: "15.0.0" } }, new Set());
    assert.equal(fw.key, "nextjs-app");
  });

  test("Vue / Nuxt detected", () => {
    const fw = detect({ dependencies: { vue: "3.4.0" } }, new Set());
    assert.equal(fw.key, "vue");
    assert.equal(fw.runtime, "vue-i18n");
  });

  test("Vite + React detected", () => {
    const fw = detect(
      { dependencies: { react: "19.0.0" }, devDependencies: { vite: "5.0.0" } },
      new Set(),
    );
    assert.equal(fw.key, "vite-react");
    assert.equal(fw.runtime, "react-i18next");
  });

  test("Empty package.json → generic", () => {
    const fw = detect({}, new Set());
    assert.equal(fw.key, "generic");
    assert.equal(fw.runtime, null);
  });

  test("Reads from devDependencies as well", () => {
    const fw = detect({ devDependencies: { next: "15.0.0" } }, new Set(["app"]));
    assert.equal(fw.key, "nextjs-app");
  });
});
