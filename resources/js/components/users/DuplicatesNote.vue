<script setup>
// The duplicate check on a card being created: the same national ID, phone,
// email or name already on a practitioner, a patient or a waiting registration.
// The specification asks for it three times; SAP grew 41,922 patient records
// matched only by phone without it.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ANum from '@/components/ui/ANum.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { usePeopleStore } from '@/stores/people';

const props = defineProps({
    /** `{ tz, phone, email, first, last, name }` — whatever the form holds so far. */
    probe: { type: Object, required: true },
    /** A code to leave out — the card being edited, or the registration itself. */
    exclude: { type: String, default: '' },
});

const { t } = useI18n();
const { loc } = useLocalized();
const people = usePeopleStore();

const probing = computed(() =>
    Boolean(
        String(props.probe.tz || '').trim() ||
        String(props.probe.phone || '').trim() ||
        String(props.probe.email || '').trim(),
    ),
);

const matches = computed(() =>
    probing.value ? people.findDuplicates(props.probe, props.exclude) : [],
);
</script>

<template>
    <ACard :title="t('users.duplicates.title')" icon="shield">
        <template #right>
            <V2Badge id="duplicates" size="sm" />
        </template>

        <p v-if="!probing" class="a-hint">{{ t('users.duplicates.idle') }}</p>

        <div v-else-if="matches.length" class="a-note a-note--warn">
            <strong>{{
                t('users.duplicates.found', { n: matches.length })
            }}</strong>
            <ul class="a-ul">
                <li
                    v-for="match in matches"
                    :key="`${match.kind}-${match.code}`"
                    class="match"
                >
                    <AChip size="sm" :dot="false">{{
                        t(`users.duplicates.kind.${match.kind}`)
                    }}</AChip>
                    <span class="t-strong">{{ loc(match.name) }}</span>
                    <ANum>{{ match.code }}</ANum>
                    <span class="t-sub">
                        {{
                            match.reasons
                                .map((reason) =>
                                    t(`users.duplicates.reason.${reason}`),
                                )
                                .join(' · ')
                        }}
                    </span>
                </li>
            </ul>
        </div>

        <div v-else class="a-note a-note--ok">
            {{ t('users.duplicates.none') }}
        </div>
    </ACard>
</template>

<style scoped>
.t-strong {
    font-weight: 700;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}

.match {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}
</style>
