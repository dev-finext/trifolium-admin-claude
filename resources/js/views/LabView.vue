<script setup>
// Lab — deliberately not built yet. The nav marks this area `inDevelopment`,
// and this screen keeps that honest: it says what the area will cover and where
// the work lives meanwhile. No mock queue, no sample rows, no control that is
// wired to nothing.
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AIcon from '@/components/ui/AIcon.vue';

const { t } = useI18n();
const router = useRouter();

/** What the area will cover when it is built, each with the icon it will wear. */
const SCOPE = [
    { id: 'queue', icon: 'clipboard_list' },
    { id: 'labels', icon: 'printer' },
    { id: 'types', icon: 'beaker' },
    { id: 'validity', icon: 'clock' },
];
</script>

<template>
    <div>
        <PageHead
            :crumbs="[t('nav.group.operations'), t('nav.item.lab')]"
            :title="t('lab.title')"
            :sub="t('lab.sub')"
        />

        <div class="a-grid">
            <ACard>
                <AEmpty
                    icon="zoom"
                    :title="t('lab.empty.title')"
                    :sub="t('lab.empty.sub')"
                >
                    <template #action>
                        <AButton
                            icon="clipboard_list"
                            @click="router.push({ name: 'orders' })"
                        >
                            {{ t('lab.toOrders') }}
                        </AButton>
                    </template>
                </AEmpty>
            </ACard>

            <ACard :title="t('lab.scopeTitle')" icon="list">
                <ul class="lab-scope">
                    <li
                        v-for="item in SCOPE"
                        :key="item.id"
                        class="lab-scope-row"
                    >
                        <AIcon
                            :name="item.icon"
                            :size="18"
                            class="lab-scope-ic"
                        />
                        <span>{{ t(`lab.scope.${item.id}`) }}</span>
                    </li>
                </ul>

                <div class="lab-where">{{ t('lab.where') }}</div>
            </ACard>
        </div>
    </div>
</template>

<style scoped>
.lab-scope {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 12px;
}

.lab-scope-row {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    line-height: 1.55;
    font-size: 14.5px;
    color: var(--a-ink-2);
}

.lab-scope-ic {
    color: var(--a-ink-4);
    flex-shrink: 0;
    margin-top: 2px;
}

.lab-where {
    margin-top: 16px;
    color: var(--a-ink-4);
    font-size: 13.5px;
}
</style>
