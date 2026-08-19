<script setup>
// The collection link: one link for the whole open balance.
//
// All or nothing — CREDIT.allowPartial is false, so there is no amount to edit
// and no order to leave out. The system does not send the link either: it is
// copied from here and sent by hand, which is why "copied" is only ever reported
// once the clipboard has actually accepted it. When the browser refuses, the
// field is selected instead and the reader is told to copy it themselves.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AButton from '@/components/ui/AButton.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AKpi from '@/components/ui/AKpi.vue';
import AModal from '@/components/ui/AModal.vue';
import AMoney from '@/components/ui/AMoney.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { CREDIT, DOC_PROVIDER } from '@/config';
import { ils, num } from '@/lib/money';
import { useMoneyStore } from '@/stores/money';

/** Wide enough for the link, the tiles and the order table side by side. */
const WIDTH = 860;

const props = defineProps({
    /** Customer number of the practitioner being collected from, or null. */
    code: { type: String, default: '' },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const money = useMoneyStore();
const router = useRouter();

const copied = ref(false);
const field = ref(null);

const practitioner = computed(() =>
    props.code ? money.byCode(props.code) : null,
);
const orders = computed(() =>
    props.code ? money.openCreditOrders(props.code) : [],
);
const link = computed(() =>
    props.code ? money.collectionLinkOf(props.code) : null,
);
const url = computed(() => link.value?.url || '');

const ordersTotal = computed(() =>
    orders.value.reduce((sum, order) => sum + order.pricing.total, 0),
);
const balance = computed(() => practitioner.value?.debt || 0);
/** Whatever the balance holds beyond the open orders: an older, carried debt. */
const legacy = computed(() => balance.value - ordersTotal.value);

// A fresh opening never inherits the previous one's "copied" state.
watch(
    () => props.code,
    () => {
        copied.value = false;
    },
);

const cols = computed(() => [
    { k: 'id', label: t('labels.order'), nowrap: true },
    { k: 'patient', label: t('labels.customer') },
    { k: 'content', label: t('finance.link.content') },
    { k: 'status', label: t('labels.status'), nowrap: true },
    { k: 'age', label: t('finance.link.debtAge'), nowrap: true },
    { k: 'amt', label: t('labels.amount'), nowrap: true },
]);

function contentOf(order) {
    if (order.type !== 'formula') {
        return t('finance.link.shelf');
    }

    return order.formula ? loc(order.formula.name) : t('finance.link.formula');
}

function openOrder(id) {
    emit('close');
    router.push({ name: 'order', params: { id } });
}

/** The link exists whichever way it reached the clipboard — record it once. */
function record() {
    money.issueCollectionLink(props.code);
}

function manual() {
    copied.value = false;
    field.value?.focus();
    field.value?.select();
    record();
    push({
        title: t('finance.link.copyFailed'),
        body: t('finance.link.copyFailedBody'),
        bad: true,
    });
}

async function copy() {
    if (!url.value) {
        return;
    }

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url.value);
            copied.value = true;
            record();
            push({
                title: t('finance.link.copied'),
                body: t('finance.link.copiedBody', {
                    name: loc(practitioner.value.name),
                    amount: ils(balance.value, 0),
                }),
            });

            return;
        }
    } catch {
        // Permission denied, or the document is not focused. The manual path
        // below is the honest answer — nothing was copied.
    }

    manual();
}
</script>

