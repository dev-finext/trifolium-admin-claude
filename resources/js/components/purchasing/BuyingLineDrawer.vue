<script setup>
// One line of a buying sheet, in full.
//
// The sheet's table carries the handful of figures the decision is made from —
// what is on the shelf, what is already coming, what the minimum is, and the
// quantity being written. Everything else the item card holds is here, read
// downwards instead of sideways, which is the shape a single record wants.
//
// These are the values **as they were when the line was added**, not what the
// item card says now. A list written in March and read in May has to say what
// the shelf held in March or it is a different document from the one that was
// written; the link at the foot goes to the live card for whatever is current.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import { fmtISO } from '@/lib/dates';
import { ils, num } from '@/lib/money';

const props = defineProps({
    /** The line, or null while the drawer is closed. */
    line: { type: Object, default: null },
    /** The sheet it belongs to, for the unit labels and the kind. */
    list: { type: Object, default: null },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const router = useRouter();

const unit = (uom) => (uom ? t(`inventory.unit.${uom}`) : '—');

const qty = (value, uom) =>
    value === null || value === undefined
        ? '—'
        : `${num(value, 3)} ${unit(uom)}`;

const money = (value) => (value === null ? '—' : ils(value, 2));

const text = (value) => value || '—';

const win = computed(() =>
    props.line
        ? {
              id: `buyline:${props.list?.id}:${props.line.sku}`,
              title: props.line.name,
              subtitle: props.line.sku,
              icon: 'package',
          }
        : null,
);

const identity = computed(() => {
    const line = props.line;

    return [
        [t('buying.col.sku'), line.sku],
        [t('buying.col.name'), line.name],
        [t('buying.col.foreignName'), text(line.foreignName)],
        [t('buying.col.group'), text(line.group)],
        [t('buying.col.state'), ''],
    ];
});

const supply = computed(() => {
    const line = props.line;

    return [
        [t('buying.col.supplier'), text(line.supplier)],
        [t('buying.col.supplierCode'), text(line.supplierCode)],
        [t('buying.col.catalogNum'), text(line.catalogNum)],
        [t('buying.col.purchaseUom'), unit(line.purchaseUom || line.uom)],
        [t('buying.col.numInBuy'), num(line.numInBuy, 3)],
        [t('buying.col.packUom'), text(line.packUom)],
        [
            t('buying.col.packQty'),
            line.packQty === null ? '—' : num(line.packQty, 3),
        ],
        [t('buying.col.lastPrice'), money(line.lastPrice)],
        [
            t('buying.col.lastPriceOn'),
            line.lastPriceOn ? fmtISO(line.lastPriceOn) : '—',
        ],
        [t('buying.col.evalPrice'), money(line.evalPrice)],
    ];
});

const shelf = computed(() => {
    const line = props.line;

    return [
        [t('buying.col.uom'), unit(line.uom)],
        [t('buying.col.onHand'), qty(line.onHand, line.uom)],
        [t('buying.col.committed'), qty(line.committed, line.uom)],
        [t('buying.col.available'), qty(line.available, line.uom)],
        [t('buying.col.onOrder'), qty(line.onOrder, line.uom)],
        [t('buying.col.min'), qty(line.min, line.uom)],
        [t('buying.col.max'), qty(line.max, line.uom)],
        [t('buying.col.reorder'), qty(line.reorder, line.uom)],
    ];
});

const replenish = computed(() => {
    const line = props.line;

    return [
        [t('buying.col.minOrder'), qty(line.minOrder, line.purchaseUom)],
        [
            t('buying.col.leadDays'),
            line.leadDays === null
                ? '—'
                : t('buying.days', { n: line.leadDays }),
        ],
        [
            t('buying.col.procurement'),
            t(`items.procurementMethod.${line.procurement}`),
        ],
    ];
});

/** What the buyer wrote on this line, and what arrived against it. */
const working = computed(() => {
    const line = props.line;
    const rows = [
        [
            t('buying.col.qty'),
            line.qty === null
                ? '—'
                : `${num(line.qty, 3)} ${unit(line.purchaseUom || line.uom)}`,
        ],
    ];

    if (props.list?.kind === 'request') {
        rows.push([
            t('buying.col.done'),
            line.done ? t('buying.lineDone') : t('buying.lineNotDone'),
        ]);
    }

    if (line.received !== null) {
        rows.push([
            t('buying.col.received'),
            `${num(line.received, 3)} ${unit(line.purchaseUom || line.uom)}`,
        ]);
    }

    return rows;
});

function openItem() {
    router.push({ name: 'items', query: { item: props.line.sku } });
}
</script>

<template>
    <ADrawer :open="Boolean(line)" :win="win" @close="emit('close')">
        <template v-if="line" #header>
            <div class="ld-head">
                <h2 class="a-dhead-h">{{ line.name }}</h2>
                <span class="a-code a-tag">{{ line.sku }}</span>
            </div>
        </template>

        <div v-if="line" class="ld">
            <p class="a-hint ld-lede">{{ t('buying.lineSnapshot') }}</p>

            <div class="ld-grid">
                <ACard :title="t('buying.group.working')" icon="edit">
                    <AKeyValue :rows="working" />
                </ACard>

                <ACard :title="t('buying.group.identity')" icon="tag">
                    <AKeyValue :rows="identity">
                        <template #value-4>
                            <AChip
                                size="sm"
                                :dot="false"
                                :tone="
                                    line.state === 'active' ? 'green' : 'red'
                                "
                            >
                                {{ t(`buying.itemState.${line.state}`) }}
                            </AChip>
                        </template>
                    </AKeyValue>
                </ACard>

                <ACard :title="t('buying.group.supply')" icon="truck">
                    <AKeyValue :rows="supply" />
                </ACard>

                <ACard :title="t('buying.group.shelf')" icon="grid">
                    <AKeyValue :rows="shelf" />
                </ACard>

                <ACard :title="t('buying.group.replenish')" icon="layers">
                    <AKeyValue :rows="replenish" />
                </ACard>
            </div>

            <div class="ld-foot">
                <AButton icon="external" @click="openItem">
                    {{ t('buying.openItemCard') }}
                </AButton>
                <span class="a-hint">{{ t('buying.openItemCardHint') }}</span>
            </div>
        </div>
    </ADrawer>
</template>

<style scoped>
.ld {
    display: grid;
    gap: 16px;
}

.ld-head {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.ld-lede {
    margin: 0;
    max-width: 70ch;
}

.ld-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
    align-items: start;
}

.ld-foot {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.ld-foot .a-hint {
    margin: 0;
}
</style>
