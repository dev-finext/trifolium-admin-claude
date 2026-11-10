<script setup>
// One production order: where it stands, what it makes, what it draws from
// which batches, what came back and when it is due. The buttons follow the
// state — an open run is received (in parts or whole) or cancelled, a
// finished one only read and printed. There is no planned stage: an order is
// at the lab from the moment it is written.
//
// Two kinds of note, kept apart: the lab's — this run's own and the standing
// ones off the item card, all printed on the work sheet — and the pharmacy's
// internal note, which stays here and is never printed for the lab.
//
// Two things go to the lab with the order and are printed from here: the work
// sheet and the order label, the one that names the material on the bench until
// it has a batch ("כדי שלא יעמוד מוצר ללא מדבקה במעבדה, עד שהמוצר יתקבל למלאי
// ויקבל אצווה ותוקף").
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AInput from '@/components/ui/AInput.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useProductionLabels } from '@/composables/useProductionLabels';
import { useProductionSheet } from '@/composables/useProductionSheet';
import { useStickerData } from '@/composables/useStickerData';
import { useToast } from '@/composables/useToast';
import {
    isOverdue,
    PRODUCTION_OPEN_STATE_IDS,
    PRODUCTION_STATE,
    receivedQty,
} from '@/config';
import { fmtISO, isoDaysAgo } from '@/lib/dates';
import { ils, num, qtyText } from '@/lib/money';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';
import { useProductionStore } from '@/stores/production';

const props = defineProps({
    /** The order, or null while the drawer is closed. */
    order: { type: Object, default: null },
});

const emit = defineEmits(['close', 'complete', 'cancel']);
/**
 * V3 — what this window is called when it is parked in the tray.
 *
 * Null while the drawer is closed, which is what keeps the window bar off an
 * empty drawer.
 */ const win = computed(() =>
    props.order
        ? {
              id: `production:${props.order.id}`,
              title: props.order.id,
              subtitle: loc(props.order.name),
              icon: 'beaker',
          }
        : null,
);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const { printProductionSheet } = useProductionSheet();
const { printOrderLabel, printBatchLabels } = useProductionLabels();
const { productionLabelCount } = useStickerData();
const items = useItemsStore();
const inventory = useInventoryStore();
const store = useProductionStore();

/** The states a run passes through, in order, for the rail. */
const RAIL = ['issued', 'completed'];

const unit = (uom) => t(`inventory.unit.${uom || 'unit'}`);

const prepName = computed(() => {
    const type = props.order ? items.prepTypeById(props.order.prepType) : null;

    return type ? loc(type.name) : props.order?.prepType || '';
});

const railIndex = computed(() => RAIL.indexOf(props.order?.state));

const isOpen = computed(() =>
    PRODUCTION_OPEN_STATE_IDS.includes(props.order?.state),
);

const overdue = computed(() =>
    props.order ? isOverdue(props.order, isoDaysAgo(0)) : false,
);

/** Whole days past the target date. */
const lateDays = computed(() =>
    overdue.value
        ? Math.round(
              (new Date(`${isoDaysAgo(0)}T00:00:00`) -
                  new Date(`${props.order.dueOn}T00:00:00`)) /
                  86400000,
          )
        : 0,
);

const received = computed(() => receivedQty(props.order));
const receipts = computed(() => props.order?.receipts || []);

const batchExpiry = (id) => inventory.batchById(id)?.expiry || null;

