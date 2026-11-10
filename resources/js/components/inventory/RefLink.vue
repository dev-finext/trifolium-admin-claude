<script setup>
// A document reference, as every inventory table shows one.
//
// A movement's reference may be a goods receipt, an inventory document, a
// production run or a customer's order, and the store's `refKind` says which by
// finding it on file. A customer's order is the console's own order link; any
// other kind is a button that hands the reference up to the screen, which knows
// which drawer or page it opens. A reference that names nothing on file — a
// number from history the extract did not carry — is shown as plain text, never
// as a button that does nothing.
import { computed } from 'vue';

import ANum from '@/components/ui/ANum.vue';
import OrderLink from '@/components/ui/OrderLink.vue';
import { useInventoryStore } from '@/stores/inventory';

const props = defineProps({
    /** The reference, or nothing — which reads as a dash. */
    id: { type: [String, Number], default: null },
});

const emit = defineEmits(['open']);

const inventory = useInventoryStore();

const present = computed(
    () => props.id !== null && props.id !== undefined && props.id !== '',
);

const kind = computed(() =>
    present.value ? inventory.refKind(props.id) : null,
);
</script>

<template>
    <OrderLink v-if="kind === 'order'" :id="String(id)" />
    <button
        v-else-if="kind"
        type="button"
        class="a-linkbtn"
        @click.stop="emit('open', String(id))"
    >
        <ANum>{{ id }}</ANum>
    </button>
    <ANum v-else-if="present">{{ id }}</ANum>
    <span v-else class="ref-none">—</span>
</template>

<style scoped>
.ref-none {
    color: var(--a-ink-4);
}
</style>
