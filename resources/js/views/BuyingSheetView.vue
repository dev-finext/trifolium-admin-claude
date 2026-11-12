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
// stands, what the next step is, and carries the button that takes it — and
// the states themselves say the same thing:
//
//   a draft stays a draft until the buyer marks it sent by hand, once a
//   supplier and full quantities are on it. Exporting a copy of the sheet is
//   a separate, always-available action, draft included, and does not itself
//   send anything — see `markExported` in the store for why.
//
//   a sent order stays sent while its goods arrive in parts, and is received
//   when the last of them is booked in — or when the buyer closes the rest
//   that is not coming. Its lines are fixed from the moment it is sent: they
//   are what was asked of the supplier, and what arrives is measured against
//   them, line by line, for the rest of the order's life. A draft nothing
//   happened to, or an open request, can be removed; anything sent stays on
//   record.
//
// Two notes, and they are kept apart on purpose: the working note is the
// pharmacy's own — on an order it heads the internal file, and it never reaches
// the supplier's; the note for the supplier, on an order, heads both files.
//
// Booking goods in takes over the page body rather than opening over it, and
// it is an address of its own (`?do=receive`) so it survives a reload.
//
// 12.11.2026, for production: an order whose goods all came on delivery notes
// waits in "ממתין לחשבונית מס" — the band says which notes still wait and
// carries "הצמדת חשבונית מס", which closes the order once nothing else waits;
// the rail shows that step only on an order that has a delivery note. A request
// every line of which moved to an order is "בוצע", read-only, its lines marked
// with the orders they went to.
//
// Also 12.11.2026: an order exports two ways, by two buttons. "ייצוא לאקסל
// (פנימי)" is the pharmacy's own copy with every field the order holds — the
// item card's columns, the quote price, each line's note for the supplier, and
// both notes at the head (config/buying.js `buyingSheet`). "ייצוא לאקסל ספק" is
// the file that goes to the supplier, in the exact shape of the sample Avichai
// sent, with only what the supplier needs (config/supplierSheet.js). A request
// keeps its one button, "ייצוא לאקסל". None of them sends anything.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import PageHead from '@/components/layout/PageHead.vue';
import AttachInvoiceModal from '@/components/purchasing/AttachInvoiceModal.vue';
import BuyingLinesPanel from '@/components/purchasing/BuyingLinesPanel.vue';
import BuyingReceive from '@/components/purchasing/BuyingReceive.vue';
import ReceiptLabelsModal from '@/components/purchasing/ReceiptLabelsModal.vue';
import AButton from '@/components/ui/AButton.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import ChangeLogPanel from '@/components/ui/ChangeLogPanel.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import {
    BUYING_KIND,
    buyingMoves,
    buyingRailOf,
    buyingSheet,
    canReceive,
    docRef,
    hasReceipts,
    lineGap,
    lineMoved,
    lineOutstanding,
    linesEditable,
    missingQty,
    supplierCatalogNum,
    supplierSheet,
} from '@/config';
import { fmtISO } from '@/lib/dates';
import { num } from '@/lib/money';
import { downloadStyledXlsx, downloadXlsx } from '@/lib/xlsx';
import { useBuyingStore } from '@/stores/buying';
import { useDatasetStore } from '@/stores/dataset';
import { useInventoryStore } from '@/stores/inventory';
import { useItemsStore } from '@/stores/items';
import { useStickersStore } from '@/stores/stickers';
import { supplierSelectable } from '@/stores/system';

const { t, te } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const route = useRoute();
const router = useRouter();
const dataset = useDatasetStore();
const store = useBuyingStore();
const stickers = useStickersStore();
const inventory = useInventoryStore();
const items = useItemsStore();

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

const rail = computed(() =>
    buyingRailOf(sheet.value, { hasNotes: store.hasNotes(sheet.value) }),
);

