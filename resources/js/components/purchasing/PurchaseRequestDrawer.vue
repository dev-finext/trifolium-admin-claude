<script setup>
// V3 — one purchase request, and the two things that can happen to it.
//
// The note describes the output as "מייל /אקסל עם נוסח מובנה של הערות שאני רוצה
// ... ומשם אני שולחת את המייל לספק ישירות". The console does not own the
// pharmacy's mailbox, so it prepares the letter and hands it over: the text to
// copy or open in the mail client, and the same lines as a file. Marking the
// request sent is a separate, deliberate act — the console records what the
// buyer did, it does not claim to have sent anything itself.
//
// When the supplier agrees, the request becomes a purchase order. That is the
// only point at which the quantity starts counting as stock on its way.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ANum from '@/components/ui/ANum.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { PURCHASE_REQUEST_STATE } from '@/config';
import { downloadCsv } from '@/lib/csv';
import { ils, num } from '@/lib/money';
import { usePlanningStore } from '@/stores/planning';

const props = defineProps({
    /** The request, or null while the drawer is closed. */
    request: { type: Object, default: null },
});

const emit = defineEmits(['close', 'open-po']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const store = usePlanningStore();

const busy = ref(false);
const asking = ref('');

const value = computed(() =>
    (props.request?.lines || []).reduce(
        (sum, line) => sum + (Number(line.price) || 0) * Number(line.qty),
        0,
    ),
);

const cols = computed(() => [
    { k: 'sku', label: t('planning.request.col.sku'), nowrap: true },
    { k: 'name', label: t('planning.request.col.item') },
    { k: 'qty', label: t('planning.request.col.qty'), nowrap: true },
    { k: 'price', label: t('planning.request.col.price'), nowrap: true },
]);

/** The letter, as it would be written. */
const letter = computed(() => {
    const request = props.request;

    if (!request) {
        return '';
    }

    const lines = request.lines.map(
        (line) =>
            `• ${loc(line.name)} (${line.sku}) — ${num(line.qty, 3)} ${t(
                `inventory.unit.${line.unit}`,
            )}`,
    );

    return [
        request.supplier
            ? t('planning.request.mail.greeting', {
                  name: loc(request.supplier),
              })
            : t('planning.request.mail.greetingPlain'),
        '',
        t('planning.request.mail.intro', { number: request.number }),
        '',
        ...lines,
        '',
        request.note || '',
        t('planning.request.mail.sign'),
    ]
        .filter((part) => part !== null && part !== undefined)
        .join('\n');
});

async function copyLetter() {
    try {
        await navigator.clipboard.writeText(letter.value);
        push({ title: t('planning.request.copied') });
    } catch {
        push({ title: t('planning.request.copyFailed'), bad: true });
    }
}

function exportLines() {
    const request = props.request;
    const file = `purchase-request-${request.number}.csv`;
    const n = downloadCsv(
        file,
        [
            t('planning.request.col.sku'),
            t('planning.request.col.item'),
            t('planning.request.col.qty'),
            t('planning.request.col.unit'),
            t('planning.request.col.remark'),
        ],
        request.lines.map((line) => [
            line.sku,
            loc(line.name),
            line.qty,
            t(`inventory.unit.${line.unit}`),
            line.remark || '',
        ]),
    );

    push({ title: t('planning.request.exported', { n }), body: file });
}

function markSent() {
    store.sendRequest(props.request.id);
    push({ title: t('planning.request.markedSent') });
}

async function toOrder() {
    asking.value = '';
    busy.value = true;

    try {
        const po = await store.orderFromRequest(props.request.id);

        if (po) {
            push({ title: t('planning.request.ordered', { id: po.id }) });
            emit('open-po', po.id);
        }
    } finally {
        busy.value = false;
    }
}

function cancel() {
    asking.value = '';
    store.cancelRequest(props.request.id);
    push({ title: t('planning.request.cancelled'), bad: true });
}
</script>

<template>
    <ADrawer :open="Boolean(request)" @close="emit('close')">
        <template v-if="request">
            <div class="a-dhead a-dhead--line">
                <div class="a-dhead-top">
                    <div>
                        <div class="a-dhead-t">
                            <h2 class="a-dhead-h">
                                {{ t('planning.request.one') }}
                                <span class="num">{{ request.number }}</span>
                            </h2>
                            <AChip
                                :tone="
                                    PURCHASE_REQUEST_STATE[request.state]?.tone
                                "
                                size="lg"
                            >
                                {{
                                    t(`planning.requestState.${request.state}`)
                                }}
                            </AChip>
                        </div>
                        <div class="a-dhead-m">
                            <span>{{ loc(request.supplier) }}</span>
                            <span>
                                {{
                                    t('planning.request.lineCount', {
                                        n: request.lines.length,
                                    })
                                }}
                            </span>
                            <span v-if="value"
                                ><ANum>{{ ils(value, 0) }}</ANum></span
                            >
                        </div>
                    </div>
                    <div class="a-dhead-a">
                        <AButton sm icon="x" @click="emit('close')">
                            {{ t('ui.close') }}
                        </AButton>
                    </div>
                </div>
            </div>

            <div class="body">
                <AKeyValue
                    :rows="[
                        [t('planning.request.raisedOn'), request.raised?.stamp],
                        [t('planning.request.sentOn'), request.sent?.stamp],
                        [t('planning.request.by'), loc(request.by)],
                        [t('planning.request.order'), request.order],
                    ]"
                >
                    <template #value-3>
                        <button
                            v-if="request.order"
                            type="button"
                            class="a-linkbtn"
                            @click="emit('open-po', request.order)"
                        >
                            <ANum>{{ request.order }}</ANum>
                        </button>
                        <span v-else class="t-sub">—</span>
                    </template>
                </AKeyValue>

                <section>
                    <div class="a-sect-t">
                        {{ t('planning.request.lines') }}
                    </div>
                    <ADataTable
                        :cols="cols"
                        :rows="request.lines"
                        row-key="sku"
                    >
                        <template #cell-sku="{ row }">
                            <span class="a-code a-tag">{{ row.sku }}</span>
                        </template>
                        <template #cell-name="{ row }">{{
                            loc(row.name)
                        }}</template>
                        <template #cell-qty="{ row }">
                            <ANum>{{ num(row.qty, 3) }}</ANum>
                            {{ t(`inventory.unit.${row.unit}`) }}
                        </template>
                        <template #cell-price="{ row }">
                            <ANum v-if="row.price">{{
                                ils(row.price, 2)
                            }}</ANum>
                            <span v-else class="t-sub">—</span>
                        </template>
                    </ADataTable>
                </section>

                <section>
                    <div class="a-sect-t">
                        {{ t('planning.request.mailTitle') }}
                    </div>
                    <p class="a-hint">{{ t('planning.request.mailHint') }}</p>
                    <pre class="pr-letter">{{ letter }}</pre>
                    <div class="pr-acts">
                        <AButton sm icon="copy" @click="copyLetter">
                            {{ t('planning.request.copy') }}
                        </AButton>
                        <AButton sm icon="download" @click="exportLines">
                            {{ t('planning.request.export') }}
                        </AButton>
                    </div>
                </section>

                <section class="pr-foot">
                    <AButton
                        v-if="request.state === 'draft'"
                        kind="p"
                        icon="send"
                        @click="markSent"
                    >
                        {{ t('planning.request.markSent') }}
                    </AButton>
                    <AButton
                        v-if="['draft', 'sent'].includes(request.state)"
                        kind="p"
                        icon="check"
                        :disabled="busy"
                        @click="asking = 'order'"
                    >
                        {{ t('planning.request.toOrder') }}
                    </AButton>
                    <AButton
                        v-if="request.state !== 'ordered'"
                        icon="x"
                        @click="asking = 'cancel'"
                    >
                        {{ t('planning.request.cancel') }}
                    </AButton>
                </section>
            </div>

            <ConfirmDialog
                :open="asking === 'order'"
                :title="t('planning.request.toOrderTitle')"
                :body="
                    t('planning.request.toOrderBody', {
                        n: request.lines.length,
                    })
                "
                :confirm-label="t('planning.request.toOrder')"
                @confirm="toOrder"
                @close="asking = ''"
            />
            <ConfirmDialog
                :open="asking === 'cancel'"
                danger
                :title="t('planning.request.cancelTitle')"
                :body="t('planning.request.cancelBody')"
                :confirm-label="t('planning.request.cancel')"
                @confirm="cancel"
                @close="asking = ''"
            />
        </template>
    </ADrawer>
</template>

<style scoped>
.a-dhead-h {
    margin: 0;
    font-size: 24px;
}

.body {
    display: grid;
    gap: 18px;
}

.pr-letter {
    margin: 8px 0 10px;
    padding: 14px 16px;
    background: var(--a-sunk);
    border: 1px solid var(--a-line);
    border-radius: 8px;
    font-family: inherit;
    font-size: 13.5px;
    line-height: 1.6;
    white-space: pre-wrap;
    max-height: 260px;
    overflow: auto;
}

.pr-acts,
.pr-foot {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
