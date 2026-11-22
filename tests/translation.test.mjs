import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { flatten, hash, parseLockYaml } from "../bin/helpers.mjs";

const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
const preload = `
import assert from "node:assert/strict";
import { appendFileSync, readFileSync } from "node:fs";

const replies = JSON.parse(readFileSync("replies.json", "utf8"));
let cursor = 0;
globalThis.fetch = async (url, { body, headers, method }) => {
  const request = JSON.parse(body);
  assert.equal(url, "https://api.anthropic.com/v1/messages");
  assert.equal(method, "POST");
  assert.equal(headers["x-api-key"], "simulated");
  assert.equal(headers["anthropic-version"], "2023-06-01");
  assert.deepEqual(request.tool_choice, { type: "tool", name: "emit_translations" });
  const payload = JSON.parse(request.messages[0].content.split("\\n\\nTranslate:\\n")[1]);
  appendFileSync("requests.jsonl", JSON.stringify({ model: request.model, system: request.system, user: request.messages[0].content, payload }) + "\\n");
  const reply = replies[cursor++];
  assert.ok(reply, "unexpected Anthropic call");
  if (reply.status === 429) return new Response("", { status: 429, headers: { "retry-after": "0.001" } });
  const input = reply.echo ? payload : reply.input;
  return Response.json({
    content: reply.noTool ? [] : [{ type: "tool_use", name: "emit_translations", input }],
    usage: { input_tokens: 80, output_tokens: 20 }
  });
};
`;