const details = computed(() => {
    if (!props.order) {
        return [];
    }

    const order = props.order;
    const rows = [
        [
            t('production.drawer.planned'),
            `${qtyText(order.plannedQty, 3)} ${unit(order.uom)}`,
        ],
        [
            t('production.drawer.recipe'),
            `${order.bomId} · v${order.bomVersion}`,
        ],
        [t('production.drawer.created'), order.createdOn?.stamp],
    ];

    if (order.issuedOn) {
        rows.push([t('production.drawer.issuedOn'), order.issuedOn.stamp]);
    }

    // The target date is edited below while the order is open; once it is
    // closed it is a fact on the record.
    if (!isOpen.value && order.dueOn) {
        rows.push([t('production.drawer.due'), fmtISO(order.dueOn)]);
    }

    if (order.state === 'issued' && receipts.value.length) {
        rows.push([
            t('production.drawer.received'),
            t('production.drawer.receivedOf', {
                qty: qtyText(received.value, 3),
                planned: qtyText(order.plannedQty, 3),
                uom: unit(order.uom),
            }),
        ]);
    }

    if (order.state === 'completed') {
        rows.push(
            [t('production.drawer.completedOn'), order.completedOn?.stamp],
            [
                t('production.drawer.yield'),
                `${qtyText(order.yieldQty, 3)} ${unit(order.uom)}`,
            ],
            [
                t('production.drawer.waste'),
                order.wasteQty
                    ? `${qtyText(order.wasteQty, 3)} ${unit(order.uom)}`
                    : t('production.drawer.noWaste'),
            ],
            [
                t('production.drawer.cost'),
                order.cost
                    ? t('production.drawer.costValue', {
                          total: ils(order.cost.components, 2),
                          unit: ils(order.cost.perUnit ?? 0, 2),
                          uom: unit(order.uom),
                      })
                    : '—',
            ],
        );
    }

    // Closed before the whole quantity came back: what was not made, and why.
    if (order.state === 'completed' && order.closedShort) {
        rows.push([
            t('production.drawer.closedShort'),
            loc(order.reason) || '—',
        ]);
    }

    if (order.state === 'cancelled') {
        rows.push(
            [t('production.drawer.cancelledOn'), order.cancelledOn?.stamp],
            [t('production.drawer.reason'), loc(order.reason) || '—'],
        );
    }

    return rows;
});

/** Where the target date came from, said under the field. */
const dueHint = computed(() => {
    const order = props.order;

    if (!order) {
        return '';
    }

    if (!order.dueOn) {
        return t('production.drawer.dueNone');
    }

    return order.dueDays
        ? t('production.drawer.dueByType', {
              n: order.dueDays,
              type: prepName.value,
          })
        : t('production.drawer.dueManual');
});

async function onDue(value) {
    await store.setDueOn(props.order.id, value || null);
}

const standing = computed(() => props.order?.standing || {});

/**
 * The internal note, edited in place while the order is open. Saved when the
 * field is left, so nothing typed is lost to a closed drawer.
 */
const internalDraft = ref(null);

const internalText = computed(() =>
    internalDraft.value === null
        ? props.order?.internalNote || ''
        : internalDraft.value,
);

async function saveInternal() {
    if (internalDraft.value === null || !props.order) {
        return;
    }

    const saved = await store.setInternalNote(
        props.order.id,
        internalDraft.value,
    );

    internalDraft.value = null;

    if (saved) {
        push({ title: t('production.notes.internalSaved') });
    }
}
const hasNotes = computed(
    () =>
        Boolean(props.order?.labNote) ||
        Boolean(standing.value.item) ||
        Boolean(standing.value.recipe),
);

/**
 * The bench paper for this run.
 *
 * Not `window.print()` of the drawer: the lab works off a sheet with the
 * components and their quantities, a tick box and a batch line against each,
 * and empty boxes for the yield, the waste, the batch number, the expiry and
 * two signatures. That document is `useProductionSheet`, and this is the screen
 * that issues it.
 */
function print() {
    if (!printProductionSheet(props.order)) {
        push({ title: t('production.action.printFailed'), bad: true });
    }
}

async function printLabel() {
    if (!(await printOrderLabel(props.order))) {
        push({ title: t('production.action.printFailed'), bad: true });
    }
}

/**
 * Printing a receipt's batch labels again asks how many, opened on the count
 * printed last time — or the one the containers come to. With neither, the
 * field starts empty: the containers are not known, and one label is not a
 * guess worth recording.
 */
