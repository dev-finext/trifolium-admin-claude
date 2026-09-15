<script setup>
// What one item costs at each quantity, given its own unit price and the
// ladder of the group that prices it.
//
// The same card sits on the item editor and the item drawer, so a buyer
// setting a price and a pharmacist reading one see the same table. An item
// no ladder applies to says so plainly — its price is fixed.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { ils, num, pct } from '@/lib/money';
import { useCatalogStore } from '@/stores/catalog';

const props = defineProps({
    /** The item record, or null while nothing is open. */
    item: { type: Object, default: null },
    /** Show at most a handful of rows, for a card beside other cards. */
    compact: { type: Boolean, default: false },
});

/** Rows a compact card shows before "and N more". */
const COMPACT_ROWS = 5;

const { t } = useI18n();
const { loc } = useLocalized();
const catalog = useCatalogStore();

const group = computed(() =>
    props.item ? catalog.groupForItem(props.item) : null,
);
const unitPrice = computed(() =>
    props.item ? catalog.unitPriceOf(props.item) : null,
);
const rows = computed(() => (props.item ? catalog.ladderFor(props.item) : []));
const shown = computed(() =>
    props.compact ? rows.value.slice(0, COMPACT_ROWS) : rows.value,
);
const hidden = computed(() => rows.value.length - shown.value.length);

const uomName = computed(() =>
    props.item?.uom?.sales ? t(`items.uom.${props.item.uom.sales}`) : '',
);

/** How the item came to this group — by its own choice or by its code. */
const assignment = computed(() => {
    if (!props.item) {
        return '';
    }

    if (props.item.priceGroup === 'none') {
        return t('pricing.calculator.groupNone');
    }

    if (props.item.priceGroup) {
        return t('pricing.calculator.groupExplicit');
    }

    return group.value
        ? t('pricing.calculator.groupDefault')
        : t('pricing.calculator.groupInheritNone');
});
</script>

<template>
    <div class="lc">
        <div v-if="!group" class="a-note a-note--info">
            <div class="lc-strong">{{ t('pricing.calculator.fixed') }}</div>
            <div class="lc-sub">{{ t('pricing.calculator.fixedSub') }}</div>
        </div>
        <div v-else-if="unitPrice == null" class="a-note a-note--warn">
            {{ t('pricing.calculator.noPrice') }}
        </div>
        <template v-else>
            <div class="lc-head">
                <span class="lc-strong">{{ loc(group.name) }}</span>
                <span class="lc-sub">
                    · {{ t(`pricing.mode.${group.mode}`) }} ·
                    {{
                        t('pricing.table.baseQtyValue', {
                            qty: num(group.baseQty),
                            uom: uomName,
                        })
                    }}
                </span>
                <span class="lc-sub lc-how">{{ assignment }}</span>
            </div>
            <div
                v-if="catalog.uomMismatch(item)"
                class="a-note a-note--warn lc-warn"
            >
                <div>{{ t('pricing.calculator.uomMismatch') }}</div>
                <div class="lc-sub">
                    {{ t('pricing.calculator.uomMismatchSub') }}
                </div>
            </div>
            <table class="a-table lc-table">
                <thead>
                    <tr>
                        <th scope="col">{{ t('pricing.ladder.range') }}</th>
                        <th scope="col">{{ t('pricing.ladder.pct') }}</th>
                        <th scope="col" class="nowrap">
                            {{ t('pricing.ladder.unit') }}
                        </th>
                        <th scope="col" class="nowrap">
                            {{ t('pricing.ladder.unitInclVat') }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in shown" :key="row.from">
                        <td class="nowrap">
                            <ANum>
                                {{
                                    row.to == null
                                        ? t('pricing.ladder.andUp', {
                                              from: num(row.from),
                                          })
                                        : t('pricing.ladder.upTo', {
                                              from: num(row.from),
                                              to: num(row.to),
                                          })
                                }}
                            </ANum>
                            {{ uomName }}
                        </td>
                        <td class="nowrap">
                            <span v-if="row.pct" class="num">
                                {{
                                    t('pricing.ladder.off', {
                                        pct: pct(row.pct, 1),
                                    })
                                }}
                            </span>
                            <span v-else class="lc-dim">
                                {{ t('pricing.ladder.base') }}
                            </span>
                        </td>
                        <td class="num nowrap">{{ ils(row.unit, 2) }}</td>
                        <td class="num nowrap lc-sub">
                            {{ ils(row.unitInclVat, 2) }}
                        </td>
                    </tr>
                </tbody>
            </table>
            <div v-if="hidden > 0" class="lc-more">
                {{ t('pricing.calculator.more', { n: hidden }) }}
            </div>
        </template>
    </div>
</template>

<style scoped>
.lc-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 6px;
    margin-bottom: 8px;
    font-size: 13.5px;
}

.lc-strong {
    font-weight: 600;
}

.lc-sub {
    color: var(--a-ink-4);
    font-size: 13px;
}

.lc-how {
    margin-inline-start: auto;
}

.lc-warn {
    margin-bottom: 8px;
}

.lc-dim {
    color: var(--a-ink-4);
}

.lc-more {
    padding: 6px 2px 0;
    font-size: 12.5px;
    color: var(--a-ink-4);
}
</style>
