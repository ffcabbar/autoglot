// Next.js 15 App Router + next-intl scaffold.
//
// Generates:
//   - src/i18n/routing.ts      (locale config)
//   - src/i18n/request.ts      (next-intl getRequestConfig)
//   - src/middleware.ts        (locale-aware middleware)
//   - src/app/[locale]/layout.tsx  (NextIntlClientProvider wrapper) — only if no [locale] dir exists
//   - src/app/[locale]/page.tsx    (example page) — only if no [locale] dir exists
//
// We don't touch existing src/app/* — too risky to rewrite a working app.
// Instead, init prints follow-up instructions for the user to migrate
// their existing routes under [locale]. Doctor will spot the issue later.

/** @param {{ defaultLocale: string, locales: string[] }} ctx */
export function routingTs(ctx) {
  const localesArr = JSON.stringify(ctx.locales);
  return `import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ${localesArr},
  defaultLocale: ${JSON.stringify(ctx.defaultLocale)},
  // Optional: change to "always" if you want a locale prefix on every URL.
  localePrefix: "as-needed",
});
`;
}

export function requestTs() {
  return `import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(\`../../messages/\${locale}.json\`)).default,
  };
});
`;
}

export function middlewareTs() {
  return `import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip Next.js internals and static assets. Add other paths to skip here.
  matcher: ["/((?!api|_next|_vercel|.*\\\\..*).*)"],
};
`;
}

/** @param {{ defaultLocale: string }} ctx */
export function localeLayoutTsx(ctx) {
  return `import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
`;
}

export function localePageTsx() {
  return `import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("home");
  return (
    <main style={{ padding: 32 }}>
      <h1>{t("title")}</h1>
      <button>{t("cta")}</button>
    </main>
  );
}
`;
}

/**
 * Returns the list of files this template will create.
 * @param {{ defaultLocale: string, locales: string[], hasExistingApp: boolean }} ctx
 * @returns {Array<{ path: string, content: string, optional?: boolean }>}
 */
export function files(ctx) {
  const out = [
    { path: "src/i18n/routing.ts", content: routingTs(ctx) },
    { path: "src/i18n/request.ts", content: requestTs() },
    { path: "src/middleware.ts", content: middlewareTs() },
  ];
  if (!ctx.hasExistingApp) {
    out.push(
      { path: "src/app/[locale]/layout.tsx", content: localeLayoutTsx(ctx) },
      { path: "src/app/[locale]/page.tsx", content: localePageTsx() },
    );
  }
  return out;
}

export const runtimePackages = ["next-intl"];

export function followupNotes(ctx) {
  if (ctx.hasExistingApp) {
    return [
      "Existing src/app/ detected — autoglot did NOT migrate your routes.",
      "Move your existing pages/layouts under src/app/[locale]/ when ready.",
      "Wrap your root layout in <NextIntlClientProvider>.",
      "Update next.config to plug in next-intl: see https://next-intl.dev/docs/getting-started/app-router",
    ];
  }
  return [
    "next-intl is wired up. Try \`npm run dev\` and visit /, /es, /de, etc.",
    "Replace hardcoded strings in components with `useTranslations()` calls.",
  ];
}
