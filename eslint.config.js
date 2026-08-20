import stylistic from '@stylistic/eslint-plugin';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import prettier from 'eslint-config-prettier/flat';
import importPlugin from 'eslint-plugin-import';
import vue from 'eslint-plugin-vue';

const controlStatements = [
    'if',
    'return',
    'for',
    'while',
    'do',
    'switch',
    'try',
    'throw',
];
const paddingAroundControl = [
    ...controlStatements.flatMap((stmt) => [
        { blankLine: 'always', prev: '*', next: stmt },
        { blankLine: 'always', prev: stmt, next: '*' },
    ]),
];

export default defineConfigWithVueTs(
    vue.configs['flat/essential'],
    vueTsConfigs.recommended,
    {
        plugins: {
            import: importPlugin,
        },
        settings: {
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                    project: './tsconfig.json',
                },
                node: true,
            },
        },
        rules: {
            // Not on by default here: the Vue and TS presets this config builds
            // on do not pull in eslint:recommended. A repeated key in a 3,700-key
            // locale catalog is silently shadowed by the last one — a whole block
            // of copy that never reaches a screen and never reports itself.
            'no-dupe-keys': 'error',
            // Same class of bug one scope up: a second `const x` in the same
            // block is a build error, and catching it at lint time beats
            // catching it when the bundler gives up.
            'no-redeclare': 'error',
            'no-dupe-class-members': 'error',
            // `STAGE_TO_STATUS` was referenced in stores/orders.js and declared
            // nowhere. It never threw because the branch reaching it only runs
            // when an order's status disagrees with its items, which the fixture
            // never does — so the rule that branch implements had never once
            // executed. A build cannot catch this; a linter can.
            'no-undef': 'error',
            'vue/multi-word-component-names': 'off',
            // The codebase is plain-JS SFCs (allowJs) — same as the base
            // repo's migrated components; new components may use lang="ts".
            'vue/block-lang': ['error', { script: { allowNoLang: true, lang: 'ts' } }],
            '@typescript-eslint/no-explicit-any': 'off',
            // Destructure-to-omit ({ meta, ...rest } = item) is a deliberate
            // pattern here (e.g. stripping hold metadata in Pending).
            '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                    fixStyle: 'separate-type-imports',
                },
            ],
            'import/order': [
                'error',
                {
                    groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                },
            ],
            'import/consistent-type-specifier-style': [
                'error',
                'prefer-top-level',
            ],
        },
    },
    {
        plugins: {
            '@stylistic': stylistic,
        },
        rules: {
            '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],
            '@stylistic/padding-line-between-statements': [
                'error',
                ...paddingAroundControl,
            ],
        },
    },
    {
        // The check scripts run under Node, not in a browser, so `process` and
        // friends are real globals there rather than the typos `no-undef` would
        // otherwise call them.
        files: ['scripts/**/*.mjs', 'scripts/**/*.js'],
        languageOptions: {
            globals: {
                process: 'readonly',
                console: 'readonly',
                URL: 'readonly',
            },
        },
    },
    {
        ignores: ['node_modules', 'public', 'dist', 'vite.config.js'],
    },
    prettier, // Turn off all rules that might conflict with Prettier
    {
        plugins: {
            '@stylistic': stylistic,
        },
        rules: {
            curly: ['error', 'all'],
            '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],
        },
    },
);
