<script setup>
// One bill of materials: the parent, its components with quantity per unit and
// how each leaves stock, and the tincture-maker's attributes.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ANum from '@/components/ui/ANum.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { num } from '@/lib/money';
import { useItemsStore } from '@/stores/items';

const props = defineProps({
    bom: { type: Object, default: null },
});

const emit = defineEmits(['close', 'edit', 'open-item', 'removed']);

const { t } = useI18n();
const { loc } = useLocalized();
const store = useItemsStore();

const removing = ref(false);

const parent = computed(() =>
    props.bom ? store.itemBySku(props.bom.parentSku) : null,
);

const itemOf = (sku) => store.itemBySku(sku);
const nameOf = (sku) => {
    const item = itemOf(sku);

    return item
        ? loc({ he: item.names.he, en: item.names.en || item.names.he })
        : sku;
};

const cols = computed(() => [
    { k: 'item', label: t('items.bom.drawer.colItem') },
    { k: 'qty', label: t('items.bom.drawer.colQty'), nowrap: true },
    { k: 'issue', label: t('items.bom.drawer.colIssue'), nowrap: true },
    { k: 'stock', label: t('items.bom.drawer.colStock'), nowrap: true },
]);

async function confirmRemove(reason) {
    const bom = props.bom;

    await store.removeBom(bom.id, reason);
    removing.value = false;
    emit('removed', bom);
}
</script>

<template>
    <ADrawer :open="Boolean(bom)" @close="emit('close')">
        <template v-if="bom">
            <div class="a-dhead a-dhead--line">
                <div class="a-dhead-top">
                    <div>
                        <div class="a-dhead-t">
                            <h2 class="a-dhead-h">{{ loc(bom.name) }}</h2>
                            <AChip
                                v-if="bom.alcoholPct != null"
                                tone="blue"
                                :dot="false"
                            >
                                {{
                                    t('items.bom.drawer.alcohol', {
                                        n: num(bom.alcoholPct),
                                    })
                                }}
                            </AChip>
                            <AChip
                                v-if="bom.oilPct != null"
                                tone="amber"
                                :dot="false"
                            >
                                {{
                                    t('items.bom.drawer.oil', {
                                        n: num(bom.oilPct),
                                    })
                                }}
                            </AChip>
                            <AChip v-if="bom.ratio" tone="gray" :dot="false">
                                {{
                                    t('items.bom.drawer.ratio', {
                                        ratio: bom.ratio,
                                    })
                                }}
                            </AChip>
                        </div>
                        <div class="a-dhead-m">
                            <span v-if="bom.cn">{{ bom.cn }}</span>
                            <span>
                                {{
                                    t('items.bom.drawer.updated', {
                                        when: bom.updated?.stamp,
                                        by: loc(bom.updatedBy),
                                    })
                                }}
                            </span>
                        </div>
                    </div>
                    <div class="a-dhead-a">
                        <AButton
                            kind="p"
                            sm
                            icon="edit"
                            @click="emit('edit', bom)"
                        >
                            {{ t('items.bom.drawer.edit') }}
                        </AButton>
                        <AButton
                            sm
                            kind="ghost"
                            icon="trash"
                            @click="removing = true"
                        >
                            {{ t('items.bom.drawer.remove') }}
                        </AButton>
                        <AButton sm icon="x" @click="emit('close')">{{
                            t('ui.close')
                        }}</AButton>
                    </div>
                </div>
            </div>

            <ACard :title="t('items.bom.drawer.parent')" icon="tag">
                <AKeyValue
                    :rows="[
                        [t('items.bom.drawer.parentItem'), ''],
                        [
                            t('items.bom.drawer.yield'),
                            `${num(bom.yield?.qty || 1)} ${t(`items.uom.${bom.yield?.uom || 'unit'}`)}`,
                        ],
                        [
                            t('items.bom.drawer.notes'),
                            bom.notes ? loc(bom.notes) : t('items.card.noNote'),
                        ],
                    ]"
                >
                    <template #value-0>
                        <button
                            type="button"
                            class="a-linkbtn"
                            @click="emit('open-item', bom.parentSku)"
                        >
                            {{ nameOf(bom.parentSku) }}
                        </button>
                        <span class="a-code a-tag code">{{
                            parent?.code || bom.parentSku
                        }}</span>
                    </template>
                </AKeyValue>
            </ACard>

            <ACard
                :title="t('items.bom.drawer.components')"
                icon="layers"
                :pad="false"
                class="comp-card"
            >
                <template #right>
                    <span class="t-sub">{{
                        t('items.bom.n', { n: bom.components.length })
                    }}</span>
                </template>
                <ADataTable
                    :cols="cols"
                    :rows="bom.components"
                    :row-key="(row) => row.sku"
                >
                    <template #cell-item="{ row }">
                        <button
                            type="button"
                            class="a-linkbtn t-strong"
                            @click="emit('open-item', row.sku)"
                        >
                            {{ nameOf(row.sku) }}
                        </button>
                        <div class="t-sub">
                            <span class="a-code a-tag">{{
                                itemOf(row.sku)?.code || row.sku
                            }}</span>
                            <span v-if="itemOf(row.sku)?.names.lat" class="ltr">
                                · {{ itemOf(row.sku).names.lat }}</span
                            >
                        </div>
                    </template>
                    <template #cell-qty="{ row }">
                        <ANum>{{ num(row.qty, 2) }}</ANum>
                        {{ t(`items.uom.${row.uom}`) }}
                    </template>
                    <template #cell-issue="{ row }">{{
                        t(`items.bom.issue.${row.issue}`)
                    }}</template>
                    <template #cell-stock="{ row }">
                        <template v-if="store.rowBySku(row.sku)?.tracked">
                            <ANum>{{
                                num(store.rowBySku(row.sku).avail)
                            }}</ANum>
                            {{
                                t(
                                    `items.uom.${store.rowBySku(row.sku).uom?.sales}`,
                                )
                            }}
                        </template>
                        <span v-else class="t-sub">—</span>
                    </template>
                </ADataTable>
            </ACard>

            <ConfirmDialog
                v-if="removing"
                open
                danger
                reason
                :title="t('items.bom.remove.title')"
                :body="t('items.bom.remove.body', { name: loc(bom.name) })"
                :effects="[
                    t('items.bom.remove.effectItems'),
                    t('items.bom.remove.effectLog'),
                ]"
                :confirm-label="t('items.bom.remove.confirm')"
                @close="removing = false"
                @confirm="confirmRemove"
            />
        </template>
    </ADrawer>
</template>

<style scoped>
.a-dhead-h {
    margin: 0;
    font-size: 24px;
}

.code {
    margin-inline-start: 8px;
}

.comp-card {
    margin-top: 14px;
}
</style>
