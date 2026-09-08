// Gated single actions. Second-version material (dev/progress.js →
// `gated-actions`).
//
// The decision stands: there are no roles, every admin is equal. What the
// specifications keep asking for — "only with a password" — is a re-confirmation
// in front of one action, logged with the name of whoever did it. The first
// version gated two whole screens (supplier cards, admin users); this list names
// the single actions the same gate now protects. Labels at `gate.action.<id>`.
export const GATED_ACTION_IDS = ['batch_analyses', 'item_price', 'lab_texts'];

/** An unlock holds for the browser session, never longer. */
export const GATE_SCOPE = 'session';
