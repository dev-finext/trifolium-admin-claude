<script setup>
// What the console shows while it is building its database for the first time.
//
// Only the first time: after that the tables are on the machine and the console
// opens on a query. But the first time takes a few seconds — PostgreSQL has to
// come down, the schema has to run and five thousand records have to be loaded
// — and a blank screen for five seconds reads as a broken screen.
//
// So it says what it is doing, and names the stage. Nothing here is a
// percentage: the number of tables is known, and counting them is honest where
// a progress bar would be a guess.
import { computed, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AIcon from '@/components/ui/AIcon.vue';
import { onDatabaseProgress } from '@/data/source';

const { t } = useI18n();

const stage = ref('engine');
const table = ref('');
const done = ref(0);

const stop = onDatabaseProgress((next) => {
    stage.value = next.stage;

    if (next.table) {
        table.value = next.table;
        done.value += 1;
    }
});

onUnmounted(stop);

const label = computed(() => t(`boot.stage.${stage.value}`));
</script>

<template>
    <div class="boot">
        <div class="boot-card">
            <AIcon name="db" :size="28" />
            <h2>{{ t('boot.title') }}</h2>
            <p class="boot-lede">{{ t('boot.lede') }}</p>
            <div class="boot-stage">
                <span class="boot-dot" />
                {{ label }}
                <span v-if="table" class="boot-table">{{ table }}</span>
            </div>
            <p class="boot-note">{{ t('boot.once') }}</p>
        </div>
    </div>
</template>

<style scoped>
.boot {
    display: grid;
    place-items: center;
    min-height: 360px;
    padding: 40px 20px;
}

.boot-card {
    max-width: 480px;
    text-align: center;
    display: grid;
    gap: 10px;
    justify-items: center;
}

h2 {
    margin: 4px 0 0;
    font-size: 20px;
}

.boot-lede {
    margin: 0;
    color: var(--a-ink-3);
    font-size: 14px;
    line-height: 1.6;
}

.boot-stage {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    padding: 8px 14px;
    background: var(--a-sunk);
    border: 1px solid var(--a-line);
    border-radius: 999px;
    font-size: 13px;
}

.boot-table {
    color: var(--a-ink-4);
    font-family: ui-monospace, monospace;
    font-size: 12px;
}

.boot-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--a-accent);
    animation: boot-pulse 1.2s ease-in-out infinite;
}

.boot-note {
    margin: 2px 0 0;
    font-size: 12.5px;
    color: var(--a-ink-4);
}

@keyframes boot-pulse {
    0%,
    100% {
        opacity: 0.25;
    }

    50% {
        opacity: 1;
    }
}

@media (prefers-reduced-motion: reduce) {
    .boot-dot {
        animation: none;
        opacity: 1;
    }
}
</style>
