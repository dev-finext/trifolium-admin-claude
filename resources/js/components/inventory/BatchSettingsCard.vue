<script setup>
// The batch-handling settings, edited where batches live: the default shelf
// life per item family that a new batch takes unless overridden. Batch
// selection is always FEFO (no longer a setting) and batch numbers are not a
// setting either: they run per item family, and the card says so.
//
// The third column is how much one labelled container of a family holds, which
// is what counts the batch labels a receipt from production prints ("כל צנצנת
// מכילה כ-300 גרם אבקה ... כל בקבוק מכיל ליטר נוזל"). An item's own sales
// packaging on its card overrides its family — Yaron: "משפחה ואז אפשרות להתאים
// למק״ט החרגה".
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';

import ACard from '@/components/ui/ACard.vue';
import ASelect from '@/components/ui/ASelect.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { BATCH_KIND_IDS, ITEM_FAMILY_IDS } from '@/config';
import { useInventoryStore } from '@/stores/inventory';
import { usePurchasingStore } from '@/stores/purchasing';

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const store = usePurchasingStore();
const inventory = useInventoryStore();

const settings = computed(() => store.settings);

/** Families that are ever batch-managed — the ones a default shelf life means something for. */
const families = computed(() =>
    ITEM_FAMILY_IDS.filter(
        (id) => !['admin', 'workshop', 'labour'].includes(id),
    ),
);

/** The units a container can be stated in. */
const PACK_UNITS = ['g', 'kg', 'ml', 'l', 'unit'];

const packUnitOptions = computed(() =>
    PACK_UNITS.map((id) => ({ value: id, label: t(`inventory.unit.${id}`) })),
);

/**
 * A unit picked on a family that has no quantity yet: held on screen until
 * the quantity is typed, since a unit alone is not a container.
 */
const draftUnit = reactive({});

/** A family's container, or an empty one to fill in. */
const packOf = (family) =>
    settings.value?.labelPack?.[family] || {
        qty: null,
        uom: draftUnit[family] || 'g',
    };

/**
 * Put a box back to what is stored. A typed value that saves nothing — "0" on
 * an empty family, "300.0" over 300 — would otherwise stay on screen as if it
 * had been kept, because the stored value did not change and so nothing
 * re-renders the box.
 */
function showStored(input, value) {
    if (input) {
        input.value = value ?? '';
    }
}

async function setPack(family, patch, input = null) {
    const was = packOf(family);
    const next = { ...was, ...patch };
    const qty = Number(next.qty) > 0 ? Number(next.qty) : null;
    const value = qty ? { qty, uom: next.uom || 'g' } : null;

    if (!value) {
        draftUnit[family] = next.uom || 'g';

        // Nothing saved, so nothing to clear.
        if (!was.qty) {
            showStored(input, was.qty);

            return;
        }
    }

    if (
        (was.qty || null) === (value?.qty ?? null) &&
        (!value || was.uom === value.uom)
    ) {
        showStored(input, was.qty);

        return;
    }

    await store.updateSettings(
        { labelPack: { [family]: value } },
        `${t(`items.family.${family}`)}: ${
            value ? `${value.qty} ${t(`inventory.unit.${value.uom}`)}` : '—'
        }`,
    );
    push({
        title: t('inventory.settings.saved'),
        body: t(`items.family.${family}`),
    });
}

async function setExpiry(family, input) {
    const value = input.value;
    const months =
        value === '' ? null : Math.max(0, Math.round(Number(value))) || null;
    const stored = settings.value?.defaultExpiryMonths?.[family] ?? null;

    // 24.4 over 24, or 0 over nothing: no change, so the box shows the
    // stored figure again rather than what was typed.
    if (stored === months) {
        showStored(input, stored);

        return;
    }

    await store.updateSettings(
        { defaultExpiryMonths: { [family]: months } },
        `${t(`items.family.${family}`)}: ${months ?? '—'}`,
    );
    push({
        title: t('inventory.settings.saved'),
        body: t(`items.family.${family}`),
    });
}
</script>

