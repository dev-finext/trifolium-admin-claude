<script setup>
// The batch-handling settings, edited where batches live: the default shelf
// life per item family that a new batch takes unless overridden. Batch
// selection is always FEFO (no longer a setting) and batch numbers are not a
// setting either: they run per item family, and the card says so.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ACard from '@/components/ui/ACard.vue';
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

async function setExpiry(family, value) {
    const months =
        value === '' ? null : Math.max(0, Math.round(Number(value))) || null;

    if ((settings.value?.defaultExpiryMonths?.[family] ?? null) === months) {
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
                            @change="setExpiry(family, $event.target.value)"
                        />
                        <span class="t-sub">{{
                            t('inventory.settings.months')
                        }}</span>
                    </div>
                </div>
                <p class="a-hint">{{ t('inventory.settings.expiryHint') }}</p>
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

.prefix,
.months {
    height: 32px;
    font-size: 13.5px;
}
</style>
