import en from "./en.json";
import zhCN from "./zh_CN.json";

type Messages = typeof en;
type MessageKey = keyof Messages;
type Locale = "en" | "zh_CN";

const locales: Record<Locale, Messages> = {
  en,
  zh_CN: zhCN,
};

let currentLocale: Locale = "en";

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: MessageKey): string {
  return locales[currentLocale][key] ?? locales.en[key] ?? key;
}

export function detectLocale(): Locale {
  const lang = process.env.LANG || process.env.LANGUAGE || "";
  if (lang.startsWith("zh")) {
    return "zh_CN";
  }
  return "en";
}

export type { Locale, MessageKey };
