<script setup>
// Reviewing one registration.
//
// Approval is what creates the practitioner card, so the screen states exactly
// what will exist afterwards — the customer number he will sign in with above
// all — before the button is available. A diploma marked invalid blocks approval
// outright: the only way forward is a rejection carrying a reason.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AChip from '@/components/ui/AChip.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import AModal from '@/components/ui/AModal.vue';
import ANum from '@/components/ui/ANum.vue';
import ATextarea from '@/components/ui/ATextarea.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { formatAddress } from '@/components/users/address';
import DocViewer from '@/components/users/DocViewer.vue';
import { useLocalized } from '@/composables/useLocalized';
import { NUMBERING, SETTINGS } from '@/config';
import { usePeopleStore } from '@/stores/people';

/** Wide enough for a rejection reason without the card scrolling itself. */
const REJECT_WIDTH = 560;

const props = defineProps({
    user: { type: Object, required: true },
});

const emit = defineEmits(['close', 'approved', 'rejected']);

const { t } = useI18n();
const { loc } = useLocalized();
const people = usePeopleStore();

const approving = ref(false);
const rejecting = ref(false);
const reason = ref('');

watch(
    () => props.user.id,
    () => {
        approving.value = false;
        rejecting.value = false;
        reason.value = '';
    },
);

const name = computed(() => `${loc(props.user.first)} ${loc(props.user.last)}`);
const isStudent = computed(() => props.user.role === 'student');
const state = computed(() => {
    if (props.user.docOk === true) {
        return 'ok';
    }

    return props.user.docOk === false ? 'bad' : '';
});
const blocked = computed(() => props.user.docOk === false);
const code = computed(() => people.nextCustomerNumber);
const certTitle = computed(() =>
    isStudent.value ? t('users.doc.studyCert') : t('users.doc.cert'),
);
const address = computed(() => formatAddress(props.user, t, loc));

const approveEffects = computed(() => [
    t('users.approval.effect.card', { code: code.value }),
    t('users.approval.effect.login'),
    t('users.approval.effect.message'),
    t('users.approval.effect.log'),
]);

function approve() {
    const created = people.approveRegistration(props.user);

    approving.value = false;
    emit('approved', { name: name.value, code: created });
}

function reject() {
    const why = reason.value.trim();

    people.rejectRegistration(props.user, why);
    rejecting.value = false;
    emit('rejected', why);
}
</script>

