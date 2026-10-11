<script setup>
// One purchase request or one purchase order, on a page of its own
// (/purchasing/request/:id, /purchasing/order/:id).
//
// A page and not a drawer or a dialog, for one reason: a line carries the whole
// item card, so the table is twenty-nine columns and three thousand pixels
// across. Nothing that floats over the screen is the right shape for that, and
// a sixty-seven-line order booked in line by line is worse.
//
// The page is laid out around what the buyer is going to do next rather than
// around the record's fields. The band under the heading says where the sheet
// stands, what the next step is, and carries the one button that takes it —
// and the states themselves say the same thing:
//
//   a draft is a draft because the file has not gone out. Exporting it IS
//   sending it to the supplier, so the export is the only way out of a draft,
//   and from there the two answers are the two things that can happen.
//
// Booking goods in takes over the page body rather than opening over it, and
// it is an address of its own (`?do=receive`) so it survives a reload.
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import PageHead from '@/components/layout/PageHead.vue';
import BuyingLinesPanel from '@/components/purchasing/BuyingLinesPanel.vue';
import BuyingReceive from '@/components/purchasing/BuyingReceive.vue';
import AButton from '@/components/ui/AButton.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import ChangeLogPanel from '@/components/ui/ChangeLogPanel.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import {
    BUYING_KIND,
    BUYING_RAIL,
    buyingMoves,
    buyingSheet,
    canReceive,
    missingQty,
} from '@/config';
import { fmtISO } from '@/lib/dates';
import { num } from '@/lib/money';
import { downloadXlsx } from '@/lib/xlsx';
import { useBuyingStore } from '@/stores/buying';
import { useDatasetStore } from '@/stores/dataset';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const route = useRoute();
const router = useRouter();
const dataset = useDatasetStore();
const store = useBuyingStore();

const kind = computed(() =>
    route.params.kind === 'order' ? 'order' : 'request',
);

const sheet = computed(() => store.listById(String(route.params.id || '')));

const rules = computed(() => BUYING_KIND[kind.value]);

/** Booking goods in is a mode of this page, and an address of its own. */
const receiving = computed(
    () => route.query.do === 'receive' && canReceive(sheet.value),
);

function setMode(mode) {
    const query = { ...route.query };

    if (mode) {
        query.do = mode;
    } else {
        delete query.do;
    }

    router.replace({ query });
}

// A sheet that leaves the state the receipt screen belongs to takes the mode
// with it, so a reload does not land on a form that cannot be submitted.
watch(
    () => sheet.value?.state,
    () => {
        if (route.query.do === 'receive' && !canReceive(sheet.value)) {
            setMode(null);
        }
    },
);

// ---- where it stands -------------------------------------------------------

const rail = computed(() => BUYING_RAIL[kind.value] || []);
const railIndex = computed(() => rail.value.indexOf(sheet.value?.state));
const failed = computed(() => sheet.value?.state === 'failed');

const moves = computed(() => buyingMoves(sheet.value));

const short = computed(() => (sheet.value ? missingQty(sheet.value) : []));

const needsSupplier = computed(
    () => rules.value.supplier && !sheet.value?.supplierCode,
);

/** Why the file cannot leave yet — the first answer, not all of them. */
const blocker = computed(() => {
    if (!sheet.value?.lines.length) {
        return t('buying.blocked.noLines');
    }

    if (needsSupplier.value) {
        return t('buying.needSupplier');
    }

    if (short.value.length) {
        return t(
            'buying.needQty',
            { n: short.value.length },
            short.value.length,
        );
    }

    return '';
});

/** The one sentence under the heading: where this is, and what happens next. */
const nextStep = computed(() => {
    const one = sheet.value;

    if (!one) {
        return '';
    }

    if (one.kind === 'request') {
        return one.state === 'closed'
            ? t('buying.step.requestClosed')
            : t('buying.step.requestOpen');
    }

    return {
        draft: t('buying.step.draft'),
        sent: t('buying.step.sent', { when: one.sent?.stamp || '' }),
        received: t('buying.step.received', {
            when: one.received?.stamp || '',
        }),
        failed: t('buying.step.failed'),
    }[one.state];
});

// ---- the facts strip -------------------------------------------------------

const totalQty = computed(() =>
    (sheet.value?.lines || []).reduce(
        (sum, line) => sum + (Number(line.qty) || 0),
        0,
    ),
);

const ticked = computed(
    () => (sheet.value?.lines || []).filter((line) => line.done).length,
);

const arrived = computed(
    () =>
        (sheet.value?.lines || []).filter((line) => line.received !== null)
            .length,
);