<template>
    <AModal
        :open="Boolean(practitioner)"
        :title="
            practitioner
                ? t('finance.link.title', { name: loc(practitioner.name) })
                : ''
        "
        :width="WIDTH"
        @close="emit('close')"
    >
        <template v-if="practitioner">
            <div class="a-kpis f-tiles">
                <AKpi
                    icon="coin"
                    :label="t('finance.link.amount')"
                    :sub="t('finance.link.amountSub')"
                >
                    <template #value>
                        <AMoney :value="balance" big />
                    </template>
                </AKpi>
                <AKpi
                    icon="clipboard_list"
                    :label="t('finance.link.orders')"
                    :value="orders.length ? num(orders.length) : '—'"
                    :sub="
                        orders.length
                            ? t('finance.link.ordersSub')
                            : t('finance.link.ordersNone')
                    "
                />
                <AKpi
                    icon="clock"
                    :label="t('finance.link.validity')"
                    :value="
                        t('finance.link.validityDays', {
                            days: CREDIT.linkDays,
                        })
                    "
                    :sub="t('finance.link.validitySub')"
                />
            </div>

            <div class="a-sect-t">{{ t('finance.link.toCopy') }}</div>

            <div v-if="url" class="f-copyrow">
                <input
                    ref="field"
                    class="a-input a-ltr-input f-url"
                    readonly
                    :value="url"
                    :aria-label="t('finance.link.fieldLabel')"
                    @focus="$event.target.select()"
                />
                <AButton icon="copy" @click="copy">
                    {{
                        copied
                            ? t('finance.link.copiedShort')
                            : t('actions.copy')
                    }}
                </AButton>
            </div>
            <div v-else class="a-note a-note--warn f-block">
                {{ t('finance.link.noLink') }}
            </div>

            <div class="a-note a-note--info f-block">
                {{
                    t('finance.link.manualNote', {
                        days: CREDIT.linkDays,
                        mode: CREDIT.allowPartial
                            ? t('finance.how.partialAllowed')
                            : t('finance.link.noPartial'),
                    })
                }}
            </div>

            <div class="a-sect-t">{{ t('finance.link.covers') }}</div>

            <ADataTable
                v-if="orders.length"
                :cols="cols"
                :rows="orders"
                row-key="id"
            >
                <template #cell-id="{ row }">
                    <button
                        type="button"
                        class="a-linkbtn"
                        @click="openOrder(row.id)"
                    >
                        <span class="num t-strong">{{ row.id }}</span>
                    </button>
                </template>

                <template #cell-patient="{ row }">
                    {{ loc(row.patient.name) }}
                </template>

                <template #cell-content="{ row }">
                    {{ contentOf(row) }}
                </template>

                <template #cell-status="{ row }">
                    <StatusChip :status="row.status" size="sm" />
                </template>

                <template #cell-age="{ row }">
                    {{ t('finance.balances.days', { n: row.daysAgo }) }}
                </template>

                <template #cell-amt="{ row }">
                    <AMoney :value="row.pricing.total" />
                </template>
            </ADataTable>
            <div v-else class="a-note a-note--warn">
                {{ t('finance.link.legacyOnly') }}
            </div>

            <div class="f-totals">
                <span>
                    {{ t('finance.link.ordersTotal') }}
                    <strong><AMoney :value="ordersTotal" /></strong>
                </span>
                <span v-if="legacy > 0">
                    {{ t('finance.link.legacyTotal') }}
                    <strong><AMoney :value="legacy" /></strong>
                </span>
                <span>
                    {{ t('finance.link.linkTotal') }}
                    <strong><AMoney :value="balance" /></strong>
                </span>
            </div>

            <div class="a-note a-note--ok f-block">
                {{
                    t('finance.link.docNote', {
                        doc: t('docType.invrec_multi.name'),
                        provider: DOC_PROVIDER.name,
                    })
                }}
            </div>
        </template>

        <template #footer>
            <AButton kind="p" icon="copy" :disabled="!url" @click="copy">
                {{
                    copied
                        ? t('finance.link.copiedLong')
                        : t('finance.link.copyAction')
                }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.close') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.f-tiles {
    margin-bottom: 18px;
}

.f-copyrow {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 8px;
}

.f-url {
    flex: 1;
    min-width: 340px;
    font-size: 13.5px;
}

.f-block {
    margin-block: 14px 18px;
}

.f-totals {
    display: flex;
    gap: 24px;
    margin-top: 14px;
    flex-wrap: wrap;
    font-size: 14.5px;
}

.f-totals span {
    display: inline-flex;
    gap: 6px;
    align-items: baseline;
}
</style>
