// Expo + react-i18next scaffold.
//
// Expo apps have `react-native` in deps too, but Expo offers a cleaner
// device-locale API via `expo-localization` (no native linking required).
// We scaffold an i18n init that auto-picks the device locale and falls
// back to the configured default.

/** @param {{ defaultLocale: string, locales: string[] }} ctx */
export function indexTs(ctx) {
  const imports = ctx.locales
    .map((l) => `import ${jsId(l)} from "../../messages/${l}.json";`)
    .join("\n");
  const resources = ctx.locales
    .map((l) => `    ${quoteIfNeeded(l)}: { translation: ${jsId(l)} },`)
    .join("\n");
  const localesArr = ctx.locales.map((l) => JSON.stringify(l)).join(", ");

  return `import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";

${imports}

// Pick the first device locale that we have a translation for; otherwise
// fall back to the configured default.
const supported = new Set([${localesArr}]);
const deviceLocale = getLocales().find((l) => supported.has(l.languageTag) || supported.has(l.languageCode));
const initialLocale = deviceLocale?.languageTag ?? deviceLocale?.languageCode ?? "${ctx.defaultLocale}";

i18n.use(initReactI18next).init({
  // i18next requires this on RN/Expo to avoid Intl polyfill differences.
  compatibilityJSON: "v4",
  resources: {
${resources}
  },
  lng: supported.has(initialLocale) ? initialLocale : "${ctx.defaultLocale}",
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

export const runtimePackages = ["i18next", "react-i18next", "expo-localization"];

export function followupNotes() {
  return [
    "Import the i18n init early in App.tsx — before any t() calls:\n      import \"./src/i18n\";",
    "Use the useTranslation() hook in components: const { t } = useTranslation();",
    "expo-localization is included — device locale is auto-detected on app start.",
    "For Expo Router: place the import in app/_layout.tsx instead of App.tsx.",
  ];
}

function jsId(loc) {
  return loc.replace(/[^a-zA-Z0-9_$]/g, "_");
}
function quoteIfNeeded(loc) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(loc) ? loc : JSON.stringify(loc);
}
