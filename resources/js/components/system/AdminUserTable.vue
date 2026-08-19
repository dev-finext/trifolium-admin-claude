<script setup>
// The admin-user list.
//
// There are deliberately no roles in this console: every admin holds the same
// full set of permissions. The table therefore carries no permissions column at
// all — a column whose every cell reads the same says nothing, and a role picker
// would show a grant that nothing in the system enforces.
//
// The signed-in user's own row cannot be deleted: you cannot remove the account
// you are working from.
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';

defineProps({
    rows: { type: Array, default: () => [] },
});

const emit = defineEmits(['reset', 'remove']);

const { t } = useI18n();
const { loc } = useLocalized();

const cols = [
    { k: 'name', label: t('admins.table.name'), sortable: true },
    { k: 'email', label: t('admins.table.email'), sortable: true },
    { k: 'phone', label: t('admins.table.phone'), nowrap: true },
    {
        k: 'created',
        label: t('admins.table.created'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'last',
        label: t('admins.table.lastLogin'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.last?.iso || '',
    },
    { k: 'act', label: '', nowrap: true },
];

function initials(admin) {
    return loc(admin.name)
        .split(' ')
        .filter(Boolean)
        .map((word) => word[0])
        .join('');
}

/** "today 08:41", "yesterday 17:26", or the full stamp further back. */
function lastLogin(admin) {
    const moment = admin.last;

    if (!moment) {
        return t('admins.table.never');
    }

    if (moment.daysAgo === 0) {
        return `${t('relative.today')} ${moment.time}`;
    }

    if (moment.daysAgo === 1) {
        return `${t('relative.yesterday')} ${moment.time}`;
    }

    return moment.stamp;
}
</script>

<template>
    <ADataTable :cols="cols" :rows="rows" row-key="id">
        <template #empty>
            <AEmpty
                icon="users"
                :title="t('admins.empty.title')"
                :sub="t('admins.empty.sub')"
            />
        </template>

        <template #cell-name="{ row }">
            <div class="au-name">
                <span class="a-avatar au-avatar">{{ initials(row) }}</span>
                <span>
                    <span class="t-strong au-block">{{ loc(row.name) }}</span>
                    <span v-if="row.me" class="t-sub">
                        {{ t('admins.table.you') }}
                    </span>
                </span>
            </div>
        </template>

        <template #cell-email="{ row }">
            <span class="ltr">{{ row.email }}</span>
        </template>

        <template #cell-phone="{ row }">
            <ANum>{{ row.phone }}</ANum>
        </template>

        <template #cell-created="{ row }">
            <ANum>{{ row.created }}</ANum>
        </template>

        <template #cell-last="{ row }">
            <span class="au-muted">
                <ANum>{{ lastLogin(row) }}</ANum>
            </span>
        </template>

        <template #cell-act="{ row }">
            <div class="a-rowbtns" @click.stop>
                <AButton sm icon="send" @click="emit('reset', row)">
                    {{ t('admins.action.resetPassword') }}
                </AButton>
                <AButton
                    sm
                    icon="trash"
                    :disabled="row.me"
                    @click="emit('remove', row)"
                >
                    {{ t('actions.delete') }}
                </AButton>
            </div>
        </template>
    </ADataTable>
</template>

<style scoped>
.au-name {
    display: flex;
    align-items: center;
    gap: 10px;
}

.au-avatar {
    width: 34px;
    height: 34px;
    font-size: 13px;
}

.au-block {
    display: block;
}

.au-muted {
    color: var(--a-ink-3);
}
</style>
