import { describe, test } from "node:test";
import assert from "node:assert/strict";
import * as common from "../bin/templates/common.mjs";
import * as nextApp from "../bin/templates/nextjs-app-router.mjs";

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
