<script setup>
// The print run: pick what the labels are for — an order on the bench, a goods
// receipt, a parcel going out — see how many labels that is and why, look at
// them, and send them to the print dialog. Every run is logged.
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import StickerPreview from '@/components/stickers/StickerPreview.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useStickerData } from '@/composables/useStickerData';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { STICKER_RULES, STICKER_TEMPLATE_IDS } from '@/config';
import { useInventoryStore } from '@/stores/inventory';
import { statusOf, trackedItems, useOrdersStore } from '@/stores/orders';
import { useStickersStore } from '@/stores/stickers';

const PREVIEW_LIMIT = 8;

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const stickers = useStickersStore();
const orders = useOrdersStore();
const inventory = useInventoryStore();
const { labelsForOrder, labelsForReceipt, labelsForShipping, printStickers } =
    useStickerData();

const view = useUrlState({ src: 'prep', ref: '' });

watch(
    () => view.src,
    () => {
        view.ref = '';
    },
);

const sourceOptions = computed(() =>
    STICKER_TEMPLATE_IDS.map((id) => ({
        value: id,
        label: t(`stickers.template.${id}`),
    })),
);

const benchOrders = computed(() =>
    orders.all
        .filter(
            (order) =>
                ['lab', 'packed'].includes(
                    statusOf(order),
                ) &&
                trackedItems(order).some((item) => !item.cancelled),
        )
        .sort((a, b) => Number(Boolean(b.urgent)) - Number(Boolean(a.urgent))),
);

const parcelOrders = computed(() =>
    orders.all.filter(
        (order) =>
            order.courier &&
            ['packed', 'sent'].includes(statusOf(order)),
    ),
);

const receipts = computed(() => inventory.receipts);

/** What can be picked for the chosen source, newest or most urgent first. */
const targets = computed(() => {
    if (view.src === 'item') {
        return receipts.value.map((receipt) => ({
            value: receipt.id,
            label: `${receipt.id} · ${loc(receipt.supplier)} · ${receipt.when?.stamp || ''}`,
            record: receipt,
        }));
    }

    const list = view.src === 'prep' ? benchOrders.value : parcelOrders.value;

    return list.map((order) => ({
        value: order.id,
        label: `${order.id} · ${loc(order.patient.name)} · ${t(`status.${statusOf(order)}`)}`,
        record: order,
    }));
});

const selected = computed(
    () =>
        targets.value.find((row) => row.value === view.ref) ||
        targets.value[0] ||
        null,
);

const template = computed(() => stickers.templateById(view.src));

const labels = computed(() => {
    if (!selected.value) {
        return [];
    }

    if (view.src === 'prep') {
        return labelsForOrder(selected.value.record);
    }

    if (view.src === 'item') {
        return labelsForReceipt(selected.value.record);
    }

    return labelsForShipping(selected.value.record);
});

/** The count rule, spelled out per line. */
const ruleLines = computed(() => {
    if (!selected.value) {
        return [];
    }

    if (view.src === 'prep') {
        return trackedItems(selected.value.record)
            .filter((item) => !item.cancelled)
            .map((item) => {
                const packages = Math.max(1, Number(item.packages) || 1);
                const n = stickers.prepCount(item);

                return (
                    `${loc(item.name)}: ` +
                    t('stickers.print.rulePrep', { packages, n }) +
                    (item.unit === 'capsule'
                        ? t('stickers.print.ruleCapsule', {
                              spare: STICKER_RULES.capsuleSpare,
                          })
                        : '')
                );
            });
    }

    if (view.src === 'item') {
        return [
            t('stickers.print.ruleItem'),
            ...(selected.value.record.lines || []).map((line, i) =>
                t('stickers.print.line', {
                    i: i + 1,
                    name: line.batch || line.sku,
                    n: stickers.itemCount(line),
                }),
            ),
        ];
    }

    return [t('stickers.print.ruleShipping')];
});

const shown = computed(() => labels.value.slice(0, PREVIEW_LIMIT));

async function print() {
    if (!template.value || !labels.value.length || !selected.value) {
        return;
    }

    const ok = await printStickers(
        template.value,
        labels.value,
        selected.value.value,
    );

    push(
        ok
            ? {
                  title: t('stickers.print.printed'),
                  body: t('stickers.print.printedBody', {
                      n: labels.value.length,
                      template: t(`stickers.template.${view.src}`),
                      ref: selected.value.value,
                  }),
              }
            : { title: t('stickers.print.blocked'), bad: true },
    );
}
</script>

<template>
    <div class="pr">
        <ACard :title="t('stickers.tab.print')" icon="printer">
            <template #right>
                <V2Badge id="labels" size="sm" />
            </template>

            <div class="pr-form">
                <div>
                    <label class="a-lbl" for="stk-src">{{
                        t('stickers.print.source')
                    }}</label>
                    <ASelect
                        id="stk-src"
                        v-model="view.src"
                        :options="sourceOptions"
                    />
                </div>
                <div class="pr-ref">
                    <label class="a-lbl" for="stk-ref">{{
                        t('stickers.print.pick')
                    }}</label>
                    <ASelect
                        v-if="targets.length"
                        id="stk-ref"
                        :model-value="selected?.value || ''"
                        :options="targets"
                        class="a-w100"
                        ltr
                        @update:model-value="view.ref = $event"
                    />
                    <div v-else class="a-hint">
                        {{ t('stickers.print.none') }}
                    </div>
                </div>
                <div class="pr-go">
                    <AButton
                        kind="p"
                        icon="printer"
                        :disabled="!labels.length"
                        @click="print"
                    >
                        {{ t('stickers.print.print', { n: labels.length }) }}
                    </AButton>
                </div>
            </div>

            <div v-if="selected" class="pr-rule">
                <div class="pr-rule-t">
                    {{ t('stickers.print.count') }} ·
                    <ANum>{{ labels.length }}</ANum>
                </div>
                <ul class="a-ul">
                    <li v-for="(line, i) in ruleLines" :key="i">{{ line }}</li>
                </ul>
            </div>
        </ACard>

        <ACard
            v-if="template && labels.length"
            :title="t('stickers.print.labels', { n: labels.length })"
            icon="tag"
        >
            <div class="pr-grid">
                <StickerPreview
                    v-for="label in shown"
                    :key="label.key"
                    :template="template"
                    :data="label.data"
                    :scale="1.35"
                />
            </div>
            <p v-if="labels.length > shown.length" class="a-hint">
                {{
                    t('stickers.print.more', {
                        n: labels.length - shown.length,
                    })
                }}
            </p>
        </ACard>
        <AEmpty
            v-else-if="selected"
            icon="tag"
            :title="t('stickers.print.noLabels')"
        />
    </div>
</template>

<style scoped>
.pr {
    display: grid;
    gap: 16px;
}

.pr-form {
    display: flex;
    align-items: flex-end;
    gap: 16px;
    flex-wrap: wrap;
}

.pr-ref {
    flex: 1;
    min-width: 280px;
}

.pr-go {
    padding-bottom: 1px;
}

.pr-rule {
    margin-top: 14px;
    padding: 10px 14px;
    border-radius: var(--a-r);
    background: var(--a-sunk);
    font-size: 13.5px;
}

.pr-rule-t {
    font-weight: 700;
    margin-bottom: 4px;
}

.pr-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
}
</style>
