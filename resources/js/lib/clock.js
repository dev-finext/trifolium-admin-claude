// The console's clock, in one place.
//
// Production reads the real clock. The demo dataset pins it to a fixed instant
// so the sample data renders identically on every load — that is a fixture, not
// simulated liveness: nothing here advances on its own or invents values.
let pinned = null;

/**
 * Pin the clock to a fixed instant, or pass `null` to return to the real clock.
 *
 * @param {Date|null} date
 */
export function setClock(date) {
    pinned = date instanceof Date ? new Date(date.getTime()) : null;
}

/** The current instant — pinned when a fixture is loaded, real otherwise. */
export function now() {
    return pinned ? new Date(pinned.getTime()) : new Date();
}

/** True when a fixture has pinned the clock. */
export function isPinned() {
    return pinned !== null;
}
