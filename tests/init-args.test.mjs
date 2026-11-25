import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseInitArgs } from "../bin/init.mjs";

const CLI = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));

describe("parseInitArgs", () => {
  test("defaults: install off, pm null", () => {
    assert.deepEqual(parseInitArgs([]), { install: false, installExplicit: false, pm: null, locales: null });
  });

  test("--install turns install on and marks explicit", () => {
    assert.deepEqual(parseInitArgs(["--install"]), { install: true, installExplicit: true, pm: null, locales: null });
  });

  test("--no-install marks explicit and keeps install off", () => {
    assert.deepEqual(parseInitArgs(["--no-install"]), { install: false, installExplicit: true, pm: null, locales: null });
  });

  test("--pm=pnpm sets pm", () => {
    assert.equal(parseInitArgs(["--pm=pnpm"]).pm, "pnpm");
    assert.equal(parseInitArgs(["--pm=bun"]).pm, "bun");
    assert.equal(parseInitArgs(["--pm=yarn"]).pm, "yarn");
    assert.equal(parseInitArgs(["--pm=npm"]).pm, "npm");
  });

  test("unknown --pm value is ignored", () => {
    assert.equal(parseInitArgs(["--pm=cargo"]).pm, null);
  });

  test("combines flags", () => {
    assert.deepEqual(parseInitArgs(["--install", "--pm=pnpm", "--locales=de, pt-BR, de"]), {
      install: true,
      installExplicit: true,
      pm: "pnpm",
      locales: ["de", "pt-BR"],
    });
  });

  test("unknown flags are ignored (forward-compat)", () => {
    assert.deepEqual(parseInitArgs(["--future-flag"]), { install: false, installExplicit: false, pm: null, locales: null });
  });
});

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), "autoglot-init-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  return cwd;
}

function runInit(cwd, ...args) {
  const result = spawnSync(process.execPath, [CLI, "init", ...args], {
    cwd,
    env: { ...process.env, CI: "true" },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 5000,
  });
  assert.ifError(result.error);
  return result;
}

test("init --locales scaffolds with closed stdin and preserves existing files across runs", (t) => {
  const cwd = fixture(t);
  const originalGerman = '{"welcome":"Willkommen"}\n';
  const originalWorkflow = "name: Existing workflow\n";
  writeFileSync(join(cwd, "package.json"), JSON.stringify({
    dependencies: { react: "*" },
    devDependencies: { vite: "*" },
  }));
  mkdirSync(join(cwd, "messages"));
  mkdirSync(join(cwd, ".github", "workflows"), { recursive: true });
  writeFileSync(join(cwd, "messages", "de.json"), originalGerman);
  writeFileSync(join(cwd, ".github", "workflows", "translate.yml"), originalWorkflow);

  const first = runInit(cwd, "--locales=de,pt-BR,new");
  assert.equal(first.status, 0, first.stderr);
  assert.doesNotMatch(first.stdout, /Which target locales|Add another locale|Proceed\?|Install runtime packages now|Installing with/);
  assert.deepEqual(readdirSync(join(cwd, "messages")).sort(), ["de.json", "en.json", "new.json", "pt-BR.json"]);
  assert.equal(readFileSync(join(cwd, "messages", "pt-BR.json"), "utf8"), "{}\n");
  const generated = readFileSync(join(cwd, "src", "i18n.ts"), "utf8");
  assert.match(generated, /"pt-BR": \{ translation: locale_pt_BR \}/);
  assert.match(generated, /import locale_new from "\.\.\/messages\/new\.json"/);
  assert.equal(JSON.parse(readFileSync(join(cwd, "translate.config.json"), "utf8")).source, "messages/en.json");

  const second = runInit(cwd, "--locales=de,pt-BR,new");
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /Wrote 0 files, skipped 7 existing files/);
  assert.equal(readFileSync(join(cwd, "messages", "de.json"), "utf8"), originalGerman);
  assert.equal(readFileSync(join(cwd, ".github", "workflows", "translate.yml"), "utf8"), originalWorkflow);
});

test("init --locales rejects invalid lists before creating files", (t) => {
  const cwd = fixture(t);
  for (const flag of ["--locales", "--locales=", "--locales=de,", "--locales=en,de", "--locales=de,../fr"]) {
    const result = runInit(cwd, flag);
    assert.equal(result.status, 1, flag);
    assert.match(result.stderr, /expected target locale codes/);
    assert.deepEqual(readdirSync(cwd), []);
  }
});
