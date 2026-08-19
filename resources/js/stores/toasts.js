// Toasts — the console's only transient feedback channel.
//
// The store owns the list and the dismissal timers, AToastHost renders it and
// useToast() is what a screen calls. Nothing here invents a message: every toast
// is pushed by code that has just done something.
import { defineStore } from 'pinia';
import { ref } from 'vue';

/** How long a toast stays on screen before it dismisses itself, in ms. */
export const TOAST_DURATION_MS = 5200;

// Ids only need to be unique within a session, and a counter is deterministic
// where a random id would not be.
let sequence = 0;

export const useToastStore = defineStore('toasts', () => {
    const items = ref([]);
    const timers = new Map();

    /**
     * Show a toast.
     *
     * @param {{title: string, body?: string, bad?: boolean, ms?: number}} toast
     * @returns {number} The toast's id, so a caller can dismiss it early.
     */
    function push(toast) {
        const { ms, ...rest } = toast || {};
        const id = ++sequence;

        items.value = [...items.value, { id, ...rest }];
        timers.set(
            id,
            setTimeout(() => dismiss(id), ms || TOAST_DURATION_MS),
        );

        return id;
    }

    /** Remove one toast, whether it timed out or the reader closed it. */
    function dismiss(id) {
        const timer = timers.get(id);

        if (timer) {
            clearTimeout(timer);
            timers.delete(id);
        }

        items.value = items.value.filter((item) => item.id !== id);
    }

    /** Drop everything — used when a screen tears down mid-flight. */
    function clear() {
        timers.forEach((timer) => clearTimeout(timer));
        timers.clear();
        items.value = [];
    }

    return { items, push, dismiss, clear };
});
