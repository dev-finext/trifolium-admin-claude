<script setup>
// The root component.
//
// It does three things and nothing else: mount the toast host once for the whole
// console, wrap every screen in the shell, and load the dataset. Until that load
// resolves the body holds a skeleton; if it fails it holds the error state with a
// retry — no screen renders against a half-loaded dataset, and none has to check
// whether its rows arrived.
import { onMounted } from 'vue';

import AdminShell from '@/components/layout/AdminShell.vue';
import AErrorState from '@/components/ui/AErrorState.vue';
import ASkeleton from '@/components/ui/ASkeleton.vue';
import AToastHost from '@/components/ui/AToastHost.vue';
import { useDatasetStore } from '@/stores/dataset';

const dataset = useDatasetStore();

onMounted(() => dataset.load());
</script>

<template>
    <AToastHost />

    <AdminShell>
        <ASkeleton v-if="dataset.isBusy" :rows="8" />
        <AErrorState v-else-if="dataset.isError" @retry="dataset.load(true)" />
        <RouterView v-else />
    </AdminShell>
</template>
