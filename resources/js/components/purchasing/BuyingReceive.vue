<script setup>
// קבלת סחורה — booking in what a supplier actually sent.
//
// It takes the whole page rather than a dialog, because it is the longest piece
// of typing in the whole purchasing flow: a sixty-seven-line order is
// sixty-seven quantities, batch numbers, dates and label counts, and a box
// floating over the page is the wrong shape for that.
//
// One labelled block per ordered line, every field with its own label above
// it — never a header row over bare inputs (the pharmacy's own rule for line
// editors). The block's head says what the line is and what was ordered; its
// body is what the person types.
//
// Every line opens filled with what is still to come — the whole order the first
// time, the balance after a part arrived — because most deliveries are complete
// and the common case should be one press. What the delivery was short of, or
// sent extra of, is corrected on the line; a line that did not arrive at all
// goes to zero and is left out of the receipt. Receipts add up: an order stays
// open for the rest until everything on it has come.
//
// The quantity is in the purchase unit, the same unit the order was written in.
// The shelf counts in the stock unit, and `numInBuy` off the item card is what
// sits between the two — the store converts, not this screen.
//
// The batch number is the supplier's own code, always, whatever the pharmacy's
// own series is doing — Yaron: "אם חומר גלם מגיע מספק המוצר מקבל אצוות ספק
// תמיד". A lot with no code on it is numbered the way the pharmacy numbers it
// in SAP, WV and the date. The expiry is read off the carton and is required
// for an item kept in batches — it is a fact on the supplier's certificate,
// and Natalie is explicit that the console suggests an expiry for its own
// production only ("שים לב שרק מייצור פנימי ולא הזמנת רכש מספק"), which is
// why nothing is pre-filled here. The production date is the supplier's too,
// and optional: the label prints it when there is one.
//
// "כמה מדבקות להדפיס" is how many containers the quantity is divided into —
// ten kilos of powder into ten one-kilo jars is ten labels of this batch,
// numbered 1/10 … 10/10. It opens at what the item's container size says
// (config/batches.js `labelPackOf`), or at one when nothing says, and the
// labels are printed together once the receipt is signed.
//
// Signing it is the approval code, and it goes to the log with the name and the
// time — which is what makes the receipt answerable to a person.
import { computed, reactive, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useToast } from '@/composables/useToast';
import { labelCount, labelPackOf, lineOutstanding } from '@/config';
import { isoDaysAgo } from '@/lib/dates';
import { qtyText } from '@/lib/money';
import { useBuyingStore } from '@/stores/buying';
import { useDatasetStore } from '@/stores/dataset';
import { useItemsStore } from '@/stores/items';
import { useSystemStore } from '@/stores/system';

const props = defineProps({
    /** The order whose goods these are. */
    list: { type: Object, required: true },
    /**
     * Called with the booked receipt. A function and not an event: a receipt
     * that completes the order moves it to "received", which closes this
     * screen while the save is still finishing — and an unmounted component's
     * events are dropped, the labels with them.
     */
    done: { type: Function, default: null },
});

const emit = defineEmits(['cancel']);

const { t } = useI18n();
const { push } = useToast();
const store = useBuyingStore();
const items = useItemsStore();
const dataset = useDatasetStore();
const system = useSystemStore();
const uid = useId();

const saving = ref(false);
const asking = ref(false);

/**
 * One editable row per ordered line, opened at what is still to come. Each
 * row is the line's own — by its key, because one item can sit on an order
 * twice.
 */
const form = reactive({
    docNum: '',
    date: isoDaysAgo(0),
    note: '',
    lines: props.list.lines.map((line, index) => {
        const due = lineOutstanding(line);
        const card = items.itemBySku(line.sku);

        return {
            key: line.key || `${props.list.number}-x${index + 1}`,
            sku: line.sku,
            name: line.name,
            foreignName: line.foreignName || '',
            uom: line.purchaseUom || line.uom,
            stockUom: line.uom,
            perBuy: Number(line.numInBuy) || 1,
            pack: labelPackOf({
                item: card,
                settings: dataset.data.inventorySettings,
            }),
            ordered: line.qty ?? 0,
            already: Number(line.received) || 0,
            due,
            qty: String(due),
            batched: Boolean(card?.flags?.batch),
            supplierBatch: '',
            madeOn: '',
            expiry: '',
            price: line.lastPrice ?? '',
            labels: '',
            labelsTouched: false,
        };
    }),
});

