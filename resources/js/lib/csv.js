// CSV export, in one place.
//
// Every area of the console has an export button, and each one hands over the rows
// that are already on screen rather than announcing a file that never arrives.
// There used to be three copies of this — two components with one signature and
// the orders store with another, all three called `downloadCsv` — which is how a
// caller ends up passing a header array to a parameter expecting a finished string.
//
// The byte-order mark is what makes Excel read the Hebrew columns as UTF-8 instead
// of mojibake, and CRLF is what makes it treat them as rows.
const BOM = '﻿';

/** One field, quoted only when it has to be. */
function field(value) {
    const text = value === null || value === undefined ? '' : String(value);

    if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
}

/**
 * A CSV document from rows already flattened to plain values.
 *
 * @param {string[]} header Column titles, already translated.
 * @param {Array<Array<*>>} rows
 * @returns {string}
 */
export function toCsv(header, rows) {
    const lines = [header, ...rows].map((row) => row.map(field).join(','));

    return `${BOM}${lines.join('\r\n')}\r\n`;
}

/**
 * Save a finished CSV document. For the one caller that has its own serialiser:
 * the drug-interaction export is a round-trip format that `parseInteractionCsv`
 * reads back, so its column shape is a data contract rather than a screen's
 * choice of what to show.
 *
 * @param {string} filename
 * @param {string} text A complete CSV document, BOM included.
 */
export function saveCsv(filename, text) {
    const url = URL.createObjectURL(
        new Blob([text], { type: 'text/csv;charset=utf-8' }),
    );
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

/**
 * Hand the reader a CSV of the rows they are looking at.
 *
 * @param {string} filename
 * @param {string[]} header Column titles, already translated.
 * @param {Array<Array<*>>} rows
 * @returns {number} How many rows were written, for the confirmation message.
 */
export function downloadCsv(filename, header, rows) {
    saveCsv(filename, toCsv(header, rows));

    return rows.length;
}
