<script setup>
// The development progress article. Demo only; Hebrew only (see dev/progress.js).
//
// One long page: a table of contents that scrolls to the exact section, then the
// sections grouped by part. Every V2 badge in the console lands here on a `#id`.
//
// The body scroller is `.a-body`, not the window, so the router's scrollBehavior
// never reaches an anchor — this view scrolls to the hash itself, on mount and
// whenever the hash changes while it is open. A timeout, not requestAnimationFrame:
// a hidden tab pauses animation frames, and a deep link should land regardless.
import { computed, nextTick, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import PageHead from '@/components/layout/PageHead.vue';
import AChip from '@/components/ui/AChip.vue';
import AIcon from '@/components/ui/AIcon.vue';
import { DEV_PROGRESS_MARKER, PARTS, SECTIONS, UPDATED } from '@/dev/progress';
import { useV2Store } from '@/stores/v2';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const v2 = useV2Store();

const STATUS_TONE = {
    built: 'green',
    building: 'blue',
    planned: 'gray',
    blocked: 'red',
};

const parts = computed(() =>
    PARTS.map((part) => ({
        ...part,
        sections: SECTIONS.filter((section) => section.part === part.id),
    })),
);

const counts = computed(() => ({
    built: SECTIONS.filter((s) => s.part === 'built' && s.status === 'built')
        .length,
    planned: SECTIONS.filter((s) => s.part === 'built' && s.status !== 'built')
        .length,
    blocked: SECTIONS.filter((s) => s.part === 'blocked').length,
}));

function scrollToHash() {
    const id = route.hash.replace(/^#/, '');

    if (!id) {
        return;
    }

    nextTick(() => {
        setTimeout(() => {
            document
                .getElementById(id)
                ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        });
    });
}

onMounted(scrollToHash);
watch(() => route.hash, scrollToHash);

function go(id) {
    router.replace({ hash: `#${id}` });
}

function top() {
    router.replace({ hash: '' });
    document.querySelector('.a-body')?.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

<template>
    <div class="dp">
        <PageHead
            :crumbs="[t('nav.group.dev'), t('nav.item.devProgress')]"
            :title="t('nav.item.devProgress')"
            :sub="t('dev.progress.sub', { date: UPDATED })"
        >
            <template #actions>
                <button
                    type="button"
                    class="a-btn"
                    :aria-pressed="v2.shown"
                    @click="v2.toggle()"
                >
                    {{ v2.shown ? t('shell.v2.hide') : t('shell.v2.show') }}
                </button>
            </template>
        </PageHead>

        <div class="dp-counts">
            <AChip tone="green" :dot="false">{{
                t('dev.progress.count.built', { n: counts.built })
            }}</AChip>
            <AChip tone="gray" :dot="false">{{
                t('dev.progress.count.planned', { n: counts.planned })
            }}</AChip>
            <AChip tone="red" :dot="false">{{
                t('dev.progress.count.blocked', { n: counts.blocked })
            }}</AChip>
        </div>

        <nav class="a-card dp-toc" :aria-label="t('dev.progress.toc')">
            <div class="a-card-h">
                <h2 class="dp-toc-t">{{ t('dev.progress.toc') }}</h2>
            </div>
            <div class="a-card-b dp-toc-b">
                <div v-for="part in parts" :key="part.id" class="dp-toc-part">
                    <div class="dp-toc-ph">{{ part.title }}</div>
                    <ol class="dp-toc-list">
                        <li v-for="section in part.sections" :key="section.id">
                            <a
                                :href="`#${section.id}`"
                                @click.prevent="go(section.id)"
                            >
                                {{ section.title }}
                            </a>
                            <span
                                class="dp-dot"
                                :class="`is-${section.status}`"
                                :title="
                                    t(`dev.progress.status.${section.status}`)
                                "
                            ></span>
                        </li>
                    </ol>
                </div>
            </div>
        </nav>

        <article class="dp-article" :data-article="DEV_PROGRESS_MARKER">
            <template v-for="part in parts" :key="part.id">
                <h2 class="dp-part">{{ part.title }}</h2>

                <section
                    v-for="section in part.sections"
                    :id="section.id"
                    :key="section.id"
                    class="dp-section"
                    :class="{ 'is-target': route.hash === `#${section.id}` }"
                >
                    <header class="dp-sh">
                        <h3 class="dp-st">{{ section.title }}</h3>
                        <AChip
                            :tone="STATUS_TONE[section.status] || 'gray'"
                            size="sm"
                            :dot="false"
                        >
                            {{ t(`dev.progress.status.${section.status}`) }}
                        </AChip>
                    </header>

                    <p v-if="section.basis" class="dp-basis">
                        <AIcon name="file_text" :size="14" />
                        <span>{{ section.basis }}</span>
                    </p>
                    <p v-if="section.blocker" class="dp-blocker">
                        <AIcon name="lock" :size="14" />
                        <span>{{ section.blocker }}</span>
                    </p>

                    <template v-for="(block, i) in section.body" :key="i">
                        <p v-if="block.type === 'p'" class="dp-p">
                            {{ block.text }}
                        </p>
                        <ul v-else-if="block.type === 'ul'" class="dp-ul">
                            <li v-for="(item, j) in block.items" :key="j">
                                {{ item }}
                            </li>
                        </ul>
                        <dl v-else-if="block.type === 'kv'" class="dp-kv">
                            <template v-for="(row, j) in block.rows" :key="j">
                                <dt>{{ row[0] }}</dt>
                                <dd>{{ row[1] }}</dd>
                            </template>
                        </dl>
                        <p
                            v-else-if="block.type === 'note'"
                            class="a-note a-note--info dp-note"
                        >
                            {{ block.text }}
                        </p>
                    </template>

                    <a class="dp-top" href="#" @click.prevent="top">
                        {{ t('dev.progress.backToTop') }}
                    </a>
                </section>
            </template>
        </article>
    </div>
</template>

<style scoped>
.dp {
    max-width: 880px;
}

.dp-counts {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin: 4px 0 18px;
}

.dp-toc {
    margin-bottom: 26px;
}

.dp-toc-t {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
}

.dp-toc-b {
    display: grid;
    gap: 14px;
}

.dp-toc-ph {
    font-size: 12.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--a-ink-3);
    font-weight: 700;
    margin-bottom: 6px;
}

.dp-toc-list {
    margin: 0;
    padding-inline-start: 22px;
    columns: 2;
    column-gap: 28px;
    font-size: 14px;
    line-height: 1.75;
}

.dp-toc-list li {
    break-inside: avoid;
}

.dp-toc-list a {
    color: var(--a-ink);
    text-decoration: none;
}

.dp-toc-list a:hover {
    color: var(--a-accent);
    text-decoration: underline;
}

.dp-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    margin-inline-start: 7px;
    background: var(--a-line-2);
    vertical-align: middle;
}

.dp-dot.is-built {
    background: var(--a-green);
}
.dp-dot.is-building {
    background: var(--a-blue, #3b6fb6);
}
.dp-dot.is-blocked {
    background: var(--a-red);
}

.dp-part {
    margin: 34px 0 14px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--a-accent);
    font-size: 21px;
    font-weight: 700;
    color: var(--a-accent-2);
}

.dp-section {
    padding: 14px 16px 12px;
    margin-bottom: 14px;
    border-radius: var(--a-r);
    border: 1px solid transparent;
    scroll-margin-top: 12px;
}

/* The section a badge landed on is lit for as long as the hash points at it. */
.dp-section.is-target {
    background: var(--a-tint);
    border-color: var(--a-accent);
}

.dp-sh {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.dp-st {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
}

.dp-basis,
.dp-blocker {
    display: flex;
    gap: 6px;
    align-items: flex-start;
    margin: 6px 0 4px;
    font-size: 13px;
    color: var(--a-ink-3);
}

.dp-blocker {
    color: var(--a-red);
    font-weight: 600;
}

.dp-p {
    margin: 8px 0;
    line-height: 1.7;
    font-size: 15px;
}

.dp-ul {
    margin: 6px 0 8px;
    padding-inline-start: 22px;
    line-height: 1.65;
    font-size: 14.5px;
}

.dp-ul li {
    margin-bottom: 3px;
}

.dp-kv {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 4px 14px;
    margin: 8px 0;
    font-size: 14px;
    line-height: 1.6;
}

.dp-kv dt {
    font-weight: 700;
    color: var(--a-ink-2);
}

.dp-kv dd {
    margin: 0;
}

.dp-note {
    margin: 8px 0 4px;
    font-size: 14px;
}

.dp-top {
    display: inline-block;
    margin-top: 8px;
    font-size: 12.5px;
    color: var(--a-ink-4);
    text-decoration: none;
}

.dp-top:hover {
    color: var(--a-accent);
}
</style>
