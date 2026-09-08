<script setup>
// Supplier delivery notes: open until the invoice for them arrives. The list
// answers the bookkeeper's two questions — which deliveries are not yet billed,
// and which invoice covered which delivery.
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import APagination from '@/components/ui/APagination.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterChips from '@/components/ui/FilterChips.vue';
import FilterDrawer from '@/components/ui/FilterDrawer.vue';
import SavedViews from '@/components/ui/SavedViews.vue';
import {
    filterDefaults,
    PAGE_DEFAULTS,
    useListFilters,
    usePaged,
} from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import {
    SUPPLIER_NOTE_FILTER_FIELDS,
    SUPPLIER_NOTE_FILTER_GROUPS,
} from '@/config';
import { isoDaysAgo } from '@/lib/dates';
import { usePurchasingStore } from '@/stores/purchasing';

const emit = defineEmits(['open-po']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const router = useRouter();
const store = usePurchasingStore();

const SPEC = { fields: SUPPLIER_NOTE_FILTER_FIELDS };

const drawerOpen = ref(false);
const savedViews = ref(null);

const state = useUrlState({
    nq: '',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
});

const closing = ref(null);
const invoice = reactive({ num: '', date: isoDaysAgo(0) });

const searched = computed(() => {
    const term = state.nq.trim().toLowerCase();

    if (!term) {
        return store.supplierNotes;
    }

    return store.supplierNotes.filter((note) =>
        searchHaystack(
            note.id,
            note.po,
            note.supplier,
            note.docNum,
            note.invoice?.num,
        ).includes(term),
    );
});

const filters = useListFilters(SPEC, state, searched);

const rows = computed(() => filters.rows);

const { paged, total } = usePaged(rows, state);

const dirty = computed(() => filters.dirty || Boolean(state.nq));

const spec = computed(() => ({
    id: 'supplierNotes',
    ns: 'purchasing',
    noun: t('purchasing.filter.noteNoun'),
    groups: SUPPLIER_NOTE_FILTER_GROUPS,
    fields: SUPPLIER_NOTE_FILTER_FIELDS.map((field) =>
        field.key === 'nsup'
            ? {
                  ...field,
                  optionLabel: (code) => {
                      const hit = store.supplierNotes.find(
                          (note) => note.supplierCode === code,
                      );

                      return hit ? loc(hit.supplier) : String(code);
                  },
              }
            : field,
    ),
}));

function clear() {
    state.nq = '';
    filters.clear();
}

function applyView(patch) {
    Object.assign(state, filterDefaults(SPEC), { nq: '' }, patch);
}

function removeChip(chip) {
    if (chip.value === null) {
        filters.clearField(chip.key);

        return;
    }

    filters.toggle(chip.key, chip.value);
}

const cols = computed(() => [
    {
        k: 'id',
        label: t('purchasing.notes.col.id'),
        nowrap: true,
        sortable: true,
    },
    { k: 'po', label: t('purchasing.notes.col.po'), nowrap: true },
    { k: 'supplier', label: t('purchasing.notes.col.supplier') },
    { k: 'docNum', label: t('purchasing.notes.col.docNum'), nowrap: true },
    {
        k: 'when',
        label: t('purchasing.notes.col.when'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.when.iso,
    },
    { k: 'lines', label: t('purchasing.notes.col.lines'), nowrap: true },
    { k: 'receipt', label: t('purchasing.notes.col.receipt'), nowrap: true },
    { k: 'state', label: t('purchasing.notes.col.state'), nowrap: true },
    { k: 'invoice', label: t('purchasing.notes.col.invoice'), nowrap: true },
]);

function openReceipt(id) {
    router.push({ name: 'inventory', query: { tab: 'receipts', receipt: id } });
}

function startClose(note) {
    closing.value = note;
    invoice.num = '';
    invoice.date = isoDaysAgo(0);
}

async function confirmClose() {
    if (!invoice.num.trim()) {
        return;
    }

    const note = closing.value;

    await store.closeNote(note.id, invoice.num, invoice.date);
    push({
        title: t('purchasing.notes.closed'),
        body: t('purchasing.notes.closedBody', {
            id: note.id,
            num: invoice.num,
        }),
    });
    closing.value = null;
}
</script>

<template>
    <div class="a-grid a-tabbody">
        <div class="a-note a-note--info">{{ t('purchasing.notes.note') }}</div>

        <SavedViews
            ref="savedViews"
            :spec="spec"
            :filters="state"
            :rows="searched"
            @apply="applyView"
        />

        <FilterBar
            :count="rows.length"
            :label="
                t('purchasing.notes.count', {
                    total: store.supplierNotes.length,
                })
            "
            :dirty="dirty"
            @clear="clear"
        >
            <AInput
                v-model="state.nq"
                class="search"
                :placeholder="t('purchasing.notes.search')"
            />
            <AButton icon="layers" @click="drawerOpen = true">
                {{
                    filters.active.length
                        ? t('filters.openWith', { n: filters.active.length })
                        : t('filters.open')
                }}
            </AButton>
        </FilterBar>

        <FilterChips
            :spec="spec"
            :filters="state"
            :rows="searched"
            @remove="removeChip"
            @clear="clear"
        />

        <ADataTable :cols="cols" :rows="paged" row-key="id">
            <template #cell-id="{ row }"
                ><span class="t-strong num">{{ row.id }}</span></template
            >
            <template #cell-po="{ row }">
                <button
                    type="button"
                    class="a-linkbtn"
                    @click="emit('open-po', row.po)"
                >
                    <ANum>{{ row.po }}</ANum>
                </button>
            </template>
            <template #cell-supplier="{ row }">{{
                loc(row.supplier)
            }}</template>
            <template #cell-docNum="{ row }"
                ><ANum>{{ row.docNum }}</ANum></template
            >
            <template #cell-when="{ row }"
                ><ANum>{{ row.when.stamp }}</ANum></template
            >
            <template #cell-lines="{ row }"
                ><ANum>{{ row.lines.length }}</ANum></template
            >
            <template #cell-receipt="{ row }">
                <button
                    v-if="row.receipt"
                    type="button"
                    class="a-linkbtn"
                    @click="openReceipt(row.receipt)"
                >
                    <ANum>{{ row.receipt }}</ANum>
                </button>
                <span v-else class="t-sub">—</span>
            </template>
            <template #cell-state="{ row }">
                <AChip :tone="row.state === 'closed' ? 'green' : 'amber'">
                    {{ t(`purchasing.noteState.${row.state}`) }}
                </AChip>
            </template>
            <template #cell-invoice="{ row }">
                <template v-if="row.invoice">
                    <ANum>{{ row.invoice.num }}</ANum>
                    <div class="t-sub">{{ row.invoice.when.stamp }}</div>
                </template>
                <AButton v-else sm icon="check" @click.stop="startClose(row)">
                    {{ t('purchasing.action.closeNote') }}
                </AButton>
            </template>
        </ADataTable>

        <APagination
            v-model:page="state.pg"
            v-model:size="state.ps"
            :total="total"
        />

        <FilterDrawer
            :open="drawerOpen"
            :spec="spec"
            :filters="state"
            :rows="searched"
            :result-count="rows.length"
            @close="drawerOpen = false"
            @clear="clear"
            @patch="filters.patch"
            @save="savedViews?.openSave()"
        />

        <AModal
            :open="Boolean(closing)"
            :title="
                closing
                    ? t('purchasing.notes.closeTitle', { id: closing.id })
                    : ''
            "
            :width="520"
            @close="closing = null"
        >
            <div class="a-2col">
                <div>
                    <label class="a-lbl">{{
                        t('purchasing.notes.invoiceNum')
                    }}</label>
                    <AInput v-model="invoice.num" ltr class="a-w100" />
                </div>
                <div>
                    <label class="a-lbl">{{
                        t('purchasing.notes.invoiceDate')
                    }}</label>
                    <AInput v-model="invoice.date" type="date" class="a-w100" />
                </div>
            </div>
            <template #footer>
                <AButton
                    kind="p"
                    icon="check"
                    :disabled="!invoice.num.trim()"
                    @click="confirmClose"
                >
                    {{ t('purchasing.notes.closeConfirm') }}
                </AButton>
                <AButton @click="closing = null">{{
                    t('actions.cancel')
                }}</AButton>
            </template>
        </AModal>
    </div>
</template>

<style scoped>
.a-tabbody {
    margin-top: 20px;
}

.search {
    width: 320px;
    max-width: 100%;
}
</style>
