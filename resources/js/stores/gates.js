// Gated single actions: which ones this session has re-confirmed. Second-version
// material — the same gate that already protects the supplier cards and the admin
// users, applied to one action at a time.
//
// An unlock is a session fact, never stored: refresh the page and every gate is
// shut again. The approval code is verified by the server; the fixture's session
// carries one only so the flow can be exercised without a backend.
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { persist } from '@/data/source';
import { hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { useDatasetStore } from '@/stores/dataset';

export const useGatesStore = defineStore('gates', () => {
    const dataset = useDatasetStore();

    /** `{ [actionId]: true }` for the actions unlocked in this session. */
    const unlocked = ref({});

    const pin = computed(() => dataset.session?.pin || true);

    const isUnlocked = (id) => Boolean(unlocked.value[id]);

    async function unlock(id, code) {
        try {
            await persist(`gates/${id}/unlock`, { code });
        } catch {
            return false;
        }

        unlocked.value = { ...unlocked.value, [id]: true };

        const log = dataset.data.log;

        if (Array.isArray(log)) {
            log.unshift({
                id: `lg-gate_unlock-${id}-${log.length}`,
                when: {
                    daysAgo: 0,
                    iso: isoDaysAgo(0),
                    time: hm(now()),
                    stamp: stamp(0),
                },
                actorType: 'agent',
                actor: dataset.me?.name || null,
                act: 'gate_unlock',
                entType: 'system',
                ent: id,
                valueType: 'plain',
                from: null,
                to: null,
                src: 'manual',
                ip: null,
            });
        }

        return true;
    }

    function lock(id) {
        const next = { ...unlocked.value };

        delete next[id];
        unlocked.value = next;
    }

    return { unlocked, pin, isUnlocked, unlock, lock };
});
