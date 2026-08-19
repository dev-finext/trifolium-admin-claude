<script setup>
// Integrations & external systems.
//
// The health board reports the reading the data layer holds: a stored state, a
// stored response time, a stored check time. There is no probe behind this
// screen — no interval, no timer, no invented latency.
//
// "Check all" therefore asks the server to run the checks rather than pretending
// to run them here: the request goes out, and each row changes when the server
// has an answer to report. A button that flipped states locally would be putting
// figures on screen that nothing measured.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHead from '@/components/layout/PageHead.vue';
import ConnectionCard from '@/components/system/ConnectionCard.vue';
import SearchField from '@/components/system/SearchField.vue';
import ServiceSummary from '@/components/system/ServiceSummary.vue';
import ServiceTable from '@/components/system/ServiceTable.vue';
import AButton from '@/components/ui/AButton.vue';
import ACard from '@/components/ui/ACard.vue';
import AEmpty from '@/components/ui/AEmpty.vue';
import AKeyValue from '@/components/ui/AKeyValue.vue';
import ASelect from '@/components/ui/ASelect.vue';
import ATabs from '@/components/ui/ATabs.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FilterBar from '@/components/ui/FilterBar.vue';
import { useLocalized } from '@/composables/useLocalized';
import { useToast } from '@/composables/useToast';
import { useUrlState } from '@/composables/useUrlState';
import { CONNECTIONS } from '@/config/integrations';
import { num } from '@/lib/money';
import { groupServices, useSystemStore } from '@/stores/system';

const { t } = useI18n();
const { loc, searchHaystack } = useLocalized();
const system = useSystemStore();
const { push } = useToast();

const asking = ref(false);
const checking = ref(false);

const view = useUrlState({ tab: 'services', q: '', sys: '', state: '' });

const tabs = computed(() => [
    {
        id: 'services',
        label: t('integrations.tab.services'),
        icon: 'layers',
        n: system.serviceCounts.endpoints,
    },
    {
        id: 'connections',
        label: t('integrations.tab.connections'),
        icon: 'db',
        n: CONNECTIONS.length,
    },
]);

const term = computed(() => view.q.trim().toLowerCase());

const shown = computed(() =>
    system.services.filter((service) => {
        if (view.state && service.state !== view.state) {
            return false;
        }

        if (view.sys && !system.serviceGroups.some(matches(service))) {
            return false;
        }

        if (
            term.value &&
            !searchHaystack(service.sys, service.label, service.ep).includes(
                term.value,
            )
        ) {
            return false;
        }

        return true;
    }),
);

/** A service belongs to the picked system when its group holds it. */
function matches(service) {
    return (group) => group.key === view.sys && group.services.includes(service);
}

const shownGroups = computed(() => groupServices(shown.value));

const dirty = computed(() => Boolean(view.q || view.sys || view.state));

const systemOptions = computed(() => [
    { value: '', label: t('integrations.filter.systemAll') },
    ...system.serviceGroups.map((group) => ({
        value: group.key,
        label: loc(group.sys),
    })),
]);

const stateOptions = computed(() => [
    { value: '', label: t('integrations.filter.stateAll') },
    ...system.serviceStateIds.map((id) => ({
        value: id,
        label: t(`integrations.state.${id}`),
    })),
]);

/** Which systems a down or slow banner names, as "system · endpoint". */
const namesOf = (services) =>
    services
        .map((service) => `${loc(service.sys)} · ${loc(service.label)}`)
        .join(' · ');

const impactRows = computed(() =>
    ['pay', 'doc', 'msg', 'courier', 'backup'].map((id) => [
        t(`integrations.impact.${id}`),
        t(`integrations.impact.${id}Body`),
    ]),
);

function clear() {
    view.q = '';
    view.sys = '';
    view.state = '';
}

async function runCheck() {
    asking.value = false;
    checking.value = true;

    const ok = await system.requestServiceCheck();

    checking.value = false;

    push(
        ok
            ? {
                  title: t('integrations.checkAll.done'),
                  body: t('integrations.checkAll.doneBody', {
                      n: num(system.serviceCounts.endpoints),
                  }),
              }
            : {
                  title: t('integrations.checkAll.failed'),
                  body: t('integrations.checkAll.failedBody'),
                  tone: 'red',
              },
    );
}
</script>

