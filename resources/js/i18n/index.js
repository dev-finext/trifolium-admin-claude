// Locale wiring. One switch changes four things at once: the message catalog,
// `<html lang>`, `<html dir>`, and the font stack (Assistant/Heebo for Hebrew,
// Inter for English). The choice is persisted so a reload keeps it.
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

function detectLocale() {
    const stored = readStoredLocale();

    if (stored) {
        return stored;
    }

    const preferred = (globalThis.navigator?.languages || []).concat(
        globalThis.navigator?.language || [],
    );

    for (const tag of preferred) {
        const base = String(tag).toLowerCase().split('-')[0];

        if (SUPPORTED_LOCALES.includes(base)) {
            return base;
        }
    }

    return 'he';
}

export const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale: detectLocale(),
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
