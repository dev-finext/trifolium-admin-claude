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

/** Hand a built workbook to the browser to save. */
function save(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Given back on the next turn of the loop, once the click has been taken.
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Build it and hand it to the browser to save. */
export function downloadXlsx(filename, sheet) {
    save(filename, buildXlsx(sheet));

    return sheet.rows.length;
}

// ---- a styled sheet ----------------------------------------------------------
//
// 12.11.2026. One more file has to come out looking like something else: the
// purchase order a supplier receives, in the shape of the sample Avichai sent
// (config/supplierSheet.js holds the shape and says where every number in it
// comes from). What makes it look like that is fonts, alignment, wrapping,
// column widths, row heights and one merged cell — so this writes those as
// well: the same zip, plus a stylesheet. `buildXlsx` above is untouched, and
// the reports built with it keep their exact bytes.

/** Number formats Excel knows by number; anything else gets an id from 164. */
const BUILTIN_FORMAT = { General: 0, 0: 1, '0.00': 2, '#,##0': 3 };

/** What Excel does not allow in a sheet's name, and its length limit. */
const SHEET_NAME_BAD = /[:\\/?*[\]]/g;
const SHEET_NAME_MAX = 31;

const STYLED_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

const STYLED_BOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

function fontXml(font) {
    return `<font>${font.bold ? '<b/>' : ''}<sz val="${font.size}"/><name val="${esc(font.name)}"/></font>`;
}

/**
 * The stylesheet: the fonts as given — the first is the workbook's default,
 * which an empty cell is drawn in and a column's width is measured in — and one
 * cell format per style, the first being the default cell.
 */
function stylesXml(fonts, styles) {
    const custom = [];
    const formatId = (code) => {
        if (!code || code === 'General') {
            return 0;
        }

        if (code in BUILTIN_FORMAT) {
            return BUILTIN_FORMAT[code];
        }

        if (!custom.includes(code)) {
            custom.push(code);
        }

        return 164 + custom.indexOf(code);
    };

    const xfs = styles.map((style) => {
        const numFmtId = formatId(style.numFmt);
        const align = [
            style.horizontal ? ` horizontal="${style.horizontal}"` : '',
            style.vertical ? ` vertical="${style.vertical}"` : '',
            style.wrap ? ' wrapText="1"' : '',
            // Shrink to fit: Excel draws text that is too wide smaller instead
            // of wrapping it. It only works on a cell that does not wrap.
            style.shrink && !style.wrap ? ' shrinkToFit="1"' : '',
        ].join('');
        const applied = [
            ' applyFont="1"',
            numFmtId ? ' applyNumberFormat="1"' : '',
            align ? ' applyAlignment="1"' : '',
        ].join('');

        return `<xf numFmtId="${numFmtId}" fontId="${style.font || 0}" fillId="0" borderId="0" xfId="0"${applied}>${
            align ? `<alignment${align}/>` : ''
        }</xf>`;
    });

    const numFmts = custom.length
        ? `<numFmts count="${custom.length}">${custom
              .map(
                  (code, i) =>
                      `<numFmt numFmtId="${164 + i}" formatCode="${esc(code)}"/>`,
              )
              .join('')}</numFmts>`
        : '';

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${numFmts}<fonts count="${fonts.length}">${fonts
        .map(fontXml)
        .join(
            '',
        )}</fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join(
        '',
    )}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}

/** One styled cell: a number, text (line breaks kept), or an empty styled cell. */
function styledCellXml(cell, ref) {
    if (!cell) {
        return '';
    }

    const style = cell.s ? ` s="${cell.s}"` : '';
    const value = cell.v;

    if (value === null || value === undefined || value === '') {
        return style ? `<c r="${ref}"${style}/>` : '';
    }

    if (isNumber(value)) {
        return `<c r="${ref}"${style}><v>${value}</v></c>`;
    }

    return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
}

function styledSheetXml(sheet) {
    const view = sheet.rightToLeft
        ? '<sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews>'
        : '';
    const cols = (sheet.cols || []).length
        ? `<cols>${sheet.cols
              .map(
                  (width, i) =>
                      `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`,
              )
              .join('')}</cols>`
        : '';
    const rows = (sheet.rows || [])
        .map((row, r) => {
            const height = row.height
                ? ` ht="${row.height}" customHeight="1"`
                : '';
            const cells = (row.cells || [])
                .map((cell, c) =>
                    styledCellXml(cell, `${columnLetter(c + 1)}${r + 1}`),
                )
                .join('');

            return `<row r="${r + 1}"${height}>${cells}</row>`;
        })
        .join('');
    const merges = (sheet.merges || []).length
        ? `<mergeCells count="${sheet.merges.length}">${sheet.merges
              .map((ref) => `<mergeCell ref="${ref}"/>`)
              .join('')}</mergeCells>`
        : '';
    const m = sheet.margins;
    const margins = m
        ? `<pageMargins left="${m.left}" right="${m.right}" top="${m.top}" bottom="${m.bottom}" header="${m.header}" footer="${m.footer}"/>`
        : '';

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${view}<sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rows}</sheetData>${merges}${margins}</worksheet>`;
}

/** A sheet's name as Excel will take it: no forbidden characters, 31 at most. */
export function sheetName(name) {
    const clean = String(name || 'Sheet1')
        .replace(SHEET_NAME_BAD, ' ')
        .trim();

    return (clean || 'Sheet1').slice(0, SHEET_NAME_MAX);
}

/**
 * A one-sheet workbook that carries its look.
 *
 * @param {object}   sheet
 * @param {string}   sheet.name     the tab's name (made safe by `sheetName`)
 * @param {boolean}  [sheet.rightToLeft]  false: the sheet reads left to right
 * @param {Array<{name: string, size: number, bold?: boolean}>} sheet.fonts
 *   the first is the workbook's default font
 * @param {Array<{font?: number, horizontal?: string, vertical?: string,
 *   wrap?: boolean, shrink?: boolean, numFmt?: string}>} sheet.styles
 *   cell formats, by index; the first is the default cell
 * @param {number[]} [sheet.cols]   column widths, in Excel's character units
 * @param {Array<{height?: number, cells: Array<{v?: string|number|null,
 *   s?: number}|null>}>} sheet.rows   a row's height in points
 * @param {string[]} [sheet.merges] merged ranges, e.g. `B1:J1`
 * @param {{left: number, right: number, top: number, bottom: number,
 *   header: number, footer: number}} [sheet.margins]  in inches
 * @returns {Blob}
 */
export function buildStyledXlsx(sheet) {
    return zip(
        [
            { name: '[Content_Types].xml', text: STYLED_CONTENT_TYPES },
            { name: '_rels/.rels', text: ROOT_RELS },
            {
                name: 'xl/workbook.xml',
                text: workbookXml(sheetName(sheet.name)),
            },
            { name: 'xl/_rels/workbook.xml.rels', text: STYLED_BOOK_RELS },
            {
                name: 'xl/styles.xml',
                text: stylesXml(sheet.fonts, sheet.styles),
            },
            { name: 'xl/worksheets/sheet1.xml', text: styledSheetXml(sheet) },
        ],
        new Date(),
    );
}

/** Build a styled workbook and hand it to the browser to save. */
export function downloadStyledXlsx(filename, sheet) {
    save(filename, buildStyledXlsx(sheet));

    return sheet.rows.length;
}
