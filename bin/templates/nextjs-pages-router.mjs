// Next.js Pages Router scaffold.
//
// next-intl is App-Router-first; for Pages Router the recommended path is
// next-i18next, which has its own conventions (separate i18n config file,
// appWithTranslation HOC in _app, serverSideTranslations in getStaticProps).
//
// Auto-modifying _app.tsx and next.config.js is risky — both are heavily
// user-owned. So we do NOT scaffold any files. We only print precise
// followup instructions and leave the wiring to the user.

export function files() {
  return [];
}

export const runtimePackages = ["next-i18next", "react-i18next", "i18next"];

export function followupNotes(ctx) {
  const localesArr = JSON.stringify(ctx.locales);
  return [
    `Add an i18n block to next.config.js:\n      i18n: { locales: ${localesArr}, defaultLocale: "${ctx.defaultLocale}" }`,
    "Create next-i18next.config.js at the project root mirroring the same locales array.",
    "In pages/_app.tsx, wrap the root with appWithTranslation:\n      import { appWithTranslation } from \"next-i18next\";\n      export default appWithTranslation(App);",
    "In each page that uses translations, add:\n      export async function getStaticProps({ locale }) {\n        return { props: { ...await serverSideTranslations(locale, [\"common\"]) } };\n      }",
    "Full guide: https://github.com/i18next/next-i18next#readme",
  ];
}
