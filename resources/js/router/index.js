// Routes mirror the navigation: one route per nav item, same id, lazily loaded
// so the initial bundle carries only the shell and the orders screen.
//
// Query state (active tab, filters, selected row) is the URL's job, not a
// store's — an agent can paste a filtered view to a colleague and it opens the
// same way.
import { watch } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';

import { DEFAULT_NAV_ITEM } from '@/config/nav';
import i18n from '@/i18n';

const routes = [
    { path: '/', redirect: { name: DEFAULT_NAV_ITEM } },
    {
        path: '/orders',
        name: 'orders',
        meta: { titleKey: 'nav.item.orders' },
        component: () => import('@/views/OrdersView.vue'),
    },
    {
        path: '/orders/:id',
        name: 'order',
        meta: { titleKey: 'nav.item.orders' },
        component: () => import('@/views/OrderDetailView.vue'),
    },
    {
        path: '/deliveries',
        name: 'deliveries',
        meta: { titleKey: 'nav.item.deliveries' },
        component: () => import('@/views/DeliveriesView.vue'),
    },
    {
        path: '/messaging',
        name: 'messaging',
        meta: { titleKey: 'nav.item.messaging' },
        component: () => import('@/views/MessagingView.vue'),
    },
    {
        path: '/users',
        name: 'users',
        meta: { titleKey: 'nav.item.users' },
        component: () => import('@/views/UsersView.vue'),
    },
    {
        path: '/finance',
        name: 'finance',
        meta: { titleKey: 'nav.item.finance' },
        component: () => import('@/views/FinanceView.vue'),
    },
    {
        path: '/wallet',
        name: 'wallet',
        meta: { titleKey: 'nav.item.wallet' },
        component: () => import('@/views/WalletView.vue'),
    },
    {
        path: '/products',
        name: 'products',
        meta: { titleKey: 'nav.item.products' },
        component: () => import('@/views/ProductsView.vue'),
    },
    {
        path: '/pricing',
        name: 'pricing',
        meta: { titleKey: 'nav.item.pricing' },
        component: () => import('@/views/PricingView.vue'),
    },
    {
        path: '/ingredients',
        name: 'ingredients',
        meta: { titleKey: 'nav.item.ingredients' },
        component: () => import('@/views/IngredientsView.vue'),
    },
    {
        path: '/items',
        name: 'items',
        meta: { titleKey: 'nav.item.items' },
        component: () => import('@/views/ItemsView.vue'),
    },
    {
        path: '/lab',
        name: 'lab',
        meta: { titleKey: 'nav.item.lab' },
        component: () => import('@/views/LabView.vue'),
    },
    {
        path: '/stickers',
        name: 'stickers',
        meta: { titleKey: 'nav.item.stickers' },
        component: () => import('@/views/StickersView.vue'),
    },
    {
        path: '/inventory',
        name: 'inventory',
        meta: { titleKey: 'nav.item.inventory' },
        component: () => import('@/views/InventoryView.vue'),
    },
    {
        path: '/purchasing',
        name: 'purchasing',
        meta: { titleKey: 'nav.item.purchasing' },
        component: () => import('@/views/PurchasingView.vue'),
    },
    {
        path: '/reports',
        name: 'reports',
        meta: { titleKey: 'nav.item.reports' },
        component: () => import('@/views/ReportsView.vue'),
    },
    {
        path: '/safety',
        name: 'safety',
        meta: { titleKey: 'nav.item.safety' },
        component: () => import('@/views/SafetyView.vue'),
    },
    {
        path: '/libraries',
        name: 'libraries',
        meta: { titleKey: 'nav.item.libraries' },
        component: () => import('@/views/LibrariesView.vue'),
    },
    {
        path: '/content',
        name: 'content',
        meta: { titleKey: 'nav.item.content' },
        component: () => import('@/views/ContentView.vue'),
    },
    {
        path: '/videos',
        name: 'videos',
        meta: { titleKey: 'nav.item.videos' },
        component: () => import('@/views/VideosView.vue'),
    },
    {
        path: '/integrations',
        name: 'integrations',
        meta: { titleKey: 'nav.item.integrations' },
        component: () => import('@/views/IntegrationsView.vue'),
    },
    {
        path: '/admins',
        name: 'admins',
        meta: { titleKey: 'nav.item.admins' },
        component: () => import('@/views/AdminsView.vue'),
    },
    {
        path: '/system-contacts',
        name: 'systemContacts',
        meta: { titleKey: 'nav.item.systemContacts' },
        component: () => import('@/views/SystemContactsView.vue'),
    },
    {
        path: '/log',
        name: 'log',
        meta: { titleKey: 'nav.item.log' },
        component: () => import('@/views/LogView.vue'),
    },
    // The development progress article exists only against the demo fixture. The
    // test is written against import.meta.env directly so Vite folds it: in an
    // `api` build the route — and the lazy chunk behind it — is not emitted at all.
    ...(import.meta.env.VITE_DATA_SOURCE === 'api'
        ? []
        : [
              {
                  path: '/dev/progress',
                  name: 'devProgress',
                  meta: { titleKey: 'nav.item.devProgress' },
                  component: () => import('@/views/dev/ProgressView.vue'),
              },
          ]),
    {
        path: '/:pathMatch(.*)*',
        name: 'not_found',
        meta: { titleKey: 'notFound.crumb' },
        component: () => import('@/views/NotFoundView.vue'),
    },
];

/**
 * The tab title names the screen the reader is on — `ניהול | הזמנות` — because a
 * back-office is lived in across many tabs at once and "Trifolium" on every one
 * of them tells the reader nothing.
 */
export function documentTitle(route) {
    const key = route?.meta?.titleKey;
    const prefix = i18n.global.t('app.titlePrefix');

    return key ? `${prefix} | ${i18n.global.t(key)}` : prefix;
}

export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior: (to, from, saved) => saved || { top: 0 },
});

router.afterEach((to) => {
    document.title = documentTitle(to);
});

// The title is written in the reader's language, so it is rewritten when the
// language switches, not only when the route does.
watch(i18n.global.locale, () => {
    document.title = documentTitle(router.currentRoute.value);
});

export default router;