const arriving = computed(() =>
    form.lines.filter((line) => Number(line.qty) > 0),
);

/** Lines where what came in is not what was still to come. */
const differing = computed(() =>
    arriving.value.filter((line) => Number(line.qty) !== Number(line.due)),
);

/** Arriving lines of an item kept in batches that still have no expiry. */
const noExpiry = computed(() =>
    arriving.value.filter((line) => line.batched && !line.expiry),
);

/** The containers a line's quantity comes to, when the item says how big one is. */
function suggestedLabels(line) {
    return (
        labelCount(Number(line.qty) * line.perBuy, line.stockUom, line.pack) ??
        1
    );
}

/** What the label field shows: the person's figure once they typed one. */
function labelsShown(line) {
    return line.labelsTouched ? line.labels : String(suggestedLabels(line));
}

function onLabels(line, value) {
    line.labels = String(value).replace(/[^\d]/g, '');
    line.labelsTouched = true;
}

const labelsOf = (line) => Number(labelsShown(line)) || 0;

/** Where the opening figure came from, said under the field. */
function labelsHint(line) {
    const pack = line.pack;

    if (!pack) {
        return t('buying.receive.labelsNoPack');
    }

    const size = `${qtyText(pack.qty, 3)} ${t(`inventory.unit.${pack.uom}`)}`;

    return pack.source === 'item'
        ? t('buying.receive.labelsByItem', { size })
        : t('buying.receive.labelsByFamily', { size });
}

/** A label count that is not a whole number cannot be printed. */
const badLabels = computed(() =>
    arriving.value.filter(
        (line) =>
            line.labelsTouched &&
            line.labels !== '' &&
            !Number.isInteger(Number(line.labels)),
    ),
);

const totalLabels = computed(() =>
    arriving.value.reduce((sum, line) => sum + labelsOf(line), 0),
);

/** Will this receipt bring in everything still outstanding on the order? */
const completes = computed(() =>
    form.lines.every((line) => Number(line.qty) >= line.due),
);

const ok = computed(
    () =>
        arriving.value.length > 0 &&
        noExpiry.value.length === 0 &&
        badLabels.value.length === 0 &&
        !saving.value,
);

/** Everything still due arrived — the press that covers most deliveries. */
function takeAll() {
    form.lines.forEach((line) => {
        line.qty = String(line.due);
    });
}

function none() {
    form.lines.forEach((line) => {
        line.qty = '0';
    });
}

const unit = (uom) => (uom ? t(`inventory.unit.${uom}`) : '');