<template>
    <ACard
        v-if="settings"
        :title="t('inventory.settings.title')"
        icon="settings"
    >
        <template #right>
            <span class="t-sub">
                {{
                    t('inventory.settings.updated', {
                        when: settings.updated?.stamp,
                        by: loc(settings.updatedBy),
                    })
                }}
            </span>
        </template>

        <div class="grid">
            <section>
                <div class="a-sect-t">
                    {{ t('inventory.settings.seriesTitle') }}
                </div>
                <dl class="series">
                    <template v-for="kind in BATCH_KIND_IDS" :key="kind">
                        <dt>{{ t(`inventory.settings.kind.${kind}`) }}</dt>
                        <dd>{{ t(`inventory.settings.kindRule.${kind}`) }}</dd>
                    </template>
                </dl>
                <p class="a-hint">
                    {{
                        t('inventory.settings.seriesHint', {
                            next: inventory.houseSerial + 1,
                        })
                    }}
                </p>
            </section>

            <section>
                <div class="a-sect-t">
                    {{ t('inventory.settings.expiryTitle') }}
                </div>
                <div class="expiry">
                    <div
                        v-for="family in families"
                        :key="family"
                        class="expiry-row"
                    >
                        <span>{{ t(`items.family.${family}`) }}</span>
                        <input
                            class="a-input a-ltr-input months"
                            type="number"
                            min="0"
                            :value="
                                settings.defaultExpiryMonths?.[family] ?? ''
                            "
                            :placeholder="t('inventory.settings.none')"
                            :aria-label="t(`items.family.${family}`)"
                            @change="setExpiry(family, $event.target)"
                        />
                        <span class="t-sub">{{
                            t('inventory.settings.months')
                        }}</span>
                    </div>
                </div>
                <p class="a-hint">{{ t('inventory.settings.expiryHint') }}</p>
            </section>

            <section class="pack-sect">
                <div class="a-sect-t">
                    {{ t('inventory.settings.packTitle') }}
                </div>
                <div class="expiry">
                    <div
                        v-for="family in families"
                        :key="family"
                        class="pack-row"
                    >
                        <span>{{ t(`items.family.${family}`) }}</span>
                        <input
                            class="a-input a-ltr-input months"
                            type="number"
                            min="0"
                            step="any"
                            :value="packOf(family).qty ?? ''"
                            :placeholder="t('inventory.settings.none')"
                            :aria-label="
                                t('inventory.settings.packAria', {
                                    family: t(`items.family.${family}`),
                                })
                            "
                            @change="
                                setPack(
                                    family,
                                    { qty: $event.target.value },
                                    $event.target,
                                )
                            "
                        />
                        <ASelect
                            :model-value="packOf(family).uom"
                            :options="packUnitOptions"
                            class="pack-unit"
                            :aria-label="t('inventory.settings.packUnit')"
                            @update:model-value="
                                setPack(family, { uom: $event })
                            "
                        />
                    </div>
                </div>
                <p class="a-hint">{{ t('inventory.settings.packHint') }}</p>
            </section>
        </div>
    </ACard>
</template>

<style scoped>
.grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 22px;
    align-items: start;
}

@media (max-width: 900px) {
    .grid {
        grid-template-columns: 1fr;
    }
}

.series-t {
    margin-top: 18px;
}

.series,
.expiry {
    display: grid;
    gap: 6px;
}

.series-row,
.expiry-row {
    display: grid;
    grid-template-columns: 1fr 90px auto;
    gap: 10px;
    align-items: center;
    font-size: 14px;
}

/* The containers run the full width under the other two. */
.pack-sect {
    grid-column: 1 / -1;
}

.pack-sect .expiry {
    grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
    column-gap: 22px;
}

.pack-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 110px 120px;
    gap: 10px;
    align-items: center;
    font-size: 14px;
}

/* The console's inputs carry a minimum width of their own; here each one
   stays inside its column instead of riding over the next. */
.expiry-row .a-input,
.pack-row .a-input,
.pack-row .pack-unit {
    width: 100%;
    min-width: 0;
}

.pack-unit {
    height: 32px;
}

.prefix,
.months {
    height: 32px;
    font-size: 13.5px;
}
</style>
