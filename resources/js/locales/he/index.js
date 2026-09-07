// Hebrew catalog. One file per area, namespaced under the area's own name, so
// two people can work on two screens without touching the same file.
//
// `en/index.js` must list exactly the same namespaces — a key present in one
// language and missing in the other is a bug, not a fallback.
import admins from '@/locales/he/admins';
import common from '@/locales/he/common';
import content from '@/locales/he/content';
import deliveries from '@/locales/he/deliveries';
import dev from '@/locales/he/dev';
import enums from '@/locales/he/enums';
import finance from '@/locales/he/finance';
import ingredients from '@/locales/he/ingredients';
import integrations from '@/locales/he/integrations';
import inventory from '@/locales/he/inventory';
import lab from '@/locales/he/lab';
import libraries from '@/locales/he/libraries';
import log from '@/locales/he/log';
import messaging from '@/locales/he/messaging';
import nav from '@/locales/he/nav';
import orders from '@/locales/he/orders';
import pricing from '@/locales/he/pricing';
import products from '@/locales/he/products';
import safety from '@/locales/he/safety';
import shell from '@/locales/he/shell';
import systemContacts from '@/locales/he/systemContacts';
import ui from '@/locales/he/ui';
import users from '@/locales/he/users';
import videos from '@/locales/he/videos';
import wallet from '@/locales/he/wallet';

export default {
    ...common,
    ...enums,
    admins,
    content,
    deliveries,
    dev,
    finance,
    ingredients,
    integrations,
    inventory,
    lab,
    libraries,
    log,
    messaging,
    nav,
    orders,
    pricing,
    products,
    safety,
    shell,
    ui,
    users,
    systemContacts,
    videos,
    wallet,
};
