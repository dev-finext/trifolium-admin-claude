// Code 39 as inline SVG.
//
// Code 39 is the plainest symbology a lab scanner reads: digits, capitals, a
// dash, a dot and a space, framed by `*`. Every character is nine elements —
// five bars and four spaces, three of them wide — and characters are separated
// by one narrow space. That is the whole standard, so the console renders its
// own barcodes instead of shipping a font that may not be installed on the
// printing machine.

/** Element widths per character: n = narrow, w = wide; bar, space, bar, … */
const PATTERNS = {
    0: 'nnnwwnwnn',
    1: 'wnnwnnnnw',
    2: 'nnwwnnnnw',
    3: 'wnwwnnnnn',
    4: 'nnnwwnnnw',
    5: 'wnnwwnnnn',
    6: 'nnwwwnnnn',
    7: 'nnnwnnwnw',
    8: 'wnnwnnwnn',
    9: 'nnwwnnwnn',
    A: 'wnnnnwnnw',
    B: 'nnwnnwnnw',
    C: 'wnwnnwnnn',
    D: 'nnnnwwnnw',
    E: 'wnnnwwnnn',
    F: 'nnwnwwnnn',
    G: 'nnnnnwwnw',
    H: 'wnnnnwwnn',
    I: 'nnwnnwwnn',
    J: 'nnnnwwwnn',
    K: 'wnnnnnnww',
    L: 'nnwnnnnww',
    M: 'wnwnnnnwn',
    N: 'nnnnwnnww',
    O: 'wnnnwnnwn',
    P: 'nnwnwnnwn',
    Q: 'nnnnnnwww',
    R: 'wnnnnnwwn',
    S: 'nnwnnnwwn',
    T: 'nnnnwnwwn',
    U: 'wwnnnnnnw',
    V: 'nwwnnnnnw',
    W: 'wwwnnnnnn',
    X: 'nwnnwnnnw',
    Y: 'wwnnwnnnn',
    Z: 'nwwnwnnnn',
    '-': 'nwnnnnwnw',
    '.': 'wwnnnnwnn',
    ' ': 'nwwnnnwnn',
    $: 'nwnwnwnnn',
    '/': 'nwnwnnnwn',
    '+': 'nwnnnwnwn',
    '%': 'nnnwnwnwn',
    '*': 'nwnnwnwnn',
};

/** The value as Code 39 can carry it: upper case, unknown characters as a dash. */
export function code39Value(value) {
    return String(value ?? '')
        .toUpperCase()
        .split('')
        .map((ch) => (PATTERNS[ch] && ch !== '*' ? ch : '-'))
        .join('');
}

/**
 * An SVG of the barcode, sized by its container (`width/height: 100%`), with the
 * quiet zones included. `ratio` is the wide:narrow element ratio (2.5–3 is the
 * norm); `height` is in narrow-module units and only shapes the viewBox.
 */
export function code39Svg(value, { ratio = 3, quiet = 10, height = 40 } = {}) {
    const text = `*${code39Value(value)}*`;
    const wide = ratio;
    let x = quiet;
    const rects = [];

    for (const ch of text) {
        const pattern = PATTERNS[ch];

        for (let i = 0; i < pattern.length; i += 1) {
            const width = pattern[i] === 'w' ? wide : 1;

            if (i % 2 === 0) {
                rects.push(
                    `<rect x="${x}" y="0" width="${width}" height="${height}" />`,
                );
            }

            x += width;
        }

        // inter-character gap
        x += 1;
    }

    const total = x - 1 + quiet;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${height}" preserveAspectRatio="none" width="100%" height="100%" shape-rendering="crispEdges" fill="#111">${rects.join('')}</svg>`;
}
