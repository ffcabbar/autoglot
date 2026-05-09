// React Native + react-i18next scaffold.
//
// Generates src/i18n/index.ts with i18next configured to load every
// locale's messages JSON. The user is expected to:
//   1. Run `npm install i18next react-i18next` (we don't auto-install).
//   2. Import this file early in App.tsx so init runs before render.
//   3. Optionally wire device-locale detection with expo-localization
//      or react-native-localize — we don't pick one for them.

/** @param {{ defaultLocale: string, locales: string[] }} ctx */
export function indexTs(ctx) {
  const imports = ctx.locales
    .map((l) => `import ${jsId(l)} from "../../messages/${l}.json";`)
    .join("\n");
  const resources = ctx.locales
    .map((l) => `    ${quoteIfNeeded(l)}: { translation: ${jsId(l)} },`)
    .join("\n");

  return `import i18n from "i18next";
import { initReactI18next } from "react-i18next";

${imports}

i18n.use(initReactI18next).init({
  // i18next requires this on RN to avoid Intl polyfill differences.
  compatibilityJSON: "v4",
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

/** @param {{ defaultLocale: string, locales: string[] }} ctx */
export function files(ctx) {
  return [{ path: "src/i18n/index.ts", content: indexTs(ctx) }];
}

export const runtimePackages = ["i18next", "react-i18next"];

export function followupNotes() {
  return [
    "Import the i18n init early in App.tsx — before any t() calls:\n      import \"./src/i18n\";",
    "Use the useTranslation() hook in components: const { t } = useTranslation();",
    "For device locale detection: install expo-localization (Expo) or react-native-localize (bare RN), then set lng dynamically in src/i18n/index.ts.",
  ];
}

// Locale codes are usually safe ids (en, es, de, zh-CN), but zh-CN contains a
// dash which isn't a valid JS identifier. Use a sanitized name for the import
// binding and quote the property key on the way out.
function jsId(loc) {
  return loc.replace(/[^a-zA-Z0-9_$]/g, "_");
}
function quoteIfNeeded(loc) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(loc) ? loc : JSON.stringify(loc);
}
