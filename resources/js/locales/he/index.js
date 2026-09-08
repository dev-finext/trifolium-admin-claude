// Hebrew catalog. One file per area, namespaced under the area's own name, so
// two people can work on two screens without touching the same file.
//
// `en/index.js` must list exactly the same namespaces — a key present in one
// language and missing in the other is a bug, not a fallback.
import admins from '@/locales/he/admins';
import attachments from '@/locales/he/attachments';
import common from '@/locales/he/common';
import content from '@/locales/he/content';
import crm from '@/locales/he/crm';
import deliveries from '@/locales/he/deliveries';
import dev from '@/locales/he/dev';
import enums from '@/locales/he/enums';
import finance from '@/locales/he/finance';
import gate from '@/locales/he/gate';
import ingredients from '@/locales/he/ingredients';
import integrations from '@/locales/he/integrations';
import inventory from '@/locales/he/inventory';
import items from '@/locales/he/items';
import lab from '@/locales/he/lab';
import libraries from '@/locales/he/libraries';
import log from '@/locales/he/log';
import messaging from '@/locales/he/messaging';
import nav from '@/locales/he/nav';
import orders from '@/locales/he/orders';
import pricing from '@/locales/he/pricing';
import products from '@/locales/he/products';
import purchasing from '@/locales/he/purchasing';
import reports from '@/locales/he/reports';
import safety from '@/locales/he/safety';
import shell from '@/locales/he/shell';
import stickers from '@/locales/he/stickers';
import systemContacts from '@/locales/he/systemContacts';
import ui from '@/locales/he/ui';
import users from '@/locales/he/users';
import videos from '@/locales/he/videos';
import wallet from '@/locales/he/wallet';

export default {
    ...common,
    ...enums,
    admins,
    attachments,
    content,
    crm,
    deliveries,
    dev,
    finance,
    gate,
    ingredients,
    integrations,
    inventory,
    items,
    lab,
    libraries,
    log,
    messaging,
    nav,
    orders,
    pricing,
    products,
    purchasing,
    reports,
    safety,
    shell,
    stickers,
    ui,
    users,
    systemContacts,
    videos,
    wallet,
};
