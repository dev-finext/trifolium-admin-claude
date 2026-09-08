<script setup>
// The template editor: pick a template, edit its elements — system fields,
// fixed text, the logo block, the barcode — by kind, position, width and
// typography, and watch the label redraw with real data from the fixture.
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import StickerPreview from '@/components/stickers/StickerPreview.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AInput from '@/components/ui/AInput.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ASwitch from '@/components/ui/ASwitch.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useStickerData } from '@/composables/useStickerData';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import {
    STICKER_ALIGN_IDS,
    STICKER_KIND_IDS,
    STICKER_RULES,
    STICKER_TEMPLATE_IDS,
    stickerFieldsFor,
} from '@/config';
import { useInventoryStore } from '@/stores/inventory';
import { statusOf, trackedItems, useOrdersStore } from '@/stores/orders';
import { useStickersStore } from '@/stores/stickers';

/** CSS pixels per millimetre, for sizing the preview to its column. */
const MM = 96 / 25.4;
const PREVIEW_MAX_PX = 560;

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const stickers = useStickersStore();
const orders = useOrdersStore();
const inventory = useInventoryStore();
const { labelsForOrder, labelsForReceipt, labelsForShipping } =
    useStickerData();

const view = useUrlState({ tpl: 'prep' });

const template = computed(() => stickers.templateById(view.tpl));

const draft = reactive({ size: { w: 0, h: 0 }, elements: [] });

const clone = (value) => JSON.parse(JSON.stringify(value));

function load() {
    if (!template.value) {
        return;
    }

    draft.size = clone(template.value.size);
    draft.elements = clone(template.value.elements || []);
}

watch(() => template.value?.id, load, { immediate: true });

const dirty = computed(
    () =>
        Boolean(template.value) &&
        JSON.stringify({ size: draft.size, elements: draft.elements }) !==
            JSON.stringify({
                size: template.value.size,
                elements: template.value.elements,
            }),
);

const templateOptions = computed(() =>
    STICKER_TEMPLATE_IDS.map((id) => ({
        value: id,
        label: t(`stickers.template.${id}`),
    })),
);
const kindOptions = computed(() =>
    STICKER_KIND_IDS.map((id) => ({
        value: id,
        label: t(`stickers.kind.${id}`),
    })),
);
const alignOptions = computed(() =>
    STICKER_ALIGN_IDS.map((id) => ({
        value: id,
        label: t(`stickers.align.${id}`),
    })),
);
const fieldOptions = computed(() =>
    stickerFieldsFor(view.tpl).map((field) => ({
        value: field.id,
        label: t(`stickers.field.${field.id}`),
    })),
);

/** A real record to draw the preview from: the first order on the bench, the newest receipt, the first parcel. */
const sample = computed(() => {
    if (view.tpl === 'prep') {
        const order = orders.all.find(
            (row) =>
                ['in_production', 'ready_for_delivery'].includes(
                    statusOf(row),
                ) &&
                trackedItems(row).some((item) => item.stage !== 'cancelled'),
        );

        return order
            ? { ref: order.id, data: labelsForOrder(order)[0]?.data || null }
            : null;
    }

    if (view.tpl === 'item') {
        const receipt = inventory.receipts.find((row) =>
            (row.lines || []).some((line) => stickers.itemCount(line) > 0),
        );

        return receipt
            ? {
                  ref: receipt.id,
                  data: labelsForReceipt(receipt)[0]?.data || null,
              }
            : null;
    }

    const order = orders.all.find(
        (row) =>
            row.courier &&
            ['ready_for_delivery', 'shipped'].includes(statusOf(row)),
    );

    return order
        ? { ref: order.id, data: labelsForShipping(order)[0].data }
        : null;
});

const previewTemplate = computed(() => ({
    id: view.tpl,
    size: draft.size,
    elements: draft.elements,
}));

