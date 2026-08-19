<script setup>
// The shape of a table while its rows are still loading. It shows the layout,
// never a number — a placeholder that invented values would be worse than an
// empty screen.
defineProps({
    rows: { type: Number, default: 6 },
});

// Six bars per row: the widest tables in the console are six columns, and a
// skeleton that is wider than the table it stands in reads as a glitch.
const CELLS = 6;
</script>

<template>
    <div class="a-tablewrap">
        <div class="a-sk-h"><i class="a-sk a-sk-t" /></div>
        <div
            v-for="row in rows"
            :key="row"
            class="a-sk-row"
            :style="{ '--a-sk-row': row - 1 }"
        >
            <i v-for="cell in CELLS" :key="cell" class="a-sk a-sk-c" />
        </div>
    </div>
</template>

<style scoped>
.a-sk-t {
    display: block;
    width: 220px;
    height: 13px;
}

/* Rows fade towards the bottom of the list, so the eye reads the block as one
   loading surface rather than six identical stripes. */
.a-sk-c {
    display: block;
    height: 14px;
    opacity: calc(1 - var(--a-sk-row) * 0.09);
}

.a-sk-c:nth-child(1) {
    width: 110px;
}

.a-sk-c:nth-child(2) {
    width: 150px;
}

.a-sk-c:nth-child(3) {
    width: 120px;
}

.a-sk-c:nth-child(4) {
    width: 190px;
}

.a-sk-c:nth-child(5) {
    width: 90px;
}

.a-sk-c:nth-child(6) {
    width: 130px;
}
</style>
