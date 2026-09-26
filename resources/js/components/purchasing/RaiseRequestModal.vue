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
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
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

groups.value.forEach((group, i) => {
    picked[i] = true;
    chosen[i] = group.supplierCode || '';
    notes[i] = '';
});

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
const groupValue = (group) =>
    group.lines.reduce(
        (sum, line) => sum + (Number(line.price) || 0) * Number(line.qty),
        0,
    );

const ready = computed(() =>
    groups.value.some((group, i) => picked[i] && chosen[i]),
);

const missingSupplier = computed(() =>
    groups.value.some((group, i) => picked[i] && !chosen[i]),
);

async function raise() {
    saving.value = true;

    try {
        const made = [];

        groups.value.forEach((group, i) => {
            if (!picked[i] || !chosen[i]) {
                return;
            }

            made.push(
                store.raiseRequest({
                    supplierCode: chosen[i],
                    supplier: supplierName(chosen[i], group),
                    lines: group.lines,
                    note: notes[i],
                }),
            );
        });

        emit('raised', made);
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
                    {{
                        t('planning.request.lineCount', {
                            n: group.lines.length,
                        })
                    }}
                    <template v-if="groupValue(group)">
                        · <ANum>{{ ils(groupValue(group), 0) }}</ANum>
                    </template>
                </span>
            </header>

            <div v-if="picked[i]" class="rq-body">
                <div v-if="!group.supplierCode" class="rq-pick">
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
                        <span class="a-code a-tag">{{ line.sku }}</span>
                        <span class="rq-item">{{ loc(line.name) }}</span>
                        <ANum class="rq-qty">
                            {{ num(line.qty, 3) }}
                            {{ t(`inventory.unit.${line.unit}`) }}
                        </ANum>
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
                :disabled="!ready || saving"
                @click="raise"
            >
                {{ t('planning.request.raise') }}
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
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13.5px;
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
