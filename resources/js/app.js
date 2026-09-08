import { createPinia } from 'pinia';
import { createApp } from 'vue';

import '@css/app.css';

import App from '@/App.vue';
import i18n from '@/i18n';
import { loc } from '@/lib/localized';
import router from '@/router';
import { useLocaleStore } from '@/stores/locale';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);

// `$loc(record.field)` in any template, without importing the composable.
app.config.globalProperties.$loc = (value) =>
    loc(value, i18n.global.locale.value);

// An uncaught render error tears down the component tree and leaves a blank
// screen. In development that is loud enough; in production the agent sees an
// empty console and has no idea whether their last click saved anything, so say
// so on the page. `where` is Vue's own description of what was running.
app.config.errorHandler = (error, instance, where) => {
    console.error(`[trifolium-admin] ${where}`, error);

    const root = document.getElementById('app');

    if (!root || root.dataset.crashed) {
        return;
    }

    root.dataset.crashed = '1';
    root.innerHTML = '';

    const notice = document.createElement('div');

    notice.className = 'a-crash';
    notice.setAttribute('role', 'alert');
    notice.innerHTML = `
        <h1>${i18n.global.t('shell.crash.title')}</h1>
        <p>${i18n.global.t('shell.crash.body')}</p>
        <button type="button">${i18n.global.t('shell.crash.reload')}</button>
    `;
    notice.querySelector('button').addEventListener('click', () => {
        window.location.reload();
    });
    root.append(notice);
};

// `<html lang>` / `<html dir>` must match the detected locale before first paint.
useLocaleStore().init();

app.mount('#app');
