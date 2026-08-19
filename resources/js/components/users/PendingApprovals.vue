<script setup>
// The approvals inbox: one card per registration still waiting for a decision.
//
// A card carries only what decides whether it is worth opening — who applied,
// under which discipline, and whether the diploma and clinic photo arrived. The
// verdict itself is taken in the review drawer, or rejected outright from here.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AIcon from '@/components/ui/AIcon.vue';
import ANum from '@/components/ui/ANum.vue';
import ASelect from '@/components/ui/ASelect.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import SearchField from '@/components/users/SearchField.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useUrlState } from '@/composables/useUrlState';
import { THERAPY_IDS } from '@/config';
import { usePeopleStore } from '@/stores/people';

const emit = defineEmits(['open', 'reject']);

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const people = usePeopleStore();

// Prefixed so the approvals filter and the directory filter can both live in one
// URL without either reading the other's values.
const view = useUrlState({
    pq: '',
    prole: '',
    pdoc: '',
    psite: '',
    pth: '',
});

const all = computed(() => people.pendingUsers);

const roleIds = computed(() => [
    ...new Set(all.value.map((user) => user.role)),
]);

const therapyIds = computed(() =>
    THERAPY_IDS.filter((id) => all.value.some((user) => user.therapy === id)),
);

const countBy = (predicate) => all.value.filter(predicate).length;

const docCounts = computed(() => ({
    missing: countBy((user) => !user.cert),
    unchecked: countBy((user) => user.cert && user.docOk === null),
    ok: countBy((user) => user.docOk === true),
    bad: countBy((user) => user.docOk === false),
}));

const siteCounts = computed(() => ({
    yes: countBy((user) => user.listed),
    noimg: countBy((user) => user.listed && !user.clinicImg),
    no: countBy((user) => !user.listed),
}));

const rows = computed(() =>
    all.value.filter((user) => {
        if (view.prole && user.role !== view.prole) {
            return false;
        }

        if (view.pth && user.therapy !== view.pth) {
            return false;
        }

        if (view.pdoc === 'missing' && user.cert) {
            return false;
        }

        if (view.pdoc === 'unchecked' && !(user.cert && user.docOk === null)) {
            return false;
        }

        if (view.pdoc === 'ok' && user.docOk !== true) {
            return false;
        }

        if (view.pdoc === 'bad' && user.docOk !== false) {
            return false;
        }

        if (view.psite === 'yes' && !user.listed) {
            return false;
        }

        if (view.psite === 'no' && user.listed) {
            return false;
        }

        if (view.psite === 'noimg' && !(user.listed && !user.clinicImg)) {
            return false;
        }

        const query = view.pq.trim().toLowerCase();

        if (
            query &&
            !searchHaystack(
                user.first,
                user.last,
                user.email,
                user.phone,
                user.tz,
                user.city,
                user.clinicName,
            ).includes(query)
        ) {
            return false;
        }

        return true;
    }),
);

const dirty = computed(() =>
    Boolean(view.pq || view.prole || view.pdoc || view.psite || view.pth),
);

function clear() {
    view.pq = '';
    view.prole = '';
    view.pdoc = '';
    view.psite = '';
    view.pth = '';
}

const fullName = (user) => `${loc(user.first)} ${loc(user.last)}`;

const initials = (user) =>
    `${loc(user.first).charAt(0)}${loc(user.last).charAt(0)}`;

/** A student uploads proof of studies; a practitioner uploads a diploma. */
const certLabel = (user) =>
    user.role === 'student' ? t('users.doc.studyCert') : t('users.doc.cert');
</script>

