<script setup>
// V3 — the planned quantities leave the report as purchase requests.
//
// Natalie: "כשאני מחליטה לשלוח את המוצרים לבקשת רכש לספק ... יהיה לי מסמך של
// בקשת רכש - שים לב לא הזמנה אלה בקשה כי עדיין לא אושר על ידי הספק." So this
// screen raises requests, one per supplier, and stops there. Turning a request
// into an order happens later, on the request itself, when the supplier agrees.
//
// The lines arrive grouped by the supplier whose card the item names. A group
// whose items name no supplier cannot go out until one is chosen — a request
// with no recipient has nowhere to go.
//
// A line does not have to leave whole. Where the pharmacy has a recipe for the
// item, the quantity can be split: part bought from the supplier, part made
// here. What is made here does not go on the request at all — it leaves as a
// production order, because that is a different document, with a different
// answer to when the quantity will be there. A line sent entirely to production
// takes its group's need for a supplier with it: nothing is being asked of
// anybody.
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { ils, num } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import { usePlanningStore } from '@/stores/planning';

const emit = defineEmits(['close', 'raised']);

const { t } = useI18n();
const { loc } = useLocalized();
const dataset = useDatasetStore();
const store = usePlanningStore();

const groups = computed(() => store.plannedBySupplier);

/** Which groups go out, and under which supplier — keyed by the group's index. */
const picked = reactive({});
const chosen = reactive({});
const notes = reactive({});
const saving = ref(false);

/** How much of a line is made here rather than bought, keyed by group and SKU. */
const split = reactive({});

const key = (i, line) => `${i}:${line.sku}`;

groups.value.forEach((group, i) => {
    picked[i] = true;
    chosen[i] = group.supplierCode || '';
    notes[i] = '';
});

// One number is typed — how much of the line is made here — and the supplier's
// share is what is left of it. Two fields correcting each other would fight the
// person typing: the moment a keystroke takes one past the line quantity, the
// other is clamped, and the field's contents and the number behind it stop
// agreeing. So the typed side is held exactly as typed, and the other side is
// stated, not edited.

/** What was typed into a line's split box, as typed. */
const typed = (i, line) => split[key(i, line)]?.make ?? '';

const isSplit = (i, line) => Boolean(split[key(i, line)]?.on);

/** The quantity of a line that is being made here. Zero unless it was split. */
const madeHere = (i, line) => {
    if (!isSplit(i, line)) {
        return 0;
    }

    return Math.min(Math.max(0, Number(typed(i, line)) || 0), Number(line.qty));
};

/** And the rest, which is what the supplier is being asked for. */
const bought = (i, line) => Number(line.qty) - madeHere(i, line);

/** Somebody has asked for more than the line holds, and it needs saying. */
const overSplit = (i, line) =>
    isSplit(i, line) && Number(typed(i, line)) > Number(line.qty);

/** Open the split on a line, or close it and put the whole quantity back. */
function toggleSplit(i, line) {
    const at = key(i, line);

    split[at] = split[at]?.on
        ? { on: false, make: '' }
        : { on: true, make: '' };
}

function setMade(i, line, value) {
    split[key(i, line)] = { on: true, make: value };
}

/** The lines of a group that still have something to ask the supplier for. */
const buyLines = (group, i) =>
    group.lines
        .filter((line) => bought(i, line) > 0)
        .map((line) => ({ ...line, qty: bought(i, line) }));

/** And the lines of a group with something to make here. */
const makeLines = (group, i) =>
    group.lines
        .filter((line) => madeHere(i, line) > 0)
        .map((line) => ({ ...line, qty: madeHere(i, line) }));

const supplierOptions = computed(() => [
    { value: '', label: t('planning.request.pickSupplier') },
    ...dataset.suppliers.map((supplier) => ({
        value: supplier.code,
        label: loc(supplier.name),
    })),
]);

/**
 * The name to put on the request.
 *
 * A group keeps the name its items' cards resolve to; when the buyer picks a
 * different supplier, that one is looked up among the console's own cards. SAP's
 * supplier code is not the key of those cards, so looking the group's own code
 * up there would fail and leave a bare number on the document.
 */
const supplierName = (code, group) => {
    if (group && code === group.supplierCode && group.supplier) {
        return group.supplier;
    }

    const hit = dataset.suppliers.find((supplier) => supplier.code === code);

    return hit ? loc(hit.name) : code;
};

/** What a group comes to, where the items carry a last purchase price. */
const groupValue = (group, i) =>
    buyLines(group, i).reduce(
        (sum, line) => sum + (Number(line.price) || 0) * Number(line.qty),
        0,
    );

