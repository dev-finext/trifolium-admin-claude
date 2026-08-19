<script setup>
// A library entry as the compounding wizard presents it to a practitioner.
//
// One dialog for all three libraries: `kind` says which shape the record has —
// `house` for a pharmacy formula, `classic` for a Chinese prescription, `base`
// for a free-pour base — and the rows follow from that.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AModal from '@/components/ui/AModal.vue';
import { useLocalized } from '@/composables/useLocalized';
import { ils, num } from '@/lib/money';

const props = defineProps({
    open: { type: Boolean, default: false },
    /** `'house'` | `'classic'` | `'base'`. */
    kind: { type: String, default: '' },
    row: { type: Object, default: null },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const { loc } = useLocalized();

const heading = computed(() => {
    if (!props.row) {
        return '';
    }

    if (props.kind === 'classic') {
        return props.row.nameEn;
    }

    return loc(props.row.name);
});

/** The herb count, worded the way the tables word it. */
const herbCount = computed(() =>
    t('libraries.herbCount', { n: num(props.row?.ing || 0) }),
);

const rows = computed(() => {
    const row = props.row;

    if (!row) {
        return [];
    }

    if (props.kind === 'house') {
        return [
            [t('libraries.preview.summary'), loc(row.summary)],
            [t('libraries.col.form'), t(`preparationForm.${row.typeId}`)],
            [t('libraries.col.herbs'), herbCount.value],
        ];
    }

    if (props.kind === 'classic') {
        return [
            [t('libraries.preview.nameZh'), row.nameZh],
            [t('libraries.preview.namePinyin'), row.namePinyin],
            [t('libraries.col.source'), row.source],
            [t('libraries.col.indication'), loc(row.indication)],
            [t('libraries.col.form'), t(`preparationForm.${row.typeId}`)],
            [
                t('libraries.col.composition'),
                t('libraries.compositionCell', { n: num(row.ing) }),
            ],
        ];
    }

    return [
        [t('libraries.col.sku'), row.sku],
        [
            t('libraries.col.shelfSize'),
            t(`libraries.size.${row.unit}`, { n: num(row.size) }),
        ],
        [t('libraries.col.price'), ils(row.price, 0)],
        [t('libraries.col.indication'), t('libraries.freePourBase')],
    ];
});
</script>

<template>
    <AModal
        :open="open"
        :title="t('libraries.preview.title')"
        :width="560"
        @close="emit('close')"
    >
        <div v-if="row" class="a-grid">
            <div class="fp-head">
                <h4 class="fp-name" :class="{ ltr: kind === 'classic' }">
                    {{ heading }}
                </h4>
                <AChip
                    v-if="kind !== 'base'"
                    tone="teal"
                    size="sm"
                    :dot="false"
                >
                    {{ t(`preparationForm.${row.typeId}`) }}
                </AChip>
            </div>

            <AKeyValue :rows="rows" />

            <div class="a-note a-note--info">
                {{ t('libraries.preview.wizardNote') }}
            </div>
        </div>

        <template #footer>
            <AButton @click="emit('close')">{{ t('ui.close') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.fp-head {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.fp-name {
    margin: 0;
    font-size: 19px;
}
</style>
