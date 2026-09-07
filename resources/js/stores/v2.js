// Whether the V2 markers are shown.
//
// Everything added in the second round of the console carries a small red "V2"
// badge, so the people reviewing it can see at a glance what is new and decide
// whether it stays. The badges are a review aid, not a product feature: they exist
// only while the console runs on the demo fixture, and a reviewer can hide them all
// to see the screen as it would ship.
//
// The preference is this browser's. It is a convenience, never a requirement.
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { isDemoData } from '@/data/source';

const STORAGE_KEY = 'trifolium-admin-v2-marks';

function readStored() {
    try {
        return localStorage.getItem(STORAGE_KEY) !== 'off';
    } catch {
        return true;
    }
}

export const useV2Store = defineStore('v2', () => {
    const enabled = ref(readStored());

    /** Markers can only ever appear against the demo fixture. */
    const available = isDemoData;

    const shown = computed(() => available && enabled.value);

    function toggle() {
        enabled.value = !enabled.value;

        try {
            localStorage.setItem(STORAGE_KEY, enabled.value ? 'on' : 'off');
        } catch {
            // Private-mode browsers refuse; the toggle still works for this session.
        }
    }

    return { available, shown, toggle };
});
