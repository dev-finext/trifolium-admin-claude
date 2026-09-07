<script setup>
// One purchase order: its lines with ordered / received / open, and the
// relationship map SAP users are used to — order → delivery notes → goods
// receipts → invoice — navigable in both directions.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import ANum from '@/components/ui/ANum.vue';
import AttachmentsPanel from '@/components/ui/AttachmentsPanel.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { CURRENCY_SYMBOL, PO_STATE } from '@/config';
import { fmtISO } from '@/lib/dates';
import { num } from '@/lib/money';
import { usePurchasingStore } from '@/stores/purchasing';

const props = defineProps({
    po: { type: Object, default: null },
});

const emit = defineEmits(['close', 'edit', 'receive', 'cancelled']);

const { t } = useI18n();
const { loc } = useLocalized();
const router = useRouter();
const store = usePurchasingStore();

const cancelling = ref(false);

const notes = computed(() => (props.po ? store.notesOfPo(props.po.id) : []));
const receipts = computed(() =>
    props.po ? store.receiptsOfPo(props.po.id) : [],
);
const invoices = computed(() => notes.value.filter((note) => note.invoice));

const symbol = computed(() => CURRENCY_SYMBOL[props.po?.currency] || '');

const cols = computed(() => [
    { k: 'item', label: t('purchasing.drawer.col.item') },
    { k: 'ordered', label: t('purchasing.drawer.col.ordered'), nowrap: true },
    { k: 'received', label: t('purchasing.drawer.col.received'), nowrap: true },
    { k: 'open', label: t('purchasing.drawer.col.open'), nowrap: true },
    { k: 'price', label: t('purchasing.drawer.col.price'), nowrap: true },
    { k: 'value', label: t('purchasing.drawer.col.value'), nowrap: true },
]);

const uom = (id) => t(`items.uom.${id}`);

function openReceipt(id) {
    router.push({ name: 'inventory', query: { tab: 'receipts', receipt: id } });
}

async function confirmCancel(reason) {
    const po = props.po;

    await store.cancelPo(po.id, reason);
    cancelling.value = false;
    emit('cancelled', po);
}
</script>