<template>
    <PageHead
        :crumbs="[t('nav.group.system'), t('nav.item.integrations')]"
        :title="t('integrations.title')"
        :sub="
            t('integrations.sub', {
                systems: num(system.serviceCounts.systems),
                endpoints: num(system.serviceCounts.endpoints),
            })
        "
    >
        <template #actions>
            <AButton
                kind="p"
                icon="refresh"
                :disabled="checking"
                @click="asking = true"
            >
                {{ t('integrations.checkAll.label') }}
            </AButton>
        </template>
    </PageHead>

    <ATabs v-model="view.tab" :tabs="tabs" />

    <div v-if="view.tab === 'services'" class="a-grid int-body">
        <div v-if="system.downServices.length" class="a-note a-note--danger">
            <strong>
                {{
                    t('integrations.banner.down', system.downServices.length)
                }}
            </strong>
            — {{ namesOf(system.downServices) }}.
            {{ t('integrations.banner.downBody') }}
        </div>
        <div
            v-else-if="system.slowServices.length"
            class="a-note a-note--warn"
        >
            <strong>
                {{ t('integrations.banner.slow', system.slowServices.length) }}
            </strong>
            — {{ namesOf(system.slowServices) }}.
            {{ t('integrations.banner.slowBody') }}
        </div>
        <div v-else class="a-note a-note--ok">
            {{
                t('integrations.banner.ok', {
                    n: num(system.serviceCounts.endpoints),
                })
            }}
        </div>

        <div class="a-note a-note--info">{{ t('integrations.serverSide') }}</div>

        <ServiceSummary
            :counts="system.serviceCounts"
            :state-ids="system.serviceStateIds"
            :active="view.state"
            @state="view.state = $event"
        />

        <FilterBar
            :count="shown.length"
            :label="t('integrations.filter.label')"
            :dirty="dirty"
            @clear="clear"
        >
            <SearchField
                v-model="view.q"
                :placeholder="t('integrations.filter.search')"
                :label="t('integrations.filter.searchLabel')"
            />
            <ASelect
                v-model="view.sys"
                :options="systemOptions"
                :aria-label="t('integrations.filter.system')"
            />
            <ASelect
                v-model="view.state"
                :options="stateOptions"
                :aria-label="t('integrations.filter.state')"
            />
        </FilterBar>

        <ServiceTable
            v-if="shownGroups.length"
            :groups="shownGroups"
            :states="system.serviceStates"
        />
        <ACard v-else>
            <AEmpty
                icon="layers"
                :title="t('integrations.empty.title')"
                :sub="t('integrations.empty.sub')"
            />
        </ACard>

        <ACard :title="t('integrations.impact.title')" icon="alert">
            <AKeyValue :rows="impactRows" />
        </ACard>
    </div>

    <div v-else class="a-grid int-body">
        <div class="a-note a-note--info">
            {{ t('integrations.connections.note') }}
        </div>

        <div class="a-cards">
            <ConnectionCard
                v-for="connection in CONNECTIONS"
                :key="connection.id"
                :connection="connection"
                :services="system.connectionServices(connection.services)"
                :states="system.serviceStates"
            />
        </div>
    </div>

    <ConfirmDialog
        :open="asking"
        :title="t('integrations.checkAll.title')"
        :body="
            t('integrations.checkAll.body', {
                n: num(system.serviceCounts.endpoints),
            })
        "
        :effects="[
            t('integrations.checkAll.effectEach'),
            t('integrations.checkAll.effectFigures'),
            t('integrations.checkAll.effectDown'),
        ]"
        :confirm-label="t('integrations.checkAll.confirm')"
        @close="asking = false"
        @confirm="runCheck"
    />
</template>

<style scoped>
.int-body {
    margin-top: 20px;
}

/* The connection cards hold a longer key/value list than the default card grid
   was sized for, so they get a wider minimum before they wrap. */
.a-cards {
    grid-template-columns: repeat(auto-fill, minmax(460px, 1fr));
}
</style>
