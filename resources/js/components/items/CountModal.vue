<script setup>
// A physical count of stock nobody counts per order — toilet paper, gloves.
// The figure on the shelf becomes the figure in the system, the gap is one
// ledger movement, and the consumption clock restarts from today.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { num } from '@/lib/money';
import { useItemsStore } from '@/stores/items';

const props = defineProps({
    /** The joined item row being counted. */
    row: { type: Object, required: true },
});

const emit = defineEmits(['close', 'counted']);

const { t } = useI18n();
const { loc } = useLocalized();
const store = useItemsStore();

const qty = ref(String(props.row.onHand ?? 0));
const note = ref('');
const saving = ref(false);

const uom = computed(() =>
    props.row.uom?.stock ? t(`items.uom.${props.row.uom.stock}`) : '',
);

const ok = computed(() => qty.value !== '' && Number(qty.value) >= 0);

async function save() {
    if (!ok.value || saving.value) {
        return;
    }

    saving.value = true;

    const result = await store.recordCount(
        props.row.sku,
        Number(qty.value),
        note.value,
    );

    saving.value = false;
    emit('counted', result);
}
</script>

<template>
    <AModal
        open
        :title="
            t('items.count.title', {
                name: loc({
                    he: row.names.he,
                    en: row.names.en || row.names.he,
                }),
            })
        "
        :width="480"
        @close="emit('close')"
    >
        <div class="cm">
            <div>
                <label class="a-lbl" for="cm-qty">{{
                    t('items.count.qty')
                }}</label>
                <AInput
                    id="cm-qty"
                    v-model="qty"
                    type="number"
                    ltr
                    class="a-w100"
                />
                <div class="a-hint">
                    {{
                        t('items.count.qtyHint', {
                            qty: num(row.onHand ?? 0),
                            uom,
                        })
                    }}
                </div>
            </div>
            <div>
                <label class="a-lbl" for="cm-note">{{
                    t('items.count.note')
                }}</label>
                <ATextarea
                    id="cm-note"
                    v-model="note"
                    class="a-w100"
                    :rows="2"
                />
            </div>
        </div>
        <template #footer>
            <AButton
                kind="p"
                icon="check"
                :disabled="!ok || saving"
                @click="save"
            >
                {{ t('items.count.save') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.cm {
    display: grid;
    gap: 14px;
}
</style>
