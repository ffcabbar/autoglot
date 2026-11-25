// Vite + React + react-i18next scaffold.
//
// Generates src/i18n.ts with i18next configured. The user imports it
// once in src/main.tsx (before <App/> renders).

import { localeImportName } from "./common.mjs";

/** @param {{ defaultLocale: string, locales: string[] }} ctx */
export function i18nTs(ctx) {
  const imports = ctx.locales
    .map((l) => `import ${localeImportName(l)} from "../messages/${l}.json";`)
    .join("\n");
  const resources = ctx.locales
    .map((l) => `    ${quoteIfNeeded(l)}: { translation: ${localeImportName(l)} },`)
    .join("\n");

  return `import i18n from "i18next";
import { initReactI18next } from "react-i18next";

${imports}

i18n.use(initReactI18next).init({
  resources: {
${resources}
  },
  lng: "${ctx.defaultLocale}",
  fallbackLng: "${ctx.defaultLocale}",
  interpolation: { escapeValue: false },
});

export default i18n;
`;
}

export function files(ctx) {
  return [{ path: "src/i18n.ts", content: i18nTs(ctx) }];
}

export const runtimePackages = ["i18next", "react-i18next"];

export function followupNotes() {
  return [
    "Add this line near the top of src/main.tsx (before <App/> renders):\n      import \"./i18n\";",
    "Use the useTranslation() hook in components.",
    "For browser-locale detection, install i18next-browser-languagedetector and chain .use(LanguageDetector) before .use(initReactI18next).",
  ];
}

function quoteIfNeeded(loc) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(loc) ? loc : JSON.stringify(loc);
}
