<script setup>
// The system-video editor.
//
// A video is attached to a slot on the site, and the SITE owns that slot's id —
// the record here must repeat it verbatim or the slot renders empty. That is the
// one rule this screen exists to enforce, which is why the id sits above
// everything else and carries its own warning.
//
// Title and interest points are record text and travel as `{ he, en }` pairs, so
// the editor works in the console's language and merges it back on save.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import VideoSitePreview from '@/components/content/VideoSitePreview.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AIcon from '@/components/ui/AIcon.vue';
import AInput from '@/components/ui/AInput.vue';
import { useLocalized } from '@/composables/useLocalized';
import { withLocale } from '@/stores/content';

const props = defineProps({
    /** The slot being edited, or null for a new one. */
    video: { type: Object, default: null },
});

const emit = defineEmits(['close', 'save']);

const { t, locale } = useI18n();
const { loc } = useLocalized();

const source = props.video || {};

const slug = ref(source.slug || '');
const youtube = ref(source.youtube || '');
const duration = ref(source.duration || '');
const title = ref(loc(source.title) || '');

// Each point keeps the pair it came from, so editing the Hebrew list does not
// wipe the English one. A new row starts from nothing.
let pointSeq = 0;

function pointRow(text, origin) {
    pointSeq += 1;

    return { id: `p${pointSeq}`, text, origin };
}

const points = ref(
    (source.points || []).map((point) => pointRow(loc(point) || '', point)),
);

const filled = computed(() =>
    points.value.filter((point) => point.text.trim()),
);

const heading = computed(() => {
    if (!props.video) {
        return t('videos.editor.newTitle');
    }

    return title.value.trim() || t('videos.editor.editTitle');
});

const canSave = computed(() =>
    Boolean(slug.value.trim() && youtube.value.trim() && title.value.trim()),
);

function addPoint() {
    points.value = [...points.value, pointRow('', null)];
}

function removePoint(index) {
    points.value = points.value.filter((_, i) => i !== index);
}

function save() {
    emit('save', {
        ...source,
        slug: slug.value.trim(),
        youtube: youtube.value.trim(),
        duration: duration.value.trim(),
        title: withLocale(source.title, locale.value, title.value.trim()),
        points: filled.value.map((point) =>
            withLocale(point.origin, locale.value, point.text.trim()),
        ),
    });
}
</script>

<template>
    <ADrawer :open="true" @close="emit('close')">
        <template #header>
            <div class="a-dhead-top">
                <div class="a-dhead-t">
                    <h2 class="ve-h">{{ heading }}</h2>
                </div>
                <div class="a-dhead-a">
                    <AButton
                        kind="p"
                        icon="save"
                        :disabled="!canSave"
                        @click="save"
                    >
                        {{ t('actions.save') }}
                    </AButton>
                    <AButton sm icon="x" @click="emit('close')">
                        {{ t('actions.close') }}
                    </AButton>
                </div>
            </div>
        </template>

        <div class="ve-cols">
            <div class="a-grid">
                <ACard :title="t('videos.editor.slot')" icon="external">
                    <div class="ve-slot">
                        <div>
                            <label class="a-lbl" for="ve-slug">
                                {{ t('videos.editor.slug') }}
                            </label>
                            <AInput
                                id="ve-slug"
                                v-model="slug"
                                ltr
                                class="a-w100 num"
                                :placeholder="
                                    t('videos.editor.slugPlaceholder')
                                "
                            />
                        </div>
                        <div>
                            <label class="a-lbl" for="ve-yt">
                                {{ t('videos.editor.youtube') }}
                            </label>
                            <AInput
                                id="ve-yt"
                                v-model="youtube"
                                ltr
                                class="a-w100"
                                :placeholder="
                                    t('videos.editor.youtubePlaceholder')
                                "
                            />
                        </div>
                        <div>
                            <label class="a-lbl" for="ve-dur">
                                {{ t('videos.editor.duration') }}
                            </label>
                            <AInput
                                id="ve-dur"
                                v-model="duration"
                                ltr
                                class="a-w100 num"
                                :placeholder="
                                    t('videos.editor.durationPlaceholder')
                                "
                            />
                        </div>
                    </div>

                    <div class="a-note a-note--warn ve-note">
                        <AIcon name="alert" :size="16" />
                        <span>{{ t('videos.editor.slugNote') }}</span>
                    </div>
                </ACard>

                <ACard :title="t('videos.editor.text')" icon="file_text">
                    <label class="a-lbl" for="ve-title">
                        {{ t('videos.editor.title') }}
                    </label>
                    <AInput
                        id="ve-title"
                        v-model="title"
                        class="a-w100"
                        :placeholder="t('videos.editor.titlePlaceholder')"
                    />
                    <div class="a-hint">
                        {{ t('videos.editor.localeNote') }}
                    </div>

                    <div class="a-lbl ve-mt">
                        {{ t('videos.editor.points') }}
                    </div>
                    <div class="a-grid ve-points">
                        <div
                            v-for="(point, i) in points"
                            :key="point.id"
                            class="ve-point"
                        >
                            <span class="num ve-badge">{{ i + 1 }}</span>
                            <AInput
                                v-model="point.text"
                                class="ve-point-in"
                                :aria-label="
                                    t('videos.editor.point', { n: i + 1 })
                                "
                                :placeholder="
                                    t('videos.editor.pointPlaceholder')
                                "
                            />
                            <AButton
                                sm
                                icon="trash"
                                :aria-label="t('videos.editor.removePoint')"
                                @click="removePoint(i)"
                            />
                        </div>
                        <div>
                            <AButton sm icon="plus" @click="addPoint">
                                {{ t('videos.editor.addPoint') }}
                            </AButton>
                        </div>
                    </div>
                </ACard>
            </div>

            <ACard :title="t('videos.editor.preview')" icon="eye">
                <VideoSitePreview
                    :title="title"
                    :duration="duration"
                    :points="filled.map((point) => point.text)"
                />
            </ACard>
        </div>
    </ADrawer>
</template>

<style scoped>
.ve-h {
    margin: 0;
    font-size: 24px;
}

.ve-cols {
    display: grid;
    gap: 18px;
    grid-template-columns: minmax(0, 1fr) 360px;
    align-items: start;
}

.ve-slot {
    display: grid;
    gap: 14px;
    grid-template-columns: 220px minmax(0, 1fr) 110px;
}

.ve-note {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    margin-top: 14px;
}

.ve-mt {
    margin-top: 16px;
}

.ve-points {
    gap: 10px;
}

.ve-point {
    display: flex;
    gap: 10px;
    align-items: center;
}

.ve-point-in {
    flex: 1;
    min-width: 0;
}

/* The ordinal, so a point's place in the list is readable at a glance. */
.ve-badge {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: var(--a-accent);
    color: #fff;
    display: grid;
    place-items: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
}

@media (max-width: 1100px) {
    .ve-cols {
        grid-template-columns: 1fr;
    }

    .ve-slot {
        grid-template-columns: 1fr;
    }
}
</style>
