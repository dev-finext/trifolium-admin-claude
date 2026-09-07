<script setup>
// Create or edit a pickup point: a partner shop with its own name and address,
// or a practitioner taken from the directory — plus the dispatch days, the
// courier that serves the point and the consolidation notes.
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';

import { useCourierName } from '@/components/deliveries/useCourierName';
import AButton from '@/components/ui/AButton.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ASwitch from '@/components/ui/ASwitch.vue';
import { useLocalized } from '@/composables/useLocalized';
import { ACTIVE_COURIERS, PICKUP_POINT_KIND_IDS, WEEKDAY_IDS } from '@/config';
import { useDatasetStore } from '@/stores/dataset';
import { useDeliveriesStore } from '@/stores/deliveries';

const props = defineProps({
    /** The point being edited; `{}` for a new one. */
    point: { type: Object, required: true },
});

const emit = defineEmits(['close', 'saved']);

const { t } = useI18n();
const { loc } = useLocalized();
const dataset = useDatasetStore();
const deliveries = useDeliveriesStore();
const { courierName } = useCourierName();

const isNew = computed(() => !props.point.id);

const form = reactive({
    kind: props.point.kind || 'shop',
    practitionerCode: props.point.practitionerCode || '',
    name: { he: props.point.name?.he || '', en: props.point.name?.en || '' },
    city: props.point.city ? loc(props.point.city) : '',
    address: props.point.address ? loc(props.point.address) : '',
    days: [...(props.point.days || [])],
    courier: props.point.courier || '',
    notes: props.point.notes ? loc(props.point.notes) : '',
    active: props.point.active ?? true,
});

const kindOptions = computed(() =>
    PICKUP_POINT_KIND_IDS.map((id) => ({
        value: id,
        label: t(`pickupKind.${id}`),
    })),
);

const practitionerOptions = computed(() => [
    { value: '', label: t('deliveries.points.editor.pickPractitioner') },
    ...dataset.practitioners.map((card) => ({
        value: card.code,
        label: `${loc(card.name)} · ${card.code}`,
    })),
]);

const courierOptions = computed(() => [
    { value: '', label: t('deliveries.points.editor.noCourier') },
    ...ACTIVE_COURIERS.map((courier) => ({
        value: courier.id,
        label: `${courier.code} — ${courierName(courier.id)}`,
    })),
]);

/** Weekdays the pharmacy dispatches on — Friday and Saturday are not offered. */
const days = computed(() => WEEKDAY_IDS.slice(0, 5));

function toggleDay(id) {
    form.days = form.days.includes(id)
        ? form.days.filter((day) => day !== id)
        : [...form.days, id];
}

const errors = computed(() => ({
    name:
        form.kind === 'shop' && form.name.he.trim().length < 2
            ? t('deliveries.points.editor.validate.name')
            : '',
    practitioner:
        form.kind === 'practitioner' && !form.practitionerCode
            ? t('deliveries.points.editor.validate.practitioner')
            : '',
    days: !form.days.length ? t('deliveries.points.editor.validate.days') : '',
}));

const valid = computed(() => !Object.values(errors.value).some(Boolean));

async function save() {
    if (!valid.value) {
        return;
    }

    const result = await deliveries.savePickupPoint(
        {
            kind: form.kind,
            practitionerCode:
                form.kind === 'practitioner' ? form.practitionerCode : null,
            name: form.name,
            city: form.city,
            address: form.address,
            days: WEEKDAY_IDS.filter((id) => form.days.includes(id)),
            courier: form.courier || null,
            notes: form.notes,
            active: form.active,
        },
        props.point.id || null,
    );

    emit('saved', result);
}

const title = computed(() =>
    isNew.value
        ? t('deliveries.points.editor.newTitle')
        : t('deliveries.points.editor.editTitle', {
              name: loc(props.point.name),
          }),
);
</script>

<template>
    <AModal open :title="title" :width="760" @close="emit('close')">
        <div class="a-grid">
            <div class="a-2col">
                <div>
                    <label class="a-lbl">{{
                        t('deliveries.points.editor.kind')
                    }}</label>
                    <ASelect
                        v-model="form.kind"
                        :options="kindOptions"
                        class="a-w100"
                    />
                </div>
                <div v-if="form.kind === 'practitioner'">
                    <label class="a-lbl"
                        >{{ t('deliveries.points.editor.practitioner') }}
                        <span class="req">*</span></label
                    >
                    <ASelect
                        v-model="form.practitionerCode"
                        :options="practitionerOptions"
                        class="a-w100"
                    />
                    <div v-if="errors.practitioner" class="a-inv">
                        {{ errors.practitioner }}
                    </div>
                </div>
                <template v-else>
                    <div>
                        <label class="a-lbl"
                            >{{ t('deliveries.points.editor.nameHe') }}
                            <span class="req">*</span></label
                        >
                        <AInput v-model="form.name.he" class="a-w100" />
                        <div v-if="errors.name" class="a-inv">
                            {{ errors.name }}
                        </div>
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('deliveries.points.editor.nameEn')
                        }}</label>
                        <AInput v-model="form.name.en" ltr class="a-w100" />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('deliveries.points.editor.city')
                        }}</label>
                        <AInput v-model="form.city" class="a-w100" />
                    </div>
                    <div>
                        <label class="a-lbl">{{
                            t('deliveries.points.editor.address')
                        }}</label>
                        <AInput v-model="form.address" class="a-w100" />
                    </div>
                </template>
            </div>

            <div>
                <div class="a-lbl">
                    {{ t('deliveries.points.editor.days') }}
                    <span class="req">*</span>
                </div>
                <div class="days">
                    <label v-for="id in days" :key="id" class="check">
                        <input
                            type="checkbox"
                            class="a-check"
                            :checked="form.days.includes(id)"
                            @change="toggleDay(id)"
                        />
                        {{ t(`weekday.${id}`) }}
                    </label>
                </div>
                <div v-if="errors.days" class="a-inv">{{ errors.days }}</div>
            </div>

            <div class="a-2col">
                <div>
                    <label class="a-lbl">{{
                        t('deliveries.points.editor.courier')
                    }}</label>
                    <ASelect
                        v-model="form.courier"
                        :options="courierOptions"
                        class="a-w100"
                    />
                </div>
                <div>
                    <label class="a-lbl">{{
                        t('deliveries.points.editor.active')
                    }}</label>
                    <div class="switch">
                        <ASwitch
                            v-model="form.active"
                            :label="t('deliveries.points.editor.active')"
                        />
                        <span class="t-sub">
                            {{
                                form.active
                                    ? t('deliveries.points.editor.activeOn')
                                    : t('deliveries.points.editor.activeOff')
                            }}
                        </span>
                    </div>
                </div>
            </div>

            <div>
                <label class="a-lbl">{{
                    t('deliveries.points.editor.notes')
                }}</label>
                <AInput
                    v-model="form.notes"
                    class="a-w100"
                    :placeholder="t('deliveries.points.editor.notesPh')"
                />
            </div>
        </div>

        <template #footer>
            <AButton kind="p" icon="save" :disabled="!valid" @click="save">
                {{
                    isNew
                        ? t('deliveries.points.editor.createConfirm')
                        : t('deliveries.points.editor.saveConfirm')
                }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.req {
    color: var(--a-red);
}

.days {
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

.switch {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 38px;
}
</style>
