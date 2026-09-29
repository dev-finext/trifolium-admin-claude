// V3 — טיוטות: טופס שנעצר באמצע וחוזר.
//
// A parked form is the editor's own reactive state, flattened to JSON and put
// back when the editor opens again. Two things make that safe enough to do.
//
// The first is that a draft only fills in keys the form already has. A draft
// written before a field was added, renamed or removed must not be able to put
// that field back — the form's own shape is the truth about what an editor
// edits, and a stale draft is only allowed to supply values for it.
//
// The second is the stamp. The record may have moved on while the draft sat in
// the tray, and putting the typing back over it would quietly undo whoever
// changed it. So the record's own last-changed stamp travels with the draft and
// is compared on the way back. It does not block — the typing belongs to the
// reader and they may well still want it — it is said out loud, above the form,
// before anything is saved.

/** A form's state as it can be stored: plain data, no proxies, no functions. */
export function snapshot(form) {
    try {
        return JSON.parse(JSON.stringify(form));
    } catch {
        // A circular or unserialisable form cannot be parked. Better to park
        // nothing than to park something that will not come back.
        return null;
    }
}

const isPlain = (value) =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Put a draft back into a form, key by key, keeping the form's own shape.
 *
 * @param {object} form   the editor's reactive state, edited in place
 * @param {object} draft  what was parked
 */
export function applyDraft(form, draft) {
    if (!form || !isPlain(draft)) {
        return form;
    }

    for (const key of Object.keys(form)) {
        if (!(key in draft)) {
            continue;
        }

        const next = draft[key];
        const here = form[key];

        // A nested group — `names`, `flags`, `uom` — is merged the same way, so
        // a field added inside one keeps the value the form gave it.
        if (isPlain(here) && isPlain(next)) {
            applyDraft(here, next);
            continue;
        }

        form[key] = next;
    }

    return form;
}

/** The record's own last-changed stamp, in whatever shape it carries one. */
export function stampOf(record) {
    if (!record) {
        return null;
    }

    const when = record.updated || record.updatedAt || record.when || null;

    if (!when) {
        return null;
    }

    return String(when.iso || when.stamp || when);
}

/** Has the record changed since the draft was parked? */
export const recordMoved = (record, stamp) =>
    Boolean(stamp) && stampOf(record) !== stamp;
