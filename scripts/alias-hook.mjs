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

            return nextResolve(pathToFileURL(resolved).href, context);
        }
    }

    return nextResolve(specifier, context);
}
