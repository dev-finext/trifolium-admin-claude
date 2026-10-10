<script setup>
// קבלת סחורה — booking in what a supplier actually sent.
//
// Every line opens filled with what was ordered, because most deliveries are
// complete and the common case should be one press. What the delivery was short
// of, or sent extra of, is corrected on the line; a line that did not arrive at
// all goes to zero and is left out of the receipt entirely.
//
// The quantity is in the purchase unit, the same unit the order was written in.
// The shelf counts in the stock unit, and `numInBuy` off the item card is what
// sits between the two — the store converts, not this screen.
//
// Two fields are the shelf's rather than the order's. The batch number is the
// supplier's own code, always, whatever the pharmacy's own series is doing —
// Yaron: "אם חומר גלם מגיע מספק המוצר מקבל אצוות ספק תמיד". The expiry is
// defaulted from the family's shelf life and corrected off the carton.
//
// Signing it is the approval code. It goes to the log with the name and the
// time, which is what makes the receipt answerable to a person.
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { isoDaysAgo } from '@/lib/dates';
import { num } from '@/lib/money';
import { useBuyingStore } from '@/stores/buying';
import { usePurchasingStore } from '@/stores/purchasing';
import { useSystemStore } from '@/stores/system';

const props = defineProps({
    /** The order whose goods these are. */
    list: { type: Object, required: true },
});

const emit = defineEmits(['close', 'received']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const store = useBuyingStore();
const purchasing = usePurchasingStore();
const system = useSystemStore();

const saving = ref(false);
const asking = ref(false);

/** One editable row per ordered line, opened at the ordered quantity. */
const form = reactive({
    docNum: '',
    date: isoDaysAgo(0),
    note: '',
    lines: props.list.lines.map((line) => ({
        sku: line.sku,
        name: line.name,
        uom: line.purchaseUom || line.uom,
        ordered: line.qty ?? 0,
        qty: String(line.qty ?? 0),
        supplierBatch: '',
        expiry: purchasing.defaultExpiryFor(line.sku)?.iso || '',
        price: line.lastPrice ?? '',
    })),
});

const arriving = computed(() =>
    form.lines.filter((line) => Number(line.qty) > 0),
);

/** Lines where what came in is not what was asked for. */
const differing = computed(() =>
    form.lines.filter((line) => Number(line.qty) !== Number(line.ordered)),
);

const ok = computed(() => arriving.value.length > 0 && !saving.value);

/** Everything arrived as ordered — the press that covers most deliveries. */
function takeAll() {
    form.lines.forEach((line) => {
        line.qty = String(line.ordered);
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
    <AModal
        open
        :title="
            t('buying.receive.title', {
                number: list.number,
                supplier: loc(list.supplier) || '—',
            })
        "
        :width="1000"
        @close="emit('close')"
    >
        <div class="a-fields rg-head">
            <label class="a-field">
                <span>{{ t('buying.receive.docNum') }}</span>
                <AInput v-model="form.docNum" ltr />
            </label>
            <label class="a-field">
                <span>{{ t('buying.receive.date') }}</span>
                <AInput v-model="form.date" type="date" ltr />
            </label>
        </div>

        <div class="rg-bulk">
            <AButton sm icon="check" @click="takeAll">
                {{ t('buying.receive.takeAll') }}
            </AButton>
            <AButton sm @click="none">{{ t('buying.receive.none') }}</AButton>
            <span class="rg-count">
                {{
                    t(
                        'buying.receive.counting',
                        { n: arriving.length, total: form.lines.length },
                        arriving.length,
                    )
                }}
            </span>
        </div>

        <div class="a-tablewrap rg-wrap">
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
                        :key="line.sku"
                        :class="{ 'is-off': !(Number(line.qty) > 0) }"
                    >
                        <td class="nowrap">
                            <ANum class="a-code">{{ line.sku }}</ANum>
                        </td>
                        <td>{{ line.name }}</td>
                        <td class="nowrap">
                            <ANum>{{ num(line.ordered, 3) }}</ANum>
                            {{ t(`inventory.unit.${line.uom}`) }}
                        </td>
                        <td class="nowrap">
                            <AInput
                                v-model="line.qty"
                                type="number"
                                min="0"
                                ltr
                                class="rg-qty"
                                :class="{
                                    'is-diff':
                                        Number(line.qty) !==
                                        Number(line.ordered),
                                }"
                                :aria-label="t('buying.receive.arrived')"
                            />
                        </td>
                        <td class="nowrap">
                            <AInput
                                v-model="line.supplierBatch"
                                ltr
                                class="rg-batch"
                                :placeholder="t('buying.receive.batchHint')"
                                :aria-label="t('buying.receive.batch')"
                            />
                        </td>
                        <td class="nowrap">
                            <AInput
                                v-model="line.expiry"
                                type="date"
                                ltr
                                class="rg-date"
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
                                class="rg-price"
                                :aria-label="t('buying.receive.price')"
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <label class="a-field rg-note">
            <span>{{ t('buying.receive.note') }}</span>
            <ATextarea v-model="form.note" :rows="2" class="a-w100" />
        </label>

        <template #footer>
            <AButton
                kind="p"
                icon="check"
                :disabled="!ok"
                @click="asking = true"
            >
                {{ t('buying.receive.sign') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>

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
            t('buying.receive.effectState'),
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
.rg-head {
    --a-field-w: 220px;
    margin-bottom: 14px;
}

.rg-bulk {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
}

.rg-count {
    font-size: 13px;
    color: var(--a-ink-4);
}

.rg-wrap {
    max-height: 46vh;
    overflow: auto;
}

/* A line that did not arrive stays on the sheet and out of the receipt. */
.rg-wrap tr.is-off td {
    opacity: 0.5;
}

.rg-qty {
    width: 92px;
}

/* A quantity that is not what was ordered is the whole point of this screen. */
.rg-qty.is-diff {
    border-color: var(--a-amber-line);
    background: var(--a-amber-bg);
}

.rg-batch {
    width: 140px;
}

.rg-date {
    width: 150px;
}

.rg-price {
    width: 100px;
}

.rg-note {
    display: block;
    margin-top: 14px;
}
</style>