/** A supplier is needed only where something is actually being bought. */
const needsSupplier = (group, i) => picked[i] && buyLines(group, i).length > 0;

const ready = computed(() =>
    groups.value.some(
        (group, i) =>
            picked[i] &&
            ((buyLines(group, i).length > 0 && chosen[i]) ||
                makeLines(group, i).length > 0),
    ),
);

const missingSupplier = computed(() =>
    groups.value.some((group, i) => needsSupplier(group, i) && !chosen[i]),
);

const overSplitSomewhere = computed(() =>
    groups.value.some(
        (group, i) =>
            picked[i] && group.lines.some((line) => overSplit(i, line)),
    ),
);

/** How many lines are going to the lab, across every group that is going out. */
const makingCount = computed(() =>
    groups.value.reduce(
        (n, group, i) => n + (picked[i] ? makeLines(group, i).length : 0),
        0,
    ),
);

/**
 * Send it all out.
 *
 * What to do is read off the screen before anything is written, because writing
 * moves quantities between the report's two columns and the groups on screen
 * are computed from exactly those quantities — a list read halfway through
 * would be a different list. Production goes first: it takes its share off the
 * purchase line, and the request is raised for what is left.
 */
async function raise() {
    saving.value = true;

    try {
        const work = groups.value
            .map((group, i) => ({
                supplierCode: chosen[i],
                supplier: supplierName(chosen[i], group),
                note: notes[i],
                buy: picked[i] ? buyLines(group, i) : [],
                make: picked[i] ? makeLines(group, i) : [],
            }))
            .filter((one) => one.buy.length || one.make.length);

        const made = [];
        const opened = [];

        for (const one of work) {
            for (const line of one.make) {
                const order = await store.moveToProduction(line.sku, line.qty);

                if (order) {
                    opened.push(order);
                }
            }

            if (one.buy.length && one.supplierCode) {
                made.push(
                    store.raiseRequest({
                        supplierCode: one.supplierCode,
                        supplier: one.supplier,
                        lines: one.buy,
                        note: one.note,
                    }),
                );
            }
        }

        emit('raised', made, opened);
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <AModal
        open
        :title="t('planning.request.title')"
        :width="760"
        @close="emit('close')"
    >
        <p class="a-hint rq-lede">{{ t('planning.request.lede') }}</p>

        <div v-if="!groups.length" class="rq-none">
            {{ t('planning.request.none') }}
        </div>

        <section v-for="(group, i) in groups" :key="i" class="rq-group">
            <header class="rq-head">
                <label class="a-checkrow">
                    <input v-model="picked[i]" type="checkbox" />
                    <span class="rq-name">
                        {{
                            group.supplier
                                ? loc(group.supplier)
                                : t('planning.request.noSupplier')
                        }}
                    </span>
                </label>
                <span class="a-push rq-sum">
                    <template v-if="buyLines(group, i).length">
                        {{
                            t('planning.request.lineCount', {
                                n: buyLines(group, i).length,
                            })
                        }}
                    </template>
                    <template v-else>
                        {{ t('planning.request.nothingBought') }}
                    </template>
                    <template v-if="groupValue(group, i)">
                        · <ANum>{{ ils(groupValue(group, i), 0) }}</ANum>
                    </template>
                    <template v-if="makeLines(group, i).length">
                        ·
                        <span class="rq-made">{{
                            t('planning.request.madeCount', {
                                n: makeLines(group, i).length,
                            })
                        }}</span>
                    </template>
                </span>
            </header>

            <div v-if="picked[i]" class="rq-body">
                <div
                    v-if="!group.supplierCode && needsSupplier(group, i)"
                    class="rq-pick"
                >
                    <label class="a-lbl">{{
                        t('planning.request.pickSupplierLabel')
                    }}</label>
                    <ASelect
                        v-model="chosen[i]"
                        :options="supplierOptions"
                        class="a-w100"
                    />
                    <div class="a-hint">
                        {{ t('planning.request.pickSupplierHint') }}
                    </div>
                </div>

                <ul class="rq-lines">
                    <li v-for="line in group.lines" :key="line.sku">
                        <div class="rq-line">
                            <span class="a-code a-tag">{{ line.sku }}</span>
                            <span class="rq-item">{{ loc(line.name) }}</span>
                            <ANum class="rq-qty">
                                {{ num(line.qty, 3) }}
                                {{ t(`inventory.unit.${line.unit}`) }}
                            </ANum>
                            <AButton
                                v-if="line.produce?.can"
                                sm
                                :kind="isSplit(i, line) ? 'p' : 'ghost'"
                                icon="beaker"
                                @click="toggleSplit(i, line)"
                            >
                                {{
                                    isSplit(i, line)
                                        ? t('planning.request.splitOff')
                                        : t('planning.request.split')
                                }}
                            </AButton>
                            <span
                                v-else-if="
                                    line.produce?.why === 'alreadyPlanned'
                                "
                                class="rq-why"
                            >
                                {{ t('planning.request.why.alreadyPlanned') }}
                            </span>
                            <span
                                v-else-if="line.produce?.why === 'unitMismatch'"
                                class="rq-why"
                            >
                                {{ t('planning.request.why.unitMismatch') }}
                            </span>
                        </div>

                        <div v-if="isSplit(i, line)" class="rq-split">
                            <div class="a-fields rq-split-fields">
                                <label class="a-field">
                                    <span>{{
                                        t('planning.request.makeQty', {
                                            unit: t(
                                                `inventory.unit.${line.unit}`,
                                            ),
                                        })
                                    }}</span>
                                    <AInput
                                        :model-value="typed(i, line)"
                                        type="number"
                                        min="0"
                                        :max="line.qty"
                                        ltr
                                        @update:model-value="
                                            setMade(i, line, $event)
                                        "
                                    />
                                </label>
                                <div class="a-field">
                                    <span class="a-lbl">{{
                                        t('planning.request.buyQty', {
                                            unit: t(
                                                `inventory.unit.${line.unit}`,
                                            ),
                                        })
                                    }}</span>
                                    <ANum class="rq-rest">{{
                                        num(bought(i, line), 3)
                                    }}</ANum>
                                </div>
                            </div>
                            <div v-if="overSplit(i, line)" class="rq-over">
                                {{
                                    t('planning.request.overSplit', {
                                        qty: num(line.qty, 3),
                                        unit: t(`inventory.unit.${line.unit}`),
                                    })
                                }}
                            </div>
                            <div v-else class="a-hint">
                                {{ t('planning.request.splitHint') }}
                            </div>
                        </div>
                    </li>
                </ul>

                <label class="a-lbl">{{ t('planning.request.note') }}</label>
                <ATextarea v-model="notes[i]" :rows="2" class="a-w100" />
                <div class="a-hint">{{ t('planning.request.noteHint') }}</div>
            </div>
        </section>

        <template #footer>
            <AButton
                kind="p"
                icon="inbox"
                :disabled="!ready || overSplitSomewhere || saving"
                @click="raise"
            >
                {{
                    makingCount
                        ? t('planning.request.raiseAndMake')
                        : t('planning.request.raise')
                }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
            <span v-if="missingSupplier" class="a-push a-hint">
                {{ t('planning.request.needSupplier') }}
            </span>
        </template>
    </AModal>
</template>

<style scoped>
.rq-lede {
    margin: 0 0 14px;
}

.rq-none {
    padding: 20px;
    text-align: center;
    color: var(--a-ink-4);
}

.rq-group {
    border: 1px solid var(--a-line);
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 12px;
}

.rq-head {
    display: flex;
    align-items: center;
    gap: 10px;
}

.rq-name {
    font-weight: 700;
}

.rq-sum {
    font-size: 13px;
    color: var(--a-ink-4);
}

.rq-body {
    margin-top: 10px;
}

.rq-pick {
    margin-bottom: 10px;
}

.rq-lines {
    margin: 0 0 12px;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 6px;
}

.rq-lines li {
    font-size: 13.5px;
}

.rq-line {
    display: flex;
    align-items: center;
    gap: 10px;
}

.rq-made {
    color: var(--a-brand, var(--a-ink-2));
    font-weight: 600;
}

.rq-why {
    flex: none;
    font-size: 12.5px;
    color: var(--a-ink-4);
}

.rq-split {
    margin: 8px 0 4px;
    padding: 10px 12px;
    border: 1px solid var(--a-line);
    border-radius: 8px;
    background: var(--a-bg-2, transparent);
}

.rq-split-fields {
    --a-field-w: 150px;
    margin-bottom: 8px;
}

/* The supplier's share is stated, not typed, so it sits on the control line
   with the weight of a value rather than the look of a field. */
.rq-rest {
    align-self: center;
    padding: 7px 0;
    font-weight: 700;
    font-size: 15px;
}

.rq-over {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--a-danger, #b42318);
}

.rq-item {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.rq-qty {
    flex: none;
    font-weight: 600;
}
</style>
