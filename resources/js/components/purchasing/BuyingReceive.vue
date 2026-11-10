<script setup>
// קבלת סחורה — booking in what a supplier actually sent.
//
// It takes the whole page rather than a dialog, because it is the longest piece
// of typing in the whole purchasing flow: a sixty-seven-line order is
// sixty-seven quantities, batch numbers and expiry dates, and a box floating
// over the page is the wrong shape for that.
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
// why nothing is pre-filled here.
//
// Signing it is the approval code, and it goes to the log with the name and the
// time — which is what makes the receipt answerable to a person.
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useToast } from '@/composables/useToast';
import { lineOutstanding } from '@/config';
import { isoDaysAgo } from '@/lib/dates';
import { num } from '@/lib/money';
import { useBuyingStore } from '@/stores/buying';
import { useItemsStore } from '@/stores/items';
import { useSystemStore } from '@/stores/system';

const props = defineProps({
    /** The order whose goods these are. */
    list: { type: Object, required: true },
});

const emit = defineEmits(['cancel', 'received']);

const { t } = useI18n();
const { push } = useToast();
const store = useBuyingStore();
const items = useItemsStore();
const system = useSystemStore();

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

        return {
            key: line.key || `${props.list.number}-x${index + 1}`,
            sku: line.sku,
            name: line.name,
            uom: line.purchaseUom || line.uom,
            ordered: line.qty ?? 0,
            already: Number(line.received) || 0,
            due,
            qty: String(due),
            batched: Boolean(items.itemBySku(line.sku)?.flags?.batch),
            supplierBatch: '',
            expiry: '',
            price: line.lastPrice ?? '',
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

/** Will this receipt bring in everything still outstanding on the order? */
const completes = computed(() =>
    form.lines.every((line) => Number(line.qty) >= line.due),
);

const ok = computed(
    () =>
        arriving.value.length > 0 &&
        noExpiry.value.length === 0 &&
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
                expiry: line.expiry || null,
                price: line.price === '' ? null : Number(line.price),
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
        emit('received', receipt);
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

        <div class="a-tablewrap rc-wrap">
            <table class="a-table">
                <thead>
                    <tr>
                        <th scope="col">{{ t('buying.col.sku') }}</th>
                        <th scope="col">{{ t('buying.col.name') }}</th>
                        <th scope="col" class="nowrap">
                            {{ t('buying.receive.ordered') }}
                        </th>
                        <th scope="col" class="nowrap">
                            {{ t('buying.receive.arrived') }}
                        </th>
                        <th scope="col" class="nowrap">
                            {{ t('buying.receive.batch') }}
                        </th>
                        <th scope="col" class="nowrap">
                            {{ t('buying.receive.expiry') }}
                        </th>
                        <th scope="col" class="nowrap">
                            {{ t('buying.receive.price') }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="line in form.lines"
                        :key="line.key"
                        :class="{ 'is-off': !(Number(line.qty) > 0) }"
                    >
                        <td class="nowrap">
                            <ANum class="a-code">{{ line.sku }}</ANum>
                        </td>
                        <td>{{ line.name }}</td>
                        <td class="nowrap">
                            <ANum>{{ num(line.ordered, 3) }}</ANum>
                            {{ t(`inventory.unit.${line.uom}`) }}
                            <div v-if="line.already" class="rc-sub">
                                {{
                                    t('buying.receive.already', {
                                        n: num(line.already, 3),
                                    })
                                }}
                            </div>
                        </td>
                        <td class="nowrap">
                            <AInput
                                v-model="line.qty"
                                type="number"
                                min="0"
                                ltr
                                class="rc-qty"
                                :class="{
                                    'is-diff':
                                        Number(line.qty) !== Number(line.due),
                                }"
                                :aria-label="t('buying.receive.arrived')"
                            />
                        </td>
                        <td class="nowrap">
                            <AInput
                                v-model="line.supplierBatch"
                                ltr
                                class="rc-batch"
                                :placeholder="t('buying.receive.batchHint')"
                                :title="t('buying.receive.batchEmpty')"
                                :aria-label="t('buying.receive.batch')"
                            />
                        </td>
                        <td class="nowrap">
                            <AInput
                                v-model="line.expiry"
                                type="date"
                                ltr
                                class="rc-date"
                                :class="{
                                    'is-wanted':
                                        line.batched &&
                                        Number(line.qty) > 0 &&
                                        !line.expiry,
                                }"
                                :aria-label="t('buying.receive.expiry')"
                            />
                        </td>
                        <td class="nowrap">
                            <AInput
                                v-model="line.price"
                                type="number"
                                min="0"
                                step="0.01"
                                ltr
                                class="rc-price"
                                :aria-label="t('buying.receive.price')"
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
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
.rc-wrap tr.is-off td {
    opacity: 0.5;
}

.rc-qty {
    width: 92px;
}

/* A quantity that is not what was ordered is the whole point of this screen. */
.rc-qty.is-diff {
    border-color: var(--a-amber-line);
    background: var(--a-amber-bg);
}

.rc-batch {
    width: 140px;
}

.rc-date {
    width: 150px;
}

/* An expiry the receipt cannot go without. */
.rc-date.is-wanted {
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

.rc-price {
    width: 100px;
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
