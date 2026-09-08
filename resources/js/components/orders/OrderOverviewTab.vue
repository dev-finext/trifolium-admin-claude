<script setup>
// The overview tab: who ordered, who it is for, the price exactly as the
// practitioner sees it, and where the loyalty points stand.
//
// The discount percentages on the price rows are derived from the amounts the
// order actually holds — no rate is retyped here.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import PayerChip from '@/components/ui/PayerChip.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { SETTINGS } from '@/config';
import { pct } from '@/lib/money';

/** The rate the order's own VAT figure was calculated at. */
const VAT_PCT = SETTINGS.vatRate * 100;

const props = defineProps({
    order: { type: Object, required: true },
});

const { t } = useI18n();
const { loc } = useLocalized();
const router = useRouter();

const pricing = computed(() => props.order.pricing);

const saved = computed(
    () =>
        pricing.value.baseDisc +
        pricing.value.shelfDisc +
        pricing.value.patientDisc,
);

/** A discount's rate, recovered from the amounts on the order itself. */
function rate(part, base) {
    return base > 0 ? Math.round((part / base) * 100) : 0;
}

const priceRows = computed(() => {
    const p = pricing.value;
    const rows = [
        { key: 'list', label: t('orders.price.list'), amount: p.base },
        {
            key: 'base_disc',
            label: t('orders.price.baseDiscount', {
                pct: pct(props.order.discPct),
            }),
            note: t('orders.price.baseDiscountNote'),
            amount: p.baseDisc,
            neg: true,
        },
    ];

    if (p.shelfDisc > 0) {
        rows.push({
            key: 'shelf_disc',
            label: t('orders.price.shelfDiscount', {
                pct: pct(rate(p.shelfDisc, p.base)),
            }),
            note: t('orders.price.shelfDiscountNote'),
            amount: p.shelfDisc,
            neg: true,
        });
    }

    if (p.promo) {
        rows.push({
            key: 'promo',
            label: t('orders.price.promo'),
            note: t('orders.price.promoNote'),
            amount: 0,
            free: true,
        });
    }

    if (p.patientDisc > 0) {
        rows.push({
            key: 'patient_disc',
            label: t('orders.price.customerDiscount', {
                pct: pct(rate(p.patientDisc, p.base - p.baseDisc)),
            }),
            note: t('orders.price.customerDiscountNote'),
            amount: p.patientDisc,
            neg: true,
        });
    }

    if (p.pointsUsed > 0) {
        rows.push({
            key: 'points',
            label: t('orders.price.pointsRedeemed'),
            note: t('orders.price.pointsRedeemedNote', { n: p.pointsUsed }),
            amount: p.pointsUsed,
            neg: true,
        });
    }

    if (p.compFee > 0) {
        rows.push({
            key: 'comp_fee',
            label: t('orders.price.compoundingFee'),
            amount: p.compFee,
        });
    }

    rows.push({
        key: 'shipping',
        label: t(`fulfilment.${props.order.deliveryType}`),
        amount: p.shipFee,
        free: p.shipFee === 0,
    });
    rows.push({
        key: 'vat',
        label: t('orders.price.vat', { pct: pct(VAT_PCT) }),
        amount: p.vat,
    });
    rows.push({
        key: 'total',
        label: t('orders.price.total'),
        amount: p.total,
        strong: true,
    });

    return rows;
});

const practitionerRows = computed(() => {
    const person = props.order.practitioner;

    return [
        [t('orders.field.name'), loc(person.name)],
        [t('orders.field.customerNumber'), person.code],
        [
            t('orders.field.therapy'),
            `${t(`therapy.${person.therapy}`)} · ${loc(person.spec)}`,
        ],
        [
            t('orders.field.clinic'),
            person.clinic ? loc(person.clinic) : t('orders.value.noClinic'),
        ],
        [t('orders.field.phone'), person.phone],
        [t('orders.field.email'), person.email],
    ];
});

const patient = computed(() => props.order.patient);

function openPractitioner() {
    router.push({
        name: 'users',
        query: {
            tab: 'directory',
            practitioner: props.order.practitioner.code,
        },
    });
}
</script>

