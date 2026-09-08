// PRE-PUBLICATION CHECK — not part of `npm run verify`.
//
// The fixture deliberately carries the designer's original contact details, so
// the console can be compared against the design screen by screen. Those values
// are fabricated, but they are shaped like real Israeli phone numbers, national
// ID numbers and company numbers, and a national ID even carries a valid check
// digit.
//
// That is fine for a local demo and NOT fine in a public repository. Run this
// before making the repository public or deploying it anywhere reachable:
//
//     npm run check:privacy
//
// It is read-only — it reports, it never rewrites.
//
//   node scripts/check-fixture-privacy.mjs
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOTS = ['resources/js/demo', 'resources/js/config'].map((p) =>
    path.join(root, p),
);

/** Israeli ID check digit: valid when the weighted digit sum is a multiple of 10. */
function checksumValid(digits) {
    if (!/^\d{9}$/.test(digits)) {
        return false;
    }

    let sum = 0;

    for (let i = 0; i < 9; i += 1) {
        let n = Number(digits[i]) * (i % 2 === 0 ? 1 : 2);

        if (n > 9) {
            n -= 9;
        }

        sum += n;
    }

    return sum % 10 === 0;
}

const files = [];

// One level down as well, and JSON as well as JavaScript: the real extract in
// `demo/real/` is exactly the kind of file this check exists for.
async function collect(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            await collect(full);
        } else if (entry.name.endsWith('.js') || entry.name.endsWith('.json')) {
            files.push(full);
        }
    }
}

for (const dir of ROOTS) {
    await collect(dir);
}

const source = (await Promise.all(files.map((f) => readFile(f, 'utf8')))).join(
    '\n',
);

const distinct = (re) => [
    ...new Set([...source.matchAll(re)].map((m) => m[1])),
];

// A phone is acceptable only if its subscriber part is the 000 block.
const phones = distinct(/(?:phone|mobile|office|testPhone):\s*'([\d-]+)'/g);
const realisticPhones = phones.filter(
    (p) => !p.replace(/-/g, '').includes('000'),
);

// National IDs must be 9-prefixed AND fail the check digit, so they cannot
// coincide with a well-formed real ID.
const ids = distinct(/\btz:\s*'(\d+)'/g);
const realisticIds = ids.filter((v) => !v.startsWith('9') || checksumValid(v));

// Company registration numbers must be 8-prefixed.
const companies = distinct(/\bbiz:\s*'(\d+)'/g);
const realisticCompanies = companies.filter((v) => !v.startsWith('8'));

// Every email domain must sit under a reserved TLD.
const emails = distinct(/'([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})'/g);
const routableEmails = emails.filter((e) => {
    const domain = e.split('@')[1];

    return (
        !/\.(example|invalid|test|localhost)$/.test(domain) &&
        domain !== 'example.com'
    );
});

// Identifiers must stay distinct — they are searched on, so a collision would
// silently merge two records.
const idCollision = ids.length !== new Set(ids).size;
const companyCollision = companies.length !== new Set(companies).size;

const checks = [
    ['phone numbers are synthetic', realisticPhones],
    ['national IDs cannot be real', realisticIds],
    ['company numbers are synthetic', realisticCompanies],
    ['email domains are reserved', routableEmails],
];

let failures = 0;

console.log(
    `${phones.length} phones · ${ids.length} national IDs · ` +
        `${companies.length} company numbers · ${emails.length} emails\n`,
);

for (const [label, offenders] of checks) {
    if (offenders.length) {
        failures += offenders.length;
        console.log(`✗ ${label} (${offenders.length})`);
        offenders.slice(0, 12).forEach((o) => console.log(`    ${o}`));
    } else {
        console.log(`✓ ${label}`);
    }
}

if (idCollision || companyCollision) {
    failures += 1;
    console.log(
        '✗ identifiers are distinct — a collision would merge two records',
    );
} else {
    console.log('✓ identifiers are distinct');
}

if (failures) {
    console.log(
        `\n${failures} problem(s). Do not publish until these are resolved.`,
    );
    process.exit(1);
}

console.log('\nNothing in the fixture resembles real personal data.');
