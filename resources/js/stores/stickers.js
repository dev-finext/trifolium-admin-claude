// The stickers module: templates, the notes pool, the print log, the counts.
// Second-version material (dev/progress.js → `labels`).
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { STICKER_RULES } from '@/config';
import { persist } from '@/data/source';
import { hm, isoDaysAgo, now, stamp } from '@/lib/dates';
import { useDatasetStore } from '@/stores/dataset';

function moment() {
    return { daysAgo: 0, iso: isoDaysAgo(0), time: hm(now()), stamp: stamp(0) };
}

const clone = (value) => JSON.parse(JSON.stringify(value));

export const useStickersStore = defineStore('stickers', () => {
    const dataset = useDatasetStore();

    const list = (name) =>
        Array.isArray(dataset.data[name]) ? dataset.data[name] : [];

    const templates = computed(() => list('stickerTemplates'));
    const notes = computed(() => list('stickerNotes'));
    const prints = computed(() => list('stickerPrints'));

    /** The templates as they were before this session touched them — what reset restores. */
    const initial = ref(null);

    function snapshot() {
        if (!initial.value && templates.value.length) {
            initial.value = clone(templates.value);
        }
    }

    const actor = computed(
        () => dataset.me?.name || dataset.session?.actor || null,
    );

    const templateById = (id) =>
        templates.value.find((template) => template.id === id) || null;

    /** The pool notes that print on a preparation of this type. */
    const notesFor = (prepTypeId) =>
        notes.value.filter(
            (note) =>
                note.active &&
                (note.all || (note.prepTypes || []).includes(prepTypeId)),
        );

    /** How many labels one preparation line needs: one per package, a spare for capsules. */
    function prepCount(item) {
        const packages = Math.max(1, Number(item.packages) || 1);
        const spare = item.unit === 'capsule' ? STICKER_RULES.capsuleSpare : 0;

        return packages + spare;
    }

    /** How many labels a goods-receipt line asked for. */
    const itemCount = (line) =>
        line.labels === undefined || line.labels === null
            ? 1
            : Math.max(0, Number(line.labels) || 0);

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
            actor: actor.value,
            valueType: 'plain',
            from: null,
            to: null,
            src: 'manual',
            ip: null,
            ...row,
        });
    }

    async function saveTemplate(id, patch) {
        snapshot();

        const template = templateById(id);

        if (!template) {
            return null;
        }

        Object.assign(template, clone(patch), {
            updated: moment(),
            updatedBy: actor.value,
        });
        writeLog({
            act: 'sticker_template_update',
            entType: 'sticker_template',
            ent: id,
            to: `${template.elements.length}`,
        });
        await persist('stickerTemplates', template);

        return template;
    }

    async function resetTemplate(id) {
        snapshot();

        const source = (initial.value || []).find((row) => row.id === id);
        const template = templateById(id);

        if (!source || !template) {
            return null;
        }

        Object.assign(template, clone(source), {
            updated: moment(),
            updatedBy: actor.value,
        });
        writeLog({
            act: 'sticker_template_update',
            entType: 'sticker_template',
            ent: id,
            to: 'reset',
        });
        await persist('stickerTemplates', template);

        return template;
    }

    /** Create or update one pool note. Editing the text changes every future print. */
    async function saveNote(form) {
        const rows = bag('stickerNotes');
        const text = String(form.text || '').trim();
        const existing = form.id
            ? rows.find((row) => row.id === form.id)
            : null;
        const row = existing || {
            id: `sn-${rows.length + 1}-${Date.now().toString(36)}`,
            active: true,
        };

        Object.assign(row, {
            text: { he: text, en: text },
            all: Boolean(form.all),
            prepTypes: form.all ? [] : [...(form.prepTypes || [])],
            active: form.active !== false,
            updated: moment(),
            updatedBy: actor.value,
        });

        if (!existing) {
            rows.unshift(row);
        }

        writeLog({
            act: 'sticker_note_update',
            entType: 'sticker_note',
            ent: row.id,
            to: text,
        });
        await persist('stickerNotes', row);

        return row;
    }

    async function removeNote(id) {
        const rows = bag('stickerNotes');
        const at = rows.findIndex((row) => row.id === id);

        if (at < 0) {
            return false;
        }

        rows.splice(at, 1);
        writeLog({
            act: 'sticker_note_update',
            entType: 'sticker_note',
            ent: id,
            to: 'removed',
        });
        await persist('stickerNotes', { id, removed: true });

        return true;
    }

    /** One print run: which template, for what, how many labels. */
    async function recordPrint({ template, ref, count, detail = '' }) {
        const rows = bag('stickerPrints');
        const row = {
            id: `sp-${rows.length + 1}-${Date.now().toString(36)}`,
            template,
            ref,
            count,
            detail,
            when: moment(),
            by: actor.value,
        };

        rows.unshift(row);
        writeLog({
            act: 'sticker_print',
            entType: template === 'item' ? 'batch' : 'order',
            ent: ref,
            to: `${template} × ${count}`,
        });
        await persist('stickerPrints', row);

        return row;
    }

    return {
        templates,
        notes,
        prints,
        templateById,
        notesFor,
        prepCount,
        itemCount,
        saveTemplate,
        resetTemplate,
        saveNote,
        removeNote,
        recordPrint,
    };
});
