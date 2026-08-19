<script setup>
// שולחן בדיקות — the simulator.
//
// Type the medicines a patient declared, pick the herbs a formula contains, and
// the right-hand card shows exactly what the practitioner would see in the
// compounding wizard: the same matching rule, the same InteractionCard. It is the
// only way to check a change to the table without placing an order.
//
// Both inputs are query parameters, so a simulated case can be pasted into a
// message and reopened as it was.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchField from '@/components/safety/SearchField.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import InteractionCard from '@/components/ui/InteractionCard.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { drugList, herbMatches, useSafetyStore } from '@/stores/safety';

const { t } = useI18n();
const { loc } = useLocalized();
const store = useSafetyStore();

const view = useUrlState({ meds: '', herbs: [], bq: '' });

const meds = computed(() => drugList(view.meds));

const shownHerbs = computed(() =>
    store.herbs.filter((herb) => herbMatches(herb, view.bq)),
);

const hits = computed(() => store.benchHits(view.herbs, meds.value));

/** Nothing is simulated until there is a medicine and a herb to match it to. */
const ready = computed(() => meds.value.length > 0 && view.herbs.length > 0);

const dirty = computed(() =>
    Boolean(view.meds || view.herbs.length || view.bq),
);

function toggle(id) {
    view.herbs = view.herbs.includes(id)
        ? view.herbs.filter((picked) => picked !== id)
        : [...view.herbs, id];
}

function clear() {
    view.meds = '';
    view.herbs = [];
    view.bq = '';
}
</script>

<template>
    <div class="a-2col a-bench">
        <ACard :title="t('safety.bench.title')" icon="beaker">
            <template #right>
                <AButton v-if="dirty" sm icon="x" @click="clear">
                    {{ t('safety.bench.clear') }}
                </AButton>
            </template>

            <label class="a-lbl" for="bench-meds">
                {{ t('safety.bench.medsLabel') }}
            </label>
            <AInput
                id="bench-meds"
                v-model="view.meds"
                class="a-w100"
                ltr
                :placeholder="t('safety.bench.medsPlaceholder')"
            />

            <div class="a-lbl a-bench-l">
                {{ t('safety.bench.herbsLabel') }}
                <span class="a-bench-n">
                    · {{ t('safety.bench.picked', { n: view.herbs.length }) }}
                </span>
            </div>

            <SearchField
                v-model="view.bq"
                variant="wide"
                :placeholder="t('safety.herbSearchAria')"
                :label="t('safety.bench.herbSearchAria')"
            />

            <div class="a-scrolly a-bench-box">
                <span v-if="!shownHerbs.length" class="a-bench-none">
                    {{ t('safety.herbNotFound', { q: view.bq.trim() }) }}
                </span>

                <AButton
                    v-for="herb in shownHerbs"
                    :key="herb.id"
                    sm
                    :kind="view.herbs.includes(herb.id) ? 'p' : ''"
                    @click="toggle(herb.id)"
                >
                    {{ loc(herb.name) }}
                </AButton>
            </div>
        </ACard>

        <ACard :title="t('safety.bench.result')" icon="eye">
            <AEmpty
                v-if="!ready"
                icon="beaker"
                :title="t('safety.bench.empty.title')"
                :sub="t('safety.bench.empty.sub')"
            />

            <div v-else-if="!hits.length" class="a-note a-note--ok">
                {{ t('safety.bench.clean') }}
            </div>

            <div v-else class="a-grid a-bench-hits">
                <InteractionCard
                    v-for="hit in hits"
                    :key="hit.id"
                    :herb="loc(hit.herb?.name)"
                    :med="hit.med"
                    :drugs="hit.drugs"
                />
            </div>
        </ACard>
    </div>
</template>

<style scoped>
.a-bench {
    margin-top: 20px;
}

.a-bench-l {
    margin-top: 18px;
}

/* The count beside the label is prose, not part of the uppercase label. */
.a-bench-n {
    text-transform: none;
    letter-spacing: 0;
    color: var(--a-ink-4);
}

.a-bench-box {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    max-height: 220px;
    margin-top: 10px;
    padding: 12px;
    border: 1px solid var(--a-line);
    border-radius: 9px;
}

.a-bench-none {
    color: var(--a-ink-4);
}

.a-bench-hits {
    gap: 12px;
}
</style>
