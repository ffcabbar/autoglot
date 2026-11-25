import english from "../messages/en.json";
import spanish from "../messages/es.json";

export const languages = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" }
];

const dictionaries = new Map([
  ["en", english],
  ["es", spanish]
]);

export function getDictionary(locale) {
  return dictionaries.get(locale);
}
