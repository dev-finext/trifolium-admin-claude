// A Node module-resolution hook that understands the project's `@/` and `@css/`
// aliases, so the standalone check scripts can import locale catalogs the same
// way the app does. Registered with `node --import ./scripts/alias-hook.mjs`.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');

const ALIASES = {
    '@/': path.join(ROOT, 'resources/js/'),
    '@css/': path.join(ROOT, 'resources/css/'),
    '@img/': path.join(ROOT, 'resources/img/'),
    '@database/': path.join(ROOT, 'database/'),
};

export async function resolve(specifier, context, nextResolve) {
    for (const [alias, target] of Object.entries(ALIASES)) {
        if (specifier.startsWith(alias)) {
            let resolved = path.join(target, specifier.slice(alias.length));

            // Extensionless import: try the file, then the directory's index,
            // matching the bundler's resolution so both `@/lib/money` and
            // `@/locales/he` resolve the way they do in the app.
            if (!/\.[a-z]+$/i.test(resolved)) {
                resolved = existsSync(`${resolved}.js`)
                    ? `${resolved}.js`
                    : path.join(resolved, 'index.js');
            }

            const url = pathToFileURL(resolved).href;

            // A `.json` import needs `with { type: 'json' }` under Node and
            // nothing at all under the bundler. Rather than write the attribute
            // into every source file for Node's sake, the hook supplies it —
            // resolve() returning `importAttributes` is how that is done.
            if (resolved.endsWith('.json')) {
                return {
                    ...(await nextResolve(url, context)),
                    importAttributes: { type: 'json' },
                };
            }

            return nextResolve(url, context);
        }
    }

    return nextResolve(specifier, context);
}
