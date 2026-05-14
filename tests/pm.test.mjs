import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { detectFromLockfiles, installCommand } from "../bin/pm.mjs";

describe("detectFromLockfiles", () => {
  test("bun.lockb → bun", () => {
    assert.equal(detectFromLockfiles(new Set(["bun.lockb"])), "bun");
  });

  test("bun.lock (text variant) → bun", () => {
    assert.equal(detectFromLockfiles(new Set(["bun.lock"])), "bun");
  });

  test("pnpm-lock.yaml → pnpm", () => {
    assert.equal(detectFromLockfiles(new Set(["pnpm-lock.yaml"])), "pnpm");
  });

  test("yarn.lock → yarn", () => {
    assert.equal(detectFromLockfiles(new Set(["yarn.lock"])), "yarn");
  });

  test("package-lock.json → npm", () => {
    assert.equal(detectFromLockfiles(new Set(["package-lock.json"])), "npm");
  });

  test("nothing → npm (safe default)", () => {
    assert.equal(detectFromLockfiles(new Set()), "npm");
  });

  test("bun beats pnpm beats yarn beats npm when multiple lockfiles exist", () => {
    assert.equal(
      detectFromLockfiles(new Set(["bun.lockb", "pnpm-lock.yaml", "yarn.lock", "package-lock.json"])),
      "bun",
    );
    assert.equal(
      detectFromLockfiles(new Set(["pnpm-lock.yaml", "yarn.lock", "package-lock.json"])),
      "pnpm",
    );
    assert.equal(
      detectFromLockfiles(new Set(["yarn.lock", "package-lock.json"])),
      "yarn",
    );
  });
});

describe("installCommand", () => {
  test("npm uses `install`", () => {
    assert.deepEqual(installCommand("npm", ["next-intl"]), ["npm", "install", "next-intl"]);
  });

  test("yarn uses `add`", () => {
    assert.deepEqual(installCommand("yarn", ["next-intl"]), ["yarn", "add", "next-intl"]);
  });

  test("pnpm uses `add`", () => {
    assert.deepEqual(installCommand("pnpm", ["next-intl"]), ["pnpm", "add", "next-intl"]);
  });

  test("bun uses `add`", () => {
    assert.deepEqual(installCommand("bun", ["next-intl"]), ["bun", "add", "next-intl"]);
  });

  test("supports multiple packages", () => {
    assert.deepEqual(
      installCommand("pnpm", ["i18next", "react-i18next"]),
      ["pnpm", "add", "i18next", "react-i18next"],
    );
  });

  test("unknown pm falls back to npm", () => {
    // Defensive — TypeScript would forbid this, but JS callers might.
    assert.deepEqual(installCommand("unknown", ["x"]), ["npm", "install", "x"]);
  });
});