<template>
    <ADrawer :open="Boolean(po)" @close="emit('close')">
        <template v-if="po">
            <div class="a-dhead a-dhead--line">
                <div class="a-dhead-top">
                    <div>
                        <div class="a-dhead-t">
                            <h2 class="a-dhead-h">
                                {{ t('purchasing.drawer.title') }}
                                <span class="num">{{ po.id }}</span>
                            </h2>
                            <AChip :tone="PO_STATE[po.state]?.tone" size="lg">
                                {{ t(`purchasing.state.${po.state}`) }}
                            </AChip>
                            <AChip tone="gray" :dot="false">{{
                                loc(po.supplier)
                            }}</AChip>
                        </div>
                        <div class="a-dhead-m">
                            <span>{{
                                po.eta
                                    ? t('purchasing.drawer.eta', {
                                          date: fmtISO(po.eta),
                                      })
                                    : t('purchasing.drawer.noEta')
                            }}</span>
                            <span>{{
                                t('purchasing.drawer.created', {
                                    when: po.created.stamp,
                                    by: loc(po.by),
                                })
                            }}</span>
                            <span class="num">
                                {{
                                    t('purchasing.col.progress', {
                                        received: num(po.received, 1),
                                        total: num(po.ordered, 1),
                                    })
                                }}
                            </span>
                        </div>
                    </div>
                    <div class="a-dhead-a">
                        <AButton
                            v-if="store.receivable(po)"
                            kind="p"
                            sm
                            icon="download"
                            @click="emit('receive', po)"
                        >
                            {{ t('purchasing.action.receive') }}
                        </AButton>
                        <AButton
                            v-if="po.state === 'open'"
                            sm
                            icon="edit"
                            @click="emit('edit', po)"
                        >
                            {{ t('purchasing.action.edit') }}
                        </AButton>
                        <AButton
                            v-if="store.receivable(po)"
                            sm
                            kind="ghost"
                            icon="x"
                            @click="cancelling = true"
                        >
                            {{ t('purchasing.action.cancel') }}
                        </AButton>
                        <AButton sm icon="x" @click="emit('close')">{{
                            t('ui.close')
                        }}</AButton>
                    </div>
                </div>
            </div>

            <div v-if="po.notes" class="a-note a-note--info gap">
                {{ loc(po.notes) }}
            </div>

            <ACard
                :title="t('purchasing.drawer.lines')"
                icon="list"
                :pad="false"
                class="gap"
            >
                <ADataTable
                    :cols="cols"
                    :rows="po.lines"
                    :row-key="(row) => row.sku"
                >
                    <template #cell-item="{ row }">
                        <div class="t-strong">{{ loc(row.name) }}</div>
                        <div class="t-sub ltr">{{ row.sku }}</div>
                    </template>
                    <template #cell-ordered="{ row }">
                        <ANum>{{ num(row.qty, 1) }}</ANum> {{ uom(row.uom) }}
                    </template>
                    <template #cell-received="{ row }">
                        <ANum>{{ num(row.received || 0, 1) }}</ANum>
                    </template>
                    <template #cell-open="{ row }">
                        <span
                            class="num"
                            :class="{
                                'is-open': row.qty - (row.received || 0) > 0,
                            }"
                        >
                            {{
                                num(
                                    Math.max(0, row.qty - (row.received || 0)),
                                    1,
                                )
                            }}
                        </span>
                    </template>
                    <template #cell-price="{ row }">
                        <ANum v-if="row.price != null"
                            >{{ symbol }}{{ num(row.price, 2) }}</ANum
                        >
                        <span v-else class="t-sub">—</span>
                    </template>
                    <template #cell-value="{ row }">
                        <ANum
                            >{{ symbol
                            }}{{ num(row.qty * (row.price || 0), 0) }}</ANum
                        >
                    </template>
                </ADataTable>
            </ACard>

            <div class="a-2col gap top">
                <ACard :title="t('purchasing.drawer.map')" icon="layers">
                    <p class="a-hint map-hint">
                        {{ t('purchasing.drawer.mapHint') }}
                    </p>
                    <div class="map">
                        <div class="map-node is-root">
                            <span class="map-l">{{
                                t('purchasing.drawer.title')
                            }}</span>
                            <span class="num t-strong">{{ po.id }}</span>
                        </div>
                        <div class="map-col">
                            <span class="map-l">{{
                                t('purchasing.drawer.mapNotes')
                            }}</span>
                            <span v-if="!notes.length" class="t-sub">{{
                                t('purchasing.drawer.mapNone')
                            }}</span>
                            <span
                                v-for="note in notes"
                                :key="note.id"
                                class="map-node"
                            >
                                <span class="num">{{ note.id }}</span>
                                <AChip
                                    size="sm"
                                    :tone="
                                        note.state === 'closed'
                                            ? 'green'
                                            : 'amber'
                                    "
                                    :dot="false"
                                >
                                    {{
                                        t(`purchasing.noteState.${note.state}`)
                                    }}
                                </AChip>
                            </span>
                        </div>
                        <div class="map-col">
                            <span class="map-l">{{
                                t('purchasing.drawer.mapReceipts')
                            }}</span>
                            <span v-if="!receipts.length" class="t-sub">{{
                                t('purchasing.drawer.mapNone')
                            }}</span>
                            <button
                                v-for="receipt in receipts"
                                :key="receipt.id"
                                type="button"
                                class="a-linkbtn map-node"
                                @click="openReceipt(receipt.id)"
                            >
                                <span class="num">{{ receipt.id }}</span>
                                <span class="t-sub">{{
                                    receipt.when.stamp
                                }}</span>
                            </button>
                        </div>
                        <div class="map-col">
                            <span class="map-l">{{
                                t('purchasing.drawer.mapInvoice')
                            }}</span>
                            <span v-if="!invoices.length" class="t-sub">{{
                                t('purchasing.drawer.mapNone')
                            }}</span>
                            <span
                                v-for="note in invoices"
                                :key="note.id"
                                class="map-node"
                            >
                                <span class="num">{{ note.invoice.num }}</span>
                                <span class="t-sub">{{
                                    note.invoice.when.stamp
                                }}</span>
                            </span>
                        </div>
                    </div>
                </ACard>

                <AttachmentsPanel
                    entity="purchase_order"
                    :ref-id="po.id"
                    :title="t('purchasing.drawer.files')"
                />
            </div>

            <ConfirmDialog
                v-if="cancelling"
                open
                danger
                reason
                :title="t('purchasing.drawer.cancelTitle')"
                :body="
                    t('purchasing.drawer.cancelBody', {
                        id: po.id,
                        supplier: loc(po.supplier),
                    })
                "
                :confirm-label="t('purchasing.drawer.cancelConfirm')"
                @close="cancelling = false"
                @confirm="confirmCancel"
            />
        </template>
    </ADrawer>
</template>

<style scoped>
.a-dhead-h {
    margin: 0;
    font-size: 24px;
}

.gap {
    margin-top: 14px;
}

.top {
    align-items: start;
}

.is-open {
    color: var(--a-amber);
    font-weight: 700;
}

.map-hint {
    margin: 0 0 10px;
}

.map {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    align-items: start;
}

.map-col {
    display: grid;
    gap: 6px;
}

.map-l {
    font-size: 11.5px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--a-ink-4);
}

.map-node {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 8px 10px;
    border: 1px solid var(--a-line);
    border-radius: 8px;
    background: var(--a-surface);
    text-align: start;
    font: inherit;
    color: inherit;
}

.map-node.is-root {
    border-color: var(--a-accent);
    background: var(--a-tint);
}
</style>
