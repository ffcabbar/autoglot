// `autoglot init` — interactive scaffold.
//
// Detects the framework, asks the user which locales to support, and writes:
//   - messages/en.json (with example keys)
//   - messages/<locale>.json per chosen locale (empty)
//   - translate.config.json
//   - .github/workflows/translate.yml
//   - framework-specific files when supported (e.g. next-intl scaffold)
//
// Never overwrites existing files without explicit confirmation.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { ask, select, multiselect, confirm, info, ok, warn, err, step, c, closePrompts } from "./prompts.mjs";
import { detect, LOCALE_CATALOG } from "./detect.mjs";
import { detectPackageManager, installCommand, PACKAGE_MANAGERS } from "./pm.mjs";
import * as common from "./templates/common.mjs";
import * as nextAppRouter from "./templates/nextjs-app-router.mjs";
import * as nextPagesRouter from "./templates/nextjs-pages-router.mjs";
import * as reactNative from "./templates/react-native.mjs";
import * as viteReact from "./templates/vite-react.mjs";
import * as vueI18n from "./templates/vue-i18n.mjs";

const TEMPLATES = {
  "nextjs-app": nextAppRouter,
  "nextjs-pages": nextPagesRouter,
  "react-native": reactNative,
  "vite-react": viteReact,
  "vue": vueI18n,
};

/**
 * Parse `init`-specific flags. Unknown flags are ignored (forward-compat).
 *
 *   --install            opt-in: run the package manager to install runtime deps
 *   --pm=npm|yarn|pnpm|bun  override the auto-detected package manager
 *   --no-install         force off (useful in CI if a default ever flips)
 */
export function parseInitArgs(argv) {
  const opts = { install: false, installExplicit: false, pm: null };
  for (const arg of argv) {
    if (arg === "--install") {
      opts.install = true;
      opts.installExplicit = true;
    } else if (arg === "--no-install") {
      opts.install = false;
      opts.installExplicit = true;
    } else if (arg.startsWith("--pm=")) {
      const v = arg.slice("--pm=".length);
      if (PACKAGE_MANAGERS.includes(v)) opts.pm = v;
    }
  }
  return opts;
}