/** The order's delivery notes still waiting for a tax invoice. */
const openNotes = computed(() =>
    sheet.value?.kind === 'order' ? store.openNotesOfList(sheet.value) : [],
);
const railIndex = computed(() => rail.value.indexOf(sheet.value?.state));
const failed = computed(() => sheet.value?.state === 'failed');

const moves = computed(() => buyingMoves(sheet.value));

const short = computed(() => (sheet.value ? missingQty(sheet.value) : []));

const needsSupplier = computed(
    () => rules.value.supplier && !sheet.value?.supplierCode,
);

/** Nothing to export, and nothing to send — the one check both share. */
const noLines = computed(() => !sheet.value?.lines.length);

/** Is "mark as sent" one of the moves on offer right now? */
const canSend = computed(() => moves.value.includes('sent'));

/** Why the order cannot be marked sent yet — the first answer, not all of them. */
const sendBlocker = computed(() => {
    if (noLines.value) {
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
        return {
            open: t('buying.step.requestOpen'),
            done: t('buying.step.requestDone'),
            closed: t('buying.step.requestClosed'),
        }[one.state];
    }

    if (one.state === 'awaiting_invoice') {
        return t('buying.step.awaitingInvoice', {
            when: one.received?.stamp || '',
        });
    }

    if (one.state === 'sent' && hasReceipts(one)) {
        return t('buying.step.partial', { when: one.received?.stamp || '' });
    }

    if (one.state === 'received' && one.closedShort) {
        return t('buying.step.receivedShort', {
            when: one.received?.stamp || '',
        });
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
        (sheet.value?.lines || []).filter((line) => Number(line.received) > 0)
            .length,
);

/** Lines where what arrived is not what was ordered — short or over. */
const gaps = computed(() =>
    (sheet.value?.lines || []).filter((line) => {
        const gap = lineGap(line);

        return gap !== null && gap !== 0;
    }),
);

/** Lines still waiting for goods, on an order something already came for. */
const outstanding = computed(() =>
    (sheet.value?.lines || []).filter((line) => lineOutstanding(line) > 0),
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

        const moved = one.lines.filter(lineMoved).length;

        if (moved) {
            out.push(
                t('buying.request.moved', {
                    done: moved,
                    total: one.lines.length,
                }),
            );
        }
    }

    if (openNotes.value.length) {
        out.push(
            t(
                'buying.order.awaitingNotes',
                {
                    n: openNotes.value.length,
                    refs: openNotes.value.map(docRef).join(', '),
                },
                openNotes.value.length,
            ),
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

    if (one.kind === 'order' && gaps.value.length) {
        out.push(
            t(
                'buying.order.gapLines',
                { n: gaps.value.length },
                gaps.value.length,
            ),
        );
    }

    if (one.kind === 'order' && arrived.value && outstanding.value.length) {
        out.push(
            t(
                one.closedShort
                    ? 'buying.order.closedShortLines'
                    : 'buying.order.waiting',
                { n: outstanding.value.length },
                outstanding.value.length,
            ),
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

/**
 * The suppliers an order may go to: the active ones — a suspended card is not
 * offered, as its suspension promises — plus whichever this order already
 * names, so the field never shows a supplier that is not in its own list.
 */
const supplierOptions = computed(() => [
    { value: '', label: t('buying.pickSupplier') },
    ...dataset.suppliers
        .filter(
            (one) =>
                supplierSelectable(one) ||
                one.code === sheet.value?.supplierCode,
        )
        .map((one) => ({
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

/**
 * A settled sheet is read from, not edited. A failed order is not settled:
 * the usual reason it failed is that another supplier is being sought, so
 * its supplier and lines stay open until it goes out again.
 */
const settled = computed(() =>
    ['received', 'closed', 'done', 'awaiting_invoice'].includes(
        sheet.value?.state,
    ),
);

/** Who the order goes to is fixed once it went — and open again if it failed. */
const supplierLocked = computed(
    () => !['draft', 'failed'].includes(sheet.value?.state),
);

/**
 * The lines themselves — adding, removing, quantities — are open while the
 * sheet is: a request until it is finished, an order until it is sent.
 */
const linesLocked = computed(() => !linesEditable(sheet.value));

// ---- request → order --------------------------------------------------------

/**
 * The request's sourced lines, grouped exactly as the split will group them —
 * and, for a supplier with a draft already waiting, the draft they will join.
 * The store's own plan, so the dialog cannot say one thing and do another.
 */
const convertGroups = computed(() =>
    sheet.value?.kind === 'request' ? store.conversionPlan(sheet.value.id) : [],
);

const canConvert = computed(
    () =>
        sheet.value?.kind === 'request' &&
        !settled.value &&
        convertGroups.value.length > 0,
);

const convertOpen = ref(false);

const convertEffects = computed(() => {
    const out = convertGroups.value.map((group) =>
        t(
            group.into
                ? 'buying.convert.effect.into'
                : 'buying.convert.effect.group',
            {
                n: group.lines.length,
                supplier: group.supplierName
                    ? loc(group.supplierName)
                    : t('buying.convert.effect.noSupplier'),
                number: group.into?.number || '',
            },
            group.lines.length,
        ),
    );

    const moving = convertGroups.value.reduce(
        (sum, group) => sum + group.lines.length,
        0,
    );
    // Lines that moved before stay on the request; they are not "remaining".
    const unmoved = (sheet.value?.lines || []).filter(
        (line) => !lineMoved(line),
    ).length;
    const remaining = unmoved - moving;

    out.push(
        remaining > 0
            ? t('buying.convert.effect.remain', { n: remaining }, remaining)
            : t('buying.convert.effect.remainNone'),
        t('buying.convert.effect.kept'),
    );

    return out;
});

function onConvert() {
    const results = store.convertToOrders(sheet.value.id);

    convertOpen.value = false;

    if (!results.length) {
        return;
    }

    const opened = results.filter((one) => !one.merged);
    const joined = results.filter((one) => one.merged);

    push({
        title: opened.length
            ? t(
                  'buying.convert.done',
                  {
                      numbers: opened
                          .map(({ order }) => order.number)
                          .join(', '),
                  },
                  opened.length,
              )
            : t(
                  'buying.convert.doneJoined',
                  {
                      numbers: joined
                          .map(({ order }) => order.number)
                          .join(', '),
                  },
                  joined.length,
              ),
        body:
            opened.length && joined.length
                ? t(
                      'buying.convert.doneJoined',
                      {
                          numbers: joined
                              .map(({ order }) => order.number)
                              .join(', '),
                      },
                      joined.length,
                  )
                : '',
    });

    if (results.length === 1) {
        router.push({
            name: 'buyingSheet',
            params: { kind: 'order', id: results[0].order.id },
        });
    }
}

// ---- closing the rest, removing a sheet -------------------------------------

/** Part of it came and the rest is not coming. */
const canCloseRest = computed(
    () =>
        sheet.value?.kind === 'order' &&
        sheet.value.state === 'sent' &&
        hasReceipts(sheet.value),
);

/**
 * Only a sheet nothing happened to may be taken off the list — the store's own
 * rule, which also keeps a request any line of which moved to an order.
 */
const canRemove = computed(() => store.removable(sheet.value));

const closingRest = ref(false);
const removing = ref(false);

// ---- the tax invoice an order waits for --------------------------------------

const attaching = ref(false);

const canAttach = computed(
    () =>
        sheet.value?.state === 'awaiting_invoice' && openNotes.value.length > 0,
);

function onCloseRest(reason) {
    closingRest.value = false;

    if (store.closeRemainder(sheet.value.id, reason)) {
        push({ title: t('buying.closeRest.done'), body: sheet.value.number });
    }
}

function onRemove(reason) {
    const one = sheet.value;

    removing.value = false;

    if (store.removeList(one.id, { reason })) {
        push({
            title: t('buying.remove.done', { number: one.number }),
            bad: true,
        });
        back();
    }
}

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
    // A copy, nothing more — see `markExported`.
    store.markExported(one.id);
    push({
        title: t('buying.exported', { n: one.lines.length }, one.lines.length),
        body: file,
    });
}

/**
 * A unit's Hebrew label, whatever the screen's language: the supplier's file
 * is a Hebrew document, like the sample it copies. The stock screen's short
 * labels first (יח׳, ק״ג, מ״ל — as SAP writes them), the item card's for the
 * units they do not cover.
 */
function hebrewUnit(uom) {
    if (!uom) {
        return '';
    }

    const key = te(`inventory.unit.${uom}`, 'he')
        ? `inventory.unit.${uom}`
        : `items.uom.${uom}`;

    return t(key, {}, { locale: 'he' });
}

/**
 * The file that goes to the supplier — config/supplierSheet.js says what is in
 * it and why. The supplier's own catalogue number is read off the item card
 * now, for the supplier the order goes to.
 */
function exportSupplierSheet() {
    const one = sheet.value;
    const file = `${t('buying.order.file')}-${one.number}-${t('buying.supplierFileSuffix')}.xlsx`;

    downloadStyledXlsx(
        file,
        supplierSheet(one, {
            unit: hebrewUnit,
            catalogNum: (line) =>
                supplierCatalogNum(items.itemBySku(line.sku), one.supplierCode),
        }),
    );
    store.markExported(one.id, { supplier: true });
    push({
        title: t(
            'buying.exportedSupplier',
            { n: one.lines.length },
            one.lines.length,
        ),
        body: file,
    });
}

/**
 * The receipt just signed, while its batch labels are offered for printing.
 * Held here and not on the receipt screen, which closes the moment the
 * receipt is booked — and with it anything it had open.
 */
const labelling = ref(null);

function onReceived(booked) {
    setMode(null);

    // What the store hands back is the receipt's number and its batches; the
    // labels are read off the receipt itself.
    const receipt = booked?.id ? inventory.receiptById(booked.id) : null;

    if ((receipt?.lines || []).some((line) => stickers.itemCount(line) > 0)) {
        labelling.value = receipt;
    }
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
                        v-if="canAttach && !receiving"
                        kind="p"
                        icon="file_text"
                        @click="attaching = true"
                    >
                        {{ t('buying.attach.open') }}
                    </AButton>
                    <AButton
                        v-if="canConvert && !receiving"
                        icon="send"
                        @click="convertOpen = true"
                    >
                        {{ t('buying.convert.action') }}
                    </AButton>
                    <AButton
                        v-if="!receiving"
                        icon="download"
                        :disabled="noLines"
                        :title="noLines ? t('buying.blocked.noLines') : ''"
                        @click="exportSheet"
                    >
                        {{
                            kind === 'order'
                                ? t('buying.exportInternal')
                                : t('buying.export')
                        }}
                    </AButton>
                    <AButton
                        v-if="kind === 'order' && !receiving"
                        icon="download"
                        :disabled="noLines"
                        :title="
                            noLines
                                ? t('buying.blocked.noLines')
                                : t('buying.exportSupplierHint')
                        "
                        @click="exportSupplierSheet"
                    >
                        {{ t('buying.exportSupplier') }}
                    </AButton>
                    <AButton
                        v-for="move in moves"
                        :key="move"
                        sm
                        :kind="move === 'sent' && !sendBlocker ? 'p' : ''"
                        :disabled="move === 'sent' && Boolean(sendBlocker)"
                        :title="move === 'sent' ? sendBlocker : ''"
                        @click="store.setState(sheet.id, move)"
                    >
                        {{ t(`buying.move.${move}`) }}
                    </AButton>
                    <AButton
                        v-if="canCloseRest && !receiving"
                        sm
                        @click="closingRest = true"
                    >
                        {{ t('buying.closeRest.action') }}
                    </AButton>
                    <AButton
                        v-if="canRemove && !receiving"
                        sm
                        kind="ghost"
                        icon="trash"
                        @click="removing = true"
                    >
                        {{ t(`buying.remove.action.${kind}`) }}
                    </AButton>
                </div>

                <p
                    v-if="canSend && sendBlocker && !receiving"
                    class="bs-blocked"
                >
                    {{ sendBlocker }}
                </p>

                <ul class="bs-facts">
                    <li v-for="fact in facts" :key="fact">{{ fact }}</li>
                </ul>
            </div>

            <!-- Booking goods in takes the page; everything else waits -->
            <BuyingReceive
                v-if="receiving"
                :list="sheet"
                :done="onReceived"
                @cancel="setMode(null)"
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
                            :disabled="supplierLocked"
                            @update:model-value="onSupplier"
                        />
                    </label>
                    <label v-if="kind === 'order'" class="a-field bs-note">
                        <span>{{ t('buying.supplierNote') }}</span>
                        <ATextarea
                            :model-value="sheet.supplierNote || ''"
                            :rows="2"
                            class="a-w100"
                            :disabled="supplierLocked"
                            :placeholder="t('buying.supplierNotePlaceholder')"
                            @update:model-value="
                                store.setSupplierNote(sheet.id, $event)
                            "
                        />
                        <small class="a-hint">{{
                            t('buying.supplierNoteHint')
                        }}</small>
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
                        <small class="a-hint">{{
                            kind === 'order'
                                ? t('buying.noteHintOrder')
                                : t('buying.noteHint')
                        }}</small>
                    </label>
                </div>

                <BuyingLinesPanel :list="sheet" :readonly="linesLocked" />

                <ChangeLogPanel
                    class="bs-log"
                    entity="buying_list"
                    :ref-id="sheet.id"
                />
            </template>

            <ReceiptLabelsModal
                :receipt="labelling"
                @close="labelling = null"
            />

            <AttachInvoiceModal
                v-if="kind === 'order'"
                :open="attaching"
                :supplier-code="sheet.supplierCode || ''"
                :preselect="openNotes.map((receipt) => receipt.id)"
                @close="attaching = false"
            />

            <ConfirmDialog
                :open="convertOpen"
                :title="t('buying.convert.title')"
                :body="t('buying.convert.body')"
                :effects="convertEffects"
                :confirm-label="t('buying.convert.confirm')"
                @confirm="onConvert"
                @close="convertOpen = false"
            />

            <ConfirmDialog
                :open="closingRest"
                :title="t('buying.closeRest.title')"
                :body="
                    t(
                        'buying.closeRest.body',
                        { n: outstanding.length },
                        outstanding.length,
                    )
                "
                :effects="[
                    openNotes.length
                        ? t('buying.closeRest.effectStateWait')
                        : t('buying.closeRest.effectState'),
                    t('buying.closeRest.effectStock'),
                ]"
                :confirm-label="t('buying.closeRest.confirm')"
                reason
                @confirm="onCloseRest"
                @close="closingRest = false"
            />

            <ConfirmDialog
                :open="removing"
                :title="t(`buying.remove.title.${kind}`)"
                :body="t('buying.remove.body', { number: sheet.number })"
                :confirm-label="t(`buying.remove.action.${kind}`)"
                danger
                reason
                @confirm="onRemove"
                @close="removing = false"
            />
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
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 20px;
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
    flex: 1 1 100%;
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
    flex: 1 1 340px;
    min-width: 0;
    margin: 0;
    font-size: 14px;
}

.bs-do {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-inline-start: auto;
}

.bs-blocked {
    flex: 1 1 100%;
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--a-red);
}

.bs-facts {
    flex: 1 1 100%;
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
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
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
