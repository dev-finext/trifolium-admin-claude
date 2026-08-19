// Locale wiring. One switch changes four things at once: the message catalog,
// `<html lang>`, `<html dir>`, and the font stack (Assistant/Heebo for Hebrew,
// Inter for English).
//
// Hebrew is the console's first language and its default. The choice is persisted,
// so an agent who switches to English keeps it across reloads.
import { createI18n } from 'vue-i18n';

import en from '@/locales/en';
import he from '@/locales/he';

const STORAGE_KEY = 'trifolium-admin-locale';

/** Direction and font per locale — the only place this mapping is stated. */
export const LOCALE_META = {
    he: { dir: 'rtl', label: 'עברית', shortLabel: 'עב', font: 'hebrew' },
    en: { dir: 'ltr', label: 'English', shortLabel: 'EN', font: 'latin' },
};

export const SUPPORTED_LOCALES = Object.keys(LOCALE_META);

function readStoredLocale() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored && SUPPORTED_LOCALES.includes(stored)) {
            return stored;
        }
    } catch {
        // Private-mode browsers throw on localStorage access; fall through.
    }

    return null;
}

/**
 * The locale the console opens in.
 *
 * Hebrew, unless this browser has been switched to English before. The pharmacy
 * runs in Hebrew: it is the language the copy is written in, the language the
 * records are authored in, and the language the staff work in. English is a
 * translation for the people who need it, not a competing default — so the
 * browser's `Accept-Language` is deliberately not consulted. Sniffing it meant an
 * agent on an English-configured Windows install got an English console on their
 * first visit, which is not the console they were asking for.
 *
 * A stored choice always wins, in both directions: switching to English keeps
 * English across reloads, and switching back keeps Hebrew.
 */
function initialLocale() {
    return readStoredLocale() || 'he';
}

export const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale: initialLocale(),
    fallbackLocale: 'he',
    // Hebrew copy uses `{{var}}`-style placeholders inside message templates
    // that are displayed verbatim (WhatsApp templates); keep interpolation to
    // the single-brace form so those survive untouched.
    warnHtmlMessage: false,
    messages: { he, en },
});

/** Apply a locale to the document: catalog, lang, dir, font class. */
export function applyLocale(locale) {
    const next = SUPPORTED_LOCALES.includes(locale) ? locale : 'he';
    const meta = LOCALE_META[next];

    i18n.global.locale.value = next;

    const root = document.documentElement;

    root.setAttribute('lang', next);
    root.setAttribute('dir', meta.dir);
    root.dataset.font = meta.font;

    try {
        localStorage.setItem(STORAGE_KEY, next);
    } catch {
        // Persistence is a convenience, never a requirement.
    }

    return next;
}

/** The locale that is active right now. */
export function currentLocale() {
    return i18n.global.locale.value;
}

/** Direction for the active locale — `rtl` or `ltr`. */
export function currentDir() {
    return LOCALE_META[currentLocale()].dir;
}

export default i18n;
