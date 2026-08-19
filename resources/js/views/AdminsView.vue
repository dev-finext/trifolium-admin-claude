<script setup>
// Admin users.
//
// There are deliberately no roles: every admin holds the same full set of
// permissions. The screen states that in its subtitle and in the permissions
// column, so nobody goes looking for a grant that does not exist.
//
// Reaching the screen is a re-confirmation rather than a click — it creates and
// deletes the accounts that can reach everything in the console — and the gate
// closes again when the screen is left. Creating and deleting an account ask for
// the approval code on top of that.
import { computed, onBeforeUnmount, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import AdminEditor from '@/components/system/AdminEditor.vue';
import AdminUserTable from '@/components/system/AdminUserTable.vue';
import SearchField from '@/components/system/SearchField.vue';
import AButton from '@/components/ui/AButton.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { num } from '@/lib/money';
import {
    LAST_LOGIN_BUCKET_IDS,
    lastLoginBucket,
    useSystemStore,
} from '@/stores/system';

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const { push } = useToast();
const system = useSystemStore();

const view = useUrlState({ q: '', login: '' });

/** The "add admin" modal, and the pending confirmation — neither is view state. */
const adding = ref(false);
const ask = ref(null);

// The gate is scoped to this visit, not to the session.
onBeforeUnmount(() => system.lockAdminUsers());

const term = computed(() => view.q.trim().toLowerCase());

const shown = computed(() =>
    system.admins.filter((admin) => {
        if (view.login && lastLoginBucket(admin) !== view.login) {
            return false;
        }

        if (
            term.value &&
            !searchHaystack(admin.name, admin.email, admin.phone).includes(
                term.value,
            )
        ) {
            return false;
        }

        return true;
    }),
);

const dirty = computed(() => Boolean(view.q || view.login));

const loginOptions = computed(() => [
    { value: '', label: t('admins.filter.loginAll') },
    ...LAST_LOGIN_BUCKET_IDS.map((id) => ({
        value: id,
        label: `${t(`admins.bucket.${id}`)} (${num(
            system.admins.filter((admin) => lastLoginBucket(admin) === id)
                .length,
        )})`,
    })),
]);

const sub = computed(() => t('admins.sub', { n: num(system.admins.length) }));

function clear() {
    view.q = '';
    view.login = '';
}

function confirmAsk(reason, code) {
    const pending = ask.value;

    ask.value = null;
    pending?.done?.(reason, code);
}

function report(ok, title, body) {
    push(ok ? { title, body } : { title: t('admins.toast.failed'), bad: true });
}

// ---- the entry gate -------------------------------------------------------

function askUnlock() {
    ask.value = {
        title: t('admins.gate.confirmTitle'),
        body: t('admins.gate.confirmBody'),
        confirmLabel: t('admins.gate.confirm'),
        effects: [t('admins.gate.effect1'), t('admins.gate.effect2')],
        pin: system.adminGateCode,
        done: async (reason, code) => {
            const ok = await system.unlockAdminUsers(code);

            push(
                ok
                    ? { title: t('admins.gate.unlocked') }
                    : { title: t('admins.gate.failed'), bad: true },
            );
        },
    };
}

function lock() {
    system.lockAdminUsers();
    push({ title: t('admins.gate.locked') });
}

// ---- account actions ------------------------------------------------------

function onReset(admin) {
    const name = loc(admin.name);

    ask.value = {
        title: t('admins.reset.title'),
        body: t('admins.reset.body', { name, phone: admin.phone }),
        confirmLabel: t('admins.reset.confirm'),
        effects: [
            t('admins.reset.effect1'),
            t('admins.reset.effect2'),
            t('admins.reset.effect3'),
        ],
        done: async () => {
            const ok = await system.resetAdminPassword(admin.id);

            report(ok, t('admins.toast.reset'), name);
        },
    };
}

function onRemove(admin) {
    const name = loc(admin.name);

    ask.value = {
        title: t('admins.remove.title'),
        body: t('admins.remove.body', { name, email: admin.email }),
        confirmLabel: t('admins.remove.confirm'),
        effects: [
            t('admins.remove.effect1'),
            t('admins.remove.effect2'),
            t('admins.remove.effect3'),
        ],
        danger: true,
        reason: true,
        pin: system.approvalPin,
        done: async (why) => {
            const ok = await system.removeAdmin(admin.id, why);

            report(ok, t('admins.toast.removed'), name);
        },
    };
}

function onNext(user) {
    adding.value = false;

    ask.value = {
        title: t('admins.create.title'),
        body: t('admins.create.body', { name: user.name, email: user.email }),
        confirmLabel: t('admins.create.confirm'),
        effects: [
            t('admins.create.effect1'),
            t('admins.create.effect2'),
            t('admins.create.effect3'),
        ],
        pin: system.approvalPin,
        done: async () => {
            const ok = await system.addAdmin(user);

            report(
                ok,
                t('admins.toast.created'),
                t('admins.toast.createdBody', { name: user.name }),
            );
        },
    };
}
</script>

<template>
    <div>
        <PageHead
            :crumbs="[t('nav.group.system'), t('nav.item.admins')]"
            :title="t('admins.title')"
            :sub="sub"
        >
            <template v-if="system.adminCardsUnlocked" #actions>
                <AButton kind="p" icon="plus" @click="adding = true">
                    {{ t('admins.action.add') }}
                </AButton>
            </template>
        </PageHead>

        <div v-if="!system.adminCardsUnlocked" class="a-card av-gate">
            <div class="av-gate-icon"><AIcon name="lock" :size="26" /></div>
            <h3 class="av-gate-title">{{ t('admins.gate.title') }}</h3>
            <p class="av-gate-why">{{ t('admins.gate.why') }}</p>
            <AButton kind="p" icon="lock" @click="askUnlock">
                {{ t('admins.gate.unlock') }}
            </AButton>
            <div class="av-gate-scope">{{ t('admins.gate.scope') }}</div>
        </div>

        <template v-else>
            <div class="a-note a-note--info av-open">
                <span>{{ t('admins.gate.openNote') }}</span>
                <AButton sm icon="lock" @click="lock">
                    {{ t('admins.gate.lockAgain') }}
                </AButton>
            </div>

            <FilterBar
                :count="shown.length"
                :total="system.admins.length"
                :dirty="dirty"
                @clear="clear"
            >
                <SearchField
                    v-model="view.q"
                    :placeholder="t('admins.filter.search')"
                    :label="t('admins.filter.searchLabel')"
                    :width="320"
                />
                <ASelect
                    v-model="view.login"
                    :options="loginOptions"
                    :aria-label="t('admins.filter.login')"
                />
            </FilterBar>

            <AdminUserTable :rows="shown" @reset="onReset" @remove="onRemove" />
        </template>

        <AdminEditor :open="adding" @close="adding = false" @next="onNext" />

        <ConfirmDialog
            :open="Boolean(ask)"
            :title="ask?.title || ''"
            :body="ask?.body || ''"
            :effects="ask?.effects || []"
            :confirm-label="ask?.confirmLabel || ''"
            :danger="ask?.danger || false"
            :reason="ask?.reason || false"
            :pin="ask?.pin || false"
            @close="ask = null"
            @confirm="confirmAsk"
        />
    </div>
</template>

<style scoped>
.av-gate {
    display: grid;
    justify-items: center;
    gap: 10px;
    text-align: center;
    padding: 54px 24px;
    margin-top: 18px;
}

.av-gate-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--a-tint);
    color: var(--a-accent-2);
}

.av-gate-title {
    font-size: 19px;
    font-weight: 700;
}

.av-gate-why {
    max-width: 560px;
    color: var(--a-ink-3);
    line-height: 1.65;
}

.av-gate-scope {
    font-size: 13px;
    color: var(--a-ink-4);
}

.av-open {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin: 18px 0 0;
}
</style>
