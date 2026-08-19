<script setup>
// The video slot as the practitioner site will render it: thumbnail, running
// time, title, then the numbered "what you will see" list.
//
// It previews the draft that is on screen — the editor's own fields, already
// resolved to the active locale — so the wording can be checked before a save.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AIcon from '@/components/ui/AIcon.vue';

const props = defineProps({
    title: { type: String, default: '' },
    duration: { type: String, default: '' },
    /** Interest points as plain strings, empties already filtered out. */
    points: { type: Array, default: () => [] },
});

const { t } = useI18n();

const heading = computed(
    () => props.title.trim() || t('videos.editor.previewTitle'),
);

/** With no points written yet, one dimmed hint row stands in for the list. */
const listed = computed(() =>
    props.points.length ? props.points : [t('videos.editor.previewPointHint')],
);
</script>

<template>
    <div class="vp">
        <div class="vp-thumb">
            <span class="vp-play">
                <AIcon name="play" :size="22" />
            </span>
            <span v-if="duration.trim()" class="num ltr vp-dur">
                {{ duration }}
            </span>
        </div>

        <div class="vp-body">
            <div class="vp-title">{{ heading }}</div>
            <div class="vp-lead">{{ t('videos.editor.previewPoints') }}</div>

            <div class="a-grid vp-points">
                <div v-for="(point, i) in listed" :key="i" class="vp-point">
                    <span class="num vp-badge">{{ i + 1 }}</span>
                    <span :class="points.length ? 'vp-text' : 'vp-hint'">
                        {{ point }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* The frame mimics the practitioner site's video card, so the fixed greens
   below are the site's palette, not the console's tokens. */
.vp {
    border: 1px solid var(--a-line);
    border-radius: 12px;
    overflow: hidden;
}

.vp-thumb {
    height: 150px;
    background: #dde7d9;
    position: relative;
    display: grid;
    place-items: center;
}

.vp-play {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background: var(--a-accent);
    color: #fff;
    display: grid;
    place-items: center;
}

.vp-dur {
    position: absolute;
    bottom: 10px;
    inset-inline-start: 10px;
    background: #222b20;
    color: #fff;
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 12.5px;
    font-weight: 700;
}

.vp-body {
    padding: 16px 18px;
}

.vp-title {
    font-weight: 700;
    font-size: 16px;
}

.vp-lead {
    color: var(--a-ink-3);
    font-size: 13.5px;
    margin: 6px 0 12px;
}

.vp-points {
    gap: 10px;
}

.vp-point {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    font-size: 13.5px;
    line-height: 1.5;
}

.vp-badge {
    width: 22px;
    height: 22px;
    border-radius: 12px;
    background: #e4ecdf;
    color: #2f4429;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
}

.vp-text {
    color: var(--a-ink-2);
}

.vp-hint {
    color: var(--a-ink-4);
}
</style>
