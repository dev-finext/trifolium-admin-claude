// Printing.
//
// A printable document is opened in its own window with only the styles it
// needs, and the browser's own print dialog does the rest. Nothing here talks to
// a printer, spools a job or claims a page came out — the dialog is the user's.

/** Escape text for insertion into the generated markup. */
export function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const BASE_CSS = `
    * { box-sizing: border-box; }
    body { margin: 0; padding: 18mm 16mm; font: 13px/1.5 "Segoe UI", Arial, sans-serif; color: #1f2e1d; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 15px; margin: 18px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #cdd4c5; }
    .meta { color: #5d6a58; font-size: 12px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; }
    th, td { padding: 5px 7px; border-bottom: 1px solid #e0e5da; text-align: start; vertical-align: top; }
    th { font-size: 11px; letter-spacing: .04em; text-transform: uppercase; color: #5d6a58; background: #f0f3ed; }
    .num, .code { font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: isolate; }
    .code { font-family: ui-monospace, Consolas, monospace; font-size: 12px; }
    .box { border: 1px solid #cdd4c5; border-radius: 6px; padding: 8px 10px; margin: 6px 0; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .sig { height: 44px; border-bottom: 1px solid #1f2e1d; margin-top: 18px; }
    .small { font-size: 11px; color: #5d6a58; }
    .warn { border: 1px solid #ead9b4; background: #fbf1de; padding: 8px 10px; border-radius: 6px; }
    .barcode { font-family: ui-monospace, Consolas, monospace; font-size: 15px; letter-spacing: .08em; direction: ltr; unicode-bidi: isolate; }
    @page { margin: 0; }
`;

/**
 * Open a document in a new window and hand it to the print dialog.
 *
 * @param {string} title  The window title.
 * @param {string} body   Inner HTML of the document body — already escaped.
 * @param {'rtl'|'ltr'} dir
 * @returns {boolean} false when the browser blocked the window.
 */
export function printHtml(title, body, dir = 'rtl') {
    const win = window.open('', '_blank', 'width=900,height=1000');

    if (!win) {
        return false;
    }

    win.document.write(
        `<!doctype html><html dir="${dir}" lang="${dir === 'rtl' ? 'he' : 'en'}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${BASE_CSS}</style></head><body>${body}</body></html>`,
    );
    win.document.close();
    win.focus();

    // Fonts and layout settle in the next frame; printing before that gives a
    // blank first page in some browsers.
    win.setTimeout(() => win.print(), 150);

    return true;
}
