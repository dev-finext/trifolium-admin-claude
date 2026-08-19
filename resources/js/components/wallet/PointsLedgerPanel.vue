<script setup>
// One practitioner's points ledger, and the only way a balance ever moves.
//
// The ledger is the source of truth: the card's balance changes only together
// with a row in here, which is what keeps the integrity check able to reconcile
// the two. A manual adjustment therefore needs a signed whole number, a written
// reason and the approval code — one point is one shekel, so this is money.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchField from '@/components/finance/SearchField.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { POINT_KIND_TONES } from '@/config/finance';
import { ils, num } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import { useMoneyStore } from '@/stores/money';

/** Narrow enough to read as a form rather than a screen. */
const WIDTH = 520;

const props = defineProps({
    practitioner: { type: Object, required: true },
    /** False on a read-only view of the same ledger. */
    canAdjust: { type: Boolean, default: false },
});

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const money = useMoneyStore();
const dataset = useDatasetStore();

const adjusting = ref(false);
const confirming = ref(false);
const amount = ref('');
const why = ref('');
const q = ref('');
const kind = ref('');

const rows = computed(() => money.pointsLedgerOf(props.practitioner.code));

const countOf = (id) => rows.value.filter((row) => row.kind === id).length;

const kindOptions = computed(() => [
    { value: '', label: t('wallet.filter.kindAll') },
    {
        value: 'earn',
        label: `${t('wallet.kind.earn')} (${num(countOf('earn'))})`,
    },
    {
        value: 'spend',
        label: `${t('wallet.kind.spend')} (${num(countOf('spend'))})`,
    },
]);

const shown = computed(() =>
    rows.value.filter((row) => {
        if (kind.value && row.kind !== kind.value) {
            return false;
        }

        const text = q.value.trim().toLowerCase();

        if (
            text &&
            !searchHaystack(row.order, row.when.stamp, row.reason).includes(
                text,
            )
        ) {
            return false;
        }

        return true;
    }),
);

const dirty = computed(() => Boolean(q.value) || Boolean(kind.value));

/** A signed whole number, and not zero — anything else is not an adjustment. */
const valid = computed(
    () =>
        /^-?\d+$/.test(amount.value.trim()) &&
        Number(amount.value.trim()) !== 0,
);
const delta = computed(() => (valid.value ? Number(amount.value.trim()) : 0));
const after = computed(() =>
    Math.max(0, props.practitioner.points + delta.value),
);
const ready = computed(() => valid.value && Boolean(why.value.trim()));

const cols = computed(() => [
    { k: 'when', label: t('labels.date'), nowrap: true },
    { k: 'kind', label: t('wallet.ledger.kind'), nowrap: true },
    { k: 'order', label: t('labels.order'), nowrap: true },
    { k: 'amt', label: t('wallet.ledger.points'), nowrap: true },
    { k: 'bal', label: t('wallet.ledger.running'), nowrap: true },
]);

const effects = computed(() => [
    t('wallet.adjust.effect1'),
    t('wallet.adjust.effect2'),
    t('wallet.adjust.effect3'),
]);

function close() {
    adjusting.value = false;
    confirming.value = false;
    amount.value = '';
    why.value = '';
}

function apply() {
    const result = money.adjustPoints({
        code: props.practitioner.code,
        amount: delta.value,
        reason: why.value.trim(),
    });

    close();

    if (!result) {
        return;
    }

    push({
        title: t('wallet.toast.adjusted'),
        body: t('wallet.toast.adjustedBody', {
            delta: result.delta > 0 ? `+${result.delta}` : String(result.delta),
            balance: num(result.balance),
        }),
    });
}
</script>

