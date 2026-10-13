<script setup>
// The address book: the towns the pharmacy delivers to, and the streets in
// each.
//
// The screen is two lists side by side because the data is two lists: towns on
// one side, and the streets of whichever town is open on the other. That is the
// whole rule the book exists to hold — a street belongs to exactly one town, so
// a customer who picks a town is offered that town's streets and no others.
//
// The open town is in the query string, so a link to it opens on the same town.
// The two editors and the delete confirmation are actions, not addresses, and
// stay in local state.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PlaceEditor from '@/components/addresses/PlaceEditor.vue';
import PageHead from '@/components/layout/PageHead.vue';
import SearchField from '@/components/system/SearchField.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { num } from '@/lib/money';
import { useAddressesStore } from '@/stores/addresses';

const { t, locale } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const addresses = useAddressesStore();

const view = useUrlState({ city: '', q: '', sq: '' });

/**
 * The open editor: `{ kind: 'city' | 'street', place }`, where `place` is null
 * for a row that does not exist yet. One dialog serves both halves of the book
 * because a town and a street are the same two fields.
 */
const editing = ref(null);
/** The pending delete confirmation. */
const ask = ref(null);

// ---- towns ----------------------------------------------------------------

/**
 * The name in the language the reader is *not* in. The book holds two names for
 * every place and the table shows both — the reader's first, the other beside
 * it — so in English the second column is the Hebrew source and not a copy of
 * the first.
 */
function otherName(row) {
    return locale.value === 'he' ? row.name.en : row.name.he;
}

const cityTerm = computed(() => view.q.trim().toLowerCase());

const shownCities = computed(() =>
    addresses.cities.filter(
        (city) =>
            !cityTerm.value ||
            searchHaystack(city.name).includes(cityTerm.value),
    ),
);

const openCity = computed(() => addresses.cityById(view.city));

const sub = computed(() =>
    t('addresses.sub', {
        cities: num(addresses.cities.length),
        streets: num(addresses.streetCount),
    }),
);

const cityCols = computed(() => [
    { k: 'name', label: t('addresses.cities.col.name'), sortable: true },
    {
        k: 'alt',
        label: t('addresses.cities.col.alt'),
        nowrap: true,
        sortValue: otherName,
    },
    {
        k: 'streets',
        label: t('addresses.cities.col.streets'),
        w: '110px',
        nowrap: true,
        sortable: true,
        sortValue: (row) => row.streets?.length || 0,
    },
    { k: 'act', label: '', nowrap: true },
]);

function openStreets(city) {
    view.city = city.id;
    view.sq = '';
}

// ---- streets --------------------------------------------------------------

const streetTerm = computed(() => view.sq.trim().toLowerCase());

const shownStreets = computed(() => {
    if (!openCity.value) {
        return [];
    }

    return addresses
        .streetsOf(openCity.value.id)
        .filter(
            (street) =>
                !streetTerm.value ||
                searchHaystack(street.name).includes(streetTerm.value),
        );
});

const streetCols = computed(() => [
    { k: 'name', label: t('addresses.streets.col.name'), sortable: true },
    {
        k: 'alt',
        label: t('addresses.streets.col.alt'),
        nowrap: true,
        sortValue: otherName,
    },
    { k: 'act', label: '', nowrap: true },
]);

// ---- the shared editor ----------------------------------------------------

const editorTitle = computed(() => {
    if (!editing.value) {
        return '';
    }

    const city = openCity.value ? loc(openCity.value.name) : '';

    if (editing.value.kind === 'city') {
        return editing.value.place
            ? t('addresses.editor.cityEdit')
            : t('addresses.editor.cityNew');
    }

    return editing.value.place
        ? t('addresses.editor.streetEdit', { city })
        : t('addresses.editor.streetNew', { city });
});

const editorPlaceholders = computed(() =>
    editing.value?.kind === 'street'
        ? {
              he: t('addresses.editor.streetHePlaceholder'),
              en: t('addresses.editor.streetEnPlaceholder'),
          }
        : {
              he: t('addresses.editor.cityHePlaceholder'),
              en: t('addresses.editor.cityEnPlaceholder'),
          },
);

/** Is this name already on the list the editor is writing into? */
function nameTaken(he) {
    if (!editing.value) {
        return false;
    }

    const exceptId = editing.value.place?.id || null;

    if (editing.value.kind === 'city') {
        return addresses.cityTaken({ he, en: he }, exceptId);
    }

    return addresses.streetTaken(openCity.value?.id, { he, en: he }, exceptId);
}

