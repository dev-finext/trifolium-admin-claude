// V3 — כתיבת קובץ אקסל, בלי ספרייה.
//
// One report in this console has to come out of it byte-shaped like something
// else: ירון's stock-analysis report, which he exports from SAP and pastes into
// a workbook of his own. What happens inside that workbook is his, and the
// point of this file is that it can stay his — the export has to carry the same
// sheet, the same header row and the same value types, or his formulas land on
// the wrong columns.
//
// An .xlsx is a zip of a handful of XML files, so that is what this writes. No
// dependency, because the alternative is nine hundred kilobytes of spreadsheet
// library to produce one fixed-shape sheet, and because the exact bytes are the
// requirement here rather than an implementation detail to delegate.
//
// The entries are STORED, not deflated. A zip may hold either, every reader
// accepts both, and stored costs a larger file in exchange for not carrying a
// compressor. A report of a few thousand rows lands around a megabyte.
//
// Values keep their type. A number is written as a number so it can be summed,
// and everything else as an inline string — which also stops Excel reading a
// month heading like "2025-08" as a date and quietly turning it into 01/08/2025.

/** The zip checksum, table built once on first use. */
let CRC_TABLE = null;

function crcTable() {
    if (CRC_TABLE) {
        return CRC_TABLE;
    }

    CRC_TABLE = new Uint32Array(256);

    for (let n = 0; n < 256; n += 1) {
        let c = n;

        for (let k = 0; k < 8; k += 1) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }

        CRC_TABLE[n] = c >>> 0;
    }

    return CRC_TABLE;
}

function crc32(bytes) {
    const table = crcTable();
    let c = 0xffffffff;

    for (let i = 0; i < bytes.length; i += 1) {
        c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    }

    return (c ^ 0xffffffff) >>> 0;
}

const utf8 = (text) => new TextEncoder().encode(text);

/** XML text: the five characters that cannot appear raw, and nothing else. */
function esc(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/** 1 → A, 27 → AA. Spreadsheet columns are base-26 with no zero. */
export function columnLetter(index) {
    let n = index;
    let out = '';

    while (n > 0) {
        const rem = (n - 1) % 26;

        out = String.fromCharCode(65 + rem) + out;
        n = Math.floor((n - 1) / 26);
    }

    return out;
}

/** MS-DOS time and date, which is what a zip entry carries. */
function dosStamp(date) {
    const time =
        (date.getHours() << 11) |
        (date.getMinutes() << 5) |
        (Math.floor(date.getSeconds() / 2) & 0x1f);
    const day =
        ((date.getFullYear() - 1980) << 9) |
        ((date.getMonth() + 1) << 5) |
        date.getDate();

    return { time, day };
}

function isNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function cellXml(value, ref) {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    if (isNumber(value)) {
        return `<c r="${ref}"><v>${value}</v></c>`;
    }

    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
}

function sheetXml(rows) {
    const body = rows
        .map((row, r) => {
            const cells = row
                .map((value, c) =>
                    cellXml(value, `${columnLetter(c + 1)}${r + 1}`),
                )
                .join('');

            return `<row r="${r + 1}">${cells}</row>`;
        })
        .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const BOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;

const workbookXml = (name) =>
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(name)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;

/** A zip holding the given files, every entry stored rather than deflated. */
function zip(files, now) {
    const { time, day } = dosStamp(now);
    const locals = [];
    const central = [];
    let offset = 0;

    for (const file of files) {
        const name = utf8(file.name);
        const body = utf8(file.text);
        const sum = crc32(body);

        const local = new Uint8Array(30 + name.length + body.length);
        const lv = new DataView(local.buffer);

        lv.setUint32(0, 0x04034b50, true);
        lv.setUint16(4, 20, true); // version needed
        lv.setUint16(6, 0x0800, true); // names are UTF-8
        lv.setUint16(8, 0, true); // stored
        lv.setUint16(10, time, true);
        lv.setUint16(12, day, true);
        lv.setUint32(14, sum, true);
        lv.setUint32(18, body.length, true);
        lv.setUint32(22, body.length, true);
        lv.setUint16(26, name.length, true);
        lv.setUint16(28, 0, true);
        local.set(name, 30);
        local.set(body, 30 + name.length);
        locals.push(local);

        const entry = new Uint8Array(46 + name.length);
        const cv = new DataView(entry.buffer);

        cv.setUint32(0, 0x02014b50, true);
        cv.setUint16(4, 20, true); // version made by
        cv.setUint16(6, 20, true); // version needed
        cv.setUint16(8, 0x0800, true);
        cv.setUint16(10, 0, true);
        cv.setUint16(12, time, true);
        cv.setUint16(14, day, true);
        cv.setUint32(16, sum, true);
        cv.setUint32(20, body.length, true);
        cv.setUint32(24, body.length, true);
        cv.setUint16(28, name.length, true);
        cv.setUint32(42, offset, true);
        entry.set(name, 46);
        central.push(entry);

        offset += local.length;
    }

    const centralSize = central.reduce((n, one) => n + one.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);

    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);

    return new Blob([...locals, ...central, end], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
}

/**
 * A one-sheet workbook.
 *
 * @param {{name: string, rows: Array<Array<string|number|null>>}} sheet
 *   `rows[0]` is the header row; it is not treated specially, which is what
 *   keeps it identical to whatever the caller wants in it.
 * @returns {Blob}
 */
export function buildXlsx({ name = 'Sheet1', rows = [] }) {
    return zip(
        [
            { name: '[Content_Types].xml', text: CONTENT_TYPES },
            { name: '_rels/.rels', text: ROOT_RELS },
            { name: 'xl/workbook.xml', text: workbookXml(name) },
            { name: 'xl/_rels/workbook.xml.rels', text: BOOK_RELS },
            { name: 'xl/worksheets/sheet1.xml', text: sheetXml(rows) },
        ],
        new Date(),
    );
}

/** Build it and hand it to the browser to save. */
export function downloadXlsx(filename, sheet) {
    const url = URL.createObjectURL(buildXlsx(sheet));
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Given back on the next turn of the loop, once the click has been taken.
    setTimeout(() => URL.revokeObjectURL(url), 0);

    return sheet.rows.length;
}
