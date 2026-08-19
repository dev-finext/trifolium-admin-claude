// Keep the page behind an overlay from scrolling under it.
//
// The console's scroll container is `.a-body`, not the document, so that is the
// element this touches. Each lock captures the value it found and puts exactly
// that back — which is what makes a modal opened on top of a drawer behave: the
// modal restores `hidden` (the drawer's value), and the drawer, when it closes,
// restores what the page had before either opened.
import { onScopeDispose, unref, watch } from 'vue';

const SCROLL_HOST = '.a-body';

/**
 * @param {import('vue').Ref<boolean>|(() => boolean)|boolean} active
 */
export function useScrollLock(active) {
    let host = null;
    let previous = '';

    const isOn = () =>
        Boolean(typeof active === 'function' ? active() : unref(active));

    function lock() {
        if (host) {
            return;
        }

        const el = document.querySelector(SCROLL_HOST);

        if (!el) {
            return;
        }

        host = el;
        previous = host.style.overflow;
        host.style.overflow = 'hidden';
    }

    function release() {
        if (!host) {
            return;
        }

        host.style.overflow = previous;
        host = null;
    }

    watch(
        isOn,
        (on) => {
            if (on) {
                lock();
            } else {
                release();
            }
        },
        { immediate: true },
    );

    // A drawer torn down while open must not leave the page frozen.
    onScopeDispose(release);

    return { lock, release };
}
