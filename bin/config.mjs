// Shared config loading + path resolution used by add / doctor / translate.
//
// Two-axis path resolution:
//   - CLI flags resolve against CWD (POSIX convention).
//   - Config file values resolve against `path.dirname(configPath)` (so a
//     config at apps/mobile/translate.config.json saying "messages/en.json"
//     means apps/mobile/messages/en.json regardless of where you invoke from).
//
// `findConfig(cwd)` walks up from CWD looking for translate.config.json so
// `autoglot doctor` works from any subdirectory of a monorepo.

import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, isAbsolute, dirname, join } from "node:path";

/**
 * Walk up from `cwd` looking for `translate.config.json`. Returns the
 * absolute path of the first one found, or null if none up to the
 * filesystem root (or a `.git` directory — that's the repo boundary).
 */
export function findConfig(cwd, name = "translate.config.json") {
  let dir = resolve(cwd);
  const seen = new Set();
  while (!seen.has(dir)) {
    seen.add(dir);
    const candidate = join(dir, name);
    if (existsSync(candidate)) return candidate;
    if (existsSync(join(dir, ".git"))) return null;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

/**
 * Walk up from `cwd` looking for a `.git` directory. Returns the
 * absolute path of the repo root, or null if not in a git repo.
 */
export function findRepoRoot(cwd) {
  let dir = resolve(cwd);
  const seen = new Set();
  while (!seen.has(dir)) {
    seen.add(dir);
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

/**
 * Resolve a path:
 *   - absolute → as-is
 *   - relative → against baseDir
 */
export function resolveAgainst(baseDir, p) {
  if (!p) return p;
  return isAbsolute(p) ? p : resolve(baseDir, p);
}

/**
 * Load the config file (if present) and resolve all path fields against
 * its directory. Returns null if the file doesn't exist; caller decides
 * whether to fall back to defaults.
 */
export function loadConfig(configPath) {
  if (!existsSync(configPath)) return null;
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (err) {
    throw new Error(`Failed to parse ${configPath}: ${err.message}`);
  }
  const baseDir = dirname(resolve(configPath));
  const out = { ...parsed, namespaces: parsed.namespaces || {} };
  if (parsed.source) out.source = resolveAgainst(baseDir, parsed.source);
  if (parsed.messagesDir) out.messagesDir = resolveAgainst(baseDir, parsed.messagesDir);
  if (parsed.lockFile) out.lockFile = resolveAgainst(baseDir, parsed.lockFile);
  out.__configDir = baseDir;
  out.__configPath = configPath;
  return out;
}

/**
 * Resolve the canonical "where do I look for stuff?" tuple from CLI args
 * and (optionally) a config file. Precedence: CLI flag > config value >
 * built-in default. CLI flags resolve vs. CWD; config values resolve vs.
 * the config file's directory (handled by loadConfig).
 *
 * @param {object} args parsed CLI flags ({ source, "messages-dir", "lock-file", config })
 * @param {string} cwd current working directory (defaults: process.cwd())
 * @returns {{
 *   cwd: string, configPath: string|null, config: object|null,
 *   source: string, messagesDir: string, lockFile: string
 * }}
 */
export function resolvePaths(args, cwd = process.cwd()) {
  let configPath = null;
  if (args.config) {
    configPath = resolveAgainst(cwd, args.config);
  } else {
    configPath = findConfig(cwd);
  }

  const config = configPath ? loadConfig(configPath) : null;

  const source = args.source
    ? resolveAgainst(cwd, args.source)
    : config?.source
      ? config.source
      : resolve(cwd, "messages/en.json");

  const messagesDir = args["messages-dir"]
    ? resolveAgainst(cwd, args["messages-dir"])
    : config?.messagesDir
      ? config.messagesDir
      : resolve(cwd, "messages");

  const lockFile = args["lock-file"]
    ? resolveAgainst(cwd, args["lock-file"])
    : config?.lockFile
      ? config.lockFile
      : resolve(cwd, "translate.lock");

  return { cwd, configPath, config, source, messagesDir, lockFile };
}

/**
 * Minimal flag parser for add/doctor: extracts --source, --messages-dir,
 * --lock-file, --config. Positional args (non-flag) are returned separately.
 */
export function parseSharedFlags(argv) {
  const args = {};
  const positional = [];
  for (const a of argv) {
    if (!a.startsWith("--")) { positional.push(a); continue; }
    const eq = a.indexOf("=");
    if (eq > 0) {
      args[a.slice(2, eq)] = a.slice(eq + 1);
    } else {
      args[a.slice(2)] = true;
    }
  }
  return { args, positional };
}
