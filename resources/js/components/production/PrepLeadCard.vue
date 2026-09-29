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
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ACard from '@/components/ui/ACard.vue';
import AInput from '@/components/ui/AInput.vue';
import ASelect from '@/components/ui/ASelect.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { LEAD_UNIT_IDS } from '@/config';
import { useItemsStore } from '@/stores/items';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const store = useItemsStore();

const rows = computed(() =>
    [...store.prepTypes].sort((a, b) =>
        loc(a.name).localeCompare(loc(b.name), 'he'),
    ),
);

const unitOptions = computed(() =>
    LEAD_UNIT_IDS.map((id) => ({
        value: id,
        label: t(`items.lead.unitName.${id}`),
    })),
);

/** How many items are produced this way, so the figure has a size to it. */
const usedBy = (type) =>
    store.rows.filter(
        (row) =>
            (row.bomCount || 0) > 0 && (row.prepTypes || [])[0] === type.id,
    ).length;

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
    <ACard :title="t('items.lead.title')" icon="clock">
        <template #right>
            <V2Badge v="3" size="sm" />
        </template>

        <p class="a-hint pl-lede">{{ t('items.lead.hint') }}</p>

        <ul class="pl-list">
            <li v-for="type in rows" :key="type.id" class="pl-row">
                <div class="pl-name">
                    <div class="t-strong">{{ loc(type.name) }}</div>
                    <div v-if="usedBy(type)" class="t-sub">
                        {{ t('items.lead.usedBy', { n: usedBy(type) }) }}
                    </div>
                </div>
                <div class="a-fields pl-fields">
                    <label class="a-field">
                        <span>{{ t('items.lead.amount') }}</span>
                        <AInput
                            :model-value="type.lead?.amount ?? ''"
                            type="number"
                            min="0"
                            ltr
                            @update:model-value="
                                setLead(type, { amount: $event })
                            "
                        />
                    </label>
                    <label class="a-field">
                        <span>{{ t('items.lead.unitLabel') }}</span>
                        <ASelect
                            :model-value="type.lead?.unit || 'week'"
                            :options="unitOptions"
                            @update:model-value="
                                setLead(type, { unit: $event })
                            "
                        />
                    </label>
                </div>
            </li>
        </ul>
    </ACard>
</template>

<style scoped>
.pl-lede {
    margin: 0 0 12px;
    max-width: 86ch;
}

.pl-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 10px;
}

.pl-row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 10px 14px;
    border: 1px solid var(--a-line);
    border-radius: 10px;
}

.pl-name {
    flex: 1 1 200px;
    min-width: 0;
}

.pl-fields {
    --a-field-w: 116px;
    flex: 0 0 auto;
    width: 260px;
}

.t-sub {
    font-size: 12.5px;
    color: var(--a-ink-4);
}
</style>
