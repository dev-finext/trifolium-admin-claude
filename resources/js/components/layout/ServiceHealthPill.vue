<script setup>
// The health of the outside services this platform calls: card payments, the
// invoice provider, messaging, couriers, the nightly backups.
//
// It reports the reading the data layer holds and nothing more. There is no
// probe behind this pill: no timer moves it from one state to another, no latency
// figure is invented, and no last-checked time is shown unless a check was
// actually recorded. With no services on record it says so — an honest unknown
// beats a green light nobody earned.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import ANum from '@/components/ui/ANum.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useDatasetStore } from '@/stores/dataset';

const { t } = useI18n();
const { loc } = useLocalized();
const router = useRouter();
const dataset = useDatasetStore();

const services = computed(() => dataset.services);
const total = computed(() => services.value.length);
const down = computed(() => dataset.downServices);

const slow = computed(() =>
    services.value.filter((service) => service.state === 'slow'),
);

/** Services that answered on the recorded check. */
const up = computed(() => total.value - down.value.length);

/** The latest recorded check time, or empty when no service carries one. */
const lastChecked = computed(() => {
    const stamps = services.value
        .map((service) => service.last)
        .filter(Boolean)
        .sort();

    return stamps.length ? stamps[stamps.length - 1] : '';
});

const tone = computed(() => {
    if (!total.value) {
        return 'gray';
    }

    if (down.value.length) {
        return 'red';
    }

    return slow.value.length ? 'amber' : 'green';
});

const text = computed(() => {
    if (!total.value) {
        return t('shell.health.unknown');
    }

    if (down.value.length) {
        return t('shell.health.down', { n: down.value.length });
    }

    if (slow.value.length) {
        return t('shell.health.slow', { n: slow.value.length });
    }

    return t('shell.health.ok');
});

/** Tooltip: which services are down, or what the recorded check said. */
const hint = computed(() => {
    if (!total.value) {
        return t('shell.health.unknownHint');
    }

    const parts = down.value.length
        ? down.value.map(
              (service) => `${loc(service.sys)} · ${loc(service.label)}`,
          )
        : [t('shell.health.okHint')];

    parts.push(t('shell.health.upOf', { ok: up.value, total: total.value }));

    if (lastChecked.value) {
        parts.push(t('shell.health.lastChecked', { time: lastChecked.value }));
    }

    return parts.join(' · ');
});
</script>

<template>
    <button
        type="button"
        class="a-pill"
        :class="`c-${tone}`"
        :title="hint"
        @click="
            router.push({ name: 'integrations', query: { tab: 'services' } })
        "
    >
        <i class="a-dot" />
        {{ text }}
        <span v-if="total" class="a-pill-det">
            ·
            <ANum>{{ up }}/{{ total }}</ANum>
            <template v-if="lastChecked">
                · <ANum>{{ lastChecked }}</ANum>
            </template>
        </span>
    </button>
</template>
