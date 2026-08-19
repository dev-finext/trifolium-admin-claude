<script setup>
// The supplier ledger — the businesses the pharmacy buys from.
//
// It sits behind a re-confirmation gate because a supplier card exposes bank
// details, trade terms and purchase prices, which are not part of the daily work
// of the support team. The gate stays open until the screen is left or it is
// locked again, and opening it is written to the system log.
//
// Every filter and the open supplier live in the query string, so a filtered
// view can be pasted to a colleague and opens the same way.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchField from '@/components/system/SearchField.vue';
import SupplierProfile from '@/components/system/SupplierProfile.vue';
import SupplierTable from '@/components/system/SupplierTable.vue';
import AButton from '@/components/ui/AButton.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { num } from '@/lib/money';
import { supplierDocsOk, useSystemStore } from '@/stores/system';

const emit = defineEmits(['ask']);

const { t } = useI18n();
const { searchHaystack } = useLocalized();
const { push } = useToast();
const system = useSystemStore();

const view = useUrlState({
    sq: '',
    kind: '',
    status: '',
    docs: '',
    supplier: '',
});

const term = computed(() => view.sq.trim().toLowerCase());

const kindOptions = computed(() => [
    { value: '', label: t('systemContacts.suppliers.filter.kindAll') },
    ...system.supplierKindIds.map((id) => ({
        value: id,
        label: `${t(`systemContacts.kind.${id}`)} (${num(
            system.suppliers.filter((supplier) => supplier.kind === id).length,
        )})`,
    })),
]);

const statusOptions = computed(() => [
    { value: '', label: t('systemContacts.suppliers.filter.statusAll') },
    { value: 'active', label: t('systemContacts.status.active') },
    { value: 'suspended', label: t('systemContacts.status.suspended') },
]);

const docsOptions = computed(() => [
    { value: '', label: t('systemContacts.suppliers.filter.docsAll') },
    { value: 'bad', label: t('systemContacts.suppliers.filter.docsBad') },
    { value: 'ok', label: t('systemContacts.suppliers.filter.docsOk') },
]);

const rows = computed(() =>
    system.suppliers.filter((supplier) => {
        if (view.kind && supplier.kind !== view.kind) {
            return false;
        }

        if (view.status && supplier.status !== view.status) {
            return false;
        }

        const ok = supplierDocsOk(supplier);

        if (view.docs === 'ok' && !ok) {
            return false;
        }

        if (view.docs === 'bad' && ok) {
            return false;
        }

        if (
            term.value &&
            !searchHaystack(
                supplier.code,
                supplier.name,
                supplier.contact,
                supplier.mobile,
                supplier.biz,
                supplier.city,
            ).includes(term.value)
        ) {
            return false;
        }

        return true;
    }),
);

const dirty = computed(() =>
    Boolean(view.sq || view.kind || view.status || view.docs),
);

const openSupplier = computed(
    () =>
        system.suppliers.find((supplier) => supplier.code === view.supplier) ||
        null,
);

function clear() {
    view.sq = '';
    view.kind = '';
    view.status = '';
    view.docs = '';
}

/**
 * The unlock runs through the parent's confirmation dialog: the expected code is
 * verified by the store, never held in this component.
 */
function askUnlock() {
    emit('ask', {
        title: t('systemContacts.suppliers.gate.confirmTitle'),
        body: t('systemContacts.suppliers.gate.confirmBody'),
        confirmLabel: t('systemContacts.suppliers.gate.confirm'),
        effects: [
            t('systemContacts.suppliers.gate.effect1'),
            t('systemContacts.suppliers.gate.effect2'),
            t('systemContacts.suppliers.gate.effect3'),
        ],
        pin: system.supplierGateCode,
        done: async (reason, code) => {
            const ok = await system.unlockSupplierCards(code);

            push(
                ok
                    ? { title: t('systemContacts.suppliers.toast.unlocked') }
                    : {
                          title: t('systemContacts.suppliers.gate.failed'),
                          bad: true,
                      },
            );
        },
    });
}

function lockCards() {
    system.lockSupplierCards();
    view.supplier = '';
    push({ title: t('systemContacts.suppliers.gate.locked') });
}
</script>

<template>
    <div>
        <div v-if="!system.supplierCardsUnlocked" class="a-card st-gate">
            <div class="st-gate-icon"><AIcon name="lock" :size="26" /></div>
            <h3 class="st-gate-title">
                {{ t('systemContacts.suppliers.gate.title') }}
            </h3>
            <p class="st-gate-why">
                {{ t('systemContacts.suppliers.gate.why') }}
            </p>
            <AButton kind="p" icon="lock" @click="askUnlock">
                {{ t('systemContacts.suppliers.gate.unlock') }}
            </AButton>
            <div class="st-gate-scope">
                {{ t('systemContacts.suppliers.gate.scope') }}
            </div>
        </div>

        <template v-else>
            <div class="a-note a-note--info st-open">
                <span>{{ t('systemContacts.suppliers.gate.openNote') }}</span>
                <AButton sm icon="lock" @click="lockCards">
                    {{ t('systemContacts.suppliers.gate.lockAgain') }}
                </AButton>
            </div>

            <FilterBar
                :count="rows.length"
                :label="t('systemContacts.suppliers.countLabel')"
                :dirty="dirty"
                @clear="clear"
            >
                <SearchField
                    v-model="view.sq"
                    :placeholder="t('systemContacts.suppliers.filter.search')"
                    :label="t('systemContacts.suppliers.filter.searchLabel')"
                    :width="320"
                />
                <ASelect
                    v-model="view.kind"
                    :options="kindOptions"
                    :aria-label="t('systemContacts.suppliers.filter.kind')"
                />
                <ASelect
                    v-model="view.status"
                    :options="statusOptions"
                    :aria-label="t('systemContacts.suppliers.filter.status')"
                />
                <ASelect
                    v-model="view.docs"
                    :options="docsOptions"
                    :aria-label="t('systemContacts.suppliers.filter.docs')"
                />
            </FilterBar>

            <SupplierTable
                :rows="rows"
                :selected="view.supplier"
                @open="view.supplier = $event.code"
            />

            <ADrawer
                :open="Boolean(openSupplier)"
                full
                @close="view.supplier = ''"
            >
                <SupplierProfile
                    v-if="openSupplier"
                    :key="view.supplier"
                    :supplier="openSupplier"
                    @close="view.supplier = ''"
                />
            </ADrawer>
        </template>
    </div>
</template>

<style scoped>
.st-gate {
    display: grid;
    justify-items: center;
    gap: 10px;
    text-align: center;
    padding: 54px 24px;
    margin-top: 18px;
}

.st-gate-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--a-tint);
    color: var(--a-accent-2);
}

.st-gate-title {
    font-size: 19px;
    font-weight: 700;
}

.st-gate-why {
    max-width: 560px;
    color: var(--a-ink-3);
    line-height: 1.65;
}

.st-gate-scope {
    font-size: 13px;
    color: var(--a-ink-4);
}

.st-open {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin: 18px 0 0;
}
</style>