function failed() {
    push({
        title: t('addresses.toast.failed'),
        body: t('addresses.toast.failedBody'),
        bad: true,
    });
}

async function saveEditor(form) {
    const { kind, place } = editing.value;

    if (kind === 'city') {
        const { ok, city } = await addresses.saveCity(form, place?.id || null);

        if (!ok) {
            failed();

            return;
        }

        editing.value = null;

        // A town added from here is the one the agent is about to fill with
        // streets, so the screen moves to it rather than leaving it to be found.
        if (!place) {
            openStreets(city);
        }

        push({
            title: place
                ? t('addresses.toast.cityUpdated')
                : t('addresses.toast.cityAdded'),
            body: loc(city.name),
        });

        return;
    }

    const { ok, street } = await addresses.saveStreet(
        openCity.value.id,
        form,
        place?.id || null,
    );

    if (!ok) {
        failed();

        return;
    }

    editing.value = null;
    push({
        title: place
            ? t('addresses.toast.streetUpdated')
            : t('addresses.toast.streetAdded'),
        body: `${loc(street.name)} · ${loc(openCity.value.name)}`,
    });
}

// ---- removals -------------------------------------------------------------

function askRemoveCity(city) {
    const streets = city.streets?.length || 0;

    ask.value = {
        title: t('addresses.remove.cityTitle'),
        body: t('addresses.remove.cityBody', { city: loc(city.name) }),
        confirmLabel: t('addresses.remove.cityConfirm'),
        // A town with no streets takes none with it, and saying it would take
        // zero of them reads as a consequence where there is none.
        effects: [
            ...(streets
                ? [t('addresses.remove.cityEffect1', { n: num(streets) })]
                : []),
            t('addresses.remove.cityEffect2'),
        ],
        danger: true,
        done: async () => {
            if (!(await addresses.removeCity(city.id))) {
                failed();

                return;
            }

            if (view.city === city.id) {
                view.city = '';
            }

            push({
                title: t('addresses.toast.cityRemoved'),
                body: loc(city.name),
                bad: true,
            });
        },
    };
}

function askRemoveStreet(street) {
    const city = openCity.value;

    ask.value = {
        title: t('addresses.remove.streetTitle'),
        body: t('addresses.remove.streetBody', {
            street: loc(street.name),
            city: loc(city.name),
        }),
        confirmLabel: t('addresses.remove.streetConfirm'),
        effects: [
            t('addresses.remove.streetEffect1'),
            t('addresses.remove.streetEffect2'),
        ],
        danger: true,
        done: async () => {
            if (!(await addresses.removeStreet(city.id, street.id))) {
                failed();

                return;
            }

            push({
                title: t('addresses.toast.streetRemoved'),
                body: `${loc(street.name)} · ${loc(city.name)}`,
                bad: true,
            });
        },
    };
}

function confirmAsk() {
    const pending = ask.value;

    ask.value = null;
    pending.done();
}
</script>

