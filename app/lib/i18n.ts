import translations from "../locales/translations.json";

// Add an index signature so any key (string) is allowed
type TranslationsType = {
  [key: string]: {
    eng: string;
    ch: string;
  };
};

const typedTranslations = translations as TranslationsType;

type LanguageCode = "eng" | "ch";

export const t = (key: string, lang: LanguageCode = "eng"): string => {
  return typedTranslations[key]?.[lang] || key;
};
