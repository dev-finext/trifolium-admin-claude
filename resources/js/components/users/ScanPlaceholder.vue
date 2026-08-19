<script setup>
// Where an uploaded scan renders — a diploma, a clinic photo, a signature.
//
// The console never fabricates the image itself: the box states what it is and
// how tall the real scan will be, so a card with a document reads the same
// whether or not the file has arrived.
defineProps({
    /** The label the box carries, already translated. */
    label: { type: String, default: '' },
    /** Box height in px — a scan and a signature strip are not the same size. */
    height: { type: Number, default: 120 },
});
</script>

<template>
    <div class="u-scan" :style="{ height: `${height}px` }">{{ label }}</div>
</template>

<style scoped>
/* The hatched stand-in from the design. It is deliberately not a solid grey
   block: a reader must never mistake it for an image that failed to load. */
.u-scan {
    display: grid;
    place-items: center;
    padding: 12px;
    border: 1px solid var(--a-line);
    border-radius: 8px;
    background: repeating-linear-gradient(
        135deg,
        var(--a-line-3),
        var(--a-line-3) 7px,
        var(--a-line) 7px,
        var(--a-line) 14px
    );
    color: var(--a-ink-4);
    font-family: var(--font-latin);
    font-size: 12px;
    text-align: center;
}
</style>
