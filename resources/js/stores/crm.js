// CRM activities: every contact with a practitioner, customer or supplier, filed
// under the card with a managed type and subject. Second-version material.
import { defineStore } from 'pinia';
import { computed } from 'vue';

import { persist } from '@/data/source';
import { hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { useDatasetStore } from '@/stores/dataset';

function moment() {
    return { daysAgo: 0, iso: isoDaysAgo(0), time: hm(now()), stamp: stamp(0) };
}

export const useCrmStore = defineStore('crm', () => {
    const dataset = useDatasetStore();

    const activities = computed(() =>
        Array.isArray(dataset.data.activities) ? dataset.data.activities : [],
    );

    /** Activities on one card, newest first. */
    const activitiesOf = (entity, ref) =>
        activities.value
            .filter((row) => row.entity === entity && row.ref === ref)
            .sort((a, b) => a.when.daysAgo - b.when.daysAgo);

    /** Activities that name one order. */
    const activitiesOfOrder = (orderId) =>
        activities.value.filter((row) => row.order === orderId);

    function bag(name) {
        if (!Array.isArray(dataset.data[name])) {
            dataset.data[name] = [];
        }

        return dataset.data[name];
    }

    function writeLog(row) {
        const log = bag('log');

        log.unshift({
            id: `lg-${row.act}-${row.ent}-${log.length}`,
            when: moment(),
            actorType: 'agent',
            actor: dataset.me?.name || null,
            valueType: 'plain',
            from: null,
            to: null,
            src: 'manual',
            ip: null,
            ...row,
        });
    }

    /**
     * Record one activity. `auto` marks a row the console wrote by itself — a
     * cancellation filed as an activity — as opposed to one an agent typed.
     */
    async function addActivity({
        entity,
        ref,
        type,
        subject,
        text,
        order = null,
        auto = false,
    }) {
        const rows = bag('activities');
        const body = String(text || '').trim();
        const highest = rows.reduce((top, row) => {
            const digits = String(row.id).match(/(\d+)$/);

            return digits ? Math.max(top, Number(digits[1])) : top;
        }, 0);
        const row = {
            id: `act-${highest + 1}`,
            entity,
            ref,
            type,
            subject,
            text: { he: body, en: body },
            by: dataset.me?.name || null,
            when: moment(),
            order: order || null,
            auto,
        };

        rows.unshift(row);
        writeLog({
            act: 'activity_add',
            entType: entity,
            ent: ref,
            to: `${type} · ${subject}`,
        });
        await persist('activities', row);

        return row;
    }

    return { activities, activitiesOf, activitiesOfOrder, addActivity };
});
