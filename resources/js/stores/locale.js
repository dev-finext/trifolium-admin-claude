// Active language, and the direction/font that follow from it.
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { applyLocale, LOCALE_META, SUPPORTED_LOCALES, i18n } from '@/i18n';

export const useLocaleStore = defineStore('locale', () => {
    const locale = ref(i18n.global.locale.value);

    const meta = computed(() => LOCALE_META[locale.value]);
    const dir = computed(() => meta.value.dir);
    const isRtl = computed(() => meta.value.dir === 'rtl');

    /** The locale the toggle would switch to — this console ships exactly two. */
    const other = computed(
        () =>
            SUPPORTED_LOCALES.find((code) => code !== locale.value) ||
            locale.value,
    );

    function set(next) {
        locale.value = applyLocale(next);
    }

    function toggle() {
        set(other.value);
    }

    /** Called once at boot so `<html>` matches the detected locale. */
    function init() {
        set(locale.value);
    }

    return {
        locale,
        meta,
        dir,
        isRtl,
        other,
        locales: SUPPORTED_LOCALES,
        set,
        toggle,
        init,
    };
});