<template>
    <div>
        <PageHead
            :crumbs="[t('nav.group.system'), t('addresses.title')]"
            :title="t('addresses.title')"
            :sub="sub"
        >
            <template #actions>
                <AButton
                    kind="p"
                    icon="plus"
                    @click="editing = { kind: 'city', place: null }"
                >
                    {{ t('addresses.cities.add') }}
                </AButton>
            </template>
        </PageHead>

        <p class="ad-intro">{{ t('addresses.intro') }}</p>

        <div class="ad-split">
            <ACard
                :title="t('addresses.cities.heading')"
                icon="map_pin"
                :pad="false"
            >
                <template #right>
                    <SearchField
                        v-model="view.q"
                        :placeholder="t('addresses.cities.search')"
                        :label="t('addresses.cities.searchLabel')"
                        :width="200"
                    />
                </template>

                <ADataTable
                    :cols="cityCols"
                    :rows="shownCities"
                    row-key="id"
                    :selected="view.city"
                    @row="openStreets"
                >
                    <template #empty>
                        <AEmpty
                            icon="map_pin"
                            :title="
                                cityTerm
                                    ? t('addresses.cities.noMatch')
                                    : t('addresses.cities.none')
                            "
                            :sub="
                                cityTerm ? '' : t('addresses.cities.noneHint')
                            "
                        />
                    </template>

                    <template #cell-name="{ row }">
                        <span class="t-strong">{{ loc(row.name) }}</span>
                    </template>

                    <template #cell-alt="{ row }">
                        <span class="ad-alt" dir="auto">
                            {{ otherName(row) }}
                        </span>
                    </template>

                    <template #cell-streets="{ row }">
                        <ANum>{{ num(row.streets?.length || 0) }}</ANum>
                    </template>

                    <template #cell-act="{ row }">
                        <div class="a-rowbtns" @click.stop>
                            <AButton
                                sm
                                icon="edit"
                                @click="editing = { kind: 'city', place: row }"
                            >
                                {{ t('actions.edit') }}
                            </AButton>
                            <AButton
                                sm
                                icon="trash"
                                @click="askRemoveCity(row)"
                            >
                                {{ t('actions.delete') }}
                            </AButton>
                        </div>
                    </template>
                </ADataTable>
            </ACard>

            <ACard
                :title="
                    openCity
                        ? t('addresses.streets.heading', {
                              city: loc(openCity.name),
                          })
                        : t('addresses.streets.headingEmpty')
                "
                icon="list"
                :pad="!openCity"
            >
                <template v-if="openCity" #right>
                    <SearchField
                        v-model="view.sq"
                        :placeholder="t('addresses.streets.search')"
                        :label="t('addresses.streets.searchLabel')"
                        :width="200"
                    />
                    <AButton
                        kind="p"
                        sm
                        icon="plus"
                        @click="editing = { kind: 'street', place: null }"
                    >
                        {{ t('addresses.streets.add') }}
                    </AButton>
                </template>

                <AEmpty
                    v-if="!openCity"
                    icon="map_pin"
                    :title="t('addresses.cities.pick')"
                />

                <ADataTable
                    v-else
                    :cols="streetCols"
                    :rows="shownStreets"
                    row-key="id"
                >
                    <template #empty>
                        <AEmpty
                            icon="list"
                            :title="
                                streetTerm
                                    ? t('addresses.streets.noMatch')
                                    : t('addresses.streets.none')
                            "
                            :sub="
                                streetTerm
                                    ? ''
                                    : t('addresses.streets.noneHint')
                            "
                        />
                    </template>

                    <template #cell-name="{ row }">
                        <span class="t-strong">{{ loc(row.name) }}</span>
                    </template>

                    <template #cell-alt="{ row }">
                        <span class="ad-alt" dir="auto">
                            {{ otherName(row) }}
                        </span>
                    </template>

                    <template #cell-act="{ row }">
                        <div class="a-rowbtns" @click.stop>
                            <AButton
                                sm
                                icon="edit"
                                @click="
                                    editing = { kind: 'street', place: row }
                                "
                            >
                                {{ t('actions.edit') }}
                            </AButton>
                            <AButton
                                sm
                                icon="trash"
                                @click="askRemoveStreet(row)"
                            >
                                {{ t('actions.delete') }}
                            </AButton>
                        </div>
                    </template>
                </ADataTable>
            </ACard>
        </div>

        <PlaceEditor
            :open="Boolean(editing)"
            :title="editorTitle"
            :place="editing?.place || null"
            :he-placeholder="editorPlaceholders.he"
            :en-placeholder="editorPlaceholders.en"
            :taken="nameTaken"
            @save="saveEditor"
            @close="editing = null"
        />

        <ConfirmDialog
            :open="Boolean(ask)"
            :title="ask?.title || ''"
            :body="ask?.body || ''"
            :effects="ask?.effects || []"
            :confirm-label="ask?.confirmLabel || ''"
            :danger="ask?.danger || false"
            @close="ask = null"
            @confirm="confirmAsk"
        />
    </div>
</template>

<style scoped>
.ad-intro {
    margin: 0 0 18px;
    color: var(--a-ink-3);
    font-size: 13.5px;
}

.ad-split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 18px;
    align-items: start;
}

@media (max-width: 1100px) {
    .ad-split {
        grid-template-columns: minmax(0, 1fr);
    }
}

/* The other language's name: `dir="auto"` so Hebrew beside English, and
   English beside Hebrew, each run the way it is written. */
.ad-alt {
    color: var(--a-ink-4);
    unicode-bidi: isolate;
}
</style>