async function confirmed() {
    asking.value = false;

    if (!ok.value) {
        return;
    }

    saving.value = true;

    try {
        const receipt = await store.receiveList(props.list.id, {
            docNum: form.docNum.trim(),
            date: form.date,
            note: form.note.trim(),
            lines: arriving.value.map((line) => ({
                key: line.key,
                sku: line.sku,
                qty: Number(line.qty),
                supplierBatch: line.supplierBatch.trim(),
                madeOn: line.madeOn || null,
                expiry: line.expiry || null,
                price: line.price === '' ? null : Number(line.price),
                labels: labelsOf(line),
            })),
        });

        push({
            title: t(
                'buying.receive.done',
                { n: arriving.value.length },
                arriving.value.length,
            ),
            body: receipt.id,
        });
        props.done?.(receipt);
    } catch (error) {
        push({ title: String(error?.message || error), bad: true });
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <div class="rc">
        <div class="a-pane rc-head">
            <div class="a-fields rc-doc">
                <label class="a-field">
                    <span>{{ t('buying.receive.docNum') }}</span>
                    <AInput v-model="form.docNum" ltr />
                </label>
                <label class="a-field">
                    <span>{{ t('buying.receive.date') }}</span>
                    <AInput v-model="form.date" type="date" ltr />
                </label>
            </div>
            <div class="rc-bulk">
                <AButton sm icon="check" @click="takeAll">
                    {{ t('buying.receive.takeAll') }}
                </AButton>
                <AButton sm @click="none">
                    {{ t('buying.receive.none') }}
                </AButton>
                <span class="rc-count">
                    {{
                        t(
                            'buying.receive.counting',
                            { n: arriving.length, total: form.lines.length },
                            arriving.length,
                        )
                    }}
                </span>
            </div>
        </div>

        <div
            class="a-lines"
            role="list"
            :aria-label="t('buying.receive.linesAria')"
        >
            <div
                v-for="(line, i) in form.lines"
                :key="line.key"
                class="a-line-block"
                :class="{
                    'is-ok':
                        Number(line.qty) > 0 && !(line.batched && !line.expiry),
                    'is-off': !(Number(line.qty) > 0),
                }"
                role="listitem"
            >
                <div class="a-line-head">
                    <span class="a-line-no">
                        {{ t('labels.lineNo', { n: i + 1 }) }}
                    </span>
                    <ANum class="a-code a-tag">{{ line.sku }}</ANum>
                    <span class="rc-name">
                        <span class="t-strong">{{ line.name }}</span>
                        <span
                            v-if="
                                line.foreignName &&
                                line.foreignName !== line.name
                            "
                            class="rc-sub"
                            >{{ line.foreignName }}</span
                        >
                    </span>
                    <span class="rc-ordered a-push">
                        {{ t('buying.receive.ordered') }}
                        <ANum>{{ qtyText(line.ordered, 3) }}</ANum>
                        {{ unit(line.uom) }}
                        <template v-if="line.already">
                            ·
                            {{
                                t('buying.receive.already', {
                                    n: qtyText(line.already, 3),
                                })
                            }}
                        </template>
                    </span>
                </div>

                <div class="a-line-body">
                    <div>
                        <label class="a-lbl" :for="`${uid}-q${i}`">
                            {{ t('buying.receive.arrived') }}
                        </label>
                        <AInput
                            :id="`${uid}-q${i}`"
                            v-model="line.qty"
                            type="number"
                            min="0"
                            ltr
                            :class="{
                                'is-diff':
                                    Number(line.qty) !== Number(line.due),
                            }"
                        />
                        <div class="a-hint">
                            {{
                                Number(line.qty) !== Number(line.due)
                                    ? t('buying.receive.diffHint', {
                                          due: qtyText(line.due, 3),
                                      })
                                    : unit(line.uom)
                            }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-b${i}`">
                            {{ t('buying.receive.batch') }}
                        </label>
                        <AInput
                            :id="`${uid}-b${i}`"
                            v-model="line.supplierBatch"
                            ltr
                            :placeholder="t('buying.receive.batchHint')"
                        />
                        <div class="a-hint">
                            {{ t('buying.receive.batchEmptyShort') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-m${i}`">
                            {{ t('buying.receive.madeOn') }}
                        </label>
                        <AInput
                            :id="`${uid}-m${i}`"
                            v-model="line.madeOn"
                            type="date"
                            ltr
                        />
                        <div class="a-hint">
                            {{ t('buying.receive.madeOnHint') }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-x${i}`">
                            {{ t('buying.receive.expiry') }}
                            <span v-if="line.batched" class="a-req">{{
                                t('labels.required')
                            }}</span>
                        </label>
                        <AInput
                            :id="`${uid}-x${i}`"
                            v-model="line.expiry"
                            type="date"
                            ltr
                            :class="{
                                'is-wanted':
                                    line.batched &&
                                    Number(line.qty) > 0 &&
                                    !line.expiry,
                            }"
                        />
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-p${i}`">
                            {{ t('buying.receive.price') }}
                        </label>
                        <AInput
                            :id="`${uid}-p${i}`"
                            v-model="line.price"
                            type="number"
                            min="0"
                            step="0.01"
                            ltr
                        />
                        <div class="a-hint">
                            {{
                                t('buying.receive.priceHint', {
                                    uom: unit(line.uom),
                                })
                            }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl" :for="`${uid}-l${i}`">
                            {{ t('buying.receive.labels') }}
                        </label>
                        <AInput
                            :id="`${uid}-l${i}`"
                            :model-value="labelsShown(line)"
                            inputmode="numeric"
                            ltr
                            @update:model-value="onLabels(line, $event)"
                        />
                        <div class="a-hint">{{ labelsHint(line) }}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="a-pane rc-foot">
            <label class="a-field rc-note">
                <span>{{ t('buying.receive.note') }}</span>
                <ATextarea v-model="form.note" :rows="2" class="a-w100" />
            </label>
            <div class="rc-go">
                <span v-if="noExpiry.length" class="rc-why">
                    {{
                        t(
                            'buying.receive.needExpiry',
                            { n: noExpiry.length },
                            noExpiry.length,
                        )
                    }}
                </span>
                <span v-else-if="badLabels.length" class="rc-why">
                    {{ t('buying.receive.needLabels') }}
                </span>
                <AButton
                    kind="p"
                    icon="check"
                    :disabled="!ok"
                    @click="asking = true"
                >
                    {{ t('buying.receive.sign') }}
                </AButton>
                <AButton @click="emit('cancel')">
                    {{ t('actions.cancel') }}
                </AButton>
            </div>
        </div>
    </div>

    <ConfirmDialog
        :open="asking"
        :title="t('buying.receive.confirmTitle')"
        :body="
            t(
                'buying.receive.confirmBody',
                { n: arriving.length },
                arriving.length,
            )
        "
        :effects="[
            t('buying.receive.effectStock'),
            t('buying.receive.effectBatches'),
            completes
                ? t('buying.receive.effectState')
                : t('buying.receive.effectOpen'),
            ...(differing.length
                ? [
                      t(
                          'buying.receive.effectDiffer',
                          { n: differing.length },
                          differing.length,
                      ),
                  ]
                : []),
            totalLabels
                ? t(
                      'buying.receive.effectLabels',
                      { n: totalLabels },
                      totalLabels,
                  )
                : t('buying.receive.effectNoLabels'),
        ]"
        :confirm-label="t('buying.receive.sign')"
        :pin="system.approvalPin"
        @close="asking = false"
        @confirm="confirmed"
    />
</template>

<style scoped>
.rc {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
}

.rc-head {
    display: flex;
    align-items: end;
    gap: 24px;
    flex-wrap: wrap;
}

.rc-doc {
    --a-field-w: 200px;
    flex: 0 1 440px;
}

.rc-bulk {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 4px;
}

.rc-count {
    font-size: 13px;
    color: var(--a-ink-4);
}

/* A line that did not arrive stays on the sheet and out of the receipt. */
.a-line-block.is-off {
    opacity: 0.55;
}

.rc-name {
    display: grid;
    min-width: 0;
}

.rc-ordered {
    font-size: 13px;
    color: var(--a-ink-3, var(--a-ink-4));
}

/* A quantity that is not what was ordered is the whole point of this screen. */
.is-diff {
    border-color: var(--a-amber-line);
    background: var(--a-amber-bg);
}

/* An expiry the receipt cannot go without. */
.is-wanted {
    border-color: var(--a-amber-line);
    background: var(--a-amber-bg);
}

.rc-sub {
    font-size: 12px;
    color: var(--a-ink-4);
}

.rc-why {
    align-self: center;
    font-size: 13px;
    color: var(--a-ink-3, var(--a-ink-4));
}

.rc-foot {
    display: flex;
    align-items: end;
    gap: 24px;
    flex-wrap: wrap;
}

.rc-note {
    display: block;
    flex: 1 1 420px;
    min-width: 0;
}

.rc-go {
    display: flex;
    gap: 10px;
    padding-bottom: 4px;
}
</style>
