<script setup>
// The article editor.
//
// Record text travels as a `{ he, en }` pair, so the editor works in whichever
// language the console is showing and merges that language back into the pair on
// save — the other language is left exactly as it was. `withLocale()` in the
// content store owns that merge.
//
// A blank `article` prop means "new article".
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import ArticlePreview from '@/components/content/ArticlePreview.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ASwitch from '@/components/ui/ASwitch.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { withLocale } from '@/stores/content';

const props = defineProps({
    /** The row being edited, or null for a new article. */
    article: { type: Object, default: null },
    categories: { type: Array, default: () => [] },
    /** `[{ key, name }]` — the contributors the library already knows. */
    authors: { type: Array, default: () => [] },
    /** Today's date, formatted — the publication card shows it. */
    today: { type: String, default: '' },
});

const emit = defineEmits(['close', 'save']);

const { t, locale } = useI18n();
const { loc } = useLocalized();

/** The two traditions an article can be written within. */
const TRADITIONS = ['west', 'chinese'];

/** The block kinds the body editor can hold. */
const BLOCK_KINDS = ['h', 'p'];

const source = props.article || {};

/** Authors are keyed by their Hebrew name, the same key the filter select uses. */
function keyOf(author) {
    if (!author) {
        return '';
    }

    return typeof author === 'object' ? author.he : String(author);
}

const title = ref(loc(source.title) || '');
const excerpt = ref(loc(source.excerpt) || '');
const cat = ref(source.cat || props.categories[0] || '');
const readMin = ref(String(source.readMin ?? ''));
const tradition = ref(source.system || TRADITIONS[0]);
const authorKey = ref(keyOf(source.author));
const published = ref(Boolean(source.published));

// Body blocks. `origin` keeps the untouched `{ he, en }` pair so editing in one
// language does not drop the other.
let blockSeq = 0;

function blockId() {
    blockSeq += 1;

    return `b${blockSeq}`;
}

const blocks = ref(
    (source.blocks || []).map((block) => ({
        id: blockId(),
        kind: BLOCK_KINDS.includes(block.kind) ? block.kind : 'p',
        text: loc(block.text) || '',
        origin: block.text ?? null,
    })),
);

const previewOpen = ref(false);

const heading = computed(
    () => title.value.trim() || t('content.editor.newTitle'),
);

// A title, a category and a reading time are what the article list renders; an
// article missing any of them would show a blank cell on the practitioner site.
const canSave = computed(
    () =>
        Boolean(title.value.trim()) &&
        Boolean(cat.value) &&
        Number(readMin.value) > 0,
);

const authorRecord = computed(
    () => props.authors.find((entry) => entry.key === authorKey.value)?.name,
);

/** The draft as the preview reads it: text already resolved to this locale. */
const draft = computed(() => ({
    title: title.value.trim(),
    excerpt: excerpt.value.trim(),
    cat: cat.value,
    author: authorRecord.value,
    readMin: Number(readMin.value) || 0,
    tradition: tradition.value,
    published: published.value,
    blocks: blocks.value.filter((block) => block.text.trim()),
}));

function addBlock(kind) {
    blocks.value = [
        ...blocks.value,
        { id: blockId(), kind, text: '', origin: null },
    ];
}

function moveBlock(index, by) {
    const to = index + by;

    if (to < 0 || to >= blocks.value.length) {
        return;
    }

    const next = [...blocks.value];

    [next[index], next[to]] = [next[to], next[index]];
    blocks.value = next;
}

function removeBlock(index) {
    blocks.value = blocks.value.filter((_, i) => i !== index);
}

function onDigits(value) {
    readMin.value = String(value).replace(/\D/g, '');
}

function save() {
    emit('save', {
        ...source,
        title: withLocale(source.title, locale.value, title.value.trim()),
        excerpt: withLocale(source.excerpt, locale.value, excerpt.value.trim()),
        cat: cat.value,
        readMin: Number(readMin.value) || 0,
        system: tradition.value,
        author: authorRecord.value,
        published: published.value,
        blocks: blocks.value
            .filter((block) => block.text.trim())
            .map((block) => ({
                kind: block.kind,
                text: withLocale(block.origin, locale.value, block.text.trim()),
            })),
    });
}
</script>

