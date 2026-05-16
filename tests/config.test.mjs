import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, isAbsolute } from "node:path";
import {
  findConfig,
  findRepoRoot,
  resolveAgainst,
  loadConfig,
  resolvePaths,
  parseSharedFlags,
} from "../bin/config.mjs";

const SCRATCH = mkdtempSync(join(tmpdir(), "autoglot-config-"));

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

describe("findConfig", () => {
  test("finds config in current directory", () => {
    const dir = join(SCRATCH, "f1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "translate.config.json"), "{}");
    assert.equal(findConfig(dir), join(dir, "translate.config.json"));
  });

  test("walks up to find config in parent directory", () => {
    const root = join(SCRATCH, "f2");
    const sub = join(root, "apps", "mobile");
    mkdirSync(sub, { recursive: true });
    writeFileSync(join(root, "translate.config.json"), "{}");
    assert.equal(findConfig(sub), join(root, "translate.config.json"));
  });

  test("stops walking up at .git boundary", () => {
    const repo = join(SCRATCH, "f3");
    const outside = join(SCRATCH, "f3-outside");
    const sub = join(repo, "apps", "mobile");
    mkdirSync(sub, { recursive: true });
    mkdirSync(outside, { recursive: true });
    mkdirSync(join(repo, ".git"));
    writeFileSync(join(outside, "translate.config.json"), "{}");
    // outside/translate.config.json exists but is past the .git boundary.
    assert.equal(findConfig(sub), null);
  });

  test("returns null when no config exists", () => {
    const dir = join(SCRATCH, "f4");
    mkdirSync(dir, { recursive: true });
    assert.equal(findConfig(dir), null);
  });
});

describe("findRepoRoot", () => {
  test("walks up to .git directory", () => {
    const root = join(SCRATCH, "r1");
    const sub = join(root, "apps", "mobile");
    mkdirSync(sub, { recursive: true });
    mkdirSync(join(root, ".git"));
    assert.equal(findRepoRoot(sub), root);
  });

  test("returns null outside a git repo", () => {
    const dir = join(SCRATCH, "r2");
    mkdirSync(dir, { recursive: true });
    assert.equal(findRepoRoot(dir), null);
  });
});

describe("resolveAgainst", () => {
  test("absolute paths pass through", () => {
    // Use a platform-native absolute path so the assertion holds on
    // Windows too (where /usr/foo would gain a drive letter via path.resolve).
    const abs = resolve("/usr/foo");
    assert.equal(resolveAgainst("/tmp", abs), abs);
  });
  test("relative paths resolve against base", () => {
    const base = resolve("/tmp/base");
    const out = resolveAgainst(base, "messages/en.json");
    assert.ok(isAbsolute(out), `expected absolute path, got ${out}`);
    assert.equal(out, resolve(base, "messages/en.json"));
  });
});

describe("loadConfig", () => {
  test("resolves source/messagesDir/lockFile against config directory", () => {
    const dir = join(SCRATCH, "l1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "translate.config.json"),
      JSON.stringify({
        source: "messages/en.json",
        messagesDir: "messages",
        lockFile: "translate.lock",
      }),
    );
    const cfg = loadConfig(join(dir, "translate.config.json"));
    assert.equal(cfg.source, join(dir, "messages/en.json"));
    assert.equal(cfg.messagesDir, join(dir, "messages"));
    assert.equal(cfg.lockFile, join(dir, "translate.lock"));
  });

  test("absolute config values stay absolute", () => {
    const dir = join(SCRATCH, "l2");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "translate.config.json"),
      JSON.stringify({ source: "/abs/path/en.json" }),
    );
    const cfg = loadConfig(join(dir, "translate.config.json"));
    assert.equal(cfg.source, "/abs/path/en.json");
  });

  test("missing file returns null (not throw)", () => {
    assert.equal(loadConfig(join(SCRATCH, "nope.json")), null);
  });
});

