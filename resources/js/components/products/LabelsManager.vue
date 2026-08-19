<script setup>
// The label taxonomy.
//
// A label is a name and nothing else, but it is two things at once on the
// consumer site: a badge on the product card and a filter practitioners narrow
// the catalogue by. That is why renaming one is confirmed with the number of
// products it touches, and why deleting one is a reasoned, pinned action.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AIcon from '@/components/ui/AIcon.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { fmtISO } from '@/lib/dates';
import { PRODUCT_RULES, useCatalogStore } from '@/stores/catalog';

/** Card width: wide enough for the four columns without the body scrolling. */
const WIDTH = 780;

/** How many product names the delete confirmation lists before summarising. */
const NAMED_IN_CONFIRM = 5;

const props = defineProps({
    open: { type: Boolean, default: false },
    /** Open with the "new label" form already unfolded. */
    startNew: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'created']);

const { t, locale } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const catalog = useCatalogStore();

const rules = PRODUCT_RULES.label;

const query = ref('');
const use = ref('');
const adding = ref(false);
const draft = ref('');
const renamingId = ref(null);
const renameText = ref('');
const ask = ref(null);

// Every opening starts clean: a half-typed label must never survive into the
// next time the modal is opened.
watch(
    () => props.open,
    (open) => {
        if (!open) {
            return;
        }

        query.value = '';
        use.value = '';
        draft.value = '';
        renamingId.value = null;
        adding.value = props.startNew;
    },
    { immediate: true },
);

const usedCount = computed(
    () =>
        catalog.labels.filter((label) => catalog.labelUsage(label.id) > 0)
            .length,
);

const term = computed(() => query.value.trim().toLowerCase());

const shown = computed(() =>
    catalog.labels.filter((label) => {
        if (term.value && !loc(label.name).toLowerCase().includes(term.value)) {
            return false;
        }

        if (use.value === 'used') {
            return catalog.labelUsage(label.id) > 0;
        }

        if (use.value === 'unused') {
            return catalog.labelUsage(label.id) === 0;
        }

        return true;
    }),
);

const dirty = computed(() => Boolean(term.value || use.value));

const useOptions = computed(() => [
    {
        value: '',
        label: t('products.filters.option', {
            label: t('products.labels.useAll'),
            n: catalog.labels.length,
        }),
    },
    {
        value: 'used',
        label: t('products.filters.option', {
            label: t('products.labels.used'),
            n: usedCount.value,
        }),
    },
    {
        value: 'unused',
        label: t('products.filters.option', {
            label: t('products.labels.unused'),
            n: catalog.labels.length - usedCount.value,
        }),
    },
]);

const cols = computed(() => [
    { k: 'name', label: t('products.labels.colName') },
    { k: 'use', label: t('products.labels.colUse'), nowrap: true },
    {
        k: 'created',
        label: t('products.labels.colCreated'),
        nowrap: true,
        sortable: true,
    },
    { k: 'act', label: '', nowrap: true },
]);

/** A name already taken by another label, in the locale being read. */
function taken(value, skipId) {
    const needle = value.trim().toLowerCase();

    return catalog.labels.some(
        (label) =>
            label.id !== skipId && loc(label.name).toLowerCase() === needle,
    );
}

function nameError(value, skipId) {
    const text = value.trim();

    if (!text) {
        return '';
    }

    if (text.length < rules.min) {
        return t('products.labels.tooShort', { min: rules.min });
    }

    if (text.length > rules.max) {
        return t('products.labels.tooLong', { max: rules.max });
    }

    return taken(text, skipId) ? t('products.labels.duplicate') : '';
}

const draftError = computed(() => nameError(draft.value, null));
const renameError = computed(() =>
    nameError(renameText.value, renamingId.value),
);

const canAdd = computed(() => Boolean(draft.value.trim()) && !draftError.value);

function create() {
    if (!canAdd.value) {
        return;
    }

    const label = catalog.createLabel(draft.value.trim());

    push({
        title: t('products.toast.labelCreated'),
        body: loc(label.name),
    });
    draft.value = '';
    adding.value = false;
    emit('created', label);
}

function startRename(label) {
    renamingId.value = label.id;
    renameText.value = loc(label.name);
}