<template>
    <div>
        <FilterBar
            v-if="all.length"
            :count="rows.length"
            :label="t('users.pending.count', { n: all.length })"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchField
                v-model="view.pq"
                :placeholder="t('users.pending.search')"
            />

            <ASelect
                v-model="view.prole"
                :aria-label="t('users.pending.roleAria')"
            >
                <option value="">{{ t('users.pending.allRoles') }}</option>
                <option v-for="id in roleIds" :key="id" :value="id">
                    {{
                        t('users.pending.option', {
                            label: t(`users.role.${id}`),
                            n: countBy((user) => user.role === id),
                        })
                    }}
                </option>
            </ASelect>

            <ASelect
                v-model="view.pdoc"
                :aria-label="t('users.pending.docAria')"
            >
                <option value="">{{ t('users.pending.allDocs') }}</option>
                <option value="missing">
                    {{
                        t('users.pending.docMissing', { n: docCounts.missing })
                    }}
                </option>
                <option value="unchecked">
                    {{
                        t('users.pending.docUnchecked', {
                            n: docCounts.unchecked,
                        })
                    }}
                </option>
                <option value="ok">
                    {{ t('users.pending.docOk', { n: docCounts.ok }) }}
                </option>
                <option value="bad">
                    {{ t('users.pending.docBad', { n: docCounts.bad }) }}
                </option>
            </ASelect>

            <ASelect
                v-model="view.psite"
                :aria-label="t('users.pending.siteAria')"
            >
                <option value="">{{ t('users.pending.allSite') }}</option>
                <option value="yes">
                    {{ t('users.pending.siteYes', { n: siteCounts.yes }) }}
                </option>
                <option value="noimg">
                    {{ t('users.pending.siteNoImg', { n: siteCounts.noimg }) }}
                </option>
                <option value="no">
                    {{ t('users.pending.siteNo', { n: siteCounts.no }) }}
                </option>
            </ASelect>

            <ASelect
                v-model="view.pth"
                :aria-label="t('users.pending.therapyAria')"
            >
                <option value="">{{ t('users.pending.allTherapies') }}</option>
                <option v-for="id in therapyIds" :key="id" :value="id">
                    {{
                        t('users.pending.option', {
                            label: t(`therapy.${id}`),
                            n: countBy((user) => user.therapy === id),
                        })
                    }}
                </option>
            </ASelect>
        </FilterBar>

        <ACard v-if="!all.length">
            <AEmpty
                icon="check"
                :title="t('users.pending.emptyTitle')"
                :sub="t('users.pending.emptySub')"
            />
        </ACard>
        <ACard v-else-if="!rows.length">
            <AEmpty
                icon="inbox"
                :title="t('users.pending.noMatchTitle')"
                :sub="t('users.pending.noMatchSub')"
            />
        </ACard>

        <div v-else class="a-cards">
            <section v-for="user in rows" :key="user.id" class="a-card u-req">
                <header class="u-req-h">
                    <div class="a-avatar u-req-av">{{ initials(user) }}</div>
                    <div class="u-req-t">
                        <div class="u-req-n">{{ fullName(user) }}</div>
                        <div class="u-req-m">
                            {{
                                t('users.pending.meta', {
                                    role: t(`users.role.${user.role}`),
                                    therapy: t(`therapy.${user.therapy}`),
                                    city: loc(user.city),
                                })
                            }}
                        </div>
                    </div>
                    <AChip tone="amber" size="sm">
                        <ANum>{{ user.submitted.stamp }}</ANum>
                    </AChip>
                </header>

                <dl class="u-req-f">
                    <div>
                        <AIcon name="mail" :size="16" class="u-req-ic" />
                        <span class="ltr">{{ user.email }}</span>
                    </div>
                    <div>
                        <AIcon name="phone" :size="16" class="u-req-ic" />
                        <ANum>{{ user.phone }}</ANum>
                    </div>
                    <div>
                        <AIcon name="file" :size="16" class="u-req-ic" />
                        <span v-if="user.cert">
                            {{
                                t('users.pending.certUploaded', {
                                    doc: certLabel(user),
                                })
                            }}
                        </span>
                        <span v-else class="u-req-miss">
                            {{ t('users.pending.certMissing') }}
                        </span>
                        <span v-if="user.listed">
                            ·
                            {{
                                user.clinicImg
                                    ? t('users.pending.clinicImg')
                                    : t('users.pending.clinicImgMissing')
                            }}
                        </span>
                    </div>
                </dl>

                <footer class="u-req-a">
                    <AButton kind="p" icon="eye" @click="emit('open', user.id)">
                        {{ t('users.pending.review') }}
                    </AButton>
                    <AButton icon="x" @click="emit('reject', user.id)">
                        {{ t('actions.reject') }}
                    </AButton>
                </footer>
            </section>
        </div>
    </div>
</template>

<style scoped>
.u-req {
    padding: 22px;
}

.u-req-h {
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

.u-req-av {
    width: 48px;
    height: 48px;
    font-size: 17px;
}

.u-req-t {
    flex: 1;
}

.u-req-n {
    font-size: 19px;
    font-weight: 700;
}

.u-req-m {
    margin-top: 3px;
    color: var(--a-ink-3);
}

.u-req-f {
    display: grid;
    gap: 8px;
    margin: 16px 0 0;
    font-size: 14.5px;
    color: var(--a-ink-2);
}

.u-req-f > div {
    display: flex;
    align-items: center;
    gap: 8px;
}

.u-req-ic {
    color: var(--a-ink-4);
}

.u-req-miss {
    color: var(--a-red);
}

.u-req-a {
    display: flex;
    gap: 8px;
    margin-top: 18px;
}
</style>
