<script setup>
// Edit one preparation type: its name in both languages, its unit, its default
// shelf life, the fixed text printed on its label, what it contains, and the
// steps of its method. The method's mechanics live here; its content is the
// lab's to write.
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import { useLocalized } from '@/composables/useLocalized';
import { PREP_CONTAINS_IDS, PREP_UNIT_IDS } from '@/config';
import { useItemsStore } from '@/stores/items';

const props = defineProps({
    /** The type being edited; `{}` for a new one. */
    type: { type: Object, required: true },
});

const emit = defineEmits(['close', 'saved']);

const { t } = useI18n();
const { loc } = useLocalized();
const store = useItemsStore();

const isNew = computed(() => !props.type.id);

const form = reactive({
    id: props.type.id || '',
    name: { he: props.type.name?.he || '', en: props.type.name?.en || '' },
    unit: props.type.unit || 'ml',
    expiryMonths:
        props.type.expiryMonths != null
            ? String(props.type.expiryMonths)
            : '24',
    labelText: {
        he: props.type.labelText?.he || '',
        en: props.type.labelText?.en || '',
    },
    contains: [...(props.type.contains || [])],
    recipe: (props.type.recipe || []).map((step) => ({
        he: step.text?.he || '',
        en: step.text?.en || '',
        minutes: step.minutes != null ? String(step.minutes) : '',
    })),
});

const errors = computed(() => ({
    id: isNew.value
        ? !/^[a-z][a-z0-9_]{2,30}$/.test(form.id)
            ? t('items.prep.validate.id')
            : store.prepTypeById(form.id)
              ? t('items.prep.validate.idTaken')
              : ''
        : '',
    he: form.name.he.trim().length < 2 ? t('items.prep.validate.name') : '',
    expiry:
        !/^\d{1,3}$/.test(form.expiryMonths.trim()) ||
        Number(form.expiryMonths) < 1
            ? t('items.prep.validate.expiry')
            : '',
}));

const valid = computed(() => !Object.values(errors.value).some(Boolean));

const unitOptions = computed(() =>
    PREP_UNIT_IDS.map((id) => ({ value: id, label: t(`items.uom.${id}`) })),
);

function toggleContains(id) {
    form.contains = form.contains.includes(id)
        ? form.contains.filter((c) => c !== id)
        : [...form.contains, id];
}

function addStep() {
    form.recipe.push({ he: '', en: '', minutes: '' });
}

function removeStep(i) {
    form.recipe.splice(i, 1);
}

async function save() {
    if (!valid.value) {
        return;
    }

    const he = form.name.he.trim();
    const result = await store.savePrepType(
        {
            id: form.id.trim(),
            name: { he, en: form.name.en.trim() || he },
            unit: form.unit,
            expiryMonths: Number(form.expiryMonths),
            labelText: form.labelText.he.trim()
                ? {
                      he: form.labelText.he.trim(),
                      en: form.labelText.en.trim() || form.labelText.he.trim(),
                  }
                : null,
            contains: [...form.contains],
            recipe: form.recipe
                .filter((step) => step.he.trim())
                .map((step) => ({
                    text: {
                        he: step.he.trim(),
                        en: step.en.trim() || step.he.trim(),
                    },
                    minutes: step.minutes === '' ? null : Number(step.minutes),
                })),
        },
        props.type.id || null,
    );

    emit('saved', { created: result.created, name: loc(result.type.name) });
}

const title = computed(() =>
    isNew.value
        ? t('items.prep.editor.newTitle')
        : t('items.prep.editor.editTitle', { name: loc(props.type.name) }),
);
</script>