export async function run(argv = []) {
  const opts = parseInitArgs(argv);
  const cwd = process.cwd();
  step("autoglot init");
  info(`cwd: ${c.dim}${cwd}${c.reset}`);

  const pkgPath = join(cwd, "package.json");
  let pkg = {};
  let hasPkg = false;
  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      hasPkg = true;
    } catch (e) {
      warn(`Couldn't parse package.json: ${e.message}`);
    }
  } else {
    warn("No package.json found — running in generic mode (workflow + messages only).");
  }

  // Detect framework
  const present = new Set();
  for (const p of ["src/app", "app", "src/pages", "pages"]) {
    if (existsSync(join(cwd, p))) present.add(p);
  }
  const fw = detect(pkg, present);
  ok(`Detected: ${c.bold}${fw.label}${c.reset}`);
  if (fw.note) info(fw.note);

  // Pick locales
  step("Locales");
  const localeChoices = LOCALE_CATALOG.map((l) => ({
    label: l.label,
    value: l.code,
    default: ["es", "de", "tr"].includes(l.code),
  }));
  const targetLocales = await multiselect(
    "Which target locales to translate into?",
    localeChoices,
  );
  if (targetLocales.length === 0) {
    err("Need at least one target locale. Aborting.");
    process.exit(1);
  }

  const customLocale = await ask(
    "Add another locale not in the list? (ISO code, e.g. \"hi\")",
    "",
  );
  if (customLocale) {
    if (/^[a-z]{2,3}(-[A-Z]{2})?$/.test(customLocale)) {
      targetLocales.push(customLocale);
    } else {
      warn(`"${customLocale}" doesn't look like an ISO locale code. Skipping.`);
    }
  }

  const defaultLocale = "en";
  ok(`Source: ${defaultLocale} → Targets: ${targetLocales.join(", ")}`);

  // Note: we deliberately do NOT run `npm install` here. Auto-install of a
  // runtime i18n library is fragile (peer-dep mismatches across React 18/19,
  // RN versions, monorepo hoisting). We just print the command and let the
  // user own that step.
  //
  // Use the template's full runtimePackages list (e.g. RN needs both i18next
  // AND react-i18next, not just one) instead of the single fw.runtime label.
  let runtimeInstallHint = null;
  if (fw.runtime) {
    const templateForHint = TEMPLATES[fw.key];
    const pkgs = templateForHint?.runtimePackages || [fw.runtime];
    const installed = hasPkg
      ? pkgs.every((p) => pkg.dependencies?.[p] || pkg.devDependencies?.[p])
      : false;
    if (installed) {
      ok(`${pkgs.join(" + ")} already installed.`);
    } else {
      runtimeInstallHint = pkgs.join(" ");
    }
  }

  // Build the file list
  step("Plan");
  const filesToWrite = [];

  // Common files
  filesToWrite.push({
    path: "messages/en.json",
    content: common.exampleEnJson(),
    skipIfExists: true,
  });
  for (const loc of targetLocales) {
    filesToWrite.push({
      path: `messages/${loc}.json`,
      content: common.emptyLocale(),
      skipIfExists: true,
    });
  }
  filesToWrite.push({
    path: "translate.config.json",
    content: common.translateConfig({ source: "messages/en.json", messagesDir: "messages" }),
    skipIfExists: true,
  });
  filesToWrite.push({
    path: ".github/workflows/translate.yml",
    content: common.workflow({ messagesDir: "messages" }),
    skipIfExists: true,
  });

  // Framework-specific files
  let followupNotes = [];
  const tpl = TEMPLATES[fw.key];
  if (tpl) {
    const hasExistingApp = present.has("src/app") || present.has("app");
    const ctx = { defaultLocale, locales: [defaultLocale, ...targetLocales], hasExistingApp };
    for (const f of tpl.files(ctx)) {
      filesToWrite.push({ path: f.path, content: f.content, skipIfExists: true });
    }
    followupNotes = tpl.followupNotes(ctx);
  }

  // Show plan
  for (const f of filesToWrite) {
    const full = join(cwd, f.path);
    const exists = existsSync(full);
    const status = exists ? `${c.yellow}EXISTS (will skip)${c.reset}` : `${c.green}CREATE${c.reset}`;
    process.stdout.write(`  ${status}  ${f.path}\n`);
  }

  const proceed = await confirm("\nProceed?", true);
  if (!proceed) {
    info("Aborted.");
    closePrompts();
    return;
  }

  // Write files
  step("Writing");
  let written = 0;
  let skipped = 0;
  for (const f of filesToWrite) {
    const full = join(cwd, f.path);
    if (existsSync(full)) {
      skipped++;
      continue;
    }
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, f.content);
    ok(f.path);
    written++;
  }

  // Final report
  step("Done");
  info(`Wrote ${written} file${written === 1 ? "" : "s"}, skipped ${skipped} existing file${skipped === 1 ? "" : "s"}.`);

  // Optionally install runtime deps. Default is OFF — auto-install across
  // monorepos / mixed React versions is fragile. Opt in with --install.
  let installSucceeded = false;
  let installFailed = false;
  if (runtimeInstallHint) {
    const pkgs = runtimeInstallHint.split(" ").filter(Boolean);
    let shouldInstall = opts.install;
    if (!opts.installExplicit) {
      shouldInstall = await confirm(
        `Install runtime packages now (${pkgs.join(", ")})?`,
        false,
      );
    }
    if (shouldInstall) {
      const pm = opts.pm || detectPackageManager(cwd);
      const [bin, ...args] = installCommand(pm, pkgs);
      step(`Installing with ${pm}`);
      info(`${c.dim}${bin} ${args.join(" ")}${c.reset}`);
      const res = spawnSync(bin, args, { stdio: "inherit", cwd });
      if (res.status === 0) {
        ok(`Installed ${pkgs.join(", ")} via ${pm}.`);
        installSucceeded = true;
      } else {
        warn(`${pm} install exited with code ${res.status ?? "?"}. You can re-run manually.`);
        installFailed = true;
      }
    }
  }

  step("Next steps");
  const numbered = [];
  if (runtimeInstallHint && !installSucceeded) {
    const hintPm = opts.pm || detectPackageManager(cwd);
    const [bin, ...args] = installCommand(hintPm, runtimeInstallHint.split(" ").filter(Boolean));
    const label = installFailed
      ? `Retry installing the runtime i18n library:`
      : `Install the runtime i18n library:`;
    numbered.push(`${label}\n      ${c.dim}${bin} ${args.join(" ")}${c.reset}`);
  }
  numbered.push(
    `Add ${c.bold}ANTHROPIC_API_KEY${c.reset} to your repo secrets:\n      ${c.dim}gh secret set ANTHROPIC_API_KEY${c.reset}`,
    `Edit ${c.bold}messages/en.json${c.reset} with real strings.`,
    `Push to a branch — autoglot will translate and commit \`messages/<locale>.json\` files.`,
  );
  for (const note of followupNotes) numbered.push(note);
  numbered.forEach((note, i) => {
    process.stdout.write(`  ${c.dim}${i + 1}.${c.reset} ${note}\n`);
  });

  process.stdout.write(`\nMore: ${c.cyan}https://github.com/ffcabbar/autoglot${c.reset}\n`);
  closePrompts();
}
