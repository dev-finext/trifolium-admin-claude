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
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import SearchField from '@/components/system/SearchField.vue';
import SupplierProfile from '@/components/system/SupplierProfile.vue';
import SupplierTable from '@/components/system/SupplierTable.vue';
import AButton from '@/components/ui/AButton.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AIcon from '@/components/ui/AIcon.vue';
import APagination from '@/components/ui/APagination.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import FilterChips from '@/components/ui/FilterChips.vue';
import FilterDrawer from '@/components/ui/FilterDrawer.vue';
import SavedViews from '@/components/ui/SavedViews.vue';
import {
    filterDefaults,
    PAGE_DEFAULTS,
    useListFilters,
    usePaged,
} from '@/composables/useListFilters';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import {
    SUPPLIER_FILTER_FIELDS,
    SUPPLIER_FILTER_GROUPS,
    useSystemStore,
} from '@/stores/system';

const emit = defineEmits(['ask']);

const { t } = useI18n();
const { searchHaystack } = useLocalized();
const { push } = useToast();
const system = useSystemStore();

const SPEC = { fields: SUPPLIER_FILTER_FIELDS };

const drawerOpen = ref(false);
const savedViews = ref(null);

const view = useUrlState({
    sq: '',
    supplier: '',
    ...filterDefaults(SPEC),
    ...PAGE_DEFAULTS,
});

const term = computed(() => view.sq.trim().toLowerCase());

const searched = computed(() =>
    term.value
        ? system.suppliers.filter((supplier) =>
              searchHaystack(
                  supplier.code,
                  supplier.name,
                  supplier.bizNum,
                  supplier.contact?.name,
                  supplier.contact?.phone,
              ).includes(term.value),
          )
        : system.suppliers,
);

const filters = useListFilters(SPEC, view, searched);

const rows = computed(() => filters.rows);

const { paged, total } = usePaged(rows, view);

const dirty = computed(() => filters.dirty || Boolean(view.sq));

/** The supplier the drawer is showing — the one whose code is in the address. */
const openSupplier = computed(
    () =>
        system.suppliers.find((supplier) => supplier.code === view.supplier) ||
        null,
);

const spec = computed(() => ({
    id: 'suppliers',
    ns: 'systemContacts.suppliers',
    noun: t('systemContacts.suppliers.filter.noun'),
    groups: SUPPLIER_FILTER_GROUPS,
    fields: SUPPLIER_FILTER_FIELDS,
}));

function clear() {
    view.sq = '';
    filters.clear();
}

function applyView(patch) {
    Object.assign(view, filterDefaults(SPEC), { sq: '' }, patch);
}

function removeChip(chip) {
    if (chip.value === null) {
        filters.clearField(chip.key);

        return;
    }

    filters.toggle(chip.key, chip.value);
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

            <SavedViews
                ref="savedViews"
                :spec="spec"
                :filters="view"
                :rows="searched"
                @apply="applyView"
            />

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
                <AButton icon="layers" @click="drawerOpen = true">
                    {{
                        filters.active.length
                            ? t('filters.openWith', {
                                  n: filters.active.length,
                              })
                            : t('filters.open')
                    }}
                </AButton>
            </FilterBar>

            <FilterChips
                :spec="spec"
                :filters="view"
                :rows="searched"
                @remove="removeChip"
                @clear="clear"
            />

            <SupplierTable
                :rows="paged"
                :selected="view.supplier"
                @open="view.supplier = $event.code"
            />

            <APagination
                v-model:page="view.pg"
                v-model:size="view.ps"
                :total="total"
            />

            <FilterDrawer
                :open="drawerOpen"
                :spec="spec"
                :filters="view"
                :rows="searched"
                :result-count="rows.length"
                @close="drawerOpen = false"
                @clear="clear"
                @patch="filters.patch"
                @save="savedViews?.openSave()"
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
