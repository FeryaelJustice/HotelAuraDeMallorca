import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  resources: {
    en: {
      translation: {
        home: "Home",
        services: "Services",
        contact: "Contact",
        book: "Book",
      },
    },
    es: {
      translation: {
        home: "Inicio",
        services: "Servicios",
        contact: "Contacto",
        book: "Reservar",
      },
    },
    ca: {
      translation: {
        home: "Inici",
        services: "Servicis",
        contact: "Contacte",
        book: "Reservar",
      },
    },
    de: {
      translation: {
        home: "Start",
        services: "Dienstleistungen",
        contact: "Kontakt",
        book: "Reservieren",
      },
    },
  },
});

export default i18n;
