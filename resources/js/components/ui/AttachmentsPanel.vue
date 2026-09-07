<script setup>
// Files on a record — the one panel every "attach a file" request in the
// specifications is served by: an item's instruction sheet, a batch's analysis,
// a supplier's contract, a purchase order's quote, a practitioner's certificate.
//
// The panel owns listing, adding and removing. Against the fixture a file is its
// metadata — name, type, size, who and when — and the panel says so; storage is
// the API's job, not the console's.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import ADataTable from '@/components/ui/ADataTable.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import ANum from '@/components/ui/ANum.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import V2Badge from '@/components/ui/V2Badge.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { ATTACHMENT_RULES } from '@/config';
import { useItemsStore } from '@/stores/items';

const props = defineProps({
    /** One of ATTACHMENT_ENTITY_IDS. */
    entity: { type: String, required: true },
    /** The record's id within that entity — a sku, a batch number, a supplier code. */
    refId: { type: String, required: true },
    /** Card title; defaults to the generic one. */
    title: { type: String, default: '' },
    /** Render without the card chrome, for a panel that sits inside another card. */
    bare: { type: Boolean, default: false },
});

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const store = useItemsStore();

const input = ref(null);
const removing = ref(null);

const files = computed(() => store.attachmentsOf(props.entity, props.refId));

const cols = computed(() => [
    { k: 'name', label: t('attachments.col.name') },
    { k: 'size', label: t('attachments.col.size'), nowrap: true },
    { k: 'by', label: t('attachments.col.by') },
    { k: 'when', label: t('attachments.col.when'), nowrap: true },
    { k: 'act', label: t('attachments.col.actions'), nowrap: true },
]);

function sizeText(kb) {
    return kb >= 1024
        ? t('attachments.size.mb', { n: (kb / 1024).toFixed(1) })
        : t('attachments.size.kb', { n: kb });
}

function extensionOf(name) {
    const match = String(name)
        .toLowerCase()
        .match(/\.([a-z0-9]+)$/);

    return match ? match[1] : '';
}

function pickFile() {
    input.value?.click();
}

async function onPicked(event) {
    const [file] = event.target.files || [];

    event.target.value = '';

    if (!file) {
        return;
    }

    const ext = extensionOf(file.name);

    if (!ATTACHMENT_RULES.extensions.includes(ext)) {
        push({
            title: t('attachments.toast.badType'),
            body: t('attachments.toast.badTypeBody', {
                name: file.name,
                types: ATTACHMENT_RULES.extensions.join(', '),
            }),
            bad: true,
        });

        return;
    }

    if (file.size > ATTACHMENT_RULES.maxMb * 1024 * 1024) {
        push({
            title: t('attachments.toast.tooBig'),
            body: t('attachments.toast.tooBigBody', {
                name: file.name,
                mb: ATTACHMENT_RULES.maxMb,
            }),
            bad: true,
        });

        return;
    }

    const record = await store.addAttachment({
        entity: props.entity,
        ref: props.refId,
        name: file.name,
        type: ext,
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
    });

    push({
        title: t('attachments.toast.added'),
        body: t('attachments.toast.addedBody', {
            name: record.name,
            size: sizeText(record.sizeKb),
        }),
    });
}

async function confirmRemove(reason) {
    const file = removing.value;

    await store.removeAttachment(file.id, reason);
    push({
        title: t('attachments.toast.removed'),
        body: t('attachments.toast.removedBody', { name: file.name, reason }),
        bad: true,
    });
    removing.value = null;
}
</script>

<template>
    <component
        :is="bare ? 'div' : ACard"
        :title="bare ? undefined : title || t('attachments.title')"
        :icon="bare ? undefined : 'file'"
        :pad="false"
    >
        <template v-if="!bare" #right>
            <V2Badge id="attachments" size="sm" />
            <span class="att-n">{{
                t('attachments.sub', { n: files.length })
            }}</span>
            <AButton sm icon="upload" @click="pickFile">
                {{ t('attachments.add') }}
            </AButton>
        </template>

        <div v-if="bare" class="att-barehead">
            <V2Badge id="attachments" size="sm" />
            <span class="att-n">{{
                t('attachments.sub', { n: files.length })
            }}</span>
            <AButton sm icon="upload" @click="pickFile">
                {{ t('attachments.add') }}
            </AButton>
        </div>

        <input
            ref="input"
            type="file"
            class="a-sr"
            :accept="
                ATTACHMENT_RULES.extensions.map((ext) => `.${ext}`).join(',')
            "
            tabindex="-1"
            @change="onPicked"
        />

        <ADataTable :cols="cols" :rows="files" row-key="id">
            <template #empty>
                <AEmpty
                    icon="file"
                    :title="t('attachments.empty')"
                    :sub="
                        t('attachments.emptyHint', {
                            mb: ATTACHMENT_RULES.maxMb,
                        })
                    "
                />
            </template>

            <template #cell-name="{ row }">
                <div class="att-name">
                    <span class="att-ext">{{ row.type }}</span>
                    <span class="t-strong">{{ row.name }}</span>
                </div>
                <div v-if="row.note" class="t-sub">{{ loc(row.note) }}</div>
            </template>
            <template #cell-size="{ row }">
                <ANum>{{ sizeText(row.sizeKb) }}</ANum>
            </template>
            <template #cell-by="{ row }">{{ loc(row.by) }}</template>
            <template #cell-when="{ row }">
                <ANum>{{ row.when.stamp }}</ANum>
            </template>
            <template #cell-act="{ row }">
                <div class="a-rowbtns">
                    <AButton
                        sm
                        kind="ghost"
                        icon="trash"
                        @click.stop="removing = row"
                    >
                        {{ t('attachments.remove') }}
                    </AButton>
                </div>
            </template>
        </ADataTable>

        <p class="a-hint att-note">{{ t('attachments.demoNote') }}</p>

        <ConfirmDialog
            v-if="removing"
            open
            danger
            reason
            :title="t('attachments.removeTitle')"
            :body="
                t('attachments.removeBody', {
                    name: removing.name,
                    entity: t(`attachments.entity.${entity}`),
                })
            "
            :confirm-label="t('attachments.removeConfirm')"
            @close="removing = null"
            @confirm="confirmRemove"
        />
    </component>
</template>

<style scoped>
.att-n {
    font-size: 13px;
    color: var(--a-ink-3);
    margin-inline-end: 6px;
}

.att-barehead {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 0 10px;
}

.att-name {
    display: flex;
    align-items: center;
    gap: 8px;
}

.att-ext {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--a-sunk);
    color: var(--a-ink-3);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    direction: ltr;
}

.att-note {
    margin: 0;
    padding: 8px 14px 10px;
}
</style>
