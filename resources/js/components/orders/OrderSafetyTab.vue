<script setup>
// The safety tab: every documented interaction between the herbs on this order
// and the medicines the customer declared, plus the signed declaration itself.
//
// The three states are distinct on purpose and must not be collapsed into one
// "all clear": no medicines declared (nothing to check), medicines declared and
// nothing documented found (a check that ran and passed), and one card per
// documented herb/medicine pair. An agent has to be able to tell them apart.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ACard from '@/components/ui/ACard.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ANum from '@/components/ui/ANum.vue';
import InteractionCard from '@/components/ui/InteractionCard.vue';
import ScanPlaceholder from '@/components/users/ScanPlaceholder.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useOrdersStore } from '@/stores/orders';

const props = defineProps({
    order: { type: Object, required: true },
});

const { t } = useI18n();
const { loc } = useLocalized();
const orders = useOrdersStore();

const meds = computed(() => props.order.patient?.meds || []);
const hits = computed(() => orders.interactionsFor(props.order));

/** How many distinct herbs were checked — the formulas' herbs, deduplicated. */
const herbCount = computed(() => orders.herbsOf(props.order).length);
</script>

<template>
    <div class="a-grid">
        <ACard :title="t('orders.safety.interactions')" icon="shield">
            <div v-if="!meds.length" class="a-note a-note--ok">
                {{ t('orders.safety.noMeds') }}
            </div>

            <div v-else-if="!hits.length" class="a-note a-note--ok">
                {{
                    t('orders.safety.noneFound', {
                        herbs: herbCount,
                        meds: meds.length,
                    })
                }}
            </div>

            <div v-else class="a-grid os-hits">
                <InteractionCard
                    v-for="hit in hits"
                    :key="hit.id"
                    :herb="loc(hit.herb.name)"
                    :med="hit.med"
                    :drugs="hit.drugs"
                />
            </div>
        </ACard>

        <ACard :title="t('orders.safety.declaration')" icon="signature">
            <div class="os-decl">
                <ScanPlaceholder :height="78" />
                <AKeyValue
                    :rows="[
                        [t('orders.safety.signer'), loc(order.patient.name)],
                        [t('orders.safety.form'), t('orders.safety.formType')],
                        [t('orders.safety.date'), null],
                        [
                            t('orders.safety.declaredMeds'),
                            meds.length
                                ? meds.join(' · ')
                                : t('orders.safety.noneDeclared'),
                        ],
                    ]"
                >
                    <template #value-2>
                        <ANum>{{ order.stamp }}</ANum>
                    </template>
                </AKeyValue>
            </div>

            <div class="a-note a-note--info os-note">
                {{ t('orders.safety.onFile') }}
            </div>
        </ACard>
    </div>
</template>

<style scoped>
.os-hits {
    gap: 12px;
}

.os-decl {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 22px;
    align-items: center;
}

.os-note {
    margin-top: 14px;
}

@media (max-width: 900px) {
    .os-decl {
        grid-template-columns: 1fr;
    }
}
</style>
