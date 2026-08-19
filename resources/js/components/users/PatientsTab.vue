<script setup>
// The patient directory: every patient a practitioner treats.
//
// A patient is local-only data — no login, and always bound to exactly one
// practitioner. The filters answer what an agent arrives with: whose patient,
// in which city, carrying which safety flag, still active or not. All of them
// live in the URL, so a filtered directory can be pasted to a colleague.
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import AModal from '@/components/ui/AModal.vue';
import AMoney from '@/components/ui/AMoney.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { cityKey } from '@/components/users/address';
import { patientFields } from '@/components/users/personFields';
import SearchField from '@/components/users/SearchField.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { fmtISO } from '@/lib/dates';
import { usePeopleStore } from '@/stores/people';

/** Wide enough for the two-column field grid without the card scrolling. */
const NEW_WIDTH = 780;

const props = defineProps({
    /** The patient number whose profile is open, so its row stays marked. */
    selected: { type: String, default: '' },
});

const emit = defineEmits(['open']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const people = usePeopleStore();

const view = useUrlState({
    cq: '',
    cpr: '',
    ccity: '',
    csafe: '',
    cst: '',
});

const adding = ref(false);
const values = reactive({});
const prCode = ref('');

const createFields = computed(() => patientFields(t));

const all = computed(() => people.patients);

const countBy = (predicate) => all.value.filter(predicate).length;

const practitioners = computed(() => people.practitioners);

const cities = computed(() => {
    const seen = new Map();

    all.value.forEach((one) => {
        const key = cityKey(one.city);

        if (key && !seen.has(key)) {
            seen.set(key, one.city);
        }
    });

    return [...seen.entries()]
        .map(([key, city]) => ({ key, label: loc(city) }))
        .sort((a, b) => a.label.localeCompare(b.label));
});

const rows = computed(() =>
    all.value.filter((one) => {
        if (view.cpr && one.prCode !== view.cpr) {
            return false;
        }

        if (view.ccity && cityKey(one.city) !== view.ccity) {
            return false;
        }

        if (view.cst && one.status !== view.cst) {
            return false;
        }

        if (view.csafe === 'meds' && !one.meds.length) {
            return false;
        }

        if (view.csafe === 'preg' && !(one.preg || one.bf)) {
            return false;
        }

        if (view.csafe === 'allerg' && !one.allerg) {
            return false;
        }

        if (view.csafe === 'consent' && one.consent) {
            return false;
        }

        const query = view.cq.trim().toLowerCase();

        if (
            query &&
            !searchHaystack(
                one.code,
                one.name,
                one.tz,
                one.phone,
                one.prName,
                one.city,
            ).includes(query)
        ) {
            return false;
        }

        return true;
    }),
);

const dirty = computed(() =>
    Boolean(view.cq || view.cpr || view.ccity || view.csafe || view.cst),
);

function clear() {
    view.cq = '';
    view.cpr = '';
    view.ccity = '';
    view.csafe = '';
    view.cst = '';
}

const cols = computed(() => [
    {
        k: 'code',
        label: t('users.customers.col.code'),
        nowrap: true,
        sortable: true,
    },
    { k: 'name', label: t('users.customers.col.name'), sortable: true },
    { k: 'pr', label: t('users.customers.col.practitioner'), sortable: true },
    { k: 'city', label: t('users.customers.col.city'), nowrap: true },
    { k: 'safety', label: t('users.customers.col.safety') },
    {
        k: 'orders',
        label: t('users.customers.col.orders'),
        nowrap: true,
        sortable: true,
    },
    {
        k: 'spent',
        label: t('users.customers.col.spent'),
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.spent,
    },
    { k: 'last', label: t('users.customers.col.last'), nowrap: true },
    { k: 'status', label: t('users.customers.col.status'), nowrap: true },
]);

/** The safety flags shown on a row, as `{ tone, label }`. */
function flagsOf(patient) {
    const flags = [];

    if (patient.preg) {
        flags.push({ tone: 'amber', label: t('users.customers.flag.preg') });
    }

    if (patient.bf) {
        flags.push({ tone: 'amber', label: t('users.customers.flag.bf') });
    }

    if (patient.meds.length) {
        flags.push({
            tone: 'red',
            label: t('users.customers.flag.meds', { n: patient.meds.length }),
        });
    }

    if (patient.allerg) {
        flags.push({
            tone: 'purple',
            label: t('users.customers.flag.allerg', {
                what: loc(patient.allerg),
            }),
        });
    }

    return flags;
}

// ---- new patient ---------------------------------------------------------

const targetCard = computed(() => people.practitionerByCode(prCode.value));

const missing = computed(() =>
    createFields.value.filter(
        (field) => field.req && !String(values[field.k] ?? '').trim(),
    ),
);

const canCreate = computed(
    () => !missing.value.length && Boolean(prCode.value),
);

watch(
    () => adding.value,
    (open) => {
        if (open) {
            for (const key of Object.keys(values)) {
                delete values[key];
            }

            prCode.value = '';
        }
    },
);

function onInput(field, value) {
    values[field.k] =
        field.digits || field.numeric ? value.replace(/\D/g, '') : value;
}

function optionsOf(field) {
    if (field.allowEmpty) {
        return [{ value: '', label: '—' }, ...field.options];
    }

    return field.options;
}

function create() {
    if (!canCreate.value) {
        return;
    }

    const patient = people.createPatient({ ...values }, targetCard.value);

    adding.value = false;
    push({
        title: t('users.newCustomer.doneTitle'),
        body: t('users.newCustomer.doneBody', {
            code: patient.code,
            name: loc(targetCard.value.name),
        }),
    });
}
</script>

<template>
    <div>
        <FilterBar
            :count="rows.length"
            :label="t('users.customers.count', { n: all.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchField
                v-model="view.cq"
                :placeholder="t('users.customers.search')"
            />

            <ASelect
                v-model="view.cpr"
                :aria-label="t('users.customers.practitionerAria')"
            >
                <option value="">
                    {{ t('users.customers.allPractitioners') }}
                </option>
                <option
                    v-for="one in practitioners"
                    :key="one.code"
                    :value="one.code"
                >
                    {{
                        t('users.customers.option', {
                            label: loc(one.name),
                            n: countBy((row) => row.prCode === one.code),
                        })
                    }}
                </option>
            </ASelect>

            <ASelect
                v-model="view.ccity"
                :aria-label="t('users.customers.cityAria')"
            >
                <option value="">{{ t('users.customers.allCities') }}</option>
                <option
                    v-for="city in cities"
                    :key="city.key"
                    :value="city.key"
                >
                    {{
                        t('users.customers.option', {
                            label: city.label,
                            n: countBy((row) => cityKey(row.city) === city.key),
                        })
                    }}
                </option>
            </ASelect>

            <ASelect
                v-model="view.csafe"
                :aria-label="t('users.customers.safetyAria')"
            >
                <option value="">{{ t('users.customers.allSafety') }}</option>
                <option value="meds">
                    {{
                        t('users.customers.safetyMeds', {
                            n: countBy((row) => row.meds.length),
                        })
                    }}
                </option>
                <option value="preg">
                    {{
                        t('users.customers.safetyPreg', {
                            n: countBy((row) => row.preg || row.bf),
                        })
                    }}
                </option>
                <option value="allerg">
                    {{
                        t('users.customers.safetyAllerg', {
                            n: countBy((row) => row.allerg),
                        })
                    }}
                </option>
                <option value="consent">
                    {{
                        t('users.customers.safetyNoConsent', {
                            n: countBy((row) => !row.consent),
                        })
                    }}
                </option>
            </ASelect>

            <ASelect
                v-model="view.cst"
                :aria-label="t('users.customers.statusAria')"
            >
                <option value="">{{ t('users.customers.allStatuses') }}</option>
                <option value="active">
                    {{
                        t('users.customers.option', {
                            label: t('users.customers.active'),
                            n: countBy((row) => row.status === 'active'),
                        })
                    }}
                </option>
                <option value="inactive">
                    {{
                        t('users.customers.option', {
                            label: t('users.customers.inactive'),
                            n: countBy((row) => row.status !== 'active'),
                        })
                    }}
                </option>
            </ASelect>

            <AButton sm kind="p" icon="plus" @click="adding = true">
                {{ t('users.customers.add') }}
            </AButton>
        </FilterBar>

        <ADataTable
            :cols="cols"
            :rows="rows"
            row-key="code"
            :selected="props.selected || null"
            @row="(row) => emit('open', row.code)"
        >
            <template #cell-code="{ row }">
                <span class="t-strong"
                    ><ANum>{{ row.code }}</ANum></span
                >
            </template>
            <template #cell-name="{ row }">
                <div class="t-strong">{{ loc(row.name) }}</div>
                <div class="t-sub">
                    {{
                        t('users.customers.nameSub', {
                            tz: row.tz,
                            phone: row.phone,
                        })
                    }}
                </div>
            </template>
            <template #cell-pr="{ row }">
                <div>{{ loc(row.prName) }}</div>
                <div class="t-sub">
                    {{
                        t('users.customers.practitionerSub', {
                            code: row.prCode,
                            therapy: t(`therapy.${row.prTherapy}`),
                        })
                    }}
                </div>
            </template>
            <template #cell-city="{ row }">{{ loc(row.city) }}</template>
            <template #cell-safety="{ row }">
                <div class="u-flags">
                    <AChip
                        v-for="(flag, i) in flagsOf(row)"
                        :key="i"
                        :tone="flag.tone"
                        size="sm"
                    >
                        {{ flag.label }}
                    </AChip>
                    <span v-if="!flagsOf(row).length" class="u-muted">—</span>
                </div>
            </template>
            <template #cell-orders="{ row }">
                <ANum>{{ row.orders }}</ANum>
            </template>
            <template #cell-spent="{ row }">
                <AMoney :value="row.spent" />
            </template>
            <template #cell-last="{ row }">
                <ANum v-if="row.lastOrder">{{ fmtISO(row.lastOrder) }}</ANum>
                <span v-else class="u-muted">—</span>
            </template>
            <template #cell-status="{ row }">
                <AChip
                    v-if="row.status === 'active'"
                    tone="green"
                    size="sm"
                    :dot="false"
                >
                    {{ t('users.customers.active') }}
                </AChip>
                <span v-else class="u-muted">
                    {{ t('users.customers.inactive') }}
                </span>
            </template>
            <template #empty>
                <AEmpty
                    icon="users"
                    :title="t('users.customers.emptyTitle')"
                    :sub="t('users.customers.emptySub')"
                />
            </template>
        </ADataTable>

        <AModal
            :open="adding"
            :title="t('users.newCustomer.title')"
            :width="NEW_WIDTH"
            @close="adding = false"
        >
            <div class="a-note a-note--info u-note">
                {{ t('users.newCustomer.note') }}
            </div>

            <label class="a-lbl" for="np-pr">
                {{ t('users.newCustomer.practitioner') }}
                <span class="u-req">*</span>
            </label>
            <ASelect id="np-pr" v-model="prCode" class="a-w100">
                <option value="">{{ t('users.newCustomer.choose') }}</option>
                <option
                    v-for="one in practitioners"
                    :key="one.code"
                    :value="one.code"
                >
                    {{
                        t('users.newCustomer.option', {
                            code: one.code,
                            name: loc(one.name),
                            therapy: t(`therapy.${one.therapy}`),
                        })
                    }}
                </option>
            </ASelect>
            <div v-if="targetCard" class="a-hint u-hint">
                {{
                    t('users.newCustomer.practitionerHint', {
                        disc: targetCard.disc,
                        n: people.patientsOf(targetCard.code).length,
                    })
                }}
            </div>

            <div class="a-sect-t u-sect">
                {{ t('users.newCustomer.details') }}
            </div>
            <div class="u-grid">
                <div
                    v-for="field in createFields"
                    :key="field.k"
                    :class="{ 'u-full': field.full }"
                >
                    <label class="a-lbl" :for="`np-${field.k}`">
                        {{ field.label }}
                        <span v-if="field.req" class="u-req">*</span>
                    </label>
                    <ASelect
                        v-if="field.options"
                        :id="`np-${field.k}`"
                        :model-value="values[field.k] || ''"
                        class="a-w100"
                        :options="optionsOf(field)"
                        @update:model-value="values[field.k] = $event"
                    />
                    <AInput
                        v-else
                        :id="`np-${field.k}`"
                        :model-value="values[field.k] || ''"
                        class="a-w100"
                        :ltr="field.ltr"
                        :inputmode="
                            field.digits || field.numeric
                                ? 'numeric'
                                : undefined
                        "
                        @update:model-value="onInput(field, $event)"
                    />
                    <div v-if="field.hint" class="u-fhint">
                        {{ field.hint }}
                    </div>
                </div>
            </div>

            <div v-if="missing.length" class="u-missing">
                {{
                    t('users.newCustomer.missing', {
                        fields: missing.map((field) => field.label).join(' · '),
                    })
                }}
            </div>

            <template #footer>
                <AButton
                    kind="p"
                    icon="check"
                    :disabled="!canCreate"
                    @click="create"
                >
                    {{ t('users.newCustomer.create') }}
                </AButton>
                <AButton @click="adding = false">
                    {{ t('actions.cancel') }}
                </AButton>
            </template>
        </AModal>
    </div>
</template>

<style scoped>
.u-flags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.u-muted {
    color: var(--a-ink-4);
}

.u-note {
    margin-bottom: 18px;
}

.u-hint {
    margin-top: 6px;
}

.u-sect {
    margin-top: 22px;
}

.u-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.u-full {
    grid-column: 1 / -1;
}

.u-req {
    color: var(--a-red);
}

.u-fhint {
    margin-top: 5px;
    font-size: 13px;
    color: var(--a-ink-4);
}

.u-missing {
    margin-top: 14px;
    font-size: 14px;
    color: var(--a-red);
}
</style>