<template>
    <div class="a-dhead a-dhead--line">
        <div class="a-dhead-top u-head">
            <div>
                <div class="a-dhead-t">
                    <h2 class="u-name">{{ name }}</h2>
                    <AChip tone="amber" size="lg">
                        {{ t('users.approval.waiting') }}
                    </AChip>
                    <AChip tone="gray" :dot="false">
                        {{ t(`users.role.${user.role}`) }}
                    </AChip>
                    <AChip tone="teal" :dot="false">
                        {{ t(`therapy.${user.therapy}`) }}
                    </AChip>
                </div>
                <div class="a-dhead-m">
                    <span>
                        {{ t('users.field.tz') }}
                        <ANum>{{ user.tz }}</ANum>
                    </span>
                    <span
                        ><ANum>{{ user.phone }}</ANum></span
                    >
                    <span class="ltr">{{ user.email }}</span>
                    <span>
                        {{
                            t('users.approval.submitted', {
                                when: user.submitted.stamp,
                            })
                        }}
                    </span>
                </div>
            </div>
            <div class="a-dhead-a">
                <AButton
                    kind="p"
                    icon="check"
                    :disabled="blocked"
                    @click="approving = true"
                >
                    {{ t('users.approval.approve') }}
                </AButton>
                <AButton kind="danger" icon="x" @click="rejecting = true">
                    {{ t('actions.reject') }}
                </AButton>
                <AButton sm icon="x" @click="emit('close')">
                    {{ t('actions.close') }}
                </AButton>
            </div>
        </div>
        <div v-if="blocked" class="a-note a-note--warn u-blocked">
            {{ t('users.approval.blocked') }}
        </div>
    </div>

    <div class="u-cols">
        <div class="a-grid">
            <ACard :title="t('users.approval.personal')" icon="user">
                <AKeyValue>
                    <dt>{{ t('users.field.fullName') }}</dt>
                    <dd>{{ name }}</dd>
                    <dt>{{ t('users.field.tz') }}</dt>
                    <dd>
                        <ANum>{{ user.tz }}</ANum>
                    </dd>
                    <dt>{{ t('users.field.email') }}</dt>
                    <dd>
                        <span class="ltr">{{ user.email }}</span>
                    </dd>
                    <dt>{{ t('users.field.phone') }}</dt>
                    <dd>
                        <ANum>{{ user.phone }}</ANum>
                    </dd>
                    <dt>{{ t('users.field.address') }}</dt>
                    <dd>{{ address }}</dd>
                </AKeyValue>
            </ACard>

            <ACard
                :title="
                    isStudent
                        ? t('users.approval.studies')
                        : t('users.approval.professional')
                "
                icon="book"
            >
                <AKeyValue v-if="isStudent">
                    <dt>{{ t('users.field.college') }}</dt>
                    <dd>{{ loc(user.college) }}</dd>
                    <dt>{{ t('users.field.teacher') }}</dt>
                    <dd>{{ loc(user.teacher) }}</dd>
                    <dt>{{ t('users.field.head') }}</dt>
                    <dd>{{ loc(user.head) }}</dd>
                    <dt>{{ t('users.field.therapy') }}</dt>
                    <dd>{{ t(`therapy.${user.therapy}`) }}</dd>
                    <dt>{{ t('users.field.spec') }}</dt>
                    <dd>{{ loc(user.spec) }}</dd>
                    <dt>{{ t('users.field.intern') }}</dt>
                    <dd>
                        <AChip v-if="user.intern" tone="teal" size="sm">
                            {{ t('labels.yes') }}
                        </AChip>
                        <template v-else>{{ t('labels.no') }}</template>
                    </dd>
                </AKeyValue>
                <AKeyValue v-else>
                    <dt>{{ t('users.field.gradYear') }}</dt>
                    <dd>
                        <ANum>{{ user.gradYear }}</ANum>
                    </dd>
                    <dt>{{ t('users.field.therapy') }}</dt>
                    <dd>{{ t(`therapy.${user.therapy}`) }}</dd>
                    <dt>{{ t('users.field.spec') }}</dt>
                    <dd>{{ loc(user.spec) }}</dd>
                    <dt>{{ t('users.field.listed') }}</dt>
                    <dd>
                        <AChip v-if="user.listed" tone="teal" size="sm">
                            {{ t('labels.yes') }}
                        </AChip>
                        <template v-else>{{ t('labels.no') }}</template>
                    </dd>
                    <template v-if="user.listed">
                        <dt>{{ t('users.field.clinic') }}</dt>
                        <dd>{{ loc(user.clinicName) }}</dd>
                        <dt>{{ t('users.field.clinicDesc') }}</dt>
                        <dd class="u-desc">{{ loc(user.clinicDesc) }}</dd>
                    </template>
                </AKeyValue>
            </ACard>

            <ACard :title="t('users.approval.willCreate')" icon="db">
                <AKeyValue>
                    <dt>{{ t('users.field.code') }}</dt>
                    <dd>
                        <ANum>{{ code }}</ANum>
                        <span class="u-aside">
                            · {{ t('users.approval.nextInSeries') }}
                        </span>
                    </dd>
                    <dt>{{ t('users.field.cardName') }}</dt>
                    <dd>
                        {{
                            t('users.approval.cardName', {
                                name,
                                therapy: t(`therapy.${user.therapy}`),
                            })
                        }}
                    </dd>
                    <dt>{{ t('users.field.tz') }}</dt>
                    <dd>
                        <ANum>{{ user.tz }}</ANum>
                    </dd>
                    <dt>{{ t('users.field.userType') }}</dt>
                    <dd>{{ t(`users.role.${user.role}`) }}</dd>
                    <dt>{{ t('users.field.baseDiscount') }}</dt>
                    <dd>
                        {{
                            t('users.approval.defaultDiscount', {
                                n: SETTINGS.defaultDiscountPct,
                            })
                        }}
                    </dd>
                    <dt>{{ t('users.field.paymentTrack') }}</dt>
                    <dd>{{ t('users.approval.immediate') }}</dd>
                    <dt>{{ t('users.field.spec') }}</dt>
                    <dd>
                        {{
                            t('users.approval.specClinic', {
                                spec: loc(user.spec),
                                clinic: loc(user.clinicName) || '—',
                            })
                        }}
                    </dd>
                </AKeyValue>
                <div class="a-note a-note--info u-note">
                    {{
                        t('users.approval.numberingNote', {
                            from: NUMBERING.legacyFrom,
                            to: NUMBERING.legacyTo,
                        })
                    }}
                </div>
            </ACard>
        </div>

        <div class="a-grid">
            <DocViewer
                :title="certTitle"
                :state="state"
                reviewable
                @review="
                    (verdict) =>
                        people.setRegistrationDoc(user, verdict === 'ok')
                "
            />
            <template v-if="user.listed">
                <DocViewer
                    v-if="user.clinicImg"
                    :title="t('users.doc.clinicImage')"
                />
                <ACard v-else :title="t('users.doc.clinicImage')" icon="image">
                    <AEmpty
                        icon="image"
                        :title="t('users.doc.noImage')"
                        :sub="t('users.doc.noImageSub')"
                    />
                </ACard>
            </template>
        </div>
    </div>

    <ConfirmDialog
        :open="approving"
        :title="t('users.approval.confirmTitle')"
        :confirm-label="t('users.approval.confirmLabel')"
        :body="t('users.approval.confirmBody', { name })"
        :effects="approveEffects"
        @close="approving = false"
        @confirm="approve"
    />

    <AModal
        :open="rejecting"
        :title="t('users.approval.rejectTitle')"
        :width="REJECT_WIDTH"
        @close="rejecting = false"
    >
        <div class="a-note a-note--warn u-note-b">
            {{ t('users.approval.rejectNote') }}
        </div>
        <label class="a-lbl" for="reject-why">
            {{ t('users.approval.rejectReason') }}
        </label>
        <ATextarea
            id="reject-why"
            v-model="reason"
            :rows="4"
            class="a-w100"
            :placeholder="t('users.approval.rejectPlaceholder')"
        />
        <template #footer>
            <AButton
                kind="danger"
                icon="x"
                :disabled="!reason.trim()"
                @click="reject"
            >
                {{ t('users.approval.rejectSend') }}
            </AButton>
            <AButton @click="rejecting = false">{{
                t('actions.cancel')
            }}</AButton>
        </template>
    </AModal>
</template>

<style scoped>
.u-head {
    padding-bottom: 0;
}

.u-name {
    margin: 0;
    font-size: 26px;
}

.u-blocked {
    margin-top: 14px;
}

/* Details on the reading side, the documents being reviewed beside them. */
.u-cols {
    display: grid;
    grid-template-columns: 1fr 460px;
    gap: 20px;
    align-items: start;
}

@media (max-width: 1100px) {
    .u-cols {
        grid-template-columns: 1fr;
    }
}

.u-aside {
    color: var(--a-ink-4);
    font-size: 13.5px;
}

.u-desc {
    font-weight: 400;
}

.u-note {
    margin-top: 14px;
}

.u-note-b {
    margin-bottom: 16px;
}
</style>
