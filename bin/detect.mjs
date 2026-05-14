// Detect the framework in the current working directory.
//
// Pure helper for ease of testing: takes a `pkg` (parsed package.json) and a
// list of paths that exist on disk, returns a framework descriptor.

/**
 * @typedef {{
 *   key: "nextjs-app" | "nextjs-pages" | "expo" | "react-native" | "vite-react" | "vue" | "generic",
 *   label: string,
 *   runtime: "next-intl" | "next-i18next" | "react-i18next" | "vue-i18n" | null,
 *   note?: string
 * }} Framework
 */

/**
 * @param {object} pkg parsed package.json (or {} if none)
 * @param {Set<string>} present set of relative paths that exist (e.g. "src/app", "pages")
 * @returns {Framework}
 */
export function detect(pkg, present) {
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  // Expo before react-native: an Expo app has BOTH `expo` and `react-native` as
  // deps, but Expo has a cleaner device-locale API (expo-localization) so we
  // give it the dedicated template.
  if (deps["expo"]) {
    return {
      key: "expo",
      label: "Expo",
      runtime: "react-i18next",
      note: "Will scaffold src/i18n/index.ts with react-i18next + expo-localization for device-locale auto-detect.",
    };
  }

  if (deps["react-native"]) {
    return {
      key: "react-native",
      label: "React Native",
      runtime: "react-i18next",
      note: "Will scaffold src/i18n/index.ts with react-i18next. Pair with react-native-localize for device locale.",
    };
  }

  if (deps["next"]) {
    const hasApp = present.has("src/app") || present.has("app");
    const hasPages = present.has("src/pages") || present.has("pages");
    if (hasApp || (!hasApp && !hasPages)) {
      return {
        key: "nextjs-app",
        label: "Next.js (App Router)",
        runtime: "next-intl",
      };
    }
    return {
      key: "nextjs-pages",
      label: "Next.js (Pages Router)",
      runtime: "next-i18next",
      note: "We'll scaffold messages + workflow and print the next-i18next wiring steps. We don't auto-modify next.config.js or _app.tsx.",
    };
  }

  if (deps["nuxt"] || deps["vue"]) {
    return {
      key: "vue",
      label: "Vue / Nuxt",
      runtime: "vue-i18n",
    };
  }

  if (deps["vite"] && deps["react"]) {
    return {
      key: "vite-react",
      label: "Vite + React",
      runtime: "react-i18next",
    };
  }

  return {
    key: "generic",
    label: "Generic / no framework detected",
    runtime: null,
    note: "We'll scaffold messages + workflow only. Pair with any i18n library that reads JSON.",
  };
}

/**
 * Built-in catalog of common locales for the multi-select.
 * Display name + ISO code.
 */
export const LOCALE_CATALOG = [
  { code: "es", label: "Spanish (es)" },
  { code: "fr", label: "French (fr)" },
  { code: "de", label: "German (de)" },
  { code: "tr", label: "Turkish (tr)" },
  { code: "pt", label: "Portuguese (pt)" },
  { code: "it", label: "Italian (it)" },
  { code: "ja", label: "Japanese (ja)" },
  { code: "ko", label: "Korean (ko)" },
  { code: "zh", label: "Chinese (zh)" },
  { code: "ru", label: "Russian (ru)" },
  { code: "ar", label: "Arabic (ar)" },
  { code: "nl", label: "Dutch (nl)" },
  { code: "pl", label: "Polish (pl)" },
  { code: "sv", label: "Swedish (sv)" },
  { code: "id", label: "Indonesian (id)" },
];
