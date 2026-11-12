<script setup>
// The batch labels of a goods receipt, printed in one press once it is signed.
//
// Natalie: "אחרי שאסיים להזין את כל המסמך אני יכולה בלחיצת כפתור להוציא את
// המדבקות לכל המוצרים לפי הכמות שהגדרתי." Each line prints as many labels as
// the receiver said its quantity is divided into, numbered 1/n … n/n in the
// label's "חלוקה" box; a line of one label prints the box empty. The labels are
// the stickers module's batch label (`item`), the template the pharmacy edits,
// and the run is logged there like any other print.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import StickerPreview from '@/components/stickers/StickerPreview.vue';
import AButton from '@/components/ui/AButton.vue';
import AModal from '@/components/ui/AModal.vue';
import { useStickerData } from '@/composables/useStickerData';
import { useToast } from '@/composables/useToast';
import { useInventoryStore } from '@/stores/inventory';
import { useStickersStore } from '@/stores/stickers';

const props = defineProps({
    /** The receipt just signed, or null while there is nothing to print. */
    receipt: { type: Object, default: null },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const { push } = useToast();
const inventory = useInventoryStore();
const stickers = useStickersStore();
const { labelsForReceipt, printStickers } = useStickerData();

const template = computed(() => stickers.templateById('item'));

const labels = computed(() =>
    props.receipt ? labelsForReceipt(props.receipt) : [],
);

/** What each line prints, in the receipt's order. */
const rows = computed(() =>
    // A general line ("פריט כללי") never prints a label.
    (props.receipt?.lines || [])
        .filter((line) => !line.general)
        .map((line, at) => ({
            key: `${line.batch}-${at}`,
            sku: line.sku,
            batch: inventory.batchNo(line.batch) || line.number || '',
            count: stickers.itemCount(line),
        })),
);

/** The first label, so the person sees what is about to come out. */
const sample = computed(() => labels.value[0] || null);

async function print() {
    if (!template.value || !labels.value.length) {
        return;
    }

    const ok = await printStickers(
        template.value,
        labels.value,
        props.receipt.id,
    );

    push(
        ok
            ? {
                  title: t('stickers.print.printed'),
                  body: t(
                      'stickers.print.printedBody',
                      {
                          n: labels.value.length,
                          template: t('stickers.template.item'),
                          ref: props.receipt.id,
                      },
                      labels.value.length,
                  ),
              }
            : { title: t('stickers.print.blocked'), bad: true },
    );

    if (ok) {
        emit('close');
    }
}
</script>

<template>
    <AModal
        :open="Boolean(receipt)"
        :title="t('buying.labels.title', { id: receipt?.id || '' })"
        :width="640"
        @close="emit('close')"
    >
        <template v-if="receipt">
            <p class="rl-lead">
                {{
                    t('buying.labels.lead', { n: labels.length }, labels.length)
                }}
            </p>

            <ul class="rl-rows">
                <li v-for="row in rows" :key="row.key">
                    <span class="a-code a-tag">{{ row.sku }}</span>
                    <span class="rl-batch">
                        {{ t('buying.labels.batch', { batch: row.batch }) }}
                    </span>
                    <span class="a-push rl-count">
                        {{ t('buying.labels.each', row.count) }}
                    </span>
                </li>
            </ul>

            <div v-if="sample && template" class="rl-sample">
                <div class="a-lbl">{{ t('buying.labels.sample') }}</div>
                <StickerPreview
                    :template="template"
                    :data="sample.data"
                    :scale="1.2"
                />
            </div>
        </template>

        <template #footer>
            <AButton
                kind="p"
                icon="printer"
                :disabled="!labels.length"
                @click="print"
            >
                {{
                    t(
                        'stickers.print.print',
                        { n: labels.length },
                        labels.length,
                    )
                }}
            </AButton>
            <AButton @click="emit('close')">
                {{ t('buying.labels.skip') }}
            </AButton>
        </template>
    </AModal>
</template>

<style scoped>
.rl-lead {
    margin: 0 0 12px;
}

.rl-rows {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 13.5px;
}

.rl-rows li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    border: 1px solid var(--a-line);
    border-radius: 8px;
}

.rl-count {
    font-variant-numeric: tabular-nums;
}

.rl-batch {
    color: var(--a-ink-3, var(--a-ink-4));
}

.rl-sample {
    display: grid;
    gap: 6px;
    margin-top: 16px;
    overflow-x: auto;
}
</style>
