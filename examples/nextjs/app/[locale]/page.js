import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, languages } from "../dictionaries";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const messages = getDictionary(locale);
  if (!messages) notFound();

  return { title: messages.guide.name, description: messages.guide.description };
}

export default async function FieldGuide({ params }) {
  const { locale } = await params;
  const messages = getDictionary(locale);
  if (!messages) notFound();

  const { guide, navigation } = messages;

  return (
    <>
      <header>
        <span className="wordmark">{guide.name}</span>
        <nav aria-label={navigation.languages}>
          {languages.map(({ code, label }) => (
            <Link
              key={code}
              href={`/${code}`}
              lang={code}
              hrefLang={code}
              aria-current={locale === code ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main>
        <h1>{guide.title}</h1>
        <p className="intro">{guide.description}</p>
        <section aria-labelledby="tip-title">
          <h2 id="tip-title">{guide.tipTitle}</h2>
          <p>{guide.tip}</p>
        </section>
      </main>
    </>
  );
}
