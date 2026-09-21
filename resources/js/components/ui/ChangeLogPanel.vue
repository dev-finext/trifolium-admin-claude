<script setup>
// The change log of one record: every edit that touched this item, this
// practitioner or this customer, newest first.
//
// It reads the system log rather than a log of its own, so a change shows here
// and on the system log screen as the same row, written once. A row that names
// the field it changed says so; an action that is not a field edit — a card
// activated, a password reset — reads as itself.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ACard from '@/components/ui/ACard.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useDatasetStore } from '@/stores/dataset';

const props = defineProps({
    /** The log's own entity type — `catalog_item`, `practitioner`, `patient`. */
    entity: { type: String, required: true },
    /** The record's key, as the log writes it. */
    refId: { type: [String, Number], required: true },
    /** How many rows before "and {n} older". */
    limit: { type: Number, default: 12 },
});

const { t, te } = useI18n();
const { loc } = useLocalized();
const dataset = useDatasetStore();

const rows = computed(() =>
    (dataset.data.log || []).filter(
        (row) =>
            row.entType === props.entity &&
            String(row.ent) === String(props.refId),
    ),
);

const shown = computed(() => rows.value.slice(0, props.limit));
const older = computed(() => Math.max(0, rows.value.length - props.limit));

/**
 * The field's own label. The log stores the key rather than the text, so a
 * card read in English says what it changed in English.
 */
const fieldName = (key) => (te(key) ? t(key) : key);

/**
 * A value the log stored, ready to read: empty reads as "—", and a value that
 * is itself a label key reads as the label.
 */
const value = (one) => {
    const text = one === null || one === undefined ? '' : String(one).trim();

    if (!text) {
        return '—';
    }

    return te(text) ? t(text) : text;
};
</script>

<template>
    <ACard :title="t('log.record.title')" icon="list">
        <template #right>
            <span class="t-sub">{{
                t('log.record.count', { n: rows.length })
            }}</span>
        </template>

        <p v-if="!rows.length" class="t-sub">{{ t('log.record.empty') }}</p>

        <ol v-else class="rows">
            <li v-for="row in shown" :key="row.id" class="row">
                <div class="head">
                    <span class="what">
                        {{
                            row.field
                                ? t('log.record.fieldChanged', {
                                      field: fieldName(row.field),
                                  })
                                : t(`logAction.${row.act}`)
                        }}
                    </span>
                    <span class="t-sub">
                        <ANum>{{ row.when.stamp }}</ANum>
                        <template v-if="row.actor">
                            · {{ loc(row.actor) }}</template
                        >
                    </span>
                </div>
                <div v-if="row.from || row.to" class="change">
                    <span class="was">{{ value(row.from) }}</span>
                    <span class="arrow">←</span>
                    <span class="now">{{ value(row.to) }}</span>
                </div>
                <div v-if="row.note" class="t-sub note">{{ row.note }}</div>
            </li>
        </ol>

        <p v-if="older" class="t-sub older">
            {{ t('log.record.older', { n: older }) }}
        </p>
    </ACard>
</template>

<style scoped>
.rows {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 10px;
}

.row {
    padding-bottom: 10px;
    border-bottom: 1px solid var(--a-line);
}

.row:last-child {
    padding-bottom: 0;
    border-bottom: 0;
}

.head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
}

.what {
    font-size: 13.5px;
    font-weight: 600;
}

.change {
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 3px;
    font-size: 13px;
}

.was {
    color: var(--a-ink-4);
    text-decoration: line-through;
}

.arrow {
    color: var(--a-ink-4);
}

.note {
    margin-top: 3px;
}

.older {
    margin: 10px 0 0;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
