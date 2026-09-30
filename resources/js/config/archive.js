// Nothing is deleted.
//
// A record the pharmacy removes stops appearing in the lists and stays in the
// database, marked with who archived it, when, and why. There is no second,
// harder delete behind it: a batch number, an item code or a supplier card that
// once existed is referenced by documents that are not going anywhere, and a row
// that vanishes turns those references into dangling ids.
//
// Two rules, and they are the whole feature:
//
//   * archiving and restoring both require the approval code, every time — an
//     unlock that lasts for a screen is exactly how the wrong thing gets
//     removed while somebody is looking at something else;
//   * every list hides archived rows and offers to show them, so the archive is
//     never a place records disappear into.

/** The mark an archived record carries. `null` on a live one. */
export const ARCHIVE_FIELD = 'archived';

/** Is this record archived? */
export const isArchived = (record) => Boolean(record?.[ARCHIVE_FIELD]);

/** The live rows of a collection. */
export const liveOnly = (rows) =>
    (rows || []).filter((row) => !isArchived(row));

/** The archived rows of a collection, newest first. */
export const archivedOnly = (rows) =>
    (rows || [])
        .filter(isArchived)
        .sort((a, b) =>
            String(b[ARCHIVE_FIELD]?.on?.iso || '').localeCompare(
                String(a[ARCHIVE_FIELD]?.on?.iso || ''),
            ),
        );

/**
 * What a screen shows: the live rows, the archived ones, or both.
 *
 * Held in the URL as `arch`, so a colleague sent a link to the archive opens
 * the archive.
 */
export const ARCHIVE_VIEW_IDS = ['live', 'archived'];

export const pickArchiveView = (rows, view) =>
    view === 'archived' ? archivedOnly(rows) : liveOnly(rows);