const canSaveRename = computed(() => {
    const label = catalog.labelById(renamingId.value);

    return Boolean(
        label &&
        renameText.value.trim() &&
        !renameError.value &&
        renameText.value.trim() !== loc(label.name),
    );
});

function askRename(label) {
    const to = renameText.value.trim();
    const from = loc(label.name);

    ask.value = {
        title: t('products.confirm.renameLabel.title'),
        body: t('products.confirm.renameLabel.body', { from, to }),
        confirmLabel: t('products.confirm.renameLabel.confirm'),
        effects: [
            t('products.confirm.renameLabel.effect1', {
                n: catalog.labelUsage(label.id),
            }),
            t('products.confirm.renameLabel.effect2'),
            t('products.confirm.renameLabel.effect3'),
        ],
        danger: false,
        reason: false,
        pin: false,
        done: () => {
            catalog.renameLabel(label, to, locale.value);
            renamingId.value = null;
            push({
                title: t('products.toast.labelRenamed'),
                body: t('products.toast.labelRenamedBody', { from, to }),
            });
        },
    };
}

function askDelete(label) {
    const name = loc(label.name);
    const used = catalog.products.filter((product) =>
        product.labels.includes(label.id),
    );
    const names = used
        .slice(0, NAMED_IN_CONFIRM)
        .map((product) => loc(product.name))
        .join(' · ');

    let body = t('products.confirm.deleteLabel.bodyFree', { name });

    if (used.length > NAMED_IN_CONFIRM) {
        body = t('products.confirm.deleteLabel.bodyUsedMore', {
            name,
            n: used.length,
            names,
            rest: used.length - NAMED_IN_CONFIRM,
        });
    } else if (used.length) {
        body = t('products.confirm.deleteLabel.bodyUsed', {
            name,
            n: used.length,
            names,
        });
    }

    ask.value = {
        title: t('products.confirm.deleteLabel.title', { name }),
        body,
        confirmLabel: t('products.confirm.deleteLabel.confirm'),
        effects: [
            used.length
                ? t('products.confirm.deleteLabel.effectUsed', {
                      n: used.length,
                  })
                : t('products.confirm.deleteLabel.effectFree'),
            t('products.confirm.deleteLabel.effect2'),
            t('products.confirm.deleteLabel.effect3'),
            t('products.confirm.deleteLabel.effect4'),
        ],
        danger: true,
        reason: true,
        pin: catalog.approvalPin,
        done: (why) => {
            const removed = catalog.deleteLabel(label, why);

            push({
                title: t('products.toast.labelDeleted'),
                body: t('products.toast.labelDeletedBody', {
                    name,
                    n: removed,
                }),
                bad: true,
            });
        },
    };
}

function confirmAsk(reason) {
    const pending = ask.value;

    ask.value = null;
    pending.done(reason);
}

function clearFilters() {
    query.value = '';
    use.value = '';
}
</script>

