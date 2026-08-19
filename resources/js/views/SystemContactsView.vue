<script setup>
// The named people behind the third-party systems the platform depends on —
// the payment gateway, the invoice provider, the messaging vendor, the couriers.
//
// The supplier ledger is a different thing entirely and lives on the users
// screen behind its own gate; this screen is only the contact list.
//
// Every filter and the open contact live in the query string, so a filtered view
// can be pasted to a colleague and opens the same way.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import SearchField from '@/components/system/SearchField.vue';
import VendorProfile from '@/components/system/VendorProfile.vue';
import VendorTable from '@/components/system/VendorTable.vue';
import AButton from '@/components/ui/AButton.vue';
import ADrawer from '@/components/ui/ADrawer.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { FALLBACK_LOCALE, loc as resolve } from '@/lib/localized';
import { num } from '@/lib/money';
import { useSystemStore } from '@/stores/system';

/** The drawer's stable identity for "a contact that does not exist yet". */
const NEW = 'new';

/**
 * The blank record the drawer opens on for a new contact. It is a module-level
 * constant on purpose: returning a fresh `{}` from the computed would hand the
 * profile a new object identity on every evaluation, its watcher would refire,
 * and the two would update each other until Vue gave up mid-patch.
 */
const BLANK_CONTACT = Object.freeze({});

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const system = useSystemStore();

const view = useUrlState({
    q: '',
    csys: '',
    crole: '',
    cnotes: '',
    contact: '',
});

/** Whether the open contact drawer starts in its form — not view state. */
const startEdit = ref(false);
/** The pending confirmation — today only a contact deletion. */
const ask = ref(null);

const term = computed(() => view.q.trim().toLowerCase());

const sub = computed(() =>
    t('systemContacts.sub', { contacts: num(system.vendorContacts.length) }),
);

// ---- contacts -------------------------------------------------------------

const systemOptions = computed(() => {
    const seen = new Map();

    system.vendorContacts.forEach((contact) => {
        const key = resolve(contact.system, FALLBACK_LOCALE);

        if (key && !seen.has(key)) {
            seen.set(key, loc(contact.system));
        }
    });

    return [
        { value: '', label: t('systemContacts.contacts.filter.systemAll') },
        ...[...seen].map(([value, label]) => ({ value, label })),
    ];
});

/** The contact roles actually in use, each with how many contacts hold it. */
const roleOptions = computed(() => {
    const seen = new Map();

    system.vendorContacts.forEach((contact) => {
        const key = resolve(contact.role, FALLBACK_LOCALE);

        if (!key) {
            return;
        }

        const row = seen.get(key);

        if (row) {
            row.n += 1;
        } else {
            seen.set(key, { label: loc(contact.role), n: 1 });
        }
    });

    return [
        { value: '', label: t('systemContacts.contacts.filter.roleAll') },
        ...[...seen].map(([value, row]) => ({
            value,
            label: `${row.label} (${row.n})`,
        })),
    ];
});

const notesOptions = computed(() => [
    { value: '', label: t('systemContacts.contacts.filter.notesAll') },
    { value: 'has', label: t('systemContacts.contacts.filter.notesHas') },
    { value: 'none', label: t('systemContacts.contacts.filter.notesNone') },
]);

const shownContacts = computed(() =>
    system.vendorContacts.filter((contact) => {
        if (
            view.csys &&
            resolve(contact.system, FALLBACK_LOCALE) !== view.csys
        ) {
            return false;
        }

        if (
            view.crole &&
            resolve(contact.role, FALLBACK_LOCALE) !== view.crole
        ) {
            return false;
        }

        const hasNotes = Boolean(resolve(contact.notes, FALLBACK_LOCALE));

        if (view.cnotes === 'has' && !hasNotes) {
            return false;
        }

        if (view.cnotes === 'none' && hasNotes) {
            return false;
        }

        if (
            term.value &&
            !searchHaystack(
                contact.system,
                contact.contact,
                contact.role,
                contact.phone,
                contact.notes,
            ).includes(term.value)
        ) {
            return false;
        }

        return true;
    }),
);

const contactsDirty = computed(() =>
    Boolean(view.q || view.csys || view.crole || view.cnotes),
);

