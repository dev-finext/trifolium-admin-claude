<script setup>
// Digits inside Hebrew text. `.num` isolates the run and forces LTR, which keeps
// an order number, a quantity or a phone number from being reordered by the
// bidirectional algorithm.
</script>

<template>
    <span class="num"><slot /></span>
</template>
