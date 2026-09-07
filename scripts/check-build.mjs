// POST-BUILD CHECK — the last gate before a production bundle ships.
//
// `check-fixture-privacy.mjs` reads the source. This reads the OUTPUT, which is
// the only thing that actually gets served, and answers one question: did any
// fabricated personal data survive into it?
//
// The two are not interchangeable. The fixture is excluded by a compile-time fold
// in data/source.js, and a fold is easy to break by accident — routing
// `import.meta.env` through a local const is enough to stop Vite substituting a
// literal, after which the branch survives and 105 kB of plausible-looking Israeli
// phone numbers and national IDs go out with the bundle. That regression is
// invisible in the source and obvious here.
//
//   node scripts/check-build.mjs [dist]
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(root, process.argv[2] || 'dist');

/**
 * Values taken from the fixture itself — a real phone, national ID, company
 * number and email that exist in resources/js/demo/. Any one of them appearing in
 * the output means the whole fixture did.
 */
const FIXTURE_MARKERS = [
    ['a phone number', '052-886-4546'],
    ['a national ID', '029384756'],
    ['a company number', '513874902'],
    ['a practitioner email', 'dan@ether.co.il'],
    // Not personal data, but demo-only all the same: the development progress
    // article, whose route is folded out of an api build in router/index.js.
    ['the development article', 'dev-progress-article-v2'],
];

async function walk(dir, out = []) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            await walk(full, out);
        } else {
            out.push(full);
        }
    }

    return out;
}

try {
    await stat(dist);
} catch {
    console.log(`✗ no build at ${path.relative(root, dist)} — run the build first`);
    process.exit(1);
}

const files = await walk(dist);
const texts = await Promise.all(
    files
        .filter((f) => /\.(js|css|html|json|map)$/.test(f))
        .map(async (f) => [f, await readFile(f, 'utf8')]),
);

const found = [];

for (const [label, marker] of FIXTURE_MARKERS) {
    const hits = texts
        .filter(([, body]) => body.includes(marker))
        .map(([file]) => path.relative(dist, file));

    if (hits.length) {
        found.push(`${label} (${marker}) in ${hits.join(', ')}`);
    }
}

console.log(`checked ${texts.length} built files in ${path.relative(root, dist)}\n`);

if (found.length) {
    console.log('✗ demo-only content is in the production bundle');
    found.forEach((row) => console.log(`    ${row}`));
    console.log(
        '\nBuild with VITE_DATA_SOURCE=api. If it is already set, the fold in' +
            '\nresources/js/data/source.js has stopped working — check that' +
            '\nimport.meta.env is read directly there and not through a local const.',
    );
    process.exit(1);
}

console.log('✓ no fabricated personal data in the built output');