const previewScale = computed(() =>
    Math.min(2.6, PREVIEW_MAX_PX / (Math.max(20, draft.size.w) * MM)),
);

const num = (value, fallback = 0) => {
    const parsed = Number(String(value).replace(',', '.'));

    return Number.isFinite(parsed) ? parsed : fallback;
};

function setNum(target, key, value, min = 0, max = 400) {
    target[key] = Math.min(max, Math.max(min, num(value, target[key])));
}

let seq = 0;

function add(kind) {
    seq += 1;

    const base = {
        id: `e${Date.now().toString(36)}${seq}`,
        kind,
        field: kind === 'field' ? fieldOptions.value[0]?.value || null : null,
        text: kind === 'text' ? { he: '', en: '' } : null,
        x: 2,
        y: 2,
        w: kind === 'barcode' ? 30 : 40,
        h: kind === 'barcode' || kind === 'logo' ? 8 : null,
        size: 8,
        bold: false,
        align: 'start',
        label: false,
    };

    draft.elements.push(base);
}

function remove(element) {
    draft.elements = draft.elements.filter((row) => row.id !== element.id);
}

function setText(element, value) {
    element.text = { he: value, en: value };
}

async function save() {
    const elements = draft.elements.map((element) => ({
        ...element,
        x: num(element.x),
        y: num(element.y),
        w: Math.max(4, num(element.w, 30)),
        h: element.h === null ? null : Math.max(3, num(element.h, 8)),
        size: Math.min(
            STICKER_RULES.maxFont,
            Math.max(STICKER_RULES.minFont, num(element.size, 8)),
        ),
    }));

    await stickers.saveTemplate(view.tpl, {
        size: {
            w: Math.max(20, num(draft.size.w, 100)),
            h: Math.max(15, num(draft.size.h, 50)),
        },
        elements,
    });
    load();
    push({
        title: t('stickers.editor.saved'),
        body: t('stickers.editor.savedBody', {
            n: elements.length,
            w: draft.size.w,
            h: draft.size.h,
        }),
    });
}

async function reset() {
    await stickers.resetTemplate(view.tpl);
    load();
    push({ title: t('stickers.editor.resetDone') });
}
</script>

