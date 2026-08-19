<script setup>
// The language switch.
//
// One button, always showing the language it switches *to* — so the reader sees
// where the click leads rather than where they already are. Hebrew and English
// are equal here: this is not a "translation mode" bolted onto a Hebrew console,
// it is the console's second language.
//
// Language names are endonyms — each language named in itself — and so read the
// same in both catalogs, which is what a language picker should show.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { LOCALE_META } from '@/i18n';
import { useLocaleStore } from '@/stores/locale';

const { t } = useI18n();
const localeStore = useLocaleStore();

/** Catalog key holding each language's own name. */
const NAME_KEY = { he: 'locale.hebrew', en: 'locale.english' };

/** The locale a click lands on. */
const target = computed(() => localeStore.other);

const targetName = computed(() => t(NAME_KEY[target.value]));

/** The target language's two-letter form, shown as the badge. */
const targetCode = computed(() => LOCALE_META[target.value].shortLabel);

const label = computed(() => t('locale.switchTo', { lang: targetName.value }));
</script>

<template>
    <button
        type="button"
        class="a-btn a-locale"
        :aria-label="label"
        :title="label"
        @click="localeStore.toggle()"
    >
        <span class="a-locale-code" :lang="target" aria-hidden="true">
            {{ targetCode }}
        </span>
        <span class="a-locale-name" :lang="target">{{ targetName }}</span>
    </button>
</template>

<style scoped>
/* Sized to sit level with the icon buttons and the health pill beside it. */
.a-locale {
    height: 44px;
    padding-inline: 9px 14px;
    gap: 9px;
}

.a-locale-code {
    display: grid;
    place-items: center;
    min-width: 30px;
    height: 26px;
    padding-inline: 5px;
    border-radius: 7px;
    background: var(--a-tint-2);
    color: var(--a-accent-2);
    font-family: var(--font-latin);
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: 0.02em;
}

.a-locale-name {
    font-weight: 600;
}

@media (max-width: 1360px) {
    /* On a narrow bar the badge alone still says which language is one click
       away, so the full name is what gives up its space. */
    .a-locale-name {
        display: none;
    }

    .a-locale {
        padding-inline: 9px;
    }
}
</style>
