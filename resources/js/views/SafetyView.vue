<script setup>
// אינטראקציות תרופתיות — the safety desk.
//
// Five views of one clinical table: by herb, by drug, a test bench that shows what
// the practitioner would see, the per-herb contraindications, and the pharmacist
// approvals that close an `interaction` exception on an order.
//
// The table is the source of the alerts in the practitioner-facing compounding
// wizard, which is why every edit here says how many orders contain the herb
// before it is made, and why deleting a link asks for a reason.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import DrugGroupPanel from '@/components/safety/DrugGroupPanel.vue';
import HerbWarningsPanel from '@/components/safety/HerbWarningsPanel.vue';
import InteractionEditor from '@/components/safety/InteractionEditor.vue';
import InteractionTable from '@/components/safety/InteractionTable.vue';
import PharmacistApprovalPanel from '@/components/safety/PharmacistApprovalPanel.vue';
import TestBenchPanel from '@/components/safety/TestBenchPanel.vue';
import AButton from '@/components/ui/AButton.vue';
import ATabs from '@/components/ui/ATabs.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import DemoBar from '@/components/ui/DemoBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { saveCsv } from '@/lib/csv';
import { isoDaysAgo } from '@/lib/dates';
import {
    CSV_COLUMNS,
    interactionsToCsv,
    parseInteractionCsv,
    useSafetyStore,
} from '@/stores/safety';

/** The export file is named for the day it was taken. */
const EXPORT_PREFIX = 'interactions-';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const store = useSafetyStore();

const view = useUrlState({ tab: 'list', edit: '' });

/** The row the editor is open on: `new` for an empty one, an id for an edit. */
const editing = computed(() => {
    if (!view.edit) {
        return null;
    }

    if (view.edit === 'new') {
        return {};
    }

    return store.interactions.find((row) => row.id === view.edit) || null;
});

/** The row a delete is being confirmed for — a moment, not a view. */
const removing = ref(null);
const csvInput = ref(null);

const herbsWithWarnings = computed(
    () =>
        store.herbs.filter((herb) => store.warningsFor(herb.id).length).length,
);

const tabs = computed(() => [
    {
        id: 'list',
        label: t('safety.tab.list'),
        icon: 'leaf',
        n: store.interactions.length,
    },
    {
        id: 'drug',
        label: t('safety.tab.drug'),
        icon: 'card',
        n: store.allDrugs.length,
    },
    { id: 'bench', label: t('safety.tab.bench'), icon: 'beaker' },
    {
        id: 'warn',
        label: t('safety.tab.warn'),
        icon: 'shield',
        n: herbsWithWarnings.value,
    },
    {
        id: 'approvals',
        label: t('safety.tab.approvals'),
        icon: 'signature',
        n: store.awaitingApproval.length,
    },
]);

const herbName = (herbId) => loc(store.herb(herbId)?.name);

function edit(row) {
    view.edit = row?.id || 'new';
}

async function save(row) {
    const existing = Boolean(row.id);

    await store.saveInteraction(row);

    view.edit = '';
    push({
        title: existing ? t('safety.toast.updated') : t('safety.toast.added'),
        body: t('safety.toast.pair', {
            herb: herbName(row.herbId),
            drug: row.drug,
        }),
    });
}

async function remove(why) {
    const row = removing.value;

    removing.value = null;

    await store.deleteInteraction(row.id, why);

    push({
        title: t('safety.toast.deleted'),
        body: t('safety.toast.reason', { why }),
        bad: true,
    });
}

function exportCsv() {
    const file = `${EXPORT_PREFIX}${isoDaysAgo(0)}.csv`;

    saveCsv(file, interactionsToCsv(store.interactions));

    push({
        title: t('safety.toast.exported'),
        body: t('safety.toast.exportedBody', {
            n: store.interactions.length,
            file,
        }),
    });
}

async function importCsv(event) {
    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    const text = await file.text();
    const result = await store.importInteractions(parseInteractionCsv(text));

    // Clearing the input lets the same file be picked again after a fix.
    event.target.value = '';

    if (!result.added) {
        push({
            title: t('safety.toast.importEmpty'),
            body: t('safety.toast.importEmptyBody', {
                cols: CSV_COLUMNS.join(', '),
            }),
            bad: true,
        });

        return;
    }

    push({
        title: t('safety.toast.imported'),
        body: t('safety.toast.importedBody', result),
    });
}

function onWarningsSaved({ herb, n }) {
    push({
        title: t('safety.toast.warningsSaved'),
        body: t('safety.toast.warningsSavedBody', { herb, n }),
    });
}

function onApproved({ order, by }) {
    push({
        title: t('safety.toast.approved'),
        body: t('safety.toast.approvedBody', { order, by }),
    });
}
</script>

<template>
    <PageHead
        :crumbs="[t('nav.group.knowledge'), t('nav.item.safety')]"
        :title="t('safety.title')"
        :sub="t('safety.sub', { n: store.interactions.length })"
    >
        <template #actions>
            <AButton icon="upload" @click="csvInput?.click()">
                {{ t('safety.action.import') }}
            </AButton>
            <AButton icon="download" @click="exportCsv">
                {{ t('safety.action.export') }}
            </AButton>
            <AButton kind="p" icon="plus" @click="edit(null)">
                {{ t('safety.action.new') }}
            </AButton>
        </template>
    </PageHead>

    <input
        ref="csvInput"
        class="a-hidden"
        type="file"
        accept=".csv,text/csv"
        :aria-label="t('safety.action.import')"
        @change="importCsv"
    />

    <DemoBar :note="t('demo.note')" />

    <ATabs v-model="view.tab" :tabs="tabs" />

    <InteractionTable
        v-if="view.tab === 'list'"
        @edit="edit"
        @remove="removing = $event"
    />

    <DrugGroupPanel v-else-if="view.tab === 'drug'" @edit="edit" />

    <TestBenchPanel v-else-if="view.tab === 'bench'" />

    <HerbWarningsPanel
        v-else-if="view.tab === 'warn'"
        @saved="onWarningsSaved"
    />

    <PharmacistApprovalPanel
        v-else-if="view.tab === 'approvals'"
        @approved="onApproved"
    />

    <InteractionEditor :row="editing" @close="view.edit = ''" @save="save" />

    <ConfirmDialog
        :open="Boolean(removing)"
        danger
        reason
        :title="t('safety.remove.title')"
        :body="
            removing
                ? t('safety.remove.body', {
                      herb: herbName(removing.herbId),
                      drug: removing.drug,
                  })
                : ''
        "
        :confirm-label="t('safety.remove.confirmLabel')"
        :effects="[
            t('safety.remove.effect.wizard'),
            t('safety.remove.effect.orders'),
            t('safety.remove.effect.log'),
        ]"
        @close="removing = null"
        @confirm="remove"
    />
</template>

<style scoped>
/* The file picker is driven by the toolbar button, but stays in the accessibility
   tree so it can be reached by keyboard. */
.a-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}
</style>
