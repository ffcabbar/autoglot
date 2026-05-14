import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseInitArgs } from "../bin/init.mjs";

describe("parseInitArgs", () => {
  test("defaults: install off, pm null", () => {
    assert.deepEqual(parseInitArgs([]), { install: false, installExplicit: false, pm: null });
  });

  test("--install turns install on and marks explicit", () => {
    assert.deepEqual(parseInitArgs(["--install"]), { install: true, installExplicit: true, pm: null });
  });

  test("--no-install marks explicit and keeps install off", () => {
    assert.deepEqual(parseInitArgs(["--no-install"]), { install: false, installExplicit: true, pm: null });
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
    assert.deepEqual(parseInitArgs(["--install", "--pm=pnpm"]), {
      install: true,
      installExplicit: true,
      pm: "pnpm",
    });
  });

  test("unknown flags are ignored (forward-compat)", () => {
    assert.deepEqual(parseInitArgs(["--future-flag"]), { install: false, installExplicit: false, pm: null });
  });
});
