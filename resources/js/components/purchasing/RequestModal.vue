<script setup>
// בקשת רכש — the whole request, in one window.
//
// A request is a shopping list. It does nothing on its own: it is what the
// buyer wants, written down, before anybody has been asked for a price. So it
// is one window rather than a screen and a record behind it — opened from the
// table, worked on, closed, and opened again tomorrow with what is already in
// it. Quantities are optional and every line is ticked off as it is sourced.
//
// It is a window in the console's sense too: the bar at the top parks it in the
// tray with its typing, which is what a list you fill over two days needs.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import BuyingLinesPanel from '@/components/purchasing/BuyingLinesPanel.vue';
import AButton from '@/components/ui/AButton.vue';
import AChip from '@/components/ui/AChip.vue';
import AModal from '@/components/ui/AModal.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { buyingSheet, buyingStateTone } from '@/config';
import { fmtISO } from '@/lib/dates';
import { downloadXlsx } from '@/lib/xlsx';
import { useBuyingStore } from '@/stores/buying';

const props = defineProps({
    /** The request on screen. */
    list: { type: Object, required: true },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const { loc } = useLocalized();
const { push } = useToast();
const store = useBuyingStore();

const closed = computed(() => props.list.state === 'closed');

const done = computed(
    () => props.list.lines.filter((line) => line.done).length,
);

const win = computed(() => ({
    id: `request:${props.list.id}`,
    title: `${t('buying.request.one')} ${props.list.number}`,
    subtitle: props.list.created?.stamp || '',
    icon: 'list',
}));

/** The codes a line stores, as the words a person reads. */
const fmt = {
    unit: (uom) => (uom ? t(`inventory.unit.${uom}`) : ''),
    state: (id) => t(`buying.itemState.${id}`),
    procurement: (id) => t(`items.procurementMethod.${id}`),
    date: (iso) => fmtISO(iso),
};

function exportSheet() {
    const file = `${t('buying.request.file')}-${props.list.number}.xlsx`;

    downloadXlsx(file, {
        name: t('buying.request.one'),
        rows: buyingSheet(props.list, fmt),
    });
    store.markExported(props.list.id);
    push({
        title: t(
            'buying.exported',
            { n: props.list.lines.length },
            props.list.lines.length,
        ),
        body: file,
    });
}

function toggleClosed() {
    store.setState(props.list.id, closed.value ? 'open' : 'closed');
}
</script>

<template>
    <AModal
        open
        :title="`${t('buying.request.one')} ${list.number}`"
        :width="1180"
        :win="win"
        @close="emit('close')"
    >
        <!-- Who opened it, where it stands, and what is written on it -->
        <div class="rm-head">
            <AChip :tone="buyingStateTone(list.state)" size="sm">
                {{ t(`buying.state.${list.state}`) }}
            </AChip>
            <span class="rm-meta">
                {{
                    t('buying.openedBy', {
                        who: list.by ? loc(list.by) : '—',
                        when: list.created?.stamp || '',
                    })
                }}
            </span>
            <span v-if="list.lines.length" class="rm-meta">
                {{
                    t('buying.request.ticked', {
                        done,
                        total: list.lines.length,
                    })
                }}
            </span>
        </div>

        <!-- The note goes into the panel's own grid rather than above it, so
             it shares a column with the paste box instead of being a second
             field of a different width. -->
        <BuyingLinesPanel :list="list" :readonly="closed">
            <template #head>
                <label class="a-lbl" for="rm-note">
                    {{ t('buying.note') }}
                </label>
                <ATextarea
                    id="rm-note"
                    :model-value="list.note || ''"
                    :rows="2"
                    class="a-w100 rm-note"
                    :placeholder="t('buying.notePlaceholder')"
                    @update:model-value="store.setNote(list.id, $event)"
                />
            </template>
        </BuyingLinesPanel>

        <template #footer>
            <span class="rm-count">
                {{
                    t(
                        'buying.lineCount',
                        { n: list.lines.length },
                        list.lines.length,
                    )
                }}
            </span>
            <AButton
                kind="p"
                icon="download"
                :disabled="!list.lines.length"
                @click="exportSheet"
            >
                {{ t('buying.export') }}
            </AButton>
            <AButton icon="check" @click="toggleClosed">
                {{ closed ? t('buying.reopen') : t('buying.close') }}
            </AButton>
            <AButton @click="emit('close')">{{ t('actions.close') }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.rm-head {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 14px;
}

.rm-meta {
    font-size: 13px;
    color: var(--a-ink-4);
}

.rm-note {
    margin-bottom: 16px;
}

.rm-count {
    font-size: 13px;
    color: var(--a-ink-4);
    margin-inline-end: auto;
}
</style>
