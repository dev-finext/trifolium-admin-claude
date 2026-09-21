<script setup>
// One inventory document, opened. The header is what SAP's document header
// holds — number, type, date, warehouse, what it was raised against — and the
// table is its lines, with the batch each line opened or drew from.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { INVENTORY_DOC } from '@/config';
import { ils, num } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';

const props = defineProps({
    /** The document, or null while the drawer is closed. */
    doc: { type: Object, default: null },
});

const emit = defineEmits(['close', 'open-batch', 'open-item']);

const { t } = useI18n();
const { loc } = useLocalized();
const inventory = useInventoryStore();

const isCount = computed(() => props.doc?.type === 'count');

const cols = computed(() =>
    [
        { k: 'sku', label: t('inventory.docs.line.item'), nowrap: true },
        { k: 'name', label: t('inventory.docs.line.name') },
        isCount.value && {
            k: 'inStock',
            label: t('inventory.docs.line.inStock'),
            nowrap: true,
        },
        isCount.value && {
            k: 'counted',
            label: t('inventory.docs.line.counted'),
            nowrap: true,
        },
        { k: 'qty', label: t('inventory.docs.line.qty'), nowrap: true },
        { k: 'batch', label: t('inventory.docs.line.batch'), nowrap: true },
        { k: 'price', label: t('inventory.docs.line.price'), nowrap: true },
    ].filter(Boolean),
);

const lines = computed(() =>
    (props.doc?.lines || []).map((line, i) => ({ id: `${i}`, ...line })),
);

const unit = (line) => (line.unit ? t(`items.uom.${line.unit}`) : '');
</script>

<template>
    <ADrawer :open="Boolean(doc)" @close="emit('close')">
        <template v-if="doc">
            <div class="a-dhead a-dhead--line">
                <div class="a-dhead-top">
                    <div>
                        <div class="a-dhead-t">
                            <h2 class="a-dhead-h">
                                {{ t(`inventory.docType.${doc.type}`) }}
                            </h2>
                            <span class="a-code a-tag">{{ doc.id }}</span>
                            <AChip
                                :tone="INVENTORY_DOC[doc.type]?.tone"
                                size="sm"
                                :dot="false"
                            >
                                {{ t(`inventory.docBase.${doc.base}`) }}
                            </AChip>
                        </div>
                        <div class="a-dhead-m">
                            <ANum>{{ doc.when.stamp }}</ANum>
                            <span v-if="doc.by">{{ loc(doc.by) }}</span>
                        </div>
                    </div>
                    <div class="a-dhead-a">
                        <AButton sm icon="x" @click="emit('close')">{{
                            t('ui.close')
                        }}</AButton>
                    </div>
                </div>
            </div>

            <div class="body">
                <AKeyValue
                    :rows="[
                        [
                            t('inventory.docs.col.wh'),
                            doc.toWarehouse
                                ? `${t(`warehouse.${doc.warehouse}.name`)} → ${t(`warehouse.${doc.toWarehouse}.name`)}`
                                : t(`warehouse.${doc.warehouse}.name`),
                        ],
                        [
                            t('inventory.docs.col.base'),
                            doc.baseRef ||
                                (doc.supplier
                                    ? loc(doc.supplier)
                                    : t('inventory.docBase.manual')),
                        ],
                        [
                            t('inventory.docs.col.remarks'),
                            doc.remarks ? loc(doc.remarks) : '—',
                        ],
                    ]"
                />

                <ADataTable
                    :cols="cols"
                    :rows="lines"
                    row-key="id"
                    class="lines"
                >
                    <template #cell-sku="{ row }">
                        <button
                            type="button"
                            class="a-linkish"
                            @click="emit('open-item', row.sku)"
                        >
                            <span class="a-code a-tag">{{ row.sku }}</span>
                        </button>
                    </template>

                    <template #cell-name="{ row }">
                        {{ loc(row.name) }}
                    </template>

                    <template #cell-inStock="{ row }">
                        <span class="num"
                            >{{ num(row.inStock, 3) }} {{ unit(row) }}</span
                        >
                    </template>

                    <template #cell-counted="{ row }">
                        <span class="num"
                            >{{ num(row.counted, 3) }} {{ unit(row) }}</span
                        >
                    </template>

                    <template #cell-qty="{ row }">
                        <span class="num" :class="{ 'is-out': row.qty < 0 }"
                            >{{ num(row.qty, 3) }} {{ unit(row) }}</span
                        >
                    </template>

                    <template #cell-batch="{ row }">
                        <button
                            v-if="row.batch"
                            type="button"
                            class="a-linkish"
                            @click="emit('open-batch', row.batch)"
                        >
                            <span class="a-code a-tag">{{
                                inventory.batchNo(row.batch)
                            }}</span>
                        </button>
                        <span v-else class="t-sub">—</span>
                    </template>

                    <template #cell-price="{ row }">
                        <span v-if="row.price" class="num">{{
                            ils(row.price, 2)
                        }}</span>
                        <span v-else class="t-sub">—</span>
                    </template>
                </ADataTable>
            </div>
        </template>
    </ADrawer>
</template>

<style scoped>
.a-dhead-h {
    margin: 0;
    font-size: 24px;
}

.body {
    display: grid;
    gap: 16px;
}

.lines {
    margin-top: 4px;
}

.is-out {
    color: var(--a-red);
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
