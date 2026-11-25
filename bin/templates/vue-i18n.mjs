// Vue + vue-i18n scaffold.
//
// Generates src/i18n.ts using the vue-i18n composition API. The user
// installs the plugin in main.ts: app.use(i18n).

import { localeImportName } from "./common.mjs";

/** @param {{ defaultLocale: string, locales: string[] }} ctx */
export function i18nTs(ctx) {
  const imports = ctx.locales
    .map((l) => `import ${localeImportName(l)} from "../messages/${l}.json";`)
    .join("\n");
  const messages = ctx.locales
    .map((l) => `    ${quoteIfNeeded(l)}: ${localeImportName(l)},`)
    .join("\n");

  return `import { createI18n } from "vue-i18n";

${imports}

export const i18n = createI18n({
  legacy: false,                  // Composition API mode
  locale: "${ctx.defaultLocale}",
  fallbackLocale: "${ctx.defaultLocale}",
  messages: {
${messages}
  },
});

export default i18n;
`;
}

export function files(ctx) {
  return [{ path: "src/i18n.ts", content: i18nTs(ctx) }];
}

export const runtimePackages = ["vue-i18n"];

export function followupNotes() {
  return [
    "In src/main.ts, register the plugin:\n      import { i18n } from \"./i18n\";\n      app.use(i18n);",
    "In components: import { useI18n } from \"vue-i18n\"; const { t } = useI18n();",
    "Switch locale at runtime by mutating i18n.global.locale.value.",
  ];
}

function quoteIfNeeded(loc) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(loc) ? loc : JSON.stringify(loc);
}
