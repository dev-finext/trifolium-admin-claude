<script setup>
// An unrecognised address. Says so plainly and offers the one useful way out
// rather than a decorative dead end.
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import AButton from '@/components/ui/AButton.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import { DEFAULT_NAV_ITEM } from '@/config/nav';

const { t } = useI18n();
</script>

<template>
    <div>
        <PageHead
            :crumbs="[t('notFound.crumb')]"
            :title="t('notFound.title')"
        />

        <div class="a-card">
            <AEmpty
                icon="alert"
                :title="t('notFound.title')"
                :sub="t('notFound.hint')"
            >
                <template #action>
                    <RouterLink :to="{ name: DEFAULT_NAV_ITEM }">
                        <AButton kind="p" icon="chevron_right">
                            {{ t('notFound.home') }}
                        </AButton>
                    </RouterLink>
                </template>
            </AEmpty>
        </div>
    </div>
</template>
