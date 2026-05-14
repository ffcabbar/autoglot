// Package manager detection + install command construction.
// Pure helpers (no I/O) plus one thin filesystem wrapper for the CLI.

import { existsSync } from "node:fs";
import { join } from "node:path";

export const PACKAGE_MANAGERS = ["npm", "yarn", "pnpm", "bun"];

/**
 * Decide which package manager a project uses from its lockfile presence.
 * Precedence: bun > pnpm > yarn > npm (most distinctive first).
 *
 * Pure function — takes the set of lockfile names that exist, returns a name.
 * Use `detectPackageManager(cwd)` for the filesystem wrapper.
 *
 * @param {Set<string>} lockfiles e.g. new Set(["pnpm-lock.yaml"])
 * @returns {"npm" | "yarn" | "pnpm" | "bun"}
 */
export function detectFromLockfiles(lockfiles) {
  if (lockfiles.has("bun.lockb") || lockfiles.has("bun.lock")) return "bun";
  if (lockfiles.has("pnpm-lock.yaml")) return "pnpm";
  if (lockfiles.has("yarn.lock")) return "yarn";
  // package-lock.json or nothing → npm (safe default; ships with Node).
  return "npm";
}

/** Filesystem wrapper around detectFromLockfiles. */
export function detectPackageManager(cwd) {
  const candidates = ["bun.lockb", "bun.lock", "pnpm-lock.yaml", "yarn.lock", "package-lock.json"];
  const present = new Set();
  for (const f of candidates) {
    if (existsSync(join(cwd, f))) present.add(f);
  }
  return detectFromLockfiles(present);
}

/**
 * Build the install command tokens for a package manager.
 * Returns [bin, ...args] suitable for spawn().
 *
 * @param {"npm" | "yarn" | "pnpm" | "bun"} pm
 * @param {string[]} packages e.g. ["i18next", "react-i18next"]
 * @returns {string[]}
 */
export function installCommand(pm, packages) {
  switch (pm) {
    case "yarn":
      return ["yarn", "add", ...packages];
    case "pnpm":
      return ["pnpm", "add", ...packages];
    case "bun":
      return ["bun", "add", ...packages];
    case "npm":
    default:
      return ["npm", "install", ...packages];
  }
}
