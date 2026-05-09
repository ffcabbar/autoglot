import { describe, test } from "node:test";
import assert from "node:assert/strict";
import * as common from "../bin/templates/common.mjs";
import * as nextApp from "../bin/templates/nextjs-app-router.mjs";
import * as nextPages from "../bin/templates/nextjs-pages-router.mjs";
import * as rn from "../bin/templates/react-native.mjs";
import * as vite from "../bin/templates/vite-react.mjs";
import * as vue from "../bin/templates/vue-i18n.mjs";

describe("common templates", () => {
  test("workflow uses default messagesDir", () => {
    const w = common.workflow();
    assert.match(w, /paths:\s+- messages\/en\.json/);
    assert.match(w, /uses: ffcabbar\/autoglot@v1/);
    assert.match(w, /anthropic-api-key: \$\{\{ secrets\.ANTHROPIC_API_KEY \}\}/);
  });

  test("workflow honors custom messagesDir", () => {
    const w = common.workflow({ messagesDir: "i18n" });
    assert.match(w, /paths:\s+- i18n\/en\.json/);
  });

  test("translateConfig is valid JSON with sensible defaults", () => {
    const cfg = JSON.parse(common.translateConfig());
    assert.equal(cfg.source, "messages/en.json");
    assert.equal(cfg.messagesDir, "messages");
    assert.equal(cfg.lockFile, "translate.lock");
    assert.equal(cfg.model, "claude-haiku-4-5");
    assert.deepEqual(cfg.glossary, []);
  });

  test("translateConfig overrides", () => {
    const cfg = JSON.parse(
      common.translateConfig({ model: "claude-sonnet-4-6", glossary: ["MyApp"] }),
    );
    assert.equal(cfg.model, "claude-sonnet-4-6");
    assert.deepEqual(cfg.glossary, ["MyApp"]);
  });

  test("exampleEnJson parses and has nested keys", () => {
    const ex = JSON.parse(common.exampleEnJson());
    assert.equal(typeof ex.home.title, "string");
    assert.equal(typeof ex.common.appName, "string");
  });

  test("emptyLocale is parseable", () => {
    assert.deepEqual(JSON.parse(common.emptyLocale()), {});
  });
});

describe("next-intl App Router template", () => {
  const ctx = {
    defaultLocale: "en",
    locales: ["en", "es", "de"],
    hasExistingApp: false,
  };

  test("routing.ts contains the locale array", () => {
    const r = nextApp.routingTs(ctx);
    assert.match(r, /locales: \["en","es","de"\]/);
    assert.match(r, /defaultLocale: "en"/);
    assert.match(r, /from "next-intl\/routing"/);
  });

  test("request.ts imports from next-intl/server", () => {
    const r = nextApp.requestTs();
    assert.match(r, /from "next-intl\/server"/);
    assert.match(r, /requestLocale/);
  });

  test("middleware.ts wires createMiddleware(routing)", () => {
    const m = nextApp.middlewareTs();
    assert.match(m, /createMiddleware\(routing\)/);
    assert.match(m, /matcher:/);
  });

  test("files() returns 5 files for fresh app", () => {
    const fs = nextApp.files({ ...ctx, hasExistingApp: false });
    const paths = fs.map((f) => f.path);
    assert.deepEqual(paths.sort(), [
      "src/app/[locale]/layout.tsx",
      "src/app/[locale]/page.tsx",
      "src/i18n/request.ts",
      "src/i18n/routing.ts",
      "src/middleware.ts",
    ]);
  });

  test("files() returns only 3 files when app already exists", () => {
    const fs = nextApp.files({ ...ctx, hasExistingApp: true });
    assert.equal(fs.length, 3);
    assert.ok(fs.every((f) => !f.path.startsWith("src/app/[locale]")));
  });

  test("runtimePackages includes next-intl", () => {
    assert.deepEqual(nextApp.runtimePackages, ["next-intl"]);
  });

  test("followupNotes differs based on existing app", () => {
    const a = nextApp.followupNotes({ hasExistingApp: true });
    const b = nextApp.followupNotes({ hasExistingApp: false });
    assert.ok(a.some((n) => /did NOT migrate/i.test(n)));
    assert.ok(b.some((n) => /try `npm run dev`/i.test(n)));
  });
});

describe("react-native template", () => {
  const ctx = { defaultLocale: "en", locales: ["en", "es", "tr"] };

  test("indexTs imports each locale", () => {
    const t = rn.indexTs(ctx);
    assert.match(t, /import en from "\.\.\/\.\.\/messages\/en\.json"/);
    assert.match(t, /import es from "\.\.\/\.\.\/messages\/es\.json"/);
    assert.match(t, /import tr from "\.\.\/\.\.\/messages\/tr\.json"/);
  });

  test("indexTs registers initReactI18next + compatibilityJSON v4", () => {
    const t = rn.indexTs(ctx);
    assert.match(t, /initReactI18next/);
    assert.match(t, /compatibilityJSON: "v4"/);
    assert.match(t, /lng: "en"/);
  });

  test("locale codes with dashes are sanitized for JS identifiers", () => {
    const t = rn.indexTs({ defaultLocale: "en", locales: ["en", "zh-CN"] });
    assert.match(t, /import zh_CN from/);
    assert.match(t, /"zh-CN": \{ translation: zh_CN \}/);
  });

  test("files() returns one file at src/i18n/index.ts", () => {
    const fs = rn.files(ctx);
    assert.equal(fs.length, 1);
    assert.equal(fs[0].path, "src/i18n/index.ts");
  });

  test("runtimePackages = i18next + react-i18next", () => {
    assert.deepEqual(rn.runtimePackages, ["i18next", "react-i18next"]);
  });
});

describe("vite-react template", () => {
  const ctx = { defaultLocale: "en", locales: ["en", "fr"] };

  test("i18nTs imports from ../messages/", () => {
    const t = vite.i18nTs(ctx);
    assert.match(t, /import en from "\.\.\/messages\/en\.json"/);
    assert.match(t, /import fr from "\.\.\/messages\/fr\.json"/);
  });

  test("file is at src/i18n.ts", () => {
    assert.equal(vite.files(ctx)[0].path, "src/i18n.ts");
  });
});

describe("vue-i18n template", () => {
  const ctx = { defaultLocale: "en", locales: ["en", "ja"] };

  test("createI18n with composition API mode", () => {
    const t = vue.i18nTs(ctx);
    assert.match(t, /createI18n/);
    assert.match(t, /legacy: false/);
    assert.match(t, /locale: "en"/);
  });

  test("file is at src/i18n.ts", () => {
    assert.equal(vue.files(ctx)[0].path, "src/i18n.ts");
  });

  test("runtimePackages = vue-i18n only", () => {
    assert.deepEqual(vue.runtimePackages, ["vue-i18n"]);
  });
});

describe("nextjs-pages-router template", () => {
  const ctx = { defaultLocale: "en", locales: ["en", "es", "de"] };

  test("scaffolds no files (manual wiring)", () => {
    assert.deepEqual(nextPages.files(ctx), []);
  });

  test("recommends next-i18next", () => {
    assert.deepEqual(nextPages.runtimePackages, ["next-i18next", "react-i18next", "i18next"]);
  });

  test("followupNotes mention next.config.js i18n block", () => {
    const notes = nextPages.followupNotes(ctx);
    assert.ok(notes.some((n) => /next\.config\.js/i.test(n)));
    assert.ok(notes.some((n) => /appWithTranslation/i.test(n)));
    assert.ok(notes.some((n) => /serverSideTranslations/i.test(n)));
  });
});
