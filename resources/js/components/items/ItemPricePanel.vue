<script setup>
// The price area of an item card.
//
// One field is editable here and one only: the item's own price, for one unit
// of whatever its price group is written in. Everything else on this panel is
// derived — which group covers this item code, what unit that group prices in,
// and what the ladder therefore comes to at every quantity. None of it is a
// choice to be made on the item, because all of it is already decided by the
// group, and answering the same question in two places is how two answers
// start to disagree.
//
// Every price here is before VAT, and the panel says so once rather than
// carrying a second column that repeats the first times 1.18.
//
// A red dot sits beside the price when the item has a group and no price: the
// group will price it at every quantity and has nothing to work from, which is
// the one state on this card that silently does nothing.
import { computed, useId } from 'vue';
import { useI18n } from 'vue-i18n';

import ADataTable from '@/components/ui/ADataTable.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { LADDER_DECIMALS, ladderTable } from '@/lib/ladder';
import { money, pctText, qtyText } from '@/lib/money';
import { useCatalogStore } from '@/stores/catalog';

const props = defineProps({
    /** The item code the group is resolved from. */
    sku: { type: String, default: '' },
    /** The price, as a string while it is being typed. */
    modelValue: { type: [String, Number], default: '' },
    /** False on the read-only card; true inside the editor's gate. */
    editable: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();
const { loc } = useLocalized();
const catalog = useCatalogStore();
const uid = useId();

const hit = computed(() => catalog.resolveSku(props.sku));
const group = computed(() => hit.value?.group || null);

const price = computed(() => {
    const value = parseFloat(props.modelValue);

    return Number.isFinite(value) && value > 0 ? value : null;
});

/** The unit the ladder is written in — the group's, never the item's. */
const uomName = computed(() =>
    group.value?.uom ? t(`pricing.uom.${group.value.uom}`) : '',
);

/** A group that prices this item, and no price to price it with. */
const missing = computed(() => Boolean(group.value) && price.value === null);

// Before VAT throughout, which is why the rate passed in is zero: the panel
// states it once in words instead of carrying a column that says it again.
const rows = computed(() =>
    group.value && price.value !== null
        ? ladderTable(group.value, price.value, 0)
        : [],
);

const cols = computed(() => [
    { k: 'range', label: t('items.price.table.range') },
    { k: 'pct', label: t('items.price.table.pct'), nowrap: true },
    { k: 'unit', label: t('items.price.table.unit'), nowrap: true },
    { k: 'total', label: t('items.price.table.total'), nowrap: true },
]);

/** Digits, one decimal point, and no more decimals than a ladder holds. */
function onInput(event) {
    const [whole, ...rest] = event.target.value
        .replace(/[^\d.]/g, '')
        .split('.');

    emit(
        'update:modelValue',
        rest.length
            ? `${whole}.${rest.join('').slice(0, LADDER_DECIMALS)}`
            : whole,
    );
}
</script>

<template>
    <div class="ip">
        <!-- Which group covers this code, and on whose authority. -->
        <div v-if="group" class="ip-facts">
            <div class="ip-fact">
                <span class="a-lbl ip-lbl">
                    {{ t('items.price.group') }}
                </span>
                <span class="ip-strong">{{ loc(group.name) }}</span>
                <span class="ip-sub">
                    {{ t('items.price.groupBy', { prefix: hit.prefix }) }}
                </span>
            </div>
            <div class="ip-fact">
                <span class="a-lbl ip-lbl">{{ t('items.price.uom') }}</span>
                <span class="ip-strong">{{ uomName }}</span>
                <span class="ip-sub">
                    {{ t('items.price.uomFrom', { group: loc(group.name) }) }}
                </span>
            </div>
        </div>
        <div v-else class="a-note a-note--info">
            <div class="ip-strong">{{ t('items.price.noGroup') }}</div>
            <div class="ip-sub">{{ t('items.price.noGroupSub') }}</div>
        </div>

        <!-- The one field. -->
        <div class="ip-field">
            <label class="a-lbl ip-pricelbl" :for="`${uid}-price`">
                <span
                    v-if="missing"
                    class="ip-dot"
                    :title="t('items.price.missingDot')"
                    :aria-label="t('items.price.missingDot')"
                />
                {{
                    group
                        ? t('items.price.label', { uom: uomName })
                        : t('items.price.labelPlain')
                }}
            </label>
            <input
                v-if="editable"
                :id="`${uid}-price`"
                class="a-input ip-input"
                inputmode="decimal"
                :value="modelValue"
                :aria-label="t('items.price.aria')"
                @input="onInput"
            />
            <div v-else class="ip-readout">
                <span v-if="price !== null" class="num ip-strong">
                    {{ money(price) }}
                </span>
                <span v-else class="ip-sub">{{ t('items.price.none') }}</span>
            </div>
            <div class="a-hint">{{ t('items.price.beforeVat') }}</div>
        </div>

        <div v-if="missing" class="a-note a-note--warn ip-missing">
            {{ t('items.price.missing') }}
        </div>

        <!-- Derived: what the group does to that price at every quantity. -->
        <template v-if="rows.length">
            <div class="a-lbl ip-tablelbl">
                {{ t('items.price.table.title', { group: loc(group.name) }) }}
            </div>
            <ADataTable :cols="cols" :rows="rows" row-key="from">
                <template #cell-range="{ row }">
                    <ANum>
                        {{
                            row.to == null
                                ? t('pricing.ladder.andUp', {
                                      from: qtyText(row.from),
                                  })
                                : t('pricing.ladder.upTo', {
                                      from: qtyText(row.from),
                                      to: qtyText(row.to),
                                  })
                        }}
                    </ANum>
                    {{ uomName }}
                </template>
                <template #cell-pct="{ row }">
                    <span v-if="row.pct" class="num">
                        {{
                            t('pricing.ladder.off', {
                                pct: pctText(row.pct),
                            })
                        }}
                    </span>
                    <span v-else class="ip-sub">
                        {{ t('pricing.ladder.base') }}
                    </span>
                </template>
                <template #cell-unit="{ row }">
                    <span class="num ip-strong">{{ money(row.unit) }}</span>
                </template>
                <template #cell-total="{ row }">
                    <span class="num ip-sub">{{
                        money(row.exampleTotal)
                    }}</span>
                </template>
            </ADataTable>
            <div class="ip-foot">
                <AIcon name="lock" :size="13" />
                <span>{{ t('items.price.derived') }}</span>
            </div>
        </template>
    </div>
</template>

<style scoped>
.ip {
    display: grid;
    gap: 14px;
}

.ip-facts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px 24px;
}

.ip-fact {
    display: grid;
    gap: 2px;
}

.ip-lbl {
    margin: 0;
}

.ip-strong {
    font-weight: 600;
    color: var(--a-ink);
}

.ip-sub {
    font-size: 12.5px;
    color: var(--a-ink-4);
}

.ip-field {
    max-width: 280px;
}

.ip-pricelbl {
    display: flex;
    align-items: center;
    gap: 7px;
}

/* The one state on this card that otherwise looks like any other blank. */
.ip-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--a-red);
    flex: none;
}

.ip-input {
    width: 100%;
    text-align: start;
}

.ip-readout {
    padding: 4px 0;
    font-size: 15px;
}

.ip-missing {
    margin: 0;
}

.ip-tablelbl {
    margin: 4px 0 0;
}

.ip-foot {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    color: var(--a-ink-4);
}
</style>
