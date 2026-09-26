<script setup>
// V3 — the other half of what the planning column leads to.
//
// Natalie: "יש המלצות לייצור אני מחליטה אם לייצר (עם אופציה לייצור ישירות מהדוח
// בלחיצת כפתור) אחרי שההוראה יצאה לייצור - הטבלה מעדכנת את הסטטוס של המוצר
// להוזמן." Each planned line is a recommendation the buyer accepts or leaves;
// accepting it opens the production order there and then.
//
// A line that cannot be made says so before anything is opened, and names what
// is short — the check the note asks for in its own section.
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { num } from '@/lib/money';
import { usePlanningStore } from '@/stores/planning';

const emit = defineEmits(['close', 'produced']);

const { t } = useI18n();
const { loc } = useLocalized();
const store = usePlanningStore();

const rows = computed(() => store.plannedForProduction);

/** Which recommendations are accepted. One that cannot run starts unticked. */
const picked = reactive({});
const saving = ref(false);

rows.value.forEach((row) => {
    picked[row.sku] = Boolean(row.bomId && row.can?.ok);
});

const ready = computed(() => rows.value.some((row) => picked[row.sku]));

async function produce() {
    saving.value = true;

    try {
        const made = [];

        for (const row of rows.value) {
            if (!picked[row.sku]) {
                continue;
            }

            const order = await store.produceFromPlan(row.sku);

            if (order) {
                made.push(order);
            }
        }

        emit('produced', made);
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <AModal
        open
        :title="t('planning.produce.title')"
        :width="720"
        @close="emit('close')"
    >
        <p class="a-hint pf-lede">{{ t('planning.produce.lede') }}</p>

        <div v-if="!rows.length" class="pf-none">
            {{ t('planning.produce.none') }}
        </div>

        <ul v-else class="pf-rows">
            <li v-for="row in rows" :key="row.sku" class="pf-row">
                <label class="a-checkrow">
                    <input
                        v-model="picked[row.sku]"
                        type="checkbox"
                        :disabled="
                            !row.bomId || row.can?.reason === 'unitMismatch'
                        "
                    />
                    <span class="pf-name">{{ loc(row.name) }}</span>
                </label>
                <span class="a-code a-tag">{{ row.sku }}</span>
                <ANum class="pf-qty">
                    {{ num(row.qty, 3) }}
                    {{ t(`inventory.unit.${row.unit}`) }}
                </ANum>
                <AChip v-if="!row.bomId" tone="gray" size="sm" :dot="false">
                    {{ t('planning.produce.noRecipe') }}
                </AChip>
                <AChip
                    v-else-if="row.can?.ok"
                    tone="green"
                    size="sm"
                    :dot="false"
                >
                    {{ t('planning.produce.canMake') }}
                </AChip>
                <AChip
                    v-else-if="row.can?.reason === 'unitMismatch'"
                    tone="red"
                    size="sm"
                    :dot="false"
                >
                    {{ t('planning.produce.unitMismatch') }}
                </AChip>
                <AChip v-else tone="red" size="sm" :dot="false">
                    {{
                        t('planning.produce.short', {
                            n: row.can?.short?.length || 0,
                        })
                    }}
                </AChip>

                <ul
                    v-if="row.can && !row.can.ok && row.can.short?.length"
                    class="pf-short"
                >
                    <li v-for="one in row.can.short" :key="one.sku">
                        {{ loc(one.name) }} ·
                        <ANum>{{ num(one.gap, 3) }}</ANum>
                        {{ t(`inventory.unit.${one.unit}`) }}
                        {{ t('planning.produce.missing') }}
                    </li>
                </ul>
            </li>
        </ul>

        <template #footer>
            <AButton
                kind="p"
                icon="play"
                :disabled="!ready || saving"
                @click="produce"
            >
                {{ t('planning.produce.open') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.pf-lede {
    margin: 0 0 14px;
}

.pf-none {
    padding: 20px;
    text-align: center;
    color: var(--a-ink-4);
}

.pf-rows {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 10px;
}

.pf-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--a-line-3);
}

.pf-row:last-child {
    border-bottom: 0;
}

.pf-name {
    font-weight: 600;
}

.pf-qty {
    flex: 1 1 auto;
    text-align: start;
}

.pf-short {
    flex: 1 1 100%;
    margin: 0;
    padding-inline-start: 26px;
    font-size: 12.5px;
    color: var(--a-red);
}
</style>
