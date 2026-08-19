<script setup>
// The external-system contacts: the named people behind the third-party systems
// the platform depends on — who to call when an invoice will not issue. A row
// opens the contact in a drawer; the inline buttons edit or delete it directly.
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';

defineProps({
    rows: { type: Array, default: () => [] },
    /** The id of the contact open in the drawer, so its row reads as selected. */
    selected: { type: String, default: null },
    /** True while a filter is active — changes the empty-state hint. */
    filtered: { type: Boolean, default: false },
});

const emit = defineEmits(['open', 'edit', 'remove']);

const { t } = useI18n();
const { loc } = useLocalized();

const cols = [
    {
        k: 'system',
        label: t('systemContacts.contacts.table.system'),
        w: '230px',
    },
    {
        k: 'contact',
        label: t('systemContacts.contacts.table.contact'),
        nowrap: true,
    },
    { k: 'role', label: t('systemContacts.contacts.table.role'), nowrap: true },
    {
        k: 'phone',
        label: t('systemContacts.contacts.table.phone'),
        nowrap: true,
    },
    { k: 'notes', label: t('systemContacts.contacts.table.notes'), w: '340px' },
    { k: 'act', label: '', nowrap: true },
];
</script>

<template>
    <ADataTable
        :cols="cols"
        :rows="rows"
        row-key="id"
        :selected="selected"
        @row="emit('open', $event)"
    >
        <template #empty>
            <AEmpty
                icon="phone"
                :title="t('systemContacts.contacts.empty.title')"
                :sub="
                    filtered
                        ? t('systemContacts.contacts.empty.subFiltered')
                        : t('systemContacts.contacts.empty.subEmpty')
                "
            />
        </template>

        <template #cell-system="{ row }">
            <div class="vt-system">
                <AIcon :name="row.icon || 'layers'" :size="18" />
                <span class="t-strong">{{ loc(row.system) }}</span>
            </div>
        </template>

        <template #cell-contact="{ row }">
            {{ loc(row.contact) }}
        </template>

        <template #cell-role="{ row }">
            <AChip v-if="loc(row.role)" tone="gray" size="sm" :dot="false">
                {{ loc(row.role) }}
            </AChip>
            <span v-else class="vt-dash">—</span>
        </template>

        <template #cell-phone="{ row }">
            <ANum>{{ row.phone }}</ANum>
        </template>

        <template #cell-notes="{ row }">
            <span v-if="loc(row.notes)" class="vt-notes">
                {{ loc(row.notes) }}
            </span>
            <span v-else class="vt-dash">—</span>
        </template>

        <template #cell-act="{ row }">
            <div class="a-rowbtns" @click.stop>
                <AButton sm icon="edit" @click="emit('edit', row)">
                    {{ t('actions.edit') }}
                </AButton>
                <AButton sm icon="trash" @click="emit('remove', row)">
                    {{ t('actions.delete') }}
                </AButton>
            </div>
        </template>
    </ADataTable>
</template>

<style scoped>
.vt-system {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--a-ink-4);
}

.vt-system .t-strong {
    color: var(--a-ink);
}

.vt-notes {
    color: var(--a-ink-3);
}

.vt-dash {
    color: var(--a-ink-4);
}
</style>