<template>
    <div class="ed">
        <div class="ed-top">
            <div class="ed-pick">
                <label class="a-lbl" for="stk-tpl">{{
                    t('stickers.editor.pick')
                }}</label>
                <ASelect
                    id="stk-tpl"
                    v-model="view.tpl"
                    :options="templateOptions"
                />
            </div>
            <div class="ed-size">
                <label class="a-lbl">{{ t('stickers.editor.size') }}</label>
                <div class="ed-size-in">
                    <AInput
                        :model-value="draft.size.w"
                        type="number"
                        class="ed-num"
                        :aria-label="t('stickers.editor.width')"
                        @update:model-value="
                            setNum(draft.size, 'w', $event, 20, 300)
                        "
                    />
                    <span>×</span>
                    <AInput
                        :model-value="draft.size.h"
                        type="number"
                        class="ed-num"
                        :aria-label="t('stickers.editor.height')"
                        @update:model-value="
                            setNum(draft.size, 'h', $event, 15, 300)
                        "
                    />
                    <span class="t-sub">{{ t('stickers.editor.mm') }}</span>
                </div>
            </div>
            <div class="a-push ed-state">
                <AChip v-if="dirty" tone="amber" size="sm">{{
                    t('stickers.editor.dirty')
                }}</AChip>
                <span v-else-if="template?.updated" class="t-sub">
                    {{
                        t('stickers.editor.updated', {
                            stamp: template.updated.stamp,
                            by: loc(template.updatedBy) || '—',
                        })
                    }}
                </span>
                <AButton @click="reset">{{
                    t('stickers.editor.reset')
                }}</AButton>
                <AButton kind="p" icon="save" :disabled="!dirty" @click="save">
                    {{ t('stickers.editor.save') }}
                </AButton>
            </div>
        </div>

        <div class="ed-cols">
            <ACard
                :title="t('stickers.editor.elements')"
                icon="list"
                :pad="false"
            >
                <template #right>
                    <V2Badge id="labels" size="sm" />
                    <span class="t-sub">{{
                        t('stickers.editor.count', { n: draft.elements.length })
                    }}</span>
                </template>

                <div class="ed-add">
                    <span class="t-sub">{{ t('stickers.editor.add') }}:</span>
                    <AButton sm icon="plus" @click="add('field')">{{
                        t('stickers.editor.addField')
                    }}</AButton>
                    <AButton sm icon="plus" @click="add('text')">{{
                        t('stickers.editor.addText')
                    }}</AButton>
                    <AButton sm icon="plus" @click="add('logo')">{{
                        t('stickers.editor.addLogo')
                    }}</AButton>
                    <AButton sm icon="plus" @click="add('barcode')">{{
                        t('stickers.editor.addBarcode')
                    }}</AButton>
                </div>

                <div v-if="draft.elements.length" class="ed-list">
                    <div
                        v-for="(element, i) in draft.elements"
                        :key="element.id"
                        class="el"
                    >
                        <div class="el-h">
                            <ANum class="el-n">{{ i + 1 }}</ANum>
                            <ASelect
                                :model-value="element.kind"
                                :options="kindOptions"
                                class="el-kind"
                                :aria-label="t('stickers.editor.kind')"
                                @update:model-value="element.kind = $event"
                            />
                            <ASelect
                                v-if="element.kind === 'field'"
                                :model-value="element.field || ''"
                                :options="fieldOptions"
                                class="el-field"
                                :aria-label="t('stickers.editor.field')"
                                @update:model-value="element.field = $event"
                            />
                            <AInput
                                v-else-if="element.kind === 'text'"
                                :model-value="loc(element.text) || ''"
                                class="el-field"
                                :placeholder="t('stickers.editor.text')"
                                @update:model-value="setText(element, $event)"
                            />
                            <span v-else class="el-field t-sub">
                                {{ t(`stickers.kind.${element.kind}`) }}
                            </span>
                            <button
                                type="button"
                                class="a-linkbtn el-x"
                                :aria-label="t('stickers.editor.remove')"
                                @click="remove(element)"
                            >
                                ✕
                            </button>
                        </div>
                        <div class="el-g">
                            <label>
                                <span>{{ t('stickers.editor.x') }}</span>
                                <AInput
                                    :model-value="element.x"
                                    type="number"
                                    @update:model-value="
                                        setNum(element, 'x', $event)
                                    "
                                />
                            </label>
                            <label>
                                <span>{{ t('stickers.editor.y') }}</span>
                                <AInput
                                    :model-value="element.y"
                                    type="number"
                                    @update:model-value="
                                        setNum(element, 'y', $event)
                                    "
                                />
                            </label>
                            <label>
                                <span>{{ t('stickers.editor.w') }}</span>
                                <AInput
                                    :model-value="element.w"
                                    type="number"
                                    @update:model-value="
                                        setNum(element, 'w', $event, 4)
                                    "
                                />
                            </label>
                            <label
                                v-if="
                                    element.kind === 'barcode' ||
                                    element.kind === 'logo'
                                "
                            >
                                <span>{{ t('stickers.editor.h') }}</span>
                                <AInput
                                    :model-value="element.h ?? 8"
                                    type="number"
                                    @update:model-value="
                                        setNum(element, 'h', $event, 3)
                                    "
                                />
                            </label>
                            <label v-if="element.kind !== 'barcode'">
                                <span>{{ t('stickers.editor.font') }}</span>
                                <AInput
                                    :model-value="element.size"
                                    type="number"
                                    @update:model-value="
                                        setNum(
                                            element,
                                            'size',
                                            $event,
                                            STICKER_RULES.minFont,
                                            STICKER_RULES.maxFont,
                                        )
                                    "
                                />
                            </label>
                            <label
                                v-if="
                                    element.kind === 'field' ||
                                    element.kind === 'text'
                                "
                                class="el-sel"
                            >
                                <span>{{ t('stickers.editor.align') }}</span>
                                <ASelect
                                    :model-value="element.align"
                                    :options="alignOptions"
                                    @update:model-value="element.align = $event"
                                />
                            </label>
                            <div
                                v-if="
                                    element.kind === 'field' ||
                                    element.kind === 'text'
                                "
                                class="el-sw"
                            >
                                <ASwitch
                                    v-model="element.bold"
                                    :label="t('stickers.editor.bold')"
                                />
                                <span>{{ t('stickers.editor.bold') }}</span>
                            </div>
                            <div v-if="element.kind === 'field'" class="el-sw">
                                <ASwitch
                                    v-model="element.label"
                                    :label="t('stickers.editor.prefix')"
                                />
                                <span>{{ t('stickers.editor.prefix') }}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <AEmpty v-else icon="tag" :title="t('stickers.editor.empty')" />
            </ACard>

            <div class="ed-side">
                <ACard :title="t('stickers.editor.preview')" icon="eye">
                    <template #right>
                        <span v-if="sample" class="t-sub">{{
                            t('stickers.editor.sample', { ref: sample.ref })
                        }}</span>
                    </template>
                    <div class="ed-prev">
                        <StickerPreview
                            v-if="sample?.data"
                            :template="previewTemplate"
                            :data="sample.data"
                            :scale="previewScale"
                        />
                        <AEmpty
                            v-else
                            icon="tag"
                            :title="t('stickers.editor.noSample')"
                        />
                    </div>
                    <p class="a-hint">{{ t('stickers.editor.note') }}</p>
                    <p
                        v-if="view.tpl === 'shipping'"
                        class="a-note a-note--warn"
                    >
                        {{ t('stickers.editor.shippingNote') }}
                    </p>
                </ACard>
            </div>
        </div>
    </div>
