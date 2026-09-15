<script setup>
// One tax document as the customer received it: the header, one line per
// formula component with its quantity and price, the shelf lines, shipping,
// discount and points, VAT and total — built from the order's real figures,
// never typed. The PDF the provider returned opens from here.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ANum from '@/components/ui/ANum.vue';
import FileViewerModal from '@/components/ui/FileViewerModal.vue';
import OrderLink from '@/components/ui/OrderLink.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { ALLOCATION_STATES, DOC_STATES } from '@/config';
import { ils, num } from '@/lib/money';
import { useMoneyStore } from '@/stores/money';

const props = defineProps({
    /** The document row, or null while closed. */
    doc: { type: Object, default: null },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const money = useMoneyStore();

const viewing = ref(false);

const pdfFile = computed(() =>
    props.doc?.pdf
        ? { name: `${props.doc.num || props.doc.id}.pdf`, type: 'pdf' }
        : null,
);
const pdfUrl = computed(() =>
    props.doc?.pdf ? `${import.meta.env.BASE_URL}${props.doc.pdf}` : '',
);

const KIND_TONE = {
    component: 'teal',
    shelf: 'purple',
    shipping: 'blue',
    fee: 'blue',
    discount: 'amber',
    points: 'amber',
};

const header = computed(() => {
    if (!props.doc) {
        return [];
    }

    const doc = props.doc;

    return [
        [t('finance.preview.num'), doc.num || t('finance.preview.noNum')],
        [
            t('finance.preview.allocation'),
            doc.allocation?.num ||
                t(`allocationState.${doc.allocation?.state || 'not_required'}`),
        ],
        [t('finance.preview.when'), doc.when?.stamp],
        [t('finance.preview.to'), loc(doc.to)],
        [
            t('finance.preview.terminal'),
            doc.terminal ? t(`payTerminal.${doc.terminal}`) : '—',
        ],
    ];
});

async function markSent() {
    await money.markSentToAccounting([props.doc.id]);
    push({ title: t('finance.preview.sentToast'), body: props.doc.num });
}
</script>

<template>
    <ADrawer :open="Boolean(doc)" @close="emit('close')">
        <template v-if="doc">
            <div class="a-dhead a-dhead--line">
                <div class="a-dhead-top">
                    <div>
                        <div class="a-dhead-t">
                            <h2 class="a-dhead-h">
                                {{ t(`docType.${doc.type}.name`) }}
                            </h2>
                            <ANum class="a-code a-tag">{{
                                doc.num || '—'
                            }}</ANum>
                            <AChip
                                :tone="DOC_STATES[doc.status]?.tone || 'gray'"
                            >
                                {{ t(`docState.${doc.status}`) }}
                            </AChip>
                            <AChip
                                v-if="doc.allocation?.required"
                                :tone="
                                    ALLOCATION_STATES[doc.allocation.state]
                                        ?.tone || 'gray'
                                "
                                size="sm"
                            >
                                {{
                                    t(`allocationState.${doc.allocation.state}`)
                                }}
                            </AChip>
                        </div>
                        <div class="a-dhead-m">
                            <span v-if="doc.order">
                                {{ t('labels.order') }}
                                <OrderLink :id="doc.order" />
                            </span>
                            <span v-if="doc.accounting?.sent">
                                {{
                                    t('finance.preview.sentOn', {
                                        when: doc.accounting.when?.stamp,
                                    })
                                }}
                            </span>
                        </div>
                    </div>
                    <div class="a-dhead-a">
                        <AButton
                            v-if="pdfFile"
                            sm
                            icon="file_text"
                            @click="viewing = true"
                        >
                            {{ t('finance.preview.pdf') }}
                        </AButton>
                        <AButton
                            v-if="!doc.accounting?.sent"
                            sm
                            icon="check"
                            @click="markSent"
                        >
                            {{ t('finance.preview.markSent') }}
                        </AButton>
                        <AButton
                            sm
                            kind="ghost"
                            icon="x"
                            @click="emit('close')"
                        >
                            {{ t('ui.close') }}
                        </AButton>
                    </div>
                </div>
            </div>

            <div class="a-dbody">
                <AKeyValue :rows="header" />

                <div class="a-sect-t top">{{ t('finance.preview.lines') }}</div>
                <table class="a-table">
                    <thead>
                        <tr>
                            <th scope="col">
                                {{ t('finance.preview.col.kind') }}
                            </th>
                            <th scope="col">
                                {{ t('finance.preview.col.label') }}
                            </th>
                            <th scope="col" class="nowrap">
                                {{ t('finance.preview.col.qty') }}
                            </th>
                            <th scope="col" class="nowrap">
                                {{ t('finance.preview.col.unitPrice') }}
                            </th>
                            <th scope="col" class="nowrap">
                                {{ t('finance.preview.col.total') }}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(line, i) in doc.lines || []" :key="i">
                            <td>
                                <AChip
                                    :tone="KIND_TONE[line.kind] || 'gray'"
                                    size="sm"
                                    :dot="false"
                                >
                                    {{ t(`finance.preview.kind.${line.kind}`) }}
                                </AChip>
                            </td>
                            <td>
                                <div>{{ loc(line.label) }}</div>
                                <div v-if="line.code" class="t-sub num">
                                    {{ line.code }}
                                </div>
                            </td>
                            <td class="nowrap">
                                <template v-if="line.qty != null">
                                    <ANum>{{ num(line.qty, 2) }}</ANum>
                                    {{ line.uom || '' }}
                                </template>
                            </td>
                            <td class="nowrap">
                                <ANum v-if="line.unitPrice != null">{{
                                    ils(line.unitPrice, 2)
                                }}</ANum>
                            </td>
                            <td class="nowrap">
                                <ANum>{{ ils(line.total, 2) }}</ANum>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div class="totals">
                    <div>
                        <span>{{ t('finance.preview.subtotal') }}</span
                        ><ANum>{{ ils(doc.subtotal ?? doc.amt, 2) }}</ANum>
                    </div>
                    <div v-if="doc.discount">
                        <span>{{ t('finance.preview.discount') }}</span
                        ><ANum>−{{ ils(doc.discount, 2) }}</ANum>
                    </div>
                    <div v-if="doc.points">
                        <span>{{ t('finance.preview.points') }}</span
                        ><ANum>−{{ ils(doc.points, 2) }}</ANum>
                    </div>
                    <div>
                        <span>{{ t('finance.preview.vat') }}</span
                        ><ANum>{{ ils(doc.vat ?? 0, 2) }}</ANum>
                    </div>
                    <div class="grand">
                        <span>{{ t('finance.preview.total') }}</span
                        ><ANum>{{ ils(doc.total ?? doc.amt, 2) }}</ANum>
                    </div>
                </div>
            </div>

            <FileViewerModal
                :open="viewing"
                :file="pdfFile"
                :url="pdfUrl"
                @close="viewing = false"
            />
        </template>
    </ADrawer>
</template>

<style scoped>
.a-dhead-h {
    margin: 0;
    font-size: 22px;
}

.top {
    margin-top: 18px;
}

.totals {
    margin-top: 14px;
    margin-inline-start: auto;
    max-width: 360px;
    display: grid;
    gap: 6px;
}

.totals > div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
}

.grand {
    padding-top: 8px;
    border-top: 1px solid var(--a-line);
    font-weight: 700;
    font-size: 16px;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