const facts = computed(() => {
    const one = sheet.value;
    const out = [
        t('buying.lineCount', { n: one.lines.length }, one.lines.length),
    ];

    if (totalQty.value) {
        out.push(t('buying.totalQty', { n: num(totalQty.value, 3) }));
    }

    if (one.kind === 'request' && one.lines.length) {
        out.push(
            t('buying.request.ticked', {
                done: ticked.value,
                total: one.lines.length,
            }),
        );
    }

    if (arrived.value) {
        out.push(
            t('buying.order.arrived', {
                done: arrived.value,
                total: one.lines.length,
            }),
        );
    }

    out.push(
        t('buying.openedBy', {
            who: one.by ? loc(one.by) : '—',
            when: one.created?.stamp || '',
        }),
    );

    return out;
});

// ---- the supplier ----------------------------------------------------------

const supplierOptions = computed(() => [
    { value: '', label: t('buying.pickSupplier') },
    ...dataset.suppliers.map((one) => ({
        value: one.code,
        label: `${loc(one.name)} · ${one.code}`,
    })),
]);

function onSupplier(code) {
    const hit = dataset.suppliers.find((one) => one.code === code);

    store.setSupplier(sheet.value.id, {
        supplierCode: code,
        supplier: hit ? hit.name : null,
    });
}

/** A settled sheet is read from, not edited. */
const settled = computed(() =>
    ['received', 'failed', 'closed'].includes(sheet.value?.state),
);

// ---- out -------------------------------------------------------------------

/** The codes a line stores, as the words a person reads. */
const fmt = {
    unit: (uom) => (uom ? t(`inventory.unit.${uom}`) : ''),
    state: (id) => t(`buying.itemState.${id}`),
    procurement: (id) => t(`items.procurementMethod.${id}`),
    date: (iso) => fmtISO(iso),
};

function exportSheet() {
    const one = sheet.value;
    const file = `${t(`buying.${one.kind}.file`)}-${one.number}.xlsx`;

    downloadXlsx(file, {
        name: t(`buying.${one.kind}.one`),
        rows: buyingSheet(one, fmt),
    });
    // Exporting is sending: the spreadsheet is what the supplier receives, and
    // a draft has nothing else that could mean "it went out".
    store.markExported(one.id);
    push({
        title: t('buying.exported', { n: one.lines.length }, one.lines.length),
        body: file,
    });
}

const exportLabel = computed(() =>
    sheet.value?.kind === 'order' && sheet.value.state === 'draft'
        ? t('buying.exportAndSend')
        : t('buying.export'),
);

function onReceived() {
    setMode(null);
}

function back() {
    router.push({
        name: 'purchasing',
        query: { tab: kind.value, sheet: sheet.value?.id || undefined },
    });
}
</script>