const openContact = computed(() => {
    if (!view.contact) {
        return null;
    }

    if (view.contact === NEW) {
        return BLANK_CONTACT;
    }

    return system.vendorContacts.find((row) => row.id === view.contact) || null;
});

function addContact() {
    startEdit.value = true;
    view.contact = NEW;
}

function editContact(contact) {
    startEdit.value = true;
    view.contact = contact.id;
}

function viewContact(contact) {
    startEdit.value = false;
    view.contact = contact.id;
}

function closeContact() {
    view.contact = '';
    startEdit.value = false;
}

async function saveContact(row) {
    const isNew = !row.id;
    const ok = await system.saveVendorContact(row);

    if (!ok) {
        push({
            title: t('systemContacts.toast.failed'),
            body: t('systemContacts.toast.failedBody'),
            bad: true,
        });

        return;
    }

    closeContact();
    push({
        title: isNew
            ? t('systemContacts.contacts.toast.added')
            : t('systemContacts.contacts.toast.updated'),
        body: loc(row.contact),
    });
}

function askRemoveContact(contact) {
    ask.value = {
        title: t('systemContacts.contacts.remove.title'),
        body: t('systemContacts.contacts.remove.body', {
            contact: loc(contact.contact),
            system: loc(contact.system),
        }),
        confirmLabel: t('systemContacts.contacts.remove.confirm'),
        effects: [
            t('systemContacts.contacts.remove.effect1'),
            t('systemContacts.contacts.remove.effect2'),
        ],
        danger: true,
        done: async () => {
            const ok = await system.removeVendorContact(contact.id);

            if (!ok) {
                push({
                    title: t('systemContacts.toast.failed'),
                    body: t('systemContacts.toast.failedBody'),
                    bad: true,
                });

                return;
            }

            closeContact();
            push({
                title: t('systemContacts.contacts.toast.removed'),
                body: loc(contact.contact),
                bad: true,
            });
        },
    };
}

// ---- shared ---------------------------------------------------------------

function clear() {
    view.q = '';
    view.csys = '';
    view.crole = '';
    view.cnotes = '';
}

function confirmAsk(reason, code) {
    const pending = ask.value;

    ask.value = null;
    pending.done(reason, code);
}
</script>

<template>
    <div>
        <PageHead
            :crumbs="[t('nav.group.system'), t('systemContacts.title')]"
            :title="t('systemContacts.title')"
            :sub="sub"
        >
            <template #actions>
                <AButton kind="p" icon="plus" @click="addContact">
                    {{ t('systemContacts.contacts.add') }}
                </AButton>
            </template>
        </PageHead>

        <FilterBar
            :count="shownContacts.length"
            :total="system.vendorContacts.length"
            :dirty="contactsDirty"
            @clear="clear"
        >
            <SearchField
                v-model="view.q"
                :placeholder="t('systemContacts.contacts.filter.search')"
                :label="t('systemContacts.contacts.filter.searchLabel')"
                :width="340"
            />
            <ASelect
                v-model="view.csys"
                :options="systemOptions"
                :aria-label="t('systemContacts.contacts.filter.system')"
            />
            <ASelect
                v-model="view.crole"
                :options="roleOptions"
                :aria-label="t('systemContacts.contacts.filter.role')"
            />
            <ASelect
                v-model="view.cnotes"
                :options="notesOptions"
                :aria-label="t('systemContacts.contacts.filter.notes')"
            />
        </FilterBar>

        <VendorTable
            :rows="shownContacts"
            :selected="view.contact"
            :filtered="contactsDirty"
            @open="viewContact"
            @edit="editContact"
            @remove="askRemoveContact"
        />

        <ADrawer :open="Boolean(openContact)" @close="closeContact">
            <VendorProfile
                v-if="openContact"
                :key="view.contact"
                :contact="openContact"
                :start-edit="startEdit"
                @save="saveContact"
                @remove="askRemoveContact"
                @close="closeContact"
            />
        </ADrawer>

        <ConfirmDialog
            :open="Boolean(ask)"
            :title="ask?.title || ''"
            :body="ask?.body || ''"
            :effects="ask?.effects || []"
            :confirm-label="ask?.confirmLabel || ''"
            :danger="ask?.danger || false"
            :pin="ask?.pin || false"
            @close="ask = null"
            @confirm="confirmAsk"
        />
    </div>
</template>

<style scoped></style>
