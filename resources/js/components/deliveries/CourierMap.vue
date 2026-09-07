<script setup>
// The courier code mapping.
//
// A courier company is identified on the shipping label — and at the start of
// every tracking number — by a single letter. The letter itself is fixed
// configuration; the company name and the phone behind it are the pharmacy's own
// settings and are edited here.
//
// New orders read the updated names. Orders already placed keep showing the code
// stored on them, because that is what their printed label carries.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useCourierName } from '@/components/deliveries/useCourierName';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useToast } from '@/composables/useToast';
import { COURIERS } from '@/config';
import { useDeliveriesStore } from '@/stores/deliveries';

const { t, locale } = useI18n();
const { push } = useToast();
const deliveries = useDeliveriesStore();
const { courierName } = useCourierName();

/** The editable draft. Committed to the store only through the confirm dialog. */
const rows = ref([]);
const ask = ref(false);

/** Read the draft back from configuration plus whatever the pharmacy saved. */
function seed() {
    rows.value = COURIERS.map((courier) => ({
        id: courier.id,
        code: courier.code,
        hasApi: courier.hasApi,
        historical: Boolean(courier.historical),
        tp: Boolean(courier.tp),
        v2: Boolean(courier.v2),
        name: courierName(courier.id),
        phone: deliveries.courierPhone(courier.id),
    }));
}

// Switching language changes what an unedited name reads as, so the draft is
// re-read rather than left showing the previous catalog's wording.
watch(locale, seed, { immediate: true });

const dirty = computed(() =>
    rows.value.some(
        (row) =>
            row.name.trim() !== courierName(row.id) ||
            row.phone.trim() !== deliveries.courierPhone(row.id),
    ),
);

/** A company with no name could not be told apart from its letter code. */
const valid = computed(() =>
    rows.value.every((row) => row.name.trim().length > 0),
);

/** How much work each company is currently holding, straight from the desk. */
const openCounts = computed(() => {
    const counts = {};

    deliveries.deskOrders.forEach((order) => {
        if (order.courier) {
            counts[order.courier] = (counts[order.courier] || 0) + 1;
        }
    });

    return counts;
});

const cols = computed(() => [
    { k: 'code', label: t('deliveries.codes.col.code'), w: '110px' },
    { k: 'name', label: t('deliveries.codes.col.name') },
    { k: 'phone', label: t('deliveries.codes.col.phone'), w: '210px' },
    { k: 'api', label: t('deliveries.codes.col.api'), w: '160px' },
    { k: 'orders', label: t('deliveries.codes.col.orders'), w: '170px' },
]);

const effects = computed(() => [
    t('deliveries.codes.effect.newOrders'),
    t('deliveries.codes.effect.oldOrders'),
    t('deliveries.codes.effect.log'),
]);

async function save() {
    ask.value = false;

    await deliveries.saveCourierMap(
        rows.value.map((row) => ({
            id: row.id,
            name: row.name,
            phone: row.phone,
        })),
    );

    seed();
    push({
        title: t('deliveries.codes.done.title'),
        body: t('deliveries.codes.done.body'),
    });
}
</script>

<template>
    <ACard :title="t('deliveries.codes.title')" icon="settings" :pad="false">
        <template #right>
            <AButton
                sm
                kind="p"
                icon="save"
                :disabled="!dirty || !valid"
                @click="ask = true"
            >
                {{ t('deliveries.codes.save') }}
            </AButton>
        </template>

        <div class="intro">
            <div class="a-note a-note--info">
                {{ t('deliveries.codes.note') }}
            </div>
        </div>

        <ADataTable :cols="cols" :rows="rows" row-key="id">
            <template #cell-code="{ row }">
                <span class="a-code a-tag code">{{ row.code }}</span>
                <V2Badge v-if="row.v2" id="couriers" size="sm" />
                <div v-if="row.historical" class="t-sub">
                    {{ t('deliveries.codes.historical') }}
                </div>
                <div v-if="row.tp" class="t-sub">
                    {{ t('deliveries.codes.tp') }}
                </div>
            </template>

            <template #cell-name="{ row }">
                <AInput
                    v-model="row.name"
                    class="a-w100"
                    :aria-label="
                        t('deliveries.codes.nameLabel', { code: row.code })
                    "
                />
            </template>

            <template #cell-phone="{ row }">
                <AInput
                    v-model="row.phone"
                    ltr
                    class="a-w100"
                    :aria-label="
                        t('deliveries.codes.phoneLabel', { code: row.code })
                    "
                />
            </template>

            <template #cell-api="{ row }">
                <AChip :tone="row.hasApi ? 'green' : 'gray'" size="sm">
                    {{
                        row.hasApi
                            ? t('deliveries.codes.api.on')
                            : t('deliveries.codes.api.off')
                    }}
                </AChip>
            </template>

            <template #cell-orders="{ row }">
                <ANum>{{ openCounts[row.id] || 0 }}</ANum>
            </template>
        </ADataTable>
    </ACard>

    <ConfirmDialog
        :open="ask"
        :title="t('deliveries.codes.confirm.title')"
        :body="t('deliveries.codes.confirm.body')"
        :effects="effects"
        :confirm-label="t('deliveries.codes.confirm.label')"
        @close="ask = false"
        @confirm="save"
    />
</template>

<style scoped>
.intro {
    padding: 16px 22px;
}

.code {
    font-size: 15px;
    font-weight: 700;
}
</style>
