<script setup>
// One practitioner's points wallet, and the only way its balance ever moves.
//
// The ledger is the single source of truth: the card's balance changes only
// together with a row in here, which is what keeps the two reconciling. A manual
// adjustment is money — one point is one shekel — so it needs a signed whole
// number, a written reason and the approval code, and it is written to the log.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

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
import SearchField from '@/components/users/SearchField.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { ils, num } from '@/lib/money';
import { useDatasetStore } from '@/stores/dataset';
import { usePeopleStore } from '@/stores/people';

/** Narrow enough to read as a form rather than a screen. */
const WIDTH = 520;

const props = defineProps({
    practitioner: { type: Object, required: true },
});

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const people = usePeopleStore();
const dataset = useDatasetStore();

const adjusting = ref(false);
const confirming = ref(false);
const amount = ref('');
const reason = ref('');
const q = ref('');
const kind = ref('');

const rows = computed(() => people.ledgerFor(props.practitioner.code));

const countOf = (id) => rows.value.filter((row) => row.kind === id).length;

const shown = computed(() =>
    rows.value.filter((row) => {
        if (kind.value && row.kind !== kind.value) {
            return false;
        }

        const query = q.value.trim().toLowerCase();

        if (
            query &&
            !searchHaystack(
                row.order,
                row.when.stamp,
                row.reason,
                row.actor,
            ).includes(query)
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
const ready = computed(() => valid.value && Boolean(reason.value.trim()));

const cols = computed(() => [
    { k: 'when', label: t('users.points.col.when'), nowrap: true },
    { k: 'kind', label: t('users.points.col.kind'), nowrap: true },
    { k: 'src', label: t('users.points.col.src') },
    { k: 'order', label: t('users.points.col.order'), nowrap: true },
    { k: 'amt', label: t('users.points.col.amt'), nowrap: true },
    { k: 'bal', label: t('users.points.col.bal'), nowrap: true },
]);

const effects = computed(() => [
    t('users.points.effect.immutable'),
    t('users.points.effect.worth'),
    t('users.points.effect.log'),
]);

function sourceOf(row) {
    if (row.manual) {
        return t('users.points.srcManual', {
            actor: loc(row.actor),
            reason: row.reason,
        });
    }

    return row.kind === 'earn'
        ? t('users.points.srcEarn')
        : t('users.points.srcSpend');
}

function close() {
    adjusting.value = false;
    confirming.value = false;
    amount.value = '';
    reason.value = '';
}

function apply() {
    const change = delta.value;
    const balance = people.creditPoints(
        props.practitioner,
        change,
        reason.value.trim(),
    );

    close();
    push({
        title: t('users.points.doneTitle'),
        body: t('users.points.doneBody', {
            delta: change > 0 ? `+${num(change)}` : num(change),
            balance: num(balance),
        }),
    });
}
</script>

<template>
    <ACard
        :title="t('users.points.title', { name: loc(practitioner.name) })"
        icon="coin"
        :pad="false"
    >
        <template #right>
            <AChip tone="teal">
                {{ t('users.points.balance', { n: num(practitioner.points) }) }}
            </AChip>
            <AButton sm icon="edit" @click="adjusting = true">
                {{ t('users.points.adjust') }}
            </AButton>
        </template>

        <template v-if="rows.length">
            <div class="u-bar">
                <FilterBar
                    :count="shown.length"
                    :label="t('users.points.count', { n: rows.length })"
                    :dirty="dirty"
                    @clear="
                        q = '';
                        kind = '';
                    "
                >
                    <SearchField
                        v-model="q"
                        :placeholder="t('users.points.search')"
                    />
                    <ASelect
                        v-model="kind"
                        :aria-label="t('users.points.kindAria')"
                    >
                        <option value="">
                            {{ t('users.points.allKinds') }}
                        </option>
                        <option value="earn">
                            {{
                                t('users.points.option', {
                                    label: t('users.points.earn'),
                                    n: countOf('earn'),
                                })
                            }}
                        </option>
                        <option value="spend">
                            {{
                                t('users.points.option', {
                                    label: t('users.points.spend'),
                                    n: countOf('spend'),
                                })
                            }}
                        </option>
                    </ASelect>
                </FilterBar>
            </div>

            <ADataTable :cols="cols" :rows="shown" row-key="id">
                <template #empty>
                    <AEmpty
                        icon="coin"
                        :title="t('users.points.noMatchTitle')"
                        :sub="t('users.points.noMatchSub')"
                    />
                </template>

                <template #cell-when="{ row }">
                    <ANum>{{ row.when.stamp }}</ANum>
                </template>

                <template #cell-kind="{ row }">
                    <AChip
                        :tone="row.kind === 'earn' ? 'green' : 'purple'"
                        size="sm"
                    >
                        {{
                            row.kind === 'earn'
                                ? t('users.points.earn')
                                : t('users.points.spend')
                        }}
                    </AChip>
                </template>

                <template #cell-src="{ row }">
                    {{ sourceOf(row) }}
                </template>

                <template #cell-order="{ row }">
                    <ANum v-if="row.order">{{ row.order }}</ANum>
                    <span v-else class="u-dash">—</span>
                </template>

                <template #cell-amt="{ row }">
                    <span class="u-pts" :class="{ 'is-out': row.amt < 0 }">
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
        <AEmpty v-else icon="coin" :title="t('users.points.emptyTitle')" />
    </ACard>

    <AModal
        :open="adjusting && !confirming"
        :title="t('users.points.adjustTitle')"
        :width="WIDTH"
        @close="close"
    >
        <div class="a-note a-note--info u-note">
            {{ t('users.points.adjustNote') }}
        </div>

        <label class="a-lbl" for="u-adj-amt">
            {{ t('users.points.amountLabel') }}
        </label>
        <AInput
            id="u-adj-amt"
            v-model="amount"
            ltr
            class="a-w100"
            inputmode="numeric"
            :placeholder="t('users.points.amountPlaceholder')"
        />
        <div v-if="amount.trim() && !valid" class="a-inv">
            {{ t('users.points.amountError') }}
        </div>
        <div v-else-if="valid" class="a-hint">
            {{
                t('users.points.afterBalance', {
                    n: num(after),
                    amount: ils(after, 0),
                })
            }}
        </div>

        <label class="a-lbl u-lbl" for="u-adj-why">
            {{ t('users.points.reasonLabel') }}
        </label>
        <ATextarea id="u-adj-why" v-model="reason" :rows="3" class="a-w100" />

        <template #footer>
            <AButton
                kind="p"
                icon="lock"
                :disabled="!ready"
                @click="confirming = true"
            >
                {{ t('users.points.continue') }}
            </AButton>
            <AButton @click="close">{{ t('actions.cancel') }}</AButton>
        </template>
    </AModal>

    <ConfirmDialog
        :open="confirming"
        :title="t('users.points.confirmTitle')"
        :body="
            t(
                delta > 0
                    ? 'users.points.confirmCredit'
                    : 'users.points.confirmDebit',
                {
                    n: num(Math.abs(delta)),
                    name: loc(practitioner.name),
                    code: practitioner.code,
                    from: num(practitioner.points),
                    to: num(after),
                },
            )
        "
        :effects="effects"
        :confirm-label="t('users.points.confirmLabel')"
        :pin="dataset.session?.pin || true"
        @close="confirming = false"
        @confirm="apply"
    />
</template>

<style scoped>
.u-bar {
    padding: 14px 18px 0;
}

.u-pts {
    font-weight: 700;
    color: var(--a-accent);
}

.u-pts.is-out {
    color: var(--a-red);
}

.u-dash {
    color: var(--a-ink-4);
}

.u-note {
    margin-bottom: 16px;
}

.u-lbl {
    margin-top: 16px;
}
</style>
