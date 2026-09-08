// English mirror of he/gate.js — single actions behind the approval code (V2).
export default {
    unlock: 'Unlock with the approval code',
    unlocked: 'Open for this session · {action}',
    lock: 'Lock again',
    confirmTitle: 'Unlock a protected action · {action}',
    confirmBody:
        'The code is verified by the server against the signed-in user. The unlock lasts until the page is refreshed — no longer.',
    confirm: 'Unlock',
    effect1: 'The action opens for this session only',
    effect2:
        'The unlock is written to the system log with the name and the time',
    toast: 'Action unlocked',
    failed: 'The unlock was refused',

    // config/gates.js GATED_ACTION_IDS
    action: {
        batch_analyses: {
            title: 'Batch analyses and documents',
            why: 'COA analyses are quality documents — viewed and uploaded behind the approval code, as the specification asks',
        },
        item_price: {
            title: 'Item prices',
            why: 'A change to the sale or purchase price reaches every order that follows',
        },
        lab_texts: {
            title: 'Regulatory texts',
            why: 'The regulatory warning prints on every label — changing it needs re-confirmation',
        },
    },
};
