// The one-line way for a screen to show a toast:
//
//     const { push } = useToast();
//     push({ title: t('orders.toast.statusChanged') });
//     push({ title: t('orders.toast.sendFailed'), bad: true });
//
// The list itself lives in the Pinia store so a toast pushed from a drawer
// survives the drawer closing.
import { useToastStore } from '@/stores/toasts';

export function useToast() {
    const toasts = useToastStore();

    return {
        /**
         * @param {{title: string, body?: string, bad?: boolean, ms?: number}} toast
         * @returns {number} the toast's id
         */
        push: (toast) => toasts.push(toast),
        /** Close a toast before it times out, by the id `push` returned. */
        dismiss: (id) => toasts.dismiss(id),
    };
}
