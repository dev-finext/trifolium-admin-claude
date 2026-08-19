// Read `{ he, en }` record fields in the active locale.
//
//     const { loc } = useLocalized();
//     …
//     {{ loc(practitioner.firstName) }}
//
// `$loc` is also installed globally (see resources/js/app.js) for templates that
// need nothing else from this composable.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { loc as resolve, locDeep, searchHaystack } from '@/lib/localized';

export function useLocalized() {
    const { locale } = useI18n();

    const loc = (value) => resolve(value, locale.value);
    const deep = (value) => locDeep(value, locale.value);

    return {
        locale: computed(() => locale.value),
        loc,
        locDeep: deep,
        searchHaystack,
    };
}
