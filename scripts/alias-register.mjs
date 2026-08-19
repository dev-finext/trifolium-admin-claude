// Registers the `@/` alias resolution hook, then does nothing else. Used as
// `node --import ./scripts/alias-register.mjs <script>` so the check scripts can
// import project modules by their bundler aliases.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./alias-hook.mjs', pathToFileURL(import.meta.dirname + '/'));
