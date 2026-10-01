<script setup>
// The strip that says this is not the real thing.
//
// The console is close enough to finished that somebody can forget which one
// they are looking at — the data behind it is the pharmacy's own, restored out
// of SAP, and a screen full of real item codes and real practitioners does not
// announce itself as a rehearsal. So the window says it, once, at the top.
//
// It sits in the layout rather than over it. A bar that floats above the page
// covers whatever is underneath it, and the one thing a demo marker must never
// do is hide a control somebody is trying to reach; this one takes its own
// twenty-four pixels and gives nothing else up. The drawers and their scrim
// start below it for the same reason — an open record covers the whole screen,
// and the marker would be the first thing to go.
//
// When this console stops being a demo, deleting the component from
// `AdminShell` and `--a-demo-h` from the stylesheet is the whole removal.
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
    <div class="a-demotop" role="status">
        <span class="a-demotop-t">{{ t('shell.demoBanner') }}</span>
    </div>
</template>
