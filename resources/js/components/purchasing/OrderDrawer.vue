<script setup>
// הזמנת רכש — one supplier, quantities that are required, and a document with
// a life behind it.
//
// A drawer rather than a window, because that life is the point. A request is
// filled and finished; an order is drafted, sent, and then either the goods
// arrive or they do not, and the question anybody opening it asks is "where is
// this and what has happened to it". So the record is addressable, it can be
// parked in the tray, and its history is on it.
//
// The history is the system log filtered to this order, not a second log kept
// on the record — what shows here and what shows on the log screen is the same
// row, written once.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import BuyingLinesPanel from '@/components/purchasing/BuyingLinesPanel.vue';
import ReceiveGoodsModal from '@/components/purchasing/ReceiveGoodsModal.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import ChangeLogPanel from '@/components/ui/ChangeLogPanel.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import {
    BUYING_STATES,
    buyingSheet,
    buyingStateTone,
    canReceive,
    missingQty,
} from '@/config';
import { fmtISO } from '@/lib/dates';
import { downloadXlsx } from '@/lib/xlsx';
import { useBuyingStore } from '@/stores/buying';
import { useDatasetStore } from '@/stores/dataset';

const props = defineProps({
    /** The order on screen. */
    list: { type: Object, required: true },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const dataset = useDatasetStore();
const store = useBuyingStore();

const receiving = ref(false);

const win = computed(() => ({
    id: `order:${props.list.id}`,
    title: `${t('buying.order.one')} ${props.list.number}`,
    subtitle: loc(props.list.supplier) || '',
    icon: 'inbox',
}));

/** An order that arrived or fell through is read from, not edited. */
const settled = computed(() =>
    ['received', 'failed'].includes(props.list.state),
);

const short = computed(() => missingQty(props.list));

const needsSupplier = computed(() => !props.list.supplierCode);

const blocked = computed(
    () =>
        !props.list.lines.length ||
        short.value.length > 0 ||
        needsSupplier.value,
);

const supplierOptions = computed(() => [
    { value: '', label: t('buying.pickSupplier') },
    ...dataset.suppliers.map((one) => ({
        value: one.code,
        label: `${loc(one.name)} · ${one.code}`,
    })),
]);

function onSupplier(code) {
    const hit = dataset.suppliers.find((one) => one.code === code);

    store.setSupplier(props.list.id, {
        supplierCode: code,
        supplier: hit ? hit.name : null,
    });
}

/** Every state this order can be moved to by hand, except the one it is in. */
const moves = computed(() =>
    BUYING_STATES.order.filter((state) => state.id !== props.list.state),
);

const details = computed(() => {
    const rows = [
        [t('buying.order.number'), props.list.number],
        [t('buying.supplier'), loc(props.list.supplier) || '—'],
        [t('buying.order.supplierCode'), props.list.supplierCode || '—'],
        [t('buying.order.openedOn'), props.list.created?.stamp || '—'],
        [t('buying.order.openedBy'), props.list.by ? loc(props.list.by) : '—'],
    ];

    if (props.list.sent) {
        rows.push([t('buying.order.sentOn'), props.list.sent.stamp]);
    }

    if (props.list.received) {
        rows.push([t('buying.order.receivedOn'), props.list.received.stamp]);
    }

    // An order received before this console existed has no goods-receipt
    // document of its own, and that is worth saying rather than leaving blank.
    if (props.list.receipts?.length) {
        rows.push([
            t('buying.order.receipts'),
            props.list.receipts.join(' · '),
        ]);
    } else if (props.list.state === 'received') {
        rows.push([t('buying.order.receipts'), t('buying.order.inSap')]);
    }

    return rows;
});

/** The codes a line stores, as the words a person reads. */
const fmt = {
    unit: (uom) => (uom ? t(`inventory.unit.${uom}`) : ''),
    state: (id) => t(`buying.itemState.${id}`),
    procurement: (id) => t(`items.procurementMethod.${id}`),
    date: (iso) => fmtISO(iso),
};

function exportSheet() {
    const file = `${t('buying.order.file')}-${props.list.number}.xlsx`;

    downloadXlsx(file, {
        name: t('buying.order.one'),
        rows: buyingSheet(props.list, fmt),
    });
    // Exporting is sending: the spreadsheet is what the supplier receives.
    store.markExported(props.list.id);
    push({
        title: t(
            'buying.exported',
            { n: props.list.lines.length },
            props.list.lines.length,
        ),
        body: file,
    });
}
</script>

<template>
    <ADrawer open :win="win" @close="emit('close')">
        <template #header>
            <div class="od-head">
                <h2 class="a-dhead-h">
                    {{ t('buying.order.one') }} {{ list.number }}
                </h2>
                <AChip :tone="buyingStateTone(list.state)">
                    {{ t(`buying.state.${list.state}`) }}
                </AChip>
                <span class="od-sup">{{ loc(list.supplier) || '—' }}</span>
            </div>
        </template>

        <div class="od">
            <!-- Where it stands, and the presses that move it -->
            <div class="a-pane od-actions">
                <AButton
                    v-if="canReceive(list)"
                    kind="p"
                    icon="inbox"
                    @click="receiving = true"
                >
                    {{ t('buying.receive.open') }}
                </AButton>
                <AButton
                    icon="download"
                    :disabled="blocked"
                    @click="exportSheet"
                >
                    {{ t('buying.export') }}
                </AButton>
                <span v-if="needsSupplier" class="od-bad">
                    {{ t('buying.needSupplier') }}
                </span>
                <span v-else-if="short.length" class="od-bad">
                    {{ t('buying.needQty', { n: short.length }, short.length) }}
                </span>

                <div class="od-moves">
                    <span class="od-movelbl">{{
                        t('buying.order.moveTo')
                    }}</span>
                    <AButton
                        v-for="state in moves"
                        :key="state.id"
                        sm
                        @click="store.setState(list.id, state.id)"
                    >
                        {{ t(`buying.state.${state.id}`) }}
                    </AButton>
                </div>
            </div>

            <div class="od-grid">
                <ACard :title="t('buying.order.details')" icon="inbox">
                    <AKeyValue :rows="details" />
                    <label class="a-field od-note">
                        <span>{{ t('buying.note') }}</span>
                        <ATextarea
                            :model-value="list.note || ''"
                            :rows="2"
                            class="a-w100"
                            :placeholder="t('buying.notePlaceholder')"
                            @update:model-value="store.setNote(list.id, $event)"
                        />
                    </label>
                    <label v-if="!settled" class="a-field od-sup-pick">
                        <span>{{ t('buying.supplier') }}</span>
                        <ASelect
                            :model-value="list.supplierCode || ''"
                            :options="supplierOptions"
                            @update:model-value="onSupplier"
                        />
                    </label>
                </ACard>

                <ChangeLogPanel entity="buying_list" :ref-id="list.id" />
            </div>

            <BuyingLinesPanel :list="list" :readonly="settled" />
        </div>
    </ADrawer>

    <ReceiveGoodsModal
        v-if="receiving"
        :list="list"
        @close="receiving = false"
        @received="receiving = false"
    />
</template>

<style scoped>
.od {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
}

.od-head {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.od-sup {
    font-size: 13.5px;
    color: var(--a-ink-4);
}

.od-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

/* Every state is one press away, and which press is right is the buyer's call —
   an order that failed and was sent again goes back to sent. */
.od-moves {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-inline-start: auto;
    flex-wrap: wrap;
}

.od-movelbl {
    font-size: 12.5px;
    color: var(--a-ink-4);
}

.od-bad {
    color: var(--a-red);
    font-weight: 600;
    font-size: 13px;
}

.od-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 18px;
    align-items: start;
}

.od-note,
.od-sup-pick {
    display: block;
    margin-top: 14px;
}
</style>