const reprinting = ref(null);
const reprintCount = ref('');

function reprint(receipt) {
    const count = productionLabelCount(props.order, receipt, null);

    reprintCount.value = count == null ? '' : String(count);
    reprinting.value = receipt;
}

const reprintNumber = computed(() =>
    Math.round(Number(reprintCount.value) || 0),
);

async function confirmReprint() {
    const receipt = reprinting.value;
    const count = reprintNumber.value;

    if (!receipt || count < 1) {
        return;
    }

    reprinting.value = null;

    if (!(await printBatchLabels(props.order, receipt, count))) {
        push({ title: t('production.action.printFailed'), bad: true });

        return;
    }

    await store.setReceiptLabels(props.order.id, receipt.n, count);
}
</script>

<template>
    <ADrawer :open="Boolean(order)" :win="win" @close="emit('close')">
        <template v-if="order">
            <div class="a-dhead a-dhead--line">
                <div class="a-dhead-top">
                    <div>
                        <div class="a-dhead-t">
                            <h2 class="a-dhead-h">
                                <span class="a-code a-tag">{{ order.id }}</span>
                                {{ loc(order.name) }}
                            </h2>
                            <AChip
                                :tone="
                                    PRODUCTION_STATE[order.state]?.tone ||
                                    'gray'
                                "
                            >
                                {{ t(`production.state.${order.state}`) }}
                            </AChip>
                            <AChip
                                v-if="
                                    order.state === 'issued' && receipts.length
                                "
                                tone="blue"
                            >
                                {{ t('production.partial') }}
                            </AChip>
                            <AChip v-if="overdue" tone="red">
                                {{ t('production.overdue') }}
                            </AChip>
                            <AChip tone="gray" :dot="false">{{
                                prepName
                            }}</AChip>
                        </div>
                        <div class="a-dhead-m">
                            <span class="num">{{ order.parentSku }}</span>
                            <span>{{
                                t('production.drawer.by', {
                                    name: loc(order.by),
                                })
                            }}</span>
                        </div>
                    </div>
                    <div class="a-dhead-a">
                        <AButton
                            v-if="order.state === 'issued'"
                            kind="p"
                            sm
                            icon="check"
                            @click="emit('complete', order)"
                        >
                            {{ t('production.action.receive') }}
                        </AButton>
                        <AButton sm icon="printer" @click="print">
                            {{ t('production.action.print') }}
                        </AButton>
                        <AButton
                            v-if="isOpen"
                            sm
                            icon="tag"
                            @click="printLabel"
                        >
                            {{ t('production.action.printLabel') }}
                        </AButton>
                        <AButton
                            v-if="isOpen"
                            sm
                            kind="ghost"
                            icon="x"
                            @click="emit('cancel', order)"
                        >
                            {{
                                receipts.length
                                    ? t('production.action.cancelRest')
                                    : t('production.action.cancel')
                            }}
                        </AButton>
                    </div>
                </div>

                <ol
                    v-if="order.state !== 'cancelled'"
                    class="pd-rail"
                    :aria-label="t('production.drawer.railAria')"
                >
                    <li
                        v-for="(step, i) in RAIL"
                        :key="step"
                        class="pd-step"
                        :class="{
                            'is-done': i < railIndex,
                            'is-on': i === railIndex,
                        }"
                    >
                        <span class="pd-dot" />
                        <span>{{ t(`production.state.${step}`) }}</span>
                    </li>
                </ol>
            </div>

            <div class="a-dbody pd-grid">
                <ACard :title="t('production.drawer.details')" icon="file_text">
                    <AKeyValue :rows="details" />
                    <div v-if="isOpen" class="pd-due">
                        <label class="a-lbl" for="pd-due">{{
                            t('production.drawer.due')
                        }}</label>
                        <AInput
                            id="pd-due"
                            :model-value="order.dueOn || ''"
                            type="date"
                            ltr
                            class="pd-due-in"
                            @change="onDue($event.target.value)"
                        />
                        <div class="a-hint" :class="{ 'pd-late': overdue }">
                            {{
                                overdue
                                    ? t(
                                          'production.drawer.dueLate',
                                          { n: lateDays },
                                          lateDays,
                                      )
                                    : dueHint
                            }}
                        </div>
                    </div>
                </ACard>

                <ACard
                    :title="t('production.notes.title')"
                    icon="clipboard_list"
                >
                    <div v-if="hasNotes" class="pd-notes">
                        <div v-if="order.labNote" class="pd-note-block">
                            <div class="a-lbl">
                                {{ t('production.notes.labShort') }}
                            </div>
                            <div class="a-note a-note--warn pd-text">
                                {{ loc(order.labNote) }}
                            </div>
                        </div>
                        <div v-if="standing.item" class="pd-note-block">
                            <div class="a-lbl">
                                {{ t('production.notes.fromItemLong') }}
                            </div>
                            <div class="a-note a-note--info pd-text">
                                {{ standing.item }}
                            </div>
                        </div>
                        <div v-if="standing.recipe" class="pd-note-block">
                            <div class="a-lbl">
                                {{ t('production.notes.fromRecipeLong') }}
                            </div>
                            <div class="a-note a-note--info pd-text">
                                {{ loc(standing.recipe) }}
                            </div>
                        </div>
                    </div>
                    <div v-else class="t-sub">
                        {{ t('production.notes.none') }}
                    </div>
                </ACard>

                <ACard :title="t('production.notes.internal')" icon="lock">
                    <template
                        v-if="PRODUCTION_OPEN_STATE_IDS.includes(order.state)"
                    >
                        <ATextarea
                            :model-value="internalText"
                            :rows="3"
                            class="a-w100"
                            :aria-label="t('production.notes.internal')"
                            :placeholder="
                                t('production.notes.internalPlaceholder')
                            "
                            @update:model-value="internalDraft = $event"
                            @blur="saveInternal"
                        />
                    </template>
                    <div v-else-if="order.internalNote" class="a-note pd-text">
                        {{ order.internalNote }}
                    </div>
                    <div v-else class="t-sub">
                        {{ t('production.notes.internalNone') }}
                    </div>
                    <div class="a-hint">
                        {{ t('production.notes.internalHint') }}
                    </div>
                </ACard>

                <ACard
                    :title="t('production.drawer.components')"
                    icon="layers"
                    class="span2"
                    :pad="false"
                >
                    <table class="a-table">
                        <thead>
                            <tr>
                                <th scope="col">
                                    {{ t('production.drawer.compItem') }}
                                </th>
                                <th scope="col" class="nowrap">
                                    {{ t('production.drawer.compPlanned') }}
                                </th>
                                <th scope="col">
                                    {{ t('production.drawer.compPicks') }}
                                </th>
                                <th scope="col" class="nowrap">
                                    {{ t('production.drawer.compActual') }}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="component in order.components"
                                :key="component.sku"
                            >
                                <td>
                                    <div class="t-strong">
                                        {{ loc(component.name) }}
                                    </div>
                                    <div class="t-sub num">
                                        {{ component.sku }}
                                    </div>
                                </td>
                                <td class="nowrap">
                                    <ANum>{{
                                        qtyText(component.plannedQty, 3)
                                    }}</ANum>
                                    {{ unit(component.uom) }}
                                    <AChip
                                        v-if="component.issue === 'manual'"
                                        tone="gray"
                                        size="sm"
                                        :dot="false"
                                        class="pd-gap"
                                    >
                                        {{ t('items.bom.issue.manual') }}
                                    </AChip>
                                </td>
                                <td>
                                    <div
                                        v-for="pick in component.picks"
                                        :key="pick.batch"
                                        class="pd-pick"
                                    >
                                        <span class="a-code a-tag">{{
                                            inventory.batchNo(pick.batch)
                                        }}</span>
                                        <ANum>{{ num(pick.qty, 2) }}</ANum>
                                        {{ unit(component.stockUnit) }}
                                        <span
                                            v-if="batchExpiry(pick.batch)"
                                            class="t-sub"
                                        >
                                            ·
                                            {{
                                                fmtISO(batchExpiry(pick.batch))
                                            }}
                                        </span>
                                        <span
                                            v-if="
                                                order.state === 'issued' &&
                                                pick.taken
                                            "
                                            class="t-sub"
                                        >
                                            ·
                                            {{
                                                t('production.drawer.taken', {
                                                    qty: num(pick.taken, 2),
                                                })
                                            }}
                                        </span>
                                    </div>
                                    <div
                                        v-if="!component.picks.length"
                                        class="t-sub"
                                    >
                                        {{ t('production.drawer.noBatch') }}
                                    </div>
                                    <div
                                        v-if="component.short"
                                        class="pd-uncovered"
                                    >
                                        {{
                                            t('production.drawer.short', {
                                                qty: num(component.short, 2),
                                                uom: unit(component.stockUnit),
                                            })
                                        }}
                                    </div>
                                </td>
                                <td class="nowrap">
                                    <template
                                        v-if="component.actualQty != null"
                                    >
                                        <ANum>{{
                                            qtyText(component.actualQty, 3)
                                        }}</ANum>
                                        {{ unit(component.uom) }}
                                    </template>
                                    <span v-else class="t-sub">—</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </ACard>

                <ACard
                    v-if="receipts.length"
                    :title="t('production.drawer.receipts')"
                    icon="package"
                    class="span2"
                    :pad="false"
                >
                    <table class="a-table">
                        <thead>
                            <tr>
                                <th scope="col" class="nowrap">
                                    {{ t('production.drawer.rcptWhen') }}
                                </th>
                                <th scope="col" class="nowrap">
                                    {{ t('production.drawer.rcptQty') }}
                                </th>
                                <th scope="col" class="nowrap">
                                    {{ t('production.drawer.outputBatch') }}
                                </th>
                                <th scope="col" class="nowrap">
                                    {{ t('production.drawer.expiry') }}
                                </th>
                                <th scope="col" class="nowrap">
                                    {{ t('production.drawer.wasteBatch') }}
                                </th>
                                <th scope="col" class="nowrap">
                                    {{ t('production.drawer.rcptLabels') }}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="receipt in receipts" :key="receipt.n">
                                <td class="nowrap">
                                    <ANum>{{ receipt.when?.stamp }}</ANum>
                                    <div class="t-sub">
                                        {{
                                            receipt.final
                                                ? t(
                                                      'production.drawer.rcptFinal',
                                                  )
                                                : t(
                                                      'production.drawer.rcptPart',
                                                      { n: receipt.n },
                                                  )
                                        }}
                                    </div>
                                </td>
                                <td class="nowrap">
                                    <ANum>{{ qtyText(receipt.qty, 3) }}</ANum>
                                    {{ unit(order.uom) }}
                                    <div v-if="receipt.wasteQty" class="t-sub">
                                        {{
                                            t('production.drawer.rcptWaste', {
                                                qty: qtyText(
                                                    receipt.wasteQty,
                                                    3,
                                                ),
                                                uom: unit(order.uom),
                                            })
                                        }}
                                    </div>
                                </td>
                                <td class="nowrap">
                                    <span
                                        v-if="receipt.batch"
                                        class="a-code a-tag"
                                        >{{
                                            inventory.batchNo(receipt.batch)
                                        }}</span
                                    >
                                    <span v-else class="t-sub">—</span>
                                    <div v-if="receipt.added" class="t-sub">
                                        {{ t('production.drawer.rcptAdded') }}
                                    </div>
                                </td>
                                <td class="nowrap">
                                    <ANum v-if="receipt.batch">{{
                                        fmtISO(
                                            batchExpiry(receipt.batch) ||
                                                receipt.expiresOn,
                                        )
                                    }}</ANum>
                                    <span v-else class="t-sub">—</span>
                                </td>
                                <td class="nowrap">
                                    <span
                                        v-if="receipt.wasteBatch"
                                        class="a-code a-tag"
                                        >{{
                                            inventory.batchNo(
                                                receipt.wasteBatch,
                                            )
                                        }}</span
                                    >
                                    <span v-else class="t-sub">{{
                                        receipt.wasteQty
                                            ? t('production.drawer.wasteKept')
                                            : t('production.drawer.noWaste')
                                    }}</span>
                                </td>
                                <td class="nowrap">
                                    <template v-if="receipt.batch">
                                        <ANum>{{ receipt.labels ?? '—' }}</ANum>
                                        <AButton
                                            sm
                                            kind="ghost"
                                            icon="printer"
                                            class="pd-gap"
                                            :aria-label="
                                                t('production.drawer.reprint')
                                            "
                                            :title="
                                                t('production.drawer.reprint')
                                            "
                                            @click="reprint(receipt)"
                                        />
                                    </template>
                                    <span v-else class="t-sub">—</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </ACard>
            </div>
        </template>
    </ADrawer>

    <AModal
        v-if="reprinting"
        open
        :title="t('production.drawer.reprint')"
        :width="420"
        @close="reprinting = null"
    >
        <label class="a-lbl" for="pd-reprint">{{
            t('production.receive.labels.count')
        }}</label>
        <AInput
            id="pd-reprint"
            v-model="reprintCount"
            type="number"
            min="1"
            ltr
            class="pd-due-in"
        />
        <div v-if="!reprintCount" class="a-hint">
            {{ t('production.receive.labels.noPack') }}
        </div>
        <template #footer>
            <AButton
                kind="p"
                icon="printer"
                :disabled="reprintNumber < 1"
                @click="confirmReprint"
            >
                {{
                    t(
                        'production.receive.labels.print',
                        { n: reprintNumber },
                        reprintNumber,
                    )
                }}
            </AButton>
            <AButton @click="reprinting = null">{{
                t('actions.cancel')
            }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.pd-rail {
    display: flex;
    gap: 22px;
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
    color: var(--a-ink-4);
}

.pd-step {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.pd-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 1.5px solid var(--a-line-2);
    background: transparent;
}

.pd-step.is-done .pd-dot {
    background: var(--a-line-2);
    border-color: var(--a-line-2);
}

.pd-step.is-on {
    color: var(--a-ink);
    font-weight: 600;
}

.pd-step.is-on .pd-dot {
    background: var(--a-green, var(--a-ink-2));
    border-color: var(--a-green, var(--a-ink-2));
}

.pd-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
}

.span2 {
    grid-column: 1 / -1;
}

.pd-due {
    margin-top: 12px;
}

.pd-due-in {
    width: 180px;
}

.pd-late {
    color: var(--a-red);
    font-weight: 600;
}

.pd-notes {
    display: grid;
    gap: 10px;
}

.pd-note-block .a-lbl {
    margin-bottom: 4px;
}

/* A note keeps its own line breaks, and a Latin reference inside a Hebrew
   note keeps its own direction. */
.pd-text {
    white-space: pre-line;
    unicode-bidi: plaintext;
}

.pd-pick {
    display: flex;
    gap: 6px;
    align-items: baseline;
    flex-wrap: wrap;
}

.pd-pick + .pd-pick {
    margin-top: 4px;
}

.pd-n {
    text-align: end;
}

/* How much of a component has no open batch to draw from. A statement, not a
   verdict: SAP does not stop a production order over component stock either —
   the shelf is answered for when the goods issue is posted, not when the order
   is written. */
.pd-uncovered {
    margin-top: 4px;
    font-size: 12.5px;
    color: var(--a-ink-4);
}

.pd-gap {
    margin-inline-start: 6px;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
