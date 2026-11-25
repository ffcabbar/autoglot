import { languages } from "../dictionaries";
import "../styles.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return languages.map(({ code }) => ({ locale: code }));
}

export default async function RootLayout({ children, params }) {
  const { locale } = await params;

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
