import i18n from "i18next";
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en';
import ko from './locales/ko';

const detectorOptions = {
  order: ['localStorage', 'cookie', 'htmlTag', 'querystring'],
  lookupLocalStorage: 'language',
  lookupCookie: 'language',
  htmlTag: document.documentElement,
}
i18n
  .use(LanguageDetector)
  .init({
    resources: {
        en: en,
        ko: ko
    },
    // lng: "en", // if you're using a language detector, do not define the lng option
    fallbackLng: "en",
    ns:['page', 'filterPage', 'chatSaver', 'tmi', 'filter'],
    detection: detectorOptions
  });

  export default i18n