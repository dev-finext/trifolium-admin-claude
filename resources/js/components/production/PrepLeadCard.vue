<script setup>
// זמן אספקה לפי סוג הכנה.
//
// How long producing something here takes is a fact about the preparation, not
// about the herb: grinding a powder takes what grinding a powder takes, whoever
// it is for. So the figure lives on the preparation type, once, and every item
// made that way reads it — which is what stops nine hundred item cards each
// carrying their own guess.
//
// An item may still say otherwise on its own card, and then the card wins; the
// item drawer names which of the two it is using.
//
// A table, and one header row. This was a list of fat rows that each carried
// their own pair of small grey labels over two boxes — seventeen copies of the
// one arrangement the console does not use, with the name of the preparation
// pushed to the far side of an empty stripe. In a table the column says what
// the cell is, once, and the rows line up underneath it.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ADataTable from '@/components/ui/ADataTable.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { leadDays, LEAD_UNIT_IDS } from '@/config';
import { useItemsStore } from '@/stores/items';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const store = useItemsStore();

/**
 * How many items are produced each way, counted once for the whole table
 * rather than per row: the item list is fourteen hundred rows long.
 */
const madeCount = computed(() => {
    const counts = new Map();

    store.rows.forEach((row) => {
        const type = (row.prepTypes || [])[0];

        if ((row.bomCount || 0) > 0 && type) {
            counts.set(type, (counts.get(type) || 0) + 1);
        }
    });

    return counts;
});

const rows = computed(() =>
    [...store.prepTypes]
        .map((type) => ({
            id: type.id,
            type,
            name: loc(type.name),
            used: madeCount.value.get(type.id) || 0,
            amount: type.lead?.amount ?? null,
            unit: type.lead?.unit || 'week',
            days: leadDays(type.lead),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'he')),
);

const cols = computed(() => [
    { k: 'name', label: t('items.lead.colType'), sortable: true },
    {
        k: 'used',
        label: t('items.lead.colUsed'),
        align: 'end',
        nowrap: true,
        sortable: true,
    },
    { k: 'amount', label: t('items.lead.amount'), nowrap: true },
    { k: 'unit', label: t('items.lead.unitLabel'), nowrap: true },
    {
        k: 'days',
        label: t('items.lead.colDays'),
        align: 'end',
        nowrap: true,
        sortable: true,
    },
]);

const unitOptions = computed(() =>
    LEAD_UNIT_IDS.map((id) => ({
        value: id,
        label: t(`items.lead.unitName.${id}`),
    })),
);

function setLead(type, patch) {
    const next = { ...(type.lead || { amount: null, unit: 'week' }), ...patch };

    type.lead =
        next.amount === '' || next.amount === null
            ? null
            : { amount: Number(next.amount), unit: next.unit || 'week' };

    push({ title: t('items.lead.saved'), body: loc(type.name) });
}
</script>

<template>
    <div class="pl">
        <p class="a-hint pl-lede">{{ t('items.lead.hint') }}</p>

        <ADataTable :cols="cols" :rows="rows" row-key="id">
            <template #cell-name="{ row }">
                <span class="t-strong">{{ row.name }}</span>
            </template>
            <template #cell-used="{ row }">
                <ANum :class="{ 'pl-nil': !row.used }">{{ row.used }}</ANum>
            </template>
            <template #cell-amount="{ row }">
                <AInput
                    :model-value="row.amount ?? ''"
                    type="number"
                    min="0"
                    ltr
                    class="pl-amount"
                    :aria-label="t('items.lead.amount')"
                    @update:model-value="setLead(row.type, { amount: $event })"
                />
            </template>
            <template #cell-unit="{ row }">
                <ASelect
                    :model-value="row.unit"
                    :options="unitOptions"
                    class="pl-unit"
                    :aria-label="t('items.lead.unitLabel')"
                    @update:model-value="setLead(row.type, { unit: $event })"
                />
            </template>
            <template #cell-days="{ row }">
                <ANum :class="{ 'pl-nil': !row.days }">{{
                    row.days ? t('items.lead.days', { n: row.days }) : '—'
                }}</ANum>
            </template>
        </ADataTable>
    </div>
</template>

<style scoped>
.pl {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
}

.pl-lede {
    margin: 0;
    max-width: 86ch;
}

.pl-amount {
    width: 84px;
}

.pl-unit {
    width: 124px;
}

/* A preparation nothing is made by, or one with no figure yet. */
.pl-nil {
    color: var(--a-ink-4);
}
</style>