<template>
    <div>
        <ASkeleton v-if="dataset.isBusy" :rows="8" />
        <AErrorState
            v-else-if="dataset.error"
            :message="dataset.error"
            @retry="dataset.load(true)"
        />

        <AEmpty
            v-else-if="!sheet"
            icon="inbox"
            :title="t('buying.notFound')"
            :sub="t('buying.notFoundSub')"
        >
            <template #action>
                <AButton kind="p" icon="chevron_right" @click="back">
                    {{ t('buying.backToList') }}
                </AButton>
            </template>
        </AEmpty>

        <template v-else>
            <PageHead
                :crumbs="[
                    t('buying.crumb'),
                    t('buying.title'),
                    t(`buying.${kind}.one`),
                ]"
                :title="`${t(`buying.${kind}.one`)} ${sheet.number}`"
                :sub="
                    kind === 'order'
                        ? loc(sheet.supplier) || t('buying.noSupplierYet')
                        : sheet.note || ''
                "
            >
                <template #actions>
                    <AButton icon="chevron_right" @click="back">
                        {{ t('buying.backToList') }}
                    </AButton>
                </template>
            </PageHead>

            <!-- Where it stands, what happens next, and the press that does it -->
            <div class="bs-band" :class="{ 'is-failed': failed }">
                <ol class="bs-rail" :aria-label="t('buying.railAria')">
                    <li
                        v-for="(step, i) in rail"
                        :key="step"
                        class="bs-step"
                        :class="{
                            'is-done': !failed && i < railIndex,
                            'is-on': !failed && i === railIndex,
                        }"
                    >
                        <span class="bs-dot" />
                        <span>{{ t(`buying.state.${step}`) }}</span>
                    </li>
                    <li v-if="failed" class="bs-step is-failed">
                        <span class="bs-dot" />
                        <span>{{ t('buying.state.failed') }}</span>
                    </li>
                </ol>

                <p class="bs-next">{{ nextStep }}</p>

                <div class="bs-do">
                    <AButton
                        v-if="canReceive(sheet) && !receiving"
                        kind="p"
                        icon="inbox"
                        @click="setMode('receive')"
                    >
                        {{ t('buying.receive.open') }}
                    </AButton>
                    <AButton
                        v-if="!receiving"
                        :kind="
                            kind === 'order' && sheet.state === 'draft'
                                ? 'p'
                                : ''
                        "
                        icon="download"
                        :disabled="Boolean(blocker)"
                        :title="blocker"
                        @click="exportSheet"
                    >
                        {{ exportLabel }}
                    </AButton>
                    <AButton
                        v-for="move in moves"
                        :key="move"
                        sm
                        @click="store.setState(sheet.id, move)"
                    >
                        {{ t(`buying.move.${move}`) }}
                    </AButton>
                </div>

                <p v-if="blocker && !receiving" class="bs-blocked">
                    {{ blocker }}
                </p>

                <ul class="bs-facts">
                    <li v-for="fact in facts" :key="fact">{{ fact }}</li>
                </ul>
            </div>

            <!-- Booking goods in takes the page; everything else waits -->
            <BuyingReceive
                v-if="receiving"
                :list="sheet"
                @cancel="setMode(null)"
                @received="onReceived"
            />

            <template v-else>
                <div class="bs-top">
                    <label
                        v-if="kind === 'order'"
                        class="a-field bs-supplier"
                        :class="{ 'is-wanted': needsSupplier }"
                    >
                        <span>{{ t('buying.supplier') }}</span>
                        <ASelect
                            :model-value="sheet.supplierCode || ''"
                            :options="supplierOptions"
                            :disabled="settled"
                            @update:model-value="onSupplier"
                        />
                    </label>
                    <label class="a-field bs-note">
                        <span>{{ t('buying.note') }}</span>
                        <ATextarea
                            :model-value="sheet.note || ''"
                            :rows="2"
                            class="a-w100"
                            :placeholder="t('buying.notePlaceholder')"
                            @update:model-value="
                                store.setNote(sheet.id, $event)
                            "
                        />
                    </label>
                </div>

                <BuyingLinesPanel :list="sheet" :readonly="settled" />

                <ChangeLogPanel
                    class="bs-log"
                    entity="buying_list"
                    :ref-id="sheet.id"
                />
            </template>
        </template>
    </div>
</template>

<style scoped>
/* The band under the heading. It answers three questions in the order they get
   asked — where is this, what happens next, what do I press — and it sticks,
   because on a sixty-seven line order the answer scrolls away otherwise. */
.bs-band {
    position: sticky;
    top: calc(0px - var(--a-pane-pad, 0px));
    z-index: 6;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px 20px;
    align-items: center;
    margin-bottom: 18px;
    padding: 14px 18px;
    background: var(--a-surface);
    border: 1px solid var(--a-line);
    border-radius: var(--a-r);
    box-shadow: 0 6px 18px -12px rgb(31 46 29 / 40%);
}

.bs-band.is-failed {
    border-color: var(--a-red);
}

.bs-rail {
    display: flex;
    gap: 20px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
    color: var(--a-ink-4);
}

.bs-step {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.bs-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 1.5px solid var(--a-line-2);
}

.bs-step.is-done .bs-dot {
    background: var(--a-line-2);
}

.bs-step.is-on {
    color: var(--a-ink);
    font-weight: 600;
}

.bs-step.is-on .bs-dot {
    background: var(--a-accent);
    border-color: var(--a-accent);
}

.bs-step.is-failed {
    color: var(--a-red);
    font-weight: 600;
}

.bs-step.is-failed .bs-dot {
    background: var(--a-red);
    border-color: var(--a-red);
}

/* The sentence that says what to do, not what the record contains. */
.bs-next {
    grid-column: 1;
    margin: 0;
    font-size: 14px;
}

.bs-do {
    grid-column: 2;
    grid-row: 1 / span 2;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.bs-blocked {
    grid-column: 1 / -1;
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--a-red);
}

.bs-facts {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin: 2px 0 0;
    padding: 0;
    list-style: none;
    font-size: 12.5px;
    color: var(--a-ink-4);
}

.bs-facts li + li::before {
    content: '·';
    margin-inline-end: 14px;
}

.bs-top {
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
    gap: 18px;
    align-items: start;
    margin-bottom: 18px;
}

.bs-note {
    display: block;
}

/* A supplier an order cannot leave without, asked for on the field itself. */
.bs-supplier.is-wanted :deep(select) {
    border-color: var(--a-red);
    background: var(--a-red-bg);
}

.bs-log {
    margin-top: 20px;
}
</style>