describe("resolvePaths (monorepo scenario from issues #3/#4)", () => {
  test("invoking from app subdir uses config-relative paths", () => {
    // apps/mobile/translate.config.json says { source: "messages/en.json" }
    // CWD is apps/mobile → source must resolve to apps/mobile/messages/en.json
    const repo = join(SCRATCH, "mono1");
    const app = join(repo, "apps", "mobile");
    mkdirSync(join(app, "messages"), { recursive: true });
    mkdirSync(join(repo, ".git"));
    writeFileSync(
      join(app, "translate.config.json"),
      JSON.stringify({ source: "messages/en.json", messagesDir: "messages" }),
    );
    writeFileSync(join(app, "messages", "en.json"), "{}");
    const out = resolvePaths({}, app);
    assert.equal(out.source, join(app, "messages/en.json"));
    assert.equal(out.messagesDir, join(app, "messages"));
  });

  test("invoking from anywhere in repo finds nearest config and resolves correctly", () => {
    // Run from apps/mobile/src/components → should find apps/mobile/translate.config.json
    const repo = join(SCRATCH, "mono2");
    const app = join(repo, "apps", "mobile");
    const deep = join(app, "src", "components");
    mkdirSync(deep, { recursive: true });
    mkdirSync(join(repo, ".git"));
    writeFileSync(
      join(app, "translate.config.json"),
      JSON.stringify({ source: "messages/en.json" }),
    );
    const out = resolvePaths({}, deep);
    assert.equal(out.source, join(app, "messages/en.json"));
  });

  test("CLI --source overrides config and resolves against CWD", () => {
    const repo = join(SCRATCH, "mono3");
    const app = join(repo, "apps", "mobile");
    mkdirSync(app, { recursive: true });
    writeFileSync(
      join(app, "translate.config.json"),
      JSON.stringify({ source: "messages/en.json" }),
    );
    const out = resolvePaths({ source: "custom/en.json" }, app);
    assert.equal(out.source, join(app, "custom/en.json"));
  });

  test("CLI --config flag is honored", () => {
    const repo = join(SCRATCH, "mono4");
    const a = join(repo, "a");
    const b = join(repo, "b");
    mkdirSync(a, { recursive: true });
    mkdirSync(b, { recursive: true });
    writeFileSync(join(b, "custom.json"), JSON.stringify({ source: "msg/en.json" }));
    const out = resolvePaths({ config: join(b, "custom.json") }, a);
    assert.equal(out.configPath, join(b, "custom.json"));
    assert.equal(out.source, join(b, "msg/en.json"));
  });

  test("no config anywhere → falls back to CWD-relative defaults", () => {
    const dir = join(SCRATCH, "no-cfg");
    mkdirSync(dir, { recursive: true });
    const out = resolvePaths({}, dir);
    assert.equal(out.configPath, null);
    assert.equal(out.source, resolve(dir, "messages/en.json"));
    assert.equal(out.messagesDir, resolve(dir, "messages"));
  });
});

describe("parseSharedFlags", () => {
  test("extracts --source=... and positional args", () => {
    const out = parseSharedFlags(["tr", "--source=msg/en.json", "ja"]);
    assert.deepEqual(out.positional, ["tr", "ja"]);
    assert.equal(out.args.source, "msg/en.json");
  });

  test("boolean flag without value", () => {
    const out = parseSharedFlags(["--quiet"]);
    assert.equal(out.args.quiet, true);
  });

  test("all four shared flags", () => {
    const out = parseSharedFlags([
      "--source=a.json",
      "--messages-dir=m",
      "--lock-file=l.lock",
      "--config=c.json",
    ]);
    assert.equal(out.args.source, "a.json");
    assert.equal(out.args["messages-dir"], "m");
    assert.equal(out.args["lock-file"], "l.lock");
    assert.equal(out.args.config, "c.json");
  });
});
