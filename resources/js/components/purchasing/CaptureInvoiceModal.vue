<script setup>
// Capturing a supplier's invoice: whose it is, which deliveries it bills, what
// it comes to, where the expense is filed, and the scan itself.
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { EXPENSE_CATEGORY_IDS, SETTINGS } from '@/config';
import { isoDaysAgo } from '@/lib/dates';
import { ils } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import { usePurchasingStore } from '@/stores/purchasing';

const emit = defineEmits(['close', 'captured']);

const { t } = useI18n();
const { loc } = useLocalized();
const dataset = useDatasetStore();
const store = usePurchasingStore();

const form = reactive({
    supplierCode: '',
    num: '',
    date: isoDaysAgo(0),
    notes: [],
    category: 'raw_materials',
    net: '',
    note: '',
});
const file = ref(null);
const saving = ref(false);

const supplierOptions = computed(() => [
    { value: '', label: t('purchasing.capture.supplierChoose') },
    ...dataset.suppliers.map((supplier) => ({
        value: supplier.code,
        label: loc(supplier.name),
    })),
]);

const categoryOptions = computed(() =>
    EXPENSE_CATEGORY_IDS.map((id) => ({
        value: id,
        label: t(`purchasing.expenseCategory.${id}`),
    })),
);

/** The supplier's delivery notes not yet billed. */
const openNotes = computed(() =>
    store.supplierNotes.filter(
        (note) =>
            note.supplierCode === form.supplierCode && note.state !== 'closed',
    ),
);

const notesNet = computed(() =>
    form.notes.reduce((sum, id) => {
        const note = store.noteById(id);

        return sum + (note ? store.noteNet(note) : 0);
    }, 0),
);

const net = computed(() =>
    form.net === '' ? notesNet.value : Number(form.net) || 0,
);
const vat = computed(
    () => Math.round(net.value * SETTINGS.vatRate * 100) / 100,
);

const ok = computed(
    () => Boolean(form.supplierCode) && form.num.trim() !== '' && net.value > 0,
);

function toggleNote(id) {
    form.notes = form.notes.includes(id)
        ? form.notes.filter((row) => row !== id)
        : [...form.notes, id];
}

function onFile(event) {
    file.value = event.target.files?.[0] || null;
}

async function save() {
    if (!ok.value || saving.value) {
        return;
    }

    saving.value = true;

    const invoice = await store.captureSupplierInvoice({
        supplierCode: form.supplierCode,
        num: form.num,
        date: form.date,
        notes: form.notes,
        category: form.category,
        net: net.value,
        file: file.value,
        note: form.note,
    });

    saving.value = false;
    emit('captured', invoice);
}
</script>

<template>
    <AModal
        open
        :title="t('purchasing.capture.title')"
        :width="720"
        @close="emit('close')"
    >
        <div class="ci-grid">
            <div>
                <label class="a-lbl" for="ci-sup">{{
                    t('purchasing.capture.supplier')
                }}</label>
                <ASelect
                    id="ci-sup"
                    v-model="form.supplierCode"
                    :options="supplierOptions"
                    class="a-w100"
                    @update:model-value="form.notes = []"
                />
            </div>
            <div>
                <label class="a-lbl" for="ci-num">{{
                    t('purchasing.capture.num')
                }}</label>
                <AInput id="ci-num" v-model="form.num" ltr class="a-w100" />
            </div>
            <div>
                <label class="a-lbl" for="ci-date">{{
                    t('purchasing.capture.date')
                }}</label>
                <AInput
                    id="ci-date"
                    v-model="form.date"
                    type="date"
                    ltr
                    class="a-w100"
                />
            </div>
            <div class="ci-wide">
                <label class="a-lbl">{{ t('purchasing.capture.notes') }}</label>
                <div v-if="!form.supplierCode" class="a-hint">
                    {{ t('purchasing.capture.notesPick') }}
                </div>
                <div v-else-if="!openNotes.length" class="a-hint">
                    {{ t('purchasing.capture.notesNone') }}
                </div>
                <div v-else class="ci-notes">
                    <label
                        v-for="note in openNotes"
                        :key="note.id"
                        class="a-check ci-note"
                    >
                        <input
                            type="checkbox"
                            :checked="form.notes.includes(note.id)"
                            @change="toggleNote(note.id)"
                        />
                        <span class="a-code a-tag">{{ note.id }}</span>
                        <span class="t-sub"
                            >{{ note.po }} · {{ note.when.stamp }}</span
                        >
                        <ANum class="ci-net">{{
                            ils(store.noteNet(note), 2)
                        }}</ANum>
                    </label>
                </div>
            </div>
            <div>
                <label class="a-lbl" for="ci-cat">{{
                    t('purchasing.capture.category')
                }}</label>
                <ASelect
                    id="ci-cat"
                    v-model="form.category"
                    :options="categoryOptions"
                    class="a-w100"
                />
            </div>
            <div>
                <label class="a-lbl" for="ci-net">{{
                    t('purchasing.capture.net')
                }}</label>
                <AInput
                    id="ci-net"
                    v-model="form.net"
                    type="number"
                    ltr
                    class="a-w100"
                    :placeholder="String(notesNet)"
                />
                <div class="a-hint">
                    {{
                        t('purchasing.capture.netHint', {
                            notes: ils(notesNet, 2),
                        })
                    }}
                </div>
            </div>
            <div>
                <label class="a-lbl">{{ t('purchasing.capture.total') }}</label>
                <div class="ci-total">
                    <ANum>{{ ils(net + vat, 2) }}</ANum>
                    <div class="a-hint">
                        {{ t('purchasing.capture.vat', { vat: ils(vat, 2) }) }}
                    </div>
                </div>
            </div>
            <div class="ci-wide">
                <label class="a-lbl" for="ci-file">{{
                    t('purchasing.capture.file')
                }}</label>
                <input
                    id="ci-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    class="a-input a-w100"
                    @change="onFile"
                />
                <div class="a-hint">{{ t('purchasing.capture.fileHint') }}</div>
            </div>
            <div class="ci-wide">
                <label class="a-lbl" for="ci-note">{{
                    t('purchasing.capture.note')
                }}</label>
                <ATextarea
                    id="ci-note"
                    v-model="form.note"
                    class="a-w100"
                    :rows="2"
                />
            </div>
        </div>
        <template #footer>
            <AButton
                kind="p"
                icon="save"
                :disabled="!ok || saving"
                @click="save"
                >{{ t('purchasing.capture.save') }}</AButton
            >
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.ci-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px 16px;
}

.ci-wide {
    grid-column: 1 / -1;
}

.ci-notes {
    display: grid;
    gap: 6px;
}

.ci-note {
    display: flex;
    gap: 10px;
    align-items: baseline;
}

.ci-net {
    margin-inline-start: auto;
}

.ci-total {
    padding-top: 8px;
    font-size: 18px;
    font-weight: 600;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
