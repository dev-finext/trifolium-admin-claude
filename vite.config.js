// Standalone SPA build. The `resources/` layout mirrors the practitioner-facing
// trifolium-frontend repo so this console can later be mounted inside the same
// Laravel app without moving files.
//
// BASE_PATH is for a sub-path deploy: asset URLs are baked in at build time, so
// serving the console from /admin/ needs `BASE_PATH=/admin/ npm run build`.
// Unset it stays "/", which is what `npm run dev` and a root deploy want.
//
// Which data source a build carries is NOT decided here — it is `.env.production`
// and `.env.development`, read straight in resources/js/data/source.js so the
// branch folds and a production bundle drops the demo fixture entirely.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    base: process.env.BASE_PATH || '/',
    plugins: [tailwindcss(), vue()],
    resolve: {
        alias: {
            '@': path.resolve(rootDir, 'resources/js'),
            '@css': path.resolve(rootDir, 'resources/css'),
            '@img': path.resolve(rootDir, 'resources/img'),
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
            output: {
                // Vue, the router, the store and i18n change when a dependency is
                // upgraded — a few times a year. The console's own code changes
                // weekly. Splitting them means a release only invalidates the
                // application chunk, and the framework stays in the browser cache.
                manualChunks: {
                    vendor: ['vue', 'vue-router', 'pinia', 'vue-i18n'],
                },
            },
        },
    },
});
