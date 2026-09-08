<script setup>
// Lab roles and barcode values on one order — the groundwork for the second
// phase, when scanning at each station fills these in. Until then the four roles
// are marked by hand, and the identifiers a label or a prep sheet would carry
// as a barcode are shown as the stable values they are.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import ANum from '@/components/ui/ANum.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { LAB_ROLE_IDS } from '@/config';
import { statusOf, trackedItems, useOrdersStore } from '@/stores/orders';

const props = defineProps({
    order: { type: Object, required: true },
});

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const orders = useOrdersStore();

/** The roles are marked while the order is on the lab's bench or being packed. */
const editable = computed(() =>
    ['lab', 'packed'].includes(statusOf(props.order)),
);

const roles = computed(() =>
    LAB_ROLE_IDS.map((id) => ({ id, value: props.order.lab?.[id] || null })),
);

const itemCodes = computed(() =>
    trackedItems(props.order)
        .filter((item) => !item.cancelled)
        .map((item) => ({ id: item.id, name: loc(item.name) })),
);

const batchCodes = computed(() => [
    ...new Set(orders.batchesFor(props.order.id).map((row) => row.batch)),
]);

async function mark(role, on) {
    await orders.setLabRole(props.order.id, role, on);
    push({
        title: on ? t('orders.lab.markedToast') : t('orders.lab.clearedToast'),
        body: t(`orders.labRole.${role}`),
    });
}
</script>

<template>
    <ACard :title="t('orders.lab.title')" icon="beaker">
        <template #right>
            <V2Badge id="lab-roles" size="sm" />
        </template>

        <div class="roles">
            <div v-for="role in roles" :key="role.id" class="role">
                <div class="role-l">{{ t(`orders.labRole.${role.id}`) }}</div>
                <div v-if="role.value" class="role-v">
                    <span class="t-strong">{{ loc(role.value.by) }}</span>
                    <span class="t-sub"
                        ><ANum>{{ role.value.when.stamp }}</ANum></span
                    >
                </div>
                <div v-else class="role-v t-sub">
                    {{ t('orders.lab.notSet') }}
                </div>
                <div v-if="editable" class="role-a">
                    <AButton
                        v-if="!role.value"
                        sm
                        icon="check"
                        @click="mark(role.id, true)"
                    >
                        {{ t('orders.lab.markMe') }}
                    </AButton>
                    <AButton
                        v-else
                        sm
                        kind="ghost"
                        icon="x"
                        @click="mark(role.id, false)"
                    >
                        {{ t('orders.lab.clear') }}
                    </AButton>
                </div>
            </div>
        </div>
        <p class="a-hint">
            {{
                editable ? t('orders.lab.rolesNote') : t('orders.lab.readOnly')
            }}
        </p>

        <div class="a-sect-t codes-t">{{ t('orders.lab.barcodes') }}</div>
        <div class="codes">
            <div class="code-row">
                <span class="code-l">{{ t('orders.lab.barcodeOrder') }}</span>
                <span class="a-code a-tag">{{ order.id }}</span>
            </div>
            <div v-for="item in itemCodes" :key="item.id" class="code-row">
                <span class="code-l"
                    >{{ t('orders.lab.barcodeItem') }} · {{ item.name }}</span
                >
                <span class="a-code a-tag">{{ item.id }}</span>
            </div>
            <div v-for="batch in batchCodes" :key="batch" class="code-row">
                <span class="code-l">{{ t('orders.lab.barcodeBatch') }}</span>
                <span class="a-code a-tag">{{ batch }}</span>
            </div>
        </div>
        <p class="a-hint">{{ t('orders.lab.barcodeNote') }}</p>
    </ACard>
</template>

<style scoped>
.roles {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
}

@media (max-width: 900px) {
    .roles {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

.role {
    padding: 10px 12px;
    border: 1px solid var(--a-line);
    border-radius: 8px;
    display: grid;
    gap: 6px;
    align-content: start;
}

.role-l {
    font-size: 12px;
    color: var(--a-ink-3);
    letter-spacing: 0.04em;
}

.role-v {
    display: grid;
    gap: 2px;
    font-size: 14px;
}

.codes-t {
    margin-top: 14px;
}

.codes {
    display: grid;
    gap: 6px;
}

.code-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    font-size: 13.5px;
}

.code-l {
    color: var(--a-ink-2);
}
</style>