</template>

<style scoped>
.ed {
    display: grid;
    gap: 16px;
}

.ed-top {
    display: flex;
    align-items: flex-end;
    gap: 18px;
    flex-wrap: wrap;
}

.ed-pick {
    min-width: 220px;
}

.ed-size-in {
    display: flex;
    align-items: center;
    gap: 6px;
}

.ed-num {
    width: 76px;
}

.ed-state {
    display: flex;
    align-items: center;
    gap: 10px;
}

.ed-cols {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(320px, 620px);
    gap: 16px;
    align-items: start;
}

@media (max-width: 1100px) {
    .ed-cols {
        grid-template-columns: 1fr;
    }
}

.ed-add {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 12px 18px;
    border-bottom: 1px solid var(--a-line);
}

.ed-list {
    display: flex;
    flex-direction: column;
}

.el {
    padding: 12px 18px;
    border-bottom: 1px solid var(--a-line);
}

.el-h {
    display: flex;
    align-items: center;
    gap: 8px;
}

.el-n {
    width: 22px;
    color: var(--a-ink-4);
    font-size: 12.5px;
}

.el-kind {
    width: 150px;
}

.el-field {
    flex: 1;
    min-width: 0;
}

.el-x {
    color: var(--a-ink-4);
    font-size: 13px;
}

.el-g {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 8px;
}

.el-g label {
    display: grid;
    gap: 3px;
    width: 72px;
}

.el-g label.el-sel {
    width: 110px;
}

.el-g label span,
.el-sw span {
    font-size: 11.5px;
    color: var(--a-ink-4);
}

.el-sw {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-bottom: 6px;
}

.ed-prev {
    display: flex;
    justify-content: flex-start;
    padding: 6px 0 10px;
    overflow: auto;
}

.t-sub {
    font-size: 13px;
    color: var(--a-ink-4);
}
</style>
