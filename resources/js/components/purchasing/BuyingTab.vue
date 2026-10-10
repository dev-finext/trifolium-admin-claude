<script setup>
// רכש — the sheets the buyer has, listed.
//
// The page is an index, not an editor: every request or order the pharmacy has
// written, newest first, with where each one stands. "New" opens an empty one,
// and a row opens the one it names.
//
// Where it opens depends on what the document is. A request is a shopping list
// filled in a sitting or two, so it is a window — everything in one popup. An
// order is a document with a life behind it — drafted, sent, received or
// failed, with a goods receipt and a history — so it is a drawer, which is what
// the console uses for a record you open to find out what happened to it.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import OrderDrawer from '@/components/purchasing/OrderDrawer.vue';
import RequestModal from '@/components/purchasing/RequestModal.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { buyingStateTone } from '@/config';
import { useBuyingStore } from '@/stores/buying';

const props = defineProps({
    /** `'request'` or `'order'`. */
    kind: { type: String, required: true },
});

const { t } = useI18n();
const { loc } = useLocalized();
const store = useBuyingStore();

// The open sheet is an address, so a colleague sent the link opens the sheet.
const view = useUrlState({ sheet: '' });

const sheets = computed(() => store.listsOf(props.kind));

const open = computed(() => (view.sheet ? store.listById(view.sheet) : null));

function newSheet() {
    view.sheet = store.createList(props.kind).id;
}

const cols = computed(() => {
    const out = [
        { k: 'number', label: t('buying.col.number'), nowrap: true },
        { k: 'created', label: t('buying.col.opened'), nowrap: true },
        { k: 'by', label: t('buying.col.by') },
    ];

    if (props.kind === 'order') {
        out.push({ k: 'supplier', label: t('buying.supplier') });
    }

    out.push(
        { k: 'lines', label: t('buying.col.lines'), align: 'end' },
        { k: 'state', label: t('buying.col.sheetState'), nowrap: true },
        { k: 'note', label: t('buying.note') },
    );

    return out;
});

/** A request says how far through its checklist it is; an order what came in. */
function progress(row) {
    if (!row.lines.length) {
        return '';
    }

    if (row.kind === 'request') {
        return t('buying.request.ticked', {
            done: row.lines.filter((line) => line.done).length,
            total: row.lines.length,
        });
    }

    const arrived = row.lines.filter((line) => line.received !== null).length;

    return arrived
        ? t('buying.order.arrived', { done: arrived, total: row.lines.length })
        : '';
}
</script>

<template>
    <div class="bt">
        <div class="a-pane bt-head">
            <span class="bt-count">
                {{
                    t('buying.sheetCount', { n: sheets.length }, sheets.length)
                }}
            </span>
            <AButton class="a-push" kind="p" icon="plus" @click="newSheet">
                {{ t(`buying.${kind}.new`) }}
            </AButton>
        </div>

        <AEmpty
            v-if="!sheets.length"
            icon="inbox"
            :title="t(`buying.${kind}.emptyTitle`)"
            :sub="t(`buying.${kind}.emptySub`)"
        />

        <ADataTable
            v-else
            :cols="cols"
            :rows="sheets"
            row-key="id"
            :selected="view.sheet"
            @row="view.sheet = $event.id"
        >
            <template #cell-number="{ row }">
                <ANum class="a-code">{{ row.number }}</ANum>
            </template>
            <template #cell-created="{ row }">
                <ANum>{{ row.created?.stamp || '—' }}</ANum>
            </template>
            <template #cell-by="{ row }">{{
                row.by ? loc(row.by) : '—'
            }}</template>
            <template #cell-supplier="{ row }">
                <span :class="{ 'bt-nil': !row.supplier }">{{
                    loc(row.supplier) || '—'
                }}</span>
            </template>
            <template #cell-lines="{ row }">
                <ANum>{{ row.lines.length }}</ANum>
                <span v-if="progress(row)" class="bt-progress">{{
                    progress(row)
                }}</span>
            </template>
            <template #cell-state="{ row }">
                <AChip :tone="buyingStateTone(row.state)">
                    {{ t(`buying.state.${row.state}`) }}
                </AChip>
            </template>
            <template #cell-note="{ row }">
                <span :class="{ 'bt-nil': !row.note }">{{
                    row.note || '—'
                }}</span>
            </template>
        </ADataTable>

        <RequestModal
            v-if="open && kind === 'request'"
            :list="open"
            @close="view.sheet = ''"
        />
        <OrderDrawer
            v-if="open && kind === 'order'"
            :list="open"
            @close="view.sheet = ''"
        />
    </div>
</template>

<style scoped>
.bt {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
}

.bt-head {
    display: flex;
    align-items: center;
    gap: 18px;
}

.bt-count {
    font-size: 13px;
    color: var(--a-ink-4);
}

.bt-progress {
    margin-inline-start: 8px;
    font-size: 12.5px;
    color: var(--a-ink-4);
}

.bt-nil {
    color: var(--a-ink-4);
}
</style>