<template>
    <ACard
        :title="t('wallet.ledger.title', { name: loc(practitioner.name) })"
        icon="coin"
        :pad="false"
    >
        <template #right>
            <AChip tone="teal">
                {{ t('wallet.ledger.balance') }}
                <ANum>{{ num(practitioner.points) }}</ANum>
            </AChip>
            <AButton v-if="canAdjust" sm icon="edit" @click="adjusting = true">
                {{ t('wallet.adjust.action') }}
            </AButton>
            <span v-else class="f-readonly">
                {{ t('wallet.ledger.readOnly') }}
            </span>
        </template>

        <template v-if="rows.length">
            <div class="f-bar">
                <FilterBar
                    :count="shown.length"
                    :label="
                        t('wallet.noun.movements', { total: num(rows.length) })
                    "
                    :dirty="dirty"
                    @clear="
                        q = '';
                        kind = '';
                    "
                >
                    <SearchField
                        v-model="q"
                        :placeholder="t('wallet.filter.searchLedger')"
                        :width="240"
                    />
                    <ASelect v-model="kind" :options="kindOptions" />
                </FilterBar>
            </div>

            <ADataTable :cols="cols" :rows="shown" row-key="id">
                <template #empty>
                    <AEmpty
                        icon="coin"
                        :title="t('wallet.ledger.emptyFilterTitle')"
                        :sub="t('wallet.ledger.emptyFilterSub')"
                    />
                </template>

                <template #cell-when="{ row }">
                    <ANum>{{ row.when.stamp }}</ANum>
                </template>

                <template #cell-kind="{ row }">
                    <AChip
                        :tone="POINT_KIND_TONES[row.kind] || 'gray'"
                        size="sm"
                    >
                        {{ t(`wallet.kind.${row.kind}`) }}
                    </AChip>
                    <div v-if="row.manual" class="t-sub">
                        {{ t('wallet.ledger.manual')
                        }}<template v-if="row.by">
                            · {{ loc(row.by) }}</template
                        >
                    </div>
                    <div v-if="row.reason" class="t-sub">{{ row.reason }}</div>
                </template>

                <template #cell-order="{ row }">
                    <ANum v-if="row.order">{{ row.order }}</ANum>
                    <span v-else class="f-dash">—</span>
                </template>

                <template #cell-amt="{ row }">
                    <span class="f-pts" :class="{ 'is-out': row.amt < 0 }">
                        <ANum>
                            {{ row.amt > 0 ? '+' : '' }}{{ num(row.amt) }}
                        </ANum>
                    </span>
                </template>

                <template #cell-bal="{ row }">
                    <ANum>{{ num(row.bal) }}</ANum>
                </template>
            </ADataTable>
        </template>
        <AEmpty
            v-else
            icon="coin"
            :title="t('wallet.ledger.noMovesTitle')"
            :sub="t('wallet.ledger.noMovesSub')"
        />
    </ACard>

    <AModal
        :open="adjusting && !confirming"
        :title="t('wallet.adjust.title')"
        :width="WIDTH"
        @close="close"
    >
        <div class="a-note a-note--info f-note">
            {{ t('wallet.adjust.note') }}
        </div>

        <label class="a-lbl" for="w-adj-amt">
            {{ t('wallet.adjust.amountLabel') }}
        </label>
        <AInput
            id="w-adj-amt"
            v-model="amount"
            ltr
            class="a-w100"
            inputmode="numeric"
            :placeholder="t('wallet.adjust.amountPlaceholder')"
        />
        <div v-if="amount.trim() && !valid" class="a-inv">
            {{ t('wallet.adjust.invalid') }}
        </div>
        <div v-else-if="valid" class="a-hint">
            {{
                t('wallet.adjust.after', {
                    points: num(after),
                    value: ils(after, 0),
                })
            }}
        </div>

        <label class="a-lbl f-lbl" for="w-adj-why">
            {{ t('wallet.adjust.reasonLabel') }}
        </label>
        <ATextarea id="w-adj-why" v-model="why" :rows="3" />

        <template #footer>
            <AButton
                kind="p"
                icon="lock"
                :disabled="!ready"
                @click="confirming = true"
            >
                {{ t('wallet.adjust.continue') }}
            </AButton>
            <AButton @click="close">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>

    <ConfirmDialog
        :open="confirming"
        :title="t('wallet.adjust.confirmTitle')"
        :body="
            t('wallet.adjust.confirmBody', {
                verb:
                    delta > 0
                        ? t('wallet.adjust.credit')
                        : t('wallet.adjust.debit'),
                points: num(Math.abs(delta)),
                name: loc(practitioner.name),
                code: practitioner.code,
                from: num(practitioner.points),
                to: num(after),
            })
        "
        :effects="effects"
        :confirm-label="t('wallet.adjust.confirmAction')"
        :pin="dataset.session?.pin || true"
        @close="confirming = false"
        @confirm="apply"
    />
</template>

<style scoped>
.f-bar {
    padding: 14px 18px 0;
}

.f-readonly {
    font-size: 13px;
    color: var(--a-ink-4);
}

.f-pts {
    font-weight: 700;
    color: var(--a-accent);
}

.f-pts.is-out {
    color: var(--a-red);
}

.f-dash {
    color: var(--a-ink-4);
}

.f-note {
    margin-bottom: 16px;
}

.f-lbl {
    margin-top: 16px;
}
</style>