<template>
    <AModal open :title="title" :width="820" @close="emit('close')">
        <div class="pe">
            <div class="a-3col">
                <div>
                    <label class="a-lbl"
                        >{{ t('items.prep.editor.id') }}
                        <span class="req">*</span></label
                    >
                    <AInput v-if="isNew" v-model="form.id" ltr class="a-w100" />
                    <div v-else class="a-code a-tag ro">{{ type.id }}</div>
                    <div v-if="errors.id" class="a-inv">{{ errors.id }}</div>
                    <div v-else class="a-hint">
                        {{ t('items.prep.editor.idHint') }}
                    </div>
                </div>
                <div>
                    <label class="a-lbl"
                        >{{ t('items.prep.editor.nameHe') }}
                        <span class="req">*</span></label
                    >
                    <AInput v-model="form.name.he" class="a-w100" />
                    <div v-if="errors.he" class="a-inv">{{ errors.he }}</div>
                </div>
                <div>
                    <label class="a-lbl">{{
                        t('items.prep.editor.nameEn')
                    }}</label>
                    <AInput v-model="form.name.en" ltr class="a-w100" />
                </div>
                <div>
                    <label class="a-lbl">{{ t('items.prep.col.unit') }}</label>
                    <ASelect
                        v-model="form.unit"
                        :options="unitOptions"
                        class="a-w100"
                    />
                </div>
                <div>
                    <label class="a-lbl"
                        >{{ t('items.prep.editor.expiry') }}
                        <span class="req">*</span></label
                    >
                    <AInput
                        v-model="form.expiryMonths"
                        type="number"
                        ltr
                        class="a-w100"
                    />
                    <div v-if="errors.expiry" class="a-inv">
                        {{ errors.expiry }}
                    </div>
                    <div v-else class="a-hint">
                        {{ t('items.prep.editor.expiryHint') }}
                    </div>
                </div>
            </div>

            <div class="a-2col">
                <div>
                    <label class="a-lbl">{{
                        t('items.prep.editor.labelHe')
                    }}</label>
                    <AInput v-model="form.labelText.he" class="a-w100" />
                    <div class="a-hint">
                        {{ t('items.prep.editor.labelHint') }}
                    </div>
                </div>
                <div>
                    <label class="a-lbl">{{
                        t('items.prep.editor.labelEn')
                    }}</label>
                    <AInput v-model="form.labelText.en" ltr class="a-w100" />
                </div>
            </div>

            <div>
                <div class="a-lbl">{{ t('items.prep.col.contains') }}</div>
                <div class="checks">
                    <label
                        v-for="id in PREP_CONTAINS_IDS"
                        :key="id"
                        class="check"
                    >
                        <input
                            type="checkbox"
                            class="a-check"
                            :checked="form.contains.includes(id)"
                            @change="toggleContains(id)"
                        />
                        {{ t(`items.prep.contains.${id}`) }}
                    </label>
                </div>
            </div>

            <div>
                <div class="a-sect-t">{{ t('items.prep.editor.recipe') }}</div>
                <p class="a-hint">{{ t('items.prep.editor.recipeHint') }}</p>
                <div v-for="(step, i) in form.recipe" :key="i" class="step">
                    <span class="step-n num">{{ i + 1 }}</span>
                    <AInput
                        v-model="step.he"
                        :placeholder="t('items.prep.editor.stepHe')"
                        class="a-w100"
                    />
                    <AInput
                        v-model="step.en"
                        ltr
                        :placeholder="t('items.prep.editor.stepEn')"
                        class="a-w100"
                    />
                    <AInput
                        v-model="step.minutes"
                        type="number"
                        ltr
                        :placeholder="t('items.prep.editor.minutes')"
                        class="mins"
                    />
                    <AButton
                        sm
                        kind="ghost"
                        icon="trash"
                        @click="removeStep(i)"
                    />
                </div>
                <AButton sm icon="plus" @click="addStep">{{
                    t('items.prep.editor.addStep')
                }}</AButton>
            </div>
        </div>

        <template #footer>
            <AButton kind="p" icon="save" :disabled="!valid" @click="save">
                {{
                    isNew
                        ? t('items.prep.editor.createConfirm')
                        : t('items.prep.editor.saveConfirm')
                }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.pe {
    display: grid;
    gap: 18px;
}

.req {
    color: var(--a-red);
}

.ro {
    display: inline-block;
    margin-top: 6px;
}

.checks {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
}

.check {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    cursor: pointer;
}

.step {
    display: grid;
    grid-template-columns: 26px 1fr 1fr 90px auto;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
}

.step-n {
    color: var(--a-ink-4);
    font-weight: 700;
}

.mins {
    width: 90px;
}
</style>