<template>
    <AModal
        :open="open"
        :title="t('products.labels.title')"
        :width="WIDTH"
        @close="emit('close')"
    >
        <div class="a-note a-note--info a-lm-note">
            {{ t('products.labels.note') }}
        </div>

        <FilterBar
            class="a-lm-filters"
            :count="shown.length"
            :label="
                t('products.labels.countLabel', {
                    total: catalog.labels.length,
                })
            "
            :dirty="dirty"
            @clear="clearFilters"
        >
            <div class="a-search a-lm-search">
                <span class="lead"><AIcon name="search" :size="18" /></span>
                <input
                    v-model="query"
                    :placeholder="t('products.labels.searchPlaceholder')"
                    :aria-label="t('products.labels.searchAria')"
                />
            </div>
            <ASelect
                v-model="use"
                :options="useOptions"
                :aria-label="t('products.labels.useAria')"
            />
            <AButton
                v-if="!adding"
                kind="p"
                sm
                icon="plus"
                @click="adding = true"
            >
                {{ t('products.labels.newLabel') }}
            </AButton>
        </FilterBar>

        <div v-if="adding" class="a-newlabel">
            <div class="a-grow">
                <label class="a-lbl" for="lb-new">
                    {{ t('products.labels.nameLabel') }}
                </label>
                <input
                    id="lb-new"
                    v-model="draft"
                    class="a-input a-w100"
                    :maxlength="rules.max + 10"
                    :placeholder="t('products.labels.namePlaceholder')"
                    @keydown.enter.prevent="create"
                />
                <div v-if="draftError" class="a-inv">{{ draftError }}</div>
                <div v-else class="a-hint">
                    {{
                        t('products.labels.nameHint', {
                            min: rules.min,
                            max: rules.max,
                        })
                    }}
                </div>
            </div>
            <AButton kind="p" icon="check" :disabled="!canAdd" @click="create">
                {{ t('products.labels.add') }}
            </AButton>
            <AButton @click="((adding = false), (draft = ''))">
                {{ t('products.labels.cancel') }}
            </AButton>
        </div>

        <AEmpty
            v-if="!catalog.labels.length"
            icon="tag"
            :title="t('products.labels.emptyTitle')"
            :sub="t('products.labels.emptySub')"
        >
            <template #action>
                <AButton kind="p" icon="plus" @click="adding = true">
                    {{ t('products.labels.createFirst') }}
                </AButton>
            </template>
        </AEmpty>

        <ADataTable v-else :cols="cols" :rows="shown" row-key="id">
            <template #cell-name="{ row }">
                <div v-if="renamingId === row.id" class="a-renamebox">
                    <input
                        v-model="renameText"
                        class="a-input a-w100"
                        :maxlength="rules.max + 10"
                        :aria-label="t('products.labels.renameAria')"
                    />
                    <div v-if="renameError" class="a-inv">
                        {{ renameError }}
                    </div>
                </div>
                <span v-else class="t-strong">{{ loc(row.name) }}</span>
            </template>

            <template #cell-use="{ row }">
                <span v-if="catalog.labelUsage(row.id)" class="a-used">
                    {{
                        t('products.labels.usedIn', {
                            n: catalog.labelUsage(row.id),
                        })
                    }}
                </span>
                <span v-else class="a-unused">
                    {{ t('products.labels.notUsed') }}
                </span>
            </template>

            <template #cell-created="{ row }">
                <ANum>{{ fmtISO(row.created) }}</ANum>
            </template>

            <template #cell-act="{ row }">
                <div class="a-rowbtns">
                    <template v-if="renamingId === row.id">
                        <AButton
                            sm
                            kind="p"
                            icon="check"
                            :disabled="!canSaveRename"
                            @click="askRename(row)"
                        >
                            {{ t('products.labels.saveRename') }}
                        </AButton>
                        <AButton sm @click="renamingId = null">
                            {{ t('products.labels.cancel') }}
                        </AButton>
                    </template>
                    <template v-else>
                        <AButton sm icon="edit" @click="startRename(row)">
                            {{ t('products.labels.rename') }}
                        </AButton>
                        <AButton sm icon="trash" @click="askDelete(row)">
                            {{ t('products.labels.delete') }}
                        </AButton>
                    </template>
                </div>
            </template>

            <template #empty>
                <AEmpty
                    icon="search"
                    :title="t('products.labels.noMatchTitle')"
                    :sub="t('products.labels.noMatchSub')"
                >
                    <template #action>
                        <AButton icon="x" @click="clearFilters">
                            {{ t('products.labels.clearSearch') }}
                        </AButton>
                    </template>
                </AEmpty>
            </template>
        </ADataTable>

        <ConfirmDialog
            :open="Boolean(ask)"
            :title="ask?.title || ''"
            :body="ask?.body || ''"
            :effects="ask?.effects || []"
            :confirm-label="ask?.confirmLabel || ''"
            :danger="ask?.danger || false"
            :reason="ask?.reason || false"
            :pin="ask?.pin || false"
            @close="ask = null"
            @confirm="confirmAsk"
        />

        <template #footer>
            <AButton @click="emit('close')">
                {{ t('products.labels.cancel') }}
            </AButton>
        </template>
    </AModal>
</template>

<style scoped>
.a-lm-note {
    margin-bottom: 16px;
}

.a-lm-filters {
    padding: 0 0 14px;
}

.a-lm-search {
    width: 300px;
    flex: none;
}

.a-lm-search input {
    height: 44px;
}

.a-grow {
    flex: 1;
}

.a-renamebox {
    display: grid;
    gap: 6px;
}

.a-used {
    color: var(--a-ink-3);
}

.a-unused {
    color: var(--a-ink-4);
}
</style>
