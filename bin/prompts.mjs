// Zero-deps interactive prompts via Node's readline.
//
// Design: numbered-choice text UI. Less fancy than arrow-key navigation,
// but renders correctly in every terminal (including dumb CI shells, ssh,
// container exec, and Windows cmd). Same pattern Linux installers use.
//
// Implementation: ONE shared readline interface across all prompts so
// piped stdin (e.g. `printf '...\n' | autoglot init`) works correctly.
// Multiple createInterface calls on the same stdin race each other and
// leave one of them dangling — that's why we reuse.
//
// All exports return Promises that resolve to the user's input.

import readline from "node:readline";

let _rl = null;
let _closed = false;

function getRl() {
  if (_rl) return _rl;
  _rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  _rl.on("close", () => {
    _closed = true;
  });
  return _rl;
}

/** Close the shared readline. Call after the last prompt of a session. */
export function closePrompts() {
  if (_rl) {
    _rl.close();
    _rl = null;
  }
}

const reset = "\x1b[0m";
const dim = "\x1b[2m";
const bold = "\x1b[1m";
const cyan = "\x1b[36m";
const green = "\x1b[32m";
const red = "\x1b[31m";
const yellow = "\x1b[33m";

export const c = { reset, dim, bold, cyan, green, red, yellow };

export function info(msg) { process.stdout.write(`${cyan}ℹ${reset}  ${msg}\n`); }
export function ok(msg) { process.stdout.write(`${green}✓${reset}  ${msg}\n`); }
export function warn(msg) { process.stdout.write(`${yellow}!${reset}  ${msg}\n`); }
export function err(msg) { process.stdout.write(`${red}✗${reset}  ${msg}\n`); }
export function step(msg) { process.stdout.write(`\n${bold}${msg}${reset}\n`); }

/**
 * Prompt for free-form text input.
 * If stdin is closed (EOF), resolves to defaultValue (or "" if no default).
 */
export function ask(question, defaultValue) {
  return new Promise((resolve) => {
    if (_closed) {
      resolve(defaultValue !== undefined ? defaultValue : "");
      return;
    }
    const r = getRl();
    const suffix = defaultValue ? ` ${dim}(${defaultValue})${reset}` : "";
    const onClose = () => resolve(defaultValue !== undefined ? defaultValue : "");
    r.once("close", onClose);
    r.question(`${cyan}?${reset} ${question}${suffix} `, (answer) => {
      r.removeListener("close", onClose);
      const trimmed = answer.trim();
      resolve(trimmed === "" && defaultValue !== undefined ? defaultValue : trimmed);
    });
  });
}

/**
 * Yes/no confirmation. Default selectable.
 */
export async function confirm(question, defaultYes = true) {
  const hint = defaultYes ? "Y/n" : "y/N";
  const ans = await ask(`${question} ${dim}[${hint}]${reset}`);
  if (!ans) return defaultYes;
  return /^y(es)?$/i.test(ans);
}

/**
 * Single-select from a numbered list.
 * @returns {Promise<any>} chosen `value`
 */
export async function select(question, choices, defaultIndex = 0) {
  if (choices.length === 0) throw new Error("select: no choices given");
  process.stdout.write(`${cyan}?${reset} ${question}\n`);
  choices.forEach((ch, i) => {
    const isDefault = i === defaultIndex;
    const marker = isDefault ? `${green}❯${reset}` : " ";
    const num = `${dim}${i + 1})${reset}`;
    const hint = ch.hint ? ` ${dim}— ${ch.hint}${reset}` : "";
    process.stdout.write(`  ${marker} ${num} ${ch.label}${hint}\n`);
  });
  while (true) {
    const ans = await ask(`Pick a number ${dim}(1-${choices.length})${reset}`, String(defaultIndex + 1));
    const n = Number.parseInt(ans, 10);
    if (Number.isInteger(n) && n >= 1 && n <= choices.length) return choices[n - 1].value;
    err(`Invalid choice. Enter a number between 1 and ${choices.length}.`);
    if (_closed) return choices[defaultIndex].value;
  }
}

/**
 * Multi-select. User enters comma-separated numbers (e.g. "1,3,4").
 * @returns {Promise<any[]>} list of chosen `value`s, in input order
 */
export async function multiselect(question, choices) {
  if (choices.length === 0) throw new Error("multiselect: no choices given");
  process.stdout.write(`${cyan}?${reset} ${question}\n`);
  const defaults = [];
  choices.forEach((ch, i) => {
    const marker = ch.default ? `${green}●${reset}` : `${dim}○${reset}`;
    const num = `${dim}${i + 1})${reset}`;
    const hint = ch.hint ? ` ${dim}— ${ch.hint}${reset}` : "";
    process.stdout.write(`  ${marker} ${num} ${ch.label}${hint}\n`);
    if (ch.default) defaults.push(i + 1);
  });
  const defaultStr = defaults.length ? defaults.join(",") : "";
  process.stdout.write(`${dim}  Comma-separated numbers, e.g. "1,3,4". Empty to accept defaults.${reset}\n`);
  while (true) {
    const ans = await ask(`Pick`, defaultStr);
    if (!ans) {
      return choices.filter((c) => c.default).map((c) => c.value);
    }
    const nums = ans.split(/[,\s]+/).map((s) => Number.parseInt(s, 10));
    const valid = nums.every((n) => Number.isInteger(n) && n >= 1 && n <= choices.length);
    if (valid && nums.length > 0) {
      const seen = new Set();
      const out = [];
      for (const n of nums) {
        if (!seen.has(n)) {
          seen.add(n);
          out.push(choices[n - 1].value);
        }
      }
      return out;
    }
    err(`Invalid input. Use comma-separated numbers between 1 and ${choices.length}.`);
    if (_closed) return choices.filter((c) => c.default).map((c) => c.value);
  }
}
