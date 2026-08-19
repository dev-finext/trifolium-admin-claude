// Close a popup when the pointer goes down anywhere outside it.
//
// Both label pickers in this area are custom popups rather than native selects,
// so each one needs the same dismissal behaviour. `mousedown` rather than
// `click`, so the popup is gone before the click lands on what is underneath.
import { onBeforeUnmount, onMounted } from 'vue';

/**
 * @param {import('vue').Ref<HTMLElement|null>} boxRef The popup's wrapper.
 * @param {() => void} onOutside
 */
export function useClickOutside(boxRef, onOutside) {
    function handle(event) {
        if (boxRef.value && !boxRef.value.contains(event.target)) {
            onOutside();
        }
    }

    onMounted(() => document.addEventListener('mousedown', handle));
    onBeforeUnmount(() => document.removeEventListener('mousedown', handle));
}
