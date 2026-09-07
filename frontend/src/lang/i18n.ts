import i18n from "i18next";
import i18nBackend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { LANGUAGES } from "../constants";

const languageCodes: string[] = LANGUAGES.map((language) => language.code);

const getCurrentHost = (process.env.TRANSLATIONS_DATA_URL || "").replace(/\/+$/, "");
const translationsLoadPath = getCurrentHost ? `${getCurrentHost}/i18n/{{lng}}.json` : "/i18n/{{lng}}.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .use(i18nBackend)
  .init({
    fallbackLng: "en",
    load: "languageOnly",
    supportedLngs: languageCodes,
    initImmediate: false,
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
    detection: {
      order: ["querystring", "cookie", "localStorage", "navigator", "htmlTag"],
      caches: ["cookie", "localStorage"],
    },
    backend: {
      loadPath: translationsLoadPath,
      crossDomain: true,
      requestOptions: {
        mode: "cors",
        cache: "default",
      },
    },
  });

export default i18n;