function fixture(t, source, locales = {}, lockSource) {
  const cwd = mkdtempSync(join(tmpdir(), "autoglot-test-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const exists = (path) => existsSync(join(cwd, path));
  const read = (path) => readFileSync(join(cwd, path), "utf8");
  function write(path, content) {
    const target = join(cwd, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  const json = (path, body) => write(path, JSON.stringify(body));
  json("messages/en.json", source);
  for (const [locale, body] of Object.entries(locales)) json(`messages/${locale}.json`, body);
  if (lockSource) {
    const hashes = Object.entries(flatten(lockSource)).map(([key, value]) => `  ${key}: ${hash(value)}`);
    write("translate.lock", ["version: 1", "source: /old/runner/messages/en.json", "hashes:", ...hashes, ""].join("\n"));
  }
  write("provider.mjs", preload);
  function run(args = [], { replies = [], key = false, ci = false } = {}) {
    const env = { ...process.env, CI: ci ? "true" : "", ANTHROPIC_API_KEY: key ? "simulated" : "", GITHUB_STEP_SUMMARY: join(cwd, "step.md") };
    json("replies.json", replies);
    rmSync(join(cwd, "requests.jsonl"), { force: true });
    return spawnSync(process.execPath, ["--import", "./provider.mjs", cli, ...args], { cwd, env, encoding: "utf8", timeout: 15000 });
  }
  const requests = () => exists("requests.jsonl") ? read("requests.jsonl").trim().split("\n").map(JSON.parse) : [];
  const lock = () => parseLockYaml(read("translate.lock"));
  const locale = (code) => JSON.parse(read(`messages/${code}.json`));
  return { run, write, json, read, exists, requests, lock, locale };
}

function passed(result) {
  assert.equal(result.status, 0, result.stderr || result.error?.message || result.stdout);
}

test("translates a flat catalog, forwards config hints, writes summaries, and skips on replay", (t) => {
  const f = fixture(t, { "home.button": "Buy now", "billing.title": "Billing", legal: { title: "Terms" } }, { es: { obsolete: "viejo" } });
  f.json("translate.config.json", {
    model: "claude-opus-4-7", glossary: ["MyApp"], namespaceContext: { home: "Page copy" }, namespaces: { billing: ["de"], legal: ["de"] }
  });
  const result = f.run(["--summary-path=report.md", "--quiet"], {
    key: true, replies: [{ input: { "home.button": "Comprar" } }]
  });
  passed(result);
  assert.doesNotMatch(result.stdout, /es\s+→/);
  assert.deepEqual(f.locale("es"), { "home.button": "Comprar" });
  assert.equal(f.lock().source, "messages/en.json");
  assert.match(f.requests()[0].system, /English into Spanish.*MyApp/);
  assert.match(f.requests()[0].user, /home: Page copy/);
  assert.deepEqual(f.requests()[0].payload, { "home.button": "Buy now" });
  assert.match(f.read("report.md"), /\| `es` \| 1 \| 80 \| 20 \| \$0\.00090/);
  assert.equal(f.read("step.md"), f.read("report.md"));
  passed(f.run(["--summary-path=report.md"]));
  assert.deepEqual(f.requests(), []);
  passed(f.run(["--check"]));
});

test("a locale-limited run keeps source changes pending for other locales", (t) => {
  const f = fixture(t, { key: "New" }, { es: { key: "Viejo" }, de: { key: "Alt" } }, { key: "Old" });
  passed(f.run(["--locales=es,es", "--summary-path=report.md"], { key: true, replies: [{ input: { key: "Nuevo" } }] }));
  assert.equal(f.requests().length, 1);
  assert.deepEqual(f.locale("es"), { key: "Nuevo" });
  assert.deepEqual(f.locale("de"), { key: "Alt" });
  assert.equal(f.lock().hashes.key, hash("Old"));
  assert.equal(f.run(["--check"]).status, 1);
  passed(f.run(["--summary-path=report.md"], { key: true, replies: [{ echo: true }, { echo: true }] }));
  assert.equal(f.requests().length, 2);
  assert.equal(f.lock().hashes.key, hash("New"));
  passed(f.run(["--check"]));
});

test("check catches deleted keys, missing translations and orphans; pruning uses zero API calls", (t) => {
  const f = fixture(t, { title: "Title", body: "Body" }, { es: { title: "Título", old: "Viejo" }, de: { title: "Titel", body: "Inhalt" } }, { title: "Title", body: "Body", old: "Old" });
  const before = f.read("translate.lock");
  const result = f.run(["--check"]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Removed source keys: old/);
  assert.match(result.stdout, /Locales needing updates: es/);
  assert.equal(f.read("translate.lock"), before);
  f.json("messages/es.json", { title: "Título", old: "Viejo", body: "Texto" });
  passed(f.run(["--summary-path=report.md"]));
  assert.deepEqual(f.locale("es"), { title: "Título", body: "Texto" });
  assert.equal(f.lock().hashes.old, undefined);
  assert.deepEqual(f.requests(), []);
  passed(f.run(["--check"]));
});

test("dry-run makes no network requests or catalog writes, and CI keeps verbose logs", (t) => {
  const f = fixture(t, { key: "Hello" }, { es: {} });
  const result = f.run(["--dry-run", "--quiet", "--summary-path=plan.md"], { ci: true });
  passed(result);
  assert.match(result.stdout, /es\s+→ 1 keys \(dry-run\)/);
  assert.match(f.read("plan.md"), /dry-run/);
  assert.equal(f.exists("translate.lock"), false);
  assert.equal(f.exists("step.md"), false);
  assert.deepEqual(f.locale("es"), {});
  assert.deepEqual(f.requests(), []);
  assert.equal(f.run([]).status, 1);
});

test("retries throttling and invalid placeholders, totals paid responses and protects unchanged entries", (t) => {
  const f = fixture(t, { key: "Hello {name}", keep: "Keep" }, { es: { keep: "Conservar" } }, { keep: "Keep" });
  const result = f.run(["--summary-path=report.md"], {
    key: true, replies: [{ status: 429 }, { input: { key: "Hola" } }, { input: { key: "Hola {name}", keep: "Cambiar" } }]
  });
  passed(result);
  assert.match(result.stderr, /rate limited \(429\)/);
  assert.deepEqual(f.locale("es"), { key: "Hola {name}", keep: "Conservar" });
  assert.match(f.read("report.md"), /\| `es` \| 1 \| 160 \| 40 \|/);
  assert.equal(f.requests().length, 3);
});

test("retries missing tool calls and never records repeated omissions or literal escaped newlines as done", (t) => {
  const f = fixture(t, { key: "First\nSecond" }, { es: {} });
  for (const [error, replies] of [
    [/omitted a translation/, [{ noTool: true }, { input: {} }]],
    [/newline mismatch/, [{ input: { key: "Primero\\nSegundo" } }, { input: { key: "Primero\\nSegundo" } }]]
  ]) {
    const result = f.run([], { key: true, replies });
    assert.equal(result.status, 1);
    assert.match(result.stderr, error);
    assert.equal(f.requests().length, 2);
    assert.equal(f.exists("translate.lock"), false);
    assert.deepEqual(f.locale("es"), {});
  }
  passed(f.run(["--summary-path=report.md"], { key: true, replies: [{ input: { key: "Primero\nSegundo" } }] }));
  assert.equal(f.locale("es").key, "Primero\nSegundo");
});

test("chunks large catalogs and supports locale creation, non-English source and path overrides", (t) => {
  const f = fixture(t, {});
  const source = Object.fromEntries(Array.from({ length: 201 }, (_, i) => [`key${i}`, `Wert ${i}`]));
  f.json("i18n/de.json", source);
  const args = ["--source=i18n/de.json", "--messages-dir=i18n", "--lock-file=state/current.lock"];
  const result = f.run([...args, "--locales=es-419", "--summary-path=report.md"], { key: true, replies: [{ echo: true }, { echo: true }] });
  passed(result);
  assert.deepEqual(f.requests().map(({ payload }) => Object.keys(payload).length), [200, 1]);
  assert.match(f.requests()[0].system, /German into Latin American Spanish/);
  assert.deepEqual(JSON.parse(f.read("i18n/es-419.json")), source);
  assert.match(f.read("state/current.lock"), /source: \.\.\/i18n\/de\.json/);
  assert.equal(f.run([...args, "--locales=de", "--dry-run"]).status, 1);
});

test("imports only the selected Languine catalog and recognizes escaped dotted keys", (t) => {
  const f = fixture(t, { key: "Hello", "home.welcome title": "Welcome" }, { es: { key: "Hola", "home.welcome title": "Bienvenida" } });
  f.write("languine.lock", [
    "version: 1",
    "files:",
    "  messages/en.json:",
    `    key: ${hash("Hello")}`,
    `    home\\.welcome title: ${hash("Welcome")}`,
    "  other/en.json:",
    `    key: ${hash("Unrelated")}`,
    ""
  ].join("\n"));
  passed(f.run(["--import-languine"]));
  assert.deepEqual(f.lock().hashes, { key: hash("Hello"), "home.welcome title": hash("Welcome") });
  passed(f.run(["--check"]));
  const before = f.read("translate.lock");
  const mismatched = f.run(["--import-languine", "--source=another/en.json"]);
  assert.equal(mismatched.status, 1);
  assert.match(mismatched.stderr, /No entry.*matches/);
  assert.equal(f.read("translate.lock"), before);
});
