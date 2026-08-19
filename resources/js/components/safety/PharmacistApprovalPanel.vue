<script setup>
// אישורי רוקח — the work queue behind the `interaction` exception.
//
// An unapproved interaction alert is an exception like any other: named,
// individually resolvable, and resolved by exactly one action — a pharmacist
// confirming they read the pair. Confirming here clears the flag on the order, so
// the bell and the nav badge follow.
//
// An order can carry the alert and still have nothing documented against it: the
// alert says the check has not been signed off, not that a hit exists. Both cases
// are shown, and both need the signature.
import { computed, ref } from 'vue';
import { I18nT, useI18n } from 'vue-i18n';

import SearchField from '@/components/safety/SearchField.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ANum from '@/components/ui/ANum.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterKpi from '@/components/ui/FilterKpi.vue';
import InteractionCard from '@/components/ui/InteractionCard.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { useDatasetStore } from '@/stores/dataset';
import { statusOf } from '@/stores/orders';
import { useSafetyStore } from '@/stores/safety';

const emit = defineEmits(['approved']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const store = useSafetyStore();
const dataset = useDatasetStore();

const view = useUrlState({ aq: '', astate: 'pending', order: '' });

/** The confirmation is a moment, not a view — it stays out of the URL. */
const ask = ref(false);

const base = computed(() =>
    view.astate === 'approved' ? store.approvedOrders : store.awaitingApproval,
);

const rows = computed(() =>
    base.value.filter((order) => {
        const term = view.aq.trim().toLowerCase();

        if (!term) {
            return true;
        }

        return searchHaystack(
            order.id,
            order.practitioner?.name,
            order.practitioner?.code,
            order.patient?.name,
        ).includes(term);
    }),
);

const cols = computed(() => {
    const list = [
        { k: 'id', label: t('safety.approvals.col.order'), sortable: true },
        {
            k: 'practitioner',
            label: t('safety.approvals.col.practitioner'),
            sortable: true,
            sortValue: (row) => row.practitioner?.name,
        },
        {
            k: 'patient',
            label: t('safety.approvals.col.customer'),
            sortValue: (row) => row.patient?.name,
        },
        { k: 'status', label: t('safety.approvals.col.status'), nowrap: true },
        {
            k: 'hits',
            label: t('safety.approvals.col.hits'),
            sortable: true,
            sortValue: (row) => store.interactionHits(row).length,
        },
    ];

    if (view.astate === 'approved') {
        list.push({
            k: 'approved',
            label: t('safety.approvals.col.approved'),
            nowrap: true,
        });
    }

    list.push({ k: 'act', label: '', w: '160px' });

    return list;
});

const selected = computed(
    () => dataset.orders.find((order) => order.id === view.order) || null,
);

const selectedHits = computed(() =>
    selected.value ? store.interactionHits(selected.value) : [],
);

const selectedMeds = computed(() => selected.value?.patient?.meds || []);

const selectedHerbs = computed(() =>
    selected.value ? store.herbsOnOrder(selected.value) : [],
);

const pending = computed(() =>
    Boolean(selected.value?.flags?.includes('interaction')),
);

const approval = computed(() =>
    selected.value ? store.approvalFor(selected.value.id) : null,
);

const dirty = computed(() => Boolean(view.aq || view.astate !== 'pending'));

function open(order) {
    view.order = order.id;
}

function clear() {
    view.aq = '';
    view.astate = 'pending';
}

async function approve(why) {
    const order = selected.value;

    ask.value = false;

    const record = await store.approveInteraction(order.id, why);

    if (record) {
        emit('approved', {
            order: order.id,
            by: loc(record.by) || '',
        });
    }
}
</script>

<template>
    <div class="a-grid a-appr">
        <div class="a-note a-note--info">{{ t('safety.approvals.note') }}</div>

        <div class="a-kpis">
            <FilterKpi
                icon="shield"
                :label="t('safety.approvals.pendingKpi')"
                :value="store.awaitingApproval.length"
                :active="view.astate === 'pending'"
                @click="view.astate = 'pending'"
            />
            <FilterKpi
                icon="check"
                :label="t('safety.approvals.approvedKpi')"
                :value="store.approvals.length"
                :active="view.astate === 'approved'"
                @click="view.astate = 'approved'"
            />
        </div>

        <FilterBar
            :count="rows.length"
            :label="t('safety.approvals.label')"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchField
                v-model="view.aq"
                :placeholder="t('safety.approvals.search')"
                :label="t('safety.approvals.searchAria')"
            />
        </FilterBar>

        <ADataTable
            :cols="cols"
            :rows="rows"
            row-key="id"
            :selected="view.order"
            @row="open"
        >
            <template #empty>
                <AEmpty
                    icon="shield"
                    :title="
                        view.astate === 'approved'
                            ? t('safety.approvals.empty.approvedTitle')
                            : t('safety.approvals.empty.pendingTitle')
                    "
                    :sub="
                        view.astate === 'approved'
                            ? t('safety.approvals.empty.approvedSub')
                            : t('safety.approvals.empty.pendingSub')
                    "
                />
            </template>

            <template #cell-id="{ row }">
                <div class="t-strong num">{{ row.id }}</div>
                <div class="t-sub num">{{ row.stamp }}</div>
            </template>

            <template #cell-practitioner="{ row }">
                <div class="t-strong">{{ loc(row.practitioner?.name) }}</div>
                <div class="t-sub num">{{ row.practitioner?.code }}</div>
            </template>

            <template #cell-patient="{ row }">
                {{ loc(row.patient?.name) }}
            </template>

            <template #cell-status="{ row }">
                <StatusChip :status="statusOf(row)" size="sm" />
            </template>

            <template #cell-hits="{ row }">
                <span v-if="!store.interactionHits(row).length" class="a-sub">
                    {{ t('safety.approvals.none') }}
                </span>
                <AChip v-else tone="amber" size="sm">
                    <ANum>{{ store.interactionHits(row).length }}</ANum>
                </AChip>
            </template>

            <template #cell-approved="{ row }">
                <div class="num">{{ store.approvalFor(row.id)?.when }}</div>
                <div class="t-sub">
                    {{ loc(store.approvalFor(row.id)?.by) }}
                </div>
            </template>

            <template #cell-act="{ row }">
                <div class="a-rowbtns" @click.stop>
                    <AButton sm icon="eye" @click="open(row)">
                        {{ t('safety.action.review') }}
                    </AButton>
                </div>
            </template>
        </ADataTable>
    </div>

    <ADrawer :open="Boolean(selected)" @close="view.order = ''">
        <template #header>
            <div class="a-appr-h">
                <I18nT
                    keypath="safety.approvals.review.title"
                    tag="strong"
                    scope="global"
                >
                    <template #order>
                        <ANum>{{ selected?.id }}</ANum>
                    </template>
                </I18nT>
                <StatusChip v-if="selected" :status="statusOf(selected)" />
                <AButton
                    v-if="pending"
                    class="a-push"
                    kind="p"
                    icon="check"
                    @click="ask = true"
                >
                    {{ t('safety.action.approve') }}
                </AButton>
            </div>
        </template>

        <div v-if="selected" class="a-grid">
            <AKeyValue
                :rows="[
                    [
                        t('safety.approvals.review.practitioner'),
                        loc(selected.practitioner?.name),
                    ],
                    [
                        t('safety.approvals.review.customer'),
                        loc(selected.patient?.name),
                    ],
                    [t('safety.approvals.review.placed'), selected.stamp],
                    [t('safety.approvals.review.declared'), ''],
                    [t('safety.approvals.review.herbs'), ''],
                ]"
            >
                <template #value-3>
                    <span v-if="!selectedMeds.length">
                        {{ t('labels.none') }}
                    </span>
                    <span v-else class="a-appr-chips">
                        <AChip
                            v-for="med in selectedMeds"
                            :key="med"
                            tone="blue"
                            size="sm"
                            :dot="false"
                        >
                            <span class="ltr">{{ med }}</span>
                        </AChip>
                    </span>
                </template>
                <template #value-4>
                    {{
                        selectedHerbs.map((herb) => loc(herb.name)).join(' · ')
                    }}
                </template>
            </AKeyValue>

            <div v-if="!selectedMeds.length" class="a-note a-note--ok">
                {{ t('safety.approvals.review.noMeds') }}
            </div>

            <div v-else-if="!selectedHits.length" class="a-note a-note--ok">
                {{
                    t('safety.approvals.review.clean', {
                        herbs: selectedHerbs.length,
                        meds: selectedMeds.length,
                    })
                }}
            </div>

            <div v-else class="a-grid a-appr-hits">
                <div class="a-lbl">
                    {{ t('safety.approvals.review.found') }}
                </div>
                <InteractionCard
                    v-for="hit in selectedHits"
                    :key="`${hit.id}-${hit.med}`"
                    :herb="loc(hit.herb?.name)"
                    :med="hit.med"
                    :drugs="hit.drugs"
                />
            </div>

            <AKeyValue
                v-if="approval"
                :rows="[
                    [t('safety.approvals.review.approvedBy'), loc(approval.by)],
                    [t('safety.approvals.review.approvedAt'), approval.when],
                    approval.why && [
                        t('safety.approvals.review.why'),
                        approval.why,
                    ],
                ]"
            />
        </div>
    </ADrawer>

    <ConfirmDialog
        :open="ask && pending"
        reason
        :title="t('safety.approvals.confirm.title')"
        :body="
            t('safety.approvals.confirm.body', { order: selected?.id || '' })
        "
        :confirm-label="t('safety.approvals.confirm.confirmLabel')"
        :effects="[
            t('safety.approvals.confirm.effect.flag'),
            t('safety.approvals.confirm.effect.order'),
            t('safety.approvals.confirm.effect.log'),
        ]"
        @close="ask = false"
        @confirm="approve"
    />
</template>

<style scoped>
.a-appr {
    margin-top: 20px;
}

.a-appr-h {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    width: 100%;
}

.a-appr-chips {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 6px;
}

.a-appr-hits {
    gap: 12px;
}

.a-sub {
    color: var(--a-ink-4);
}
</style>