<template>
    <div class="a-grid">
        <div class="a-2col">
            <ACard :title="t('orders.overview.practitioner')" icon="user">
                <template #right>
                    <AButton sm icon="external" @click="openPractitioner">
                        {{ t('orders.detail.practitionerCard') }}
                    </AButton>
                </template>
                <AKeyValue :rows="practitionerRows">
                    <template #value-1="{ row }">
                        <ANum>{{ row[1] }}</ANum>
                    </template>
                    <template #value-4="{ row }">
                        <ANum>{{ row[1] }}</ANum>
                    </template>
                    <template #value-5="{ row }">
                        <span class="ltr">{{ row[1] }}</span>
                    </template>
                    <dt>{{ t('orders.field.points') }}</dt>
                    <dd>
                        {{
                            t('orders.value.pointsWithValue', {
                                n: order.practitioner.points,
                            })
                        }}
                        · <AMoney :value="order.practitioner.points" />
                    </dd>
                    <dt>{{ t('orders.field.payTrack') }}</dt>
                    <dd>
                        <AChip
                            v-if="order.practitioner.credit"
                            tone="purple"
                            size="sm"
                            :dot="false"
                        >
                            {{ t('orders.value.creditApprovedChip') }}
                        </AChip>
                        <template v-else>
                            {{ t('orders.value.immediatePayment') }}
                        </template>
                    </dd>
                    <dt>{{ t('orders.field.openDebt') }}</dt>
                    <dd>
                        <span
                            v-if="order.practitioner.debt"
                            class="a-debt-open"
                        >
                            <AMoney :value="order.practitioner.debt" />
                        </span>
                        <template v-else>
                            {{ t('orders.value.none') }}
                        </template>
                    </dd>
                    <template v-if="order.practitioner.specialTerms">
                        <dt>
                            {{ t('orders.overview.specialTerms') }}
                            <V2Badge id="order-flags" size="sm" />
                        </dt>
                        <dd class="a-special">
                            {{ loc(order.practitioner.specialTerms) }}
                        </dd>
                    </template>
                </AKeyValue>
            </ACard>

            <ACard :title="t('orders.overview.customer')" icon="users">
                <AKeyValue
                    :rows="[
                        [t('orders.field.name'), loc(patient.name)],
                        [t('orders.field.tz'), patient.tz],
                        [t('orders.field.phone'), patient.phone],
                        [
                            t('orders.field.ageSex'),
                            t('orders.value.ageSex', {
                                age: patient.age,
                                sex: t(`orders.sex.${patient.sex}`),
                            }),
                        ],
                    ]"
                >
                    <template #value-1="{ row }">
                        <ANum>{{ row[1] }}</ANum>
                    </template>
                    <template #value-2="{ row }">
                        <ANum>{{ row[1] }}</ANum>
                    </template>
                    <dt>{{ t('orders.field.pregnancy') }}</dt>
                    <dd>
                        <AChip v-if="patient.preg" tone="amber" size="sm">
                            {{ t('orders.value.pregnant') }}
                        </AChip>
                        <AChip v-else-if="patient.bf" tone="amber" size="sm">
                            {{ t('orders.value.breastfeeding') }}
                        </AChip>
                        <template v-else>
                            {{ t('orders.value.noPregnancy') }}
                        </template>
                    </dd>
                    <dt>{{ t('orders.field.meds') }}</dt>
                    <dd>
                        <span v-if="patient.meds.length" class="a-chipwrap">
                            <AChip
                                v-for="med in patient.meds"
                                :key="med"
                                tone="blue"
                                size="sm"
                                :dot="false"
                            >
                                <span class="ltr">{{ med }}</span>
                            </AChip>
                        </span>
                        <template v-else>
                            {{ t('orders.value.noMeds') }}
                        </template>
                    </dd>
                </AKeyValue>
                <div class="a-note a-note--info a-overview-note">
                    {{ t('orders.overview.customerDataNote') }}
                </div>
            </ACard>
        </div>

        <ACard :title="t('orders.overview.price')" icon="card">
            <template #right>
                <PayerChip :payer="order.payer" />
            </template>
            <div
                v-for="row in priceRows"
                :key="row.key"
                class="a-price-row"
                :class="{ 'is-strong': row.strong }"
            >
                <span class="a-price-l">{{ row.label }}</span>
                <span v-if="row.note" class="a-price-n">{{ row.note }}</span>
                <span class="a-push a-price-v" :class="{ 'is-neg': row.neg }">
                    <span v-if="row.free" class="a-price-free">
                        {{ t('orders.price.free') }}
                    </span>
                    <template v-else>
                        <span v-if="row.neg">−</span>
                        <AMoney
                            :value="Math.abs(row.amount)"
                            :big="row.strong"
                        />
                    </template>
                </span>
            </div>
            <div v-if="saved > 0" class="a-note a-note--ok a-overview-note">
                {{ t('orders.price.saved') }}<AMoney :value="saved" />
            </div>
        </ACard>

        <ACard :title="t('orders.overview.points')" icon="coin">
            <div class="a-points">
                <div>
                    <div class="a-stat">
                        {{ t('orders.overview.pointsUsed') }}
                    </div>
                    <div class="a-stat-v">
                        <ANum>{{ pricing.pointsUsed }}</ANum>
                        <span class="a-points-u">
                            {{ t('orders.overview.pointsUnit') }}
                        </span>
                    </div>
                </div>
                <div>
                    <div class="a-stat">
                        {{ t('orders.overview.pointsEarn') }}
                    </div>
                    <div class="a-stat-v a-points-earn">
                        +<ANum>{{ pricing.pointsEarn }}</ANum>
                        <span class="a-points-u">
                            {{ t('orders.overview.pointsUnit') }}
                        </span>
                    </div>
                </div>
                <div>
                    <div class="a-stat">
                        {{ t('orders.overview.pointsBalance') }}
                    </div>
                    <div class="a-stat-v">
                        <ANum>{{ order.practitioner.points }}</ANum>
                    </div>
                </div>
            </div>
        </ACard>
    </div>
</template>

<style scoped>
.a-special {
    color: var(--a-amber);
    font-weight: 600;
}

.a-debt-open {
    color: var(--a-red);
    font-weight: 600;
}

.a-overview-note {
    margin-top: 16px;
}

.a-price-row {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 7px 0;
}

.a-price-row.is-strong {
    margin-top: 8px;
    padding: 14px 0 0;
    border-top: 2px solid var(--a-line-2);
}

.a-price-l {
    font-weight: 500;
    font-size: 15px;
}

.a-price-row.is-strong .a-price-l {
    font-weight: 700;
    font-size: 17px;
}

.a-price-n {
    font-size: 13px;
    color: var(--a-ink-4);
}

.a-price-v {
    font-weight: 600;
}

.a-price-v.is-neg,
.a-price-free {
    color: var(--a-accent);
}

.a-points {
    display: flex;
    flex-wrap: wrap;
    gap: 40px;
}

.a-points-u {
    font-size: 15px;
    font-weight: 500;
}

.a-points-earn {
    color: var(--a-accent);
}
</style>
