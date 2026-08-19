<script setup>
// The order list route (/orders).
//
// The whole screen is OrdersBrowser: it owns the page head, the date range, the
// status tabs, the filters, the table, the bulk bar and the export, and it opens
// a row by navigating to the /orders/:id route itself. This view is deliberately
// thin so the same browser can sit behind the detail drawer unchanged.
import OrdersBrowser from '@/components/orders/OrdersBrowser.vue';
</script>

<template>
    <OrdersBrowser />
</template>
