<script setup>
// Users & approvals.
//
// Four audiences share the screen: the approvals inbox, the practitioner
// directory, the customer directory, and last the supplier ledger — which sits
// behind its own re-confirmation gate and is the one nobody opens hourly. Each pane opens its
// records in a drawer over the list. The active tab and every open record live
// in the URL, so a colleague opening a pasted link lands on the same pane with
// the same card open.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import ATabs from '@/components/ui/ATabs.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import ApprovalDrawer from '@/components/users/ApprovalDrawer.vue';
import PatientProfile from '@/components/users/PatientProfile.vue';
import PatientsTab from '@/components/users/PatientsTab.vue';
import PendingApprovals from '@/components/users/PendingApprovals.vue';
import PractitionerCard from '@/components/users/PractitionerCard.vue';
import PractitionerDirectory from '@/components/users/PractitionerDirectory.vue';
import SuppliersTab from '@/components/users/SuppliersTab.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { isoDaysAgo } from '@/lib/dates';
import { usePeopleStore } from '@/stores/people';
import { useSystemStore } from '@/stores/system';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const people = usePeopleStore();
const system = useSystemStore();

// The screen's own state: which pane, and which record (if any) is open in a
// drawer. The panes carry their own filter state under their own query keys.
const view = useUrlState({ tab: 'pending', reg: '', pr: '', pt: '', rej: '' });

/** A confirmation raised by a pane — today only the supplier-cards gate. */
const ask = ref(null);

const crumbs = computed(() => [t('users.crumb'), t('users.title')]);

const sub = computed(() =>
    t('users.sub', {
        pending: people.pendingUsers.length,
        practitioners: people.practitioners.length,
        suppliers: system.suppliers.length,
        customers: people.patients.length,
    }),
);

const tabs = computed(() => [
    {
        id: 'pending',
        label: t('users.tab.pending'),
        icon: 'inbox',
        n: people.pendingUsers.length,
    },
    {
        id: 'directory',
        label: t('users.tab.directory'),
        icon: 'users',
        n: people.practitioners.length,
    },
    {
        id: 'customers',
        label: t('users.tab.customers'),
        icon: 'user',
        n: people.patients.length,
    },
    {
        // The icon reports whether the cards are open, exactly as the gate does.
        id: 'suppliers',
        label: t('users.tab.suppliers'),
        icon: system.supplierCardsUnlocked ? 'truck' : 'lock',
        n: system.suppliers.length,
    },
]);

/**
 * The export the active pane offers. The supplier list is exportable only once
 * the cards are unlocked — the gate covers the export as much as the screen.
 */
const exportAction = computed(() => {
    if (view.tab === 'customers') {
        return { label: t('users.export.customers'), kind: 'customers' };
    }

    if (view.tab === 'suppliers') {
        return system.supplierCardsUnlocked
            ? { label: t('users.export.suppliers'), kind: 'suppliers' }
            : null;
    }

    if (view.tab === 'directory') {
        return {
            label: t('users.export.practitioners'),
            kind: 'practitioners',
        };
    }

    return null;
});

function runExport() {
    const action = exportAction.value;

    if (!action) {
        return;
    }

    const counts = {
        customers: people.patients.length,
        suppliers: system.suppliers.length,
        practitioners: people.practitioners.length,
    };

    push({
        title: t('users.export.ready'),
        body: t(`users.export.${action.kind}Body`, {
            n: counts[action.kind],
            file: `${action.kind}-${isoDaysAgo(0)}.xlsx`,
        }),
    });
}

function confirmAsk(reason, code) {
    const pending = ask.value;

    ask.value = null;
    pending?.done?.(reason, code);
}

const openReg = computed(
    () => people.pendingUsers.find((one) => one.id === view.reg) || null,
);
const openPr = computed(() => people.practitionerByCode(view.pr));
const openPt = computed(() => people.patientByCode(view.pt));
const rejectUser = computed(
    () => people.pendingUsers.find((one) => one.id === view.rej) || null,
);

const rejectName = computed(() =>
    rejectUser.value
        ? `${loc(rejectUser.value.first)} ${loc(rejectUser.value.last)}`
        : '',
);

const rejectEffects = computed(() => [
    t('users.approval.rejectEffect.noCard'),
    t('users.approval.rejectEffect.message'),
    t('users.approval.rejectEffect.remove'),
]);

function onApproved({ name, code }) {
    view.reg = '';
    push({
        title: t('users.approval.approvedTitle', { name }),
        body: t('users.approval.approvedBody', { code }),
    });
}

function onRejected(reason) {
    view.reg = '';
    push({
        title: t('users.approval.rejectedTitle'),
        body: t('users.approval.rejectedBody', { reason }),
        bad: true,
    });
}

function confirmReject(reason) {
    const user = rejectUser.value;

    if (!user) {
        return;
    }

    people.rejectRegistration(user, reason);
    view.rej = '';
    push({
        title: t('users.approval.rejectedTitle'),
        body: t('users.approval.rejectedBody', { reason }),
        bad: true,
    });
}

function openPractitioner(code) {
    view.pt = '';
    view.pr = code;
    view.tab = 'directory';
}
</script>

<template>
    <PageHead :crumbs="crumbs" :title="t('users.title')" :sub="sub">
        <template v-if="exportAction" #actions>
            <AButton icon="download" @click="runExport">
                {{ exportAction.label }}
            </AButton>
        </template>
    </PageHead>

    <ATabs
        :tabs="tabs"
        :model-value="view.tab"
        @update:model-value="view.tab = $event"
    />

    <PendingApprovals
        v-if="view.tab === 'pending'"
        @open="(id) => (view.reg = id)"
        @reject="(id) => (view.rej = id)"
    />

    <PractitionerDirectory
        v-else-if="view.tab === 'directory'"
        :selected="view.pr"
        @open="(code) => (view.pr = code)"
    />

    <SuppliersTab v-else-if="view.tab === 'suppliers'" @ask="ask = $event" />

    <PatientsTab
        v-else-if="view.tab === 'customers'"
        :selected="view.pt"
        @open="(code) => (view.pt = code)"
    />

    <ADrawer :open="Boolean(openReg)" @close="view.reg = ''">
        <ApprovalDrawer
            v-if="openReg"
            :user="openReg"
            @close="view.reg = ''"
            @approved="onApproved"
            @rejected="onRejected"
        />
    </ADrawer>

    <ADrawer :open="Boolean(openPr)" @close="view.pr = ''">
        <PractitionerCard
            v-if="openPr"
            :practitioner="openPr"
            @close="view.pr = ''"
        />
    </ADrawer>

    <ADrawer :open="Boolean(openPt)" @close="view.pt = ''">
        <PatientProfile
            v-if="openPt"
            :patient="openPt"
            @close="view.pt = ''"
            @open-practitioner="openPractitioner"
        />
    </ADrawer>

    <ConfirmDialog
        :open="Boolean(rejectUser)"
        danger
        reason
        :title="t('users.approval.rejectTitle')"
        :confirm-label="t('users.approval.rejectConfirmLabel')"
        :body="t('users.approval.rejectBody', { name: rejectName })"
        :effects="rejectEffects"
        @close="view.rej = ''"
        @confirm="confirmReject"
    />

    <ConfirmDialog
        :open="Boolean(ask)"
        :title="ask?.title || ''"
        :body="ask?.body || ''"
        :effects="ask?.effects || []"
        :confirm-label="ask?.confirmLabel || ''"
        :pin="ask?.pin || false"
        @close="ask = null"
        @confirm="confirmAsk"
    />
</template>
