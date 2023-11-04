import i18n from "i18next";
import i18nBackend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { LANGUAGES } from "../constants";

const languageCodes: string[] = LANGUAGES.map((language) => language.code);

const getCurrentHost = process.env.TRANSLATIONS_DATA_URL
/*import.meta.env.MODE === "development"
    ? process.env.DEV_FRONT_URL
    : process.env.FRONT_URL;
  */

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .use(i18nBackend)
  .init({
    fallbackLng: "en",
    load: "all",
    supportedLngs: languageCodes,
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: `${getCurrentHost}i18n/{{lng}}.json`,
      crossDomain: true,
      requestOptions: {
        mode: "cors",
        cache: "default",
      },
    },
  });

export default i18n;