<template>
    <ADrawer :open="true" @close="emit('close')">
        <template #header>
            <div class="a-dhead-top">
                <div class="a-dhead-t">
                    <h2 class="ae-h">{{ heading }}</h2>
                    <AChip :tone="published ? 'green' : 'amber'" size="sm">
                        {{
                            published
                                ? t('content.state.published')
                                : t('content.state.draft')
                        }}
                    </AChip>
                </div>
                <div class="a-dhead-a">
                    <AButton icon="eye" @click="previewOpen = true">
                        {{ t('content.preview.open') }}
                    </AButton>
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

        <div class="ae-cols">
            <div class="a-grid">
                <ACard :title="t('content.editor.details')" icon="file_text">
                    <label class="a-lbl" for="ae-title">
                        {{ t('content.editor.title') }}
                    </label>
                    <AInput
                        id="ae-title"
                        v-model="title"
                        class="a-w100"
                        :placeholder="t('content.editor.titlePlaceholder')"
                    />
                    <div class="a-hint">
                        {{ t('content.editor.localeNote') }}
                    </div>

                    <div class="ae-fields">
                        <div>
                            <label class="a-lbl" for="ae-cat">
                                {{ t('content.editor.category') }}
                            </label>
                            <ASelect id="ae-cat" v-model="cat" class="a-w100">
                                <option
                                    v-for="id in categories"
                                    :key="id"
                                    :value="id"
                                >
                                    {{ t(`content.cat.${id}`) }}
                                </option>
                            </ASelect>
                        </div>
                        <div>
                            <label class="a-lbl" for="ae-read">
                                {{ t('content.editor.readMin') }}
                            </label>
                            <AInput
                                id="ae-read"
                                class="a-w100"
                                inputmode="numeric"
                                :model-value="readMin"
                                @update:model-value="onDigits"
                            />
                        </div>
                        <div>
                            <label class="a-lbl" for="ae-trad">
                                {{ t('content.editor.system') }}
                            </label>
                            <ASelect
                                id="ae-trad"
                                v-model="tradition"
                                class="a-w100"
                            >
                                <option
                                    v-for="id in TRADITIONS"
                                    :key="id"
                                    :value="id"
                                >
                                    {{ t(`content.system.${id}`) }}
                                </option>
                            </ASelect>
                        </div>
                        <div>
                            <label class="a-lbl" for="ae-author">
                                {{ t('content.editor.author') }}
                            </label>
                            <ASelect
                                id="ae-author"
                                v-model="authorKey"
                                class="a-w100"
                            >
                                <option value="">{{ t('labels.none') }}</option>
                                <option
                                    v-for="entry in authors"
                                    :key="entry.key"
                                    :value="entry.key"
                                >
                                    {{ loc(entry.name) }}
                                </option>
                            </ASelect>
                        </div>
                    </div>

                    <label class="a-lbl ae-mt" for="ae-excerpt">
                        {{ t('content.editor.excerpt') }}
                    </label>
                    <ATextarea
                        id="ae-excerpt"
                        v-model="excerpt"
                        :rows="3"
                        :placeholder="t('content.editor.excerptPlaceholder')"
                    />
                </ACard>

                <ACard :title="t('content.editor.body')" icon="list">
                    <AEmpty
                        v-if="!blocks.length"
                        icon="list"
                        :title="t('content.editor.bodyEmpty')"
                        :sub="t('content.editor.bodyEmptyHint')"
                    />

                    <div v-else class="a-grid ae-blocks">
                        <div
                            v-for="(block, i) in blocks"
                            :key="block.id"
                            class="ae-block"
                        >
                            <div class="ae-block-h">
                                <AChip tone="gray" size="sm" :dot="false">
                                    {{
                                        t(`content.editor.block.${block.kind}`)
                                    }}
                                </AChip>
                                <div class="a-push ae-block-a">
                                    <AButton
                                        sm
                                        icon="chevron_down"
                                        class="ae-up"
                                        :disabled="i === 0"
                                        :aria-label="t('content.editor.moveUp')"
                                        @click="moveBlock(i, -1)"
                                    />
                                    <AButton
                                        sm
                                        icon="chevron_down"
                                        :disabled="i === blocks.length - 1"
                                        :aria-label="
                                            t('content.editor.moveDown')
                                        "
                                        @click="moveBlock(i, 1)"
                                    />
                                    <AButton
                                        sm
                                        icon="trash"
                                        :aria-label="
                                            t('content.editor.removeBlock')
                                        "
                                        @click="removeBlock(i)"
                                    />
                                </div>
                            </div>
                            <ATextarea
                                v-model="block.text"
                                :rows="block.kind === 'h' ? 1 : 3"
                                :aria-label="
                                    t(`content.editor.block.${block.kind}`)
                                "
                                :placeholder="
                                    t(
                                        `content.editor.blockPlaceholder.${block.kind}`,
                                    )
                                "
                            />
                        </div>
                    </div>

                    <div class="ae-block-add">
                        <AButton sm icon="plus" @click="addBlock('h')">
                            {{ t('content.editor.addHeading') }}
                        </AButton>
                        <AButton sm icon="plus" @click="addBlock('p')">
                            {{ t('content.editor.addParagraph') }}
                        </AButton>
                    </div>
                </ACard>
            </div>

            <ACard :title="t('content.editor.publication')" icon="calendar">
                <div class="ae-switch">
                    <ASwitch
                        v-model="published"
                        :label="t('content.editor.publishedLabel')"
                    />
                    <span>{{ t('content.editor.publishedLabel') }}</span>
                </div>

                <AKeyValue
                    class="ae-mt"
                    :rows="[
                        [t('content.editor.date'), today],
                        [
                            t('content.editor.author'),
                            loc(authorRecord) || t('labels.none'),
                        ],
                    ]"
                >
                    <dt>{{ t('content.editor.blocks') }}</dt>
                    <dd>
                        <ANum>{{ draft.blocks.length }}</ANum>
                    </dd>
                </AKeyValue>
            </ACard>
        </div>

        <ArticlePreview
            :open="previewOpen"
            :draft="draft"
            @close="previewOpen = false"
        />
    </ADrawer>
</template>

<style scoped>
.ae-h {
    margin: 0;
    font-size: 24px;
}

.ae-cols {
    display: grid;
    gap: 18px;
    grid-template-columns: minmax(0, 1fr) 340px;
    align-items: start;
}

.ae-fields {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    margin-top: 16px;
}

.ae-mt {
    margin-top: 16px;
}

.ae-blocks {
    gap: 12px;
}

.ae-block {
    border: 1px solid var(--a-line);
    border-radius: 9px;
    padding: 14px;
}

.ae-block-h {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.ae-block-a {
    display: flex;
    gap: 6px;
}

/* One chevron glyph serves both directions — the up button flips it. */
.ae-up :deep(.a-ico) {
    transform: rotate(180deg);
}

.ae-block-add {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    flex-wrap: wrap;
}

.ae-switch {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14.5px;
}

@media (max-width: 1100px) {
    .ae-cols {
        grid-template-columns: 1fr;
    }
}
</style>
