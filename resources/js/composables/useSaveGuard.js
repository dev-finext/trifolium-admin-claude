// What the reader sees when a change does not go through.
//
// Every screen in the console applies its change locally and then sends it. That
// is the right order — the interface must not stutter — but it means a rejected
// write leaves the screen showing something that never happened. This is the
// designed answer to that: put the screen back, say so, and offer the action
// again.
//
// A guarded action reads:
//
//     await guard({
//         label: t('lab.queue.roleMarked', { role }),
//         run: () => orders.setLabRole(id, role, true),
//         revert: () => orders.setLabRole(id, role, false, { quiet: true }),
//     });
//
// `run` performs the optimistic change and sends it; `revert` undoes the local
// half. When `run` resolves, the success toast is shown; when it rejects, the
// revert runs and a failure toast offers "try again".
import { useI18n } from 'vue-i18n';

import { useToast } from '@/composables/useToast';

/** A failure stays on screen long enough to be read and acted on. */
export const FAILURE_TOAST_MS = 14000;

export function useSaveGuard() {
    const { t } = useI18n();
    const { push } = useToast();

    /**
     * @param {{
     *   label: string,          what was attempted, for both toasts
     *   run: () => Promise<*>,  the optimistic change plus its write
     *   revert?: () => *,       put the screen back when the write is refused
     *   body?: string,          extra line on the success toast
     *   silent?: boolean,       skip the success toast
     * }} action
     * @returns {Promise<boolean>} whether the change stuck
     */
    async function guard(action) {
        try {
            await action.run();

            if (!action.silent) {
                push({ title: action.label, body: action.body });
            }

            return true;
        } catch (error) {
            try {
                action.revert?.();
            } catch {
                // A revert that itself fails must not swallow the report below.
            }

            push({
                title: t('ui.saveFailed.title'),
                body: t('ui.saveFailed.body', {
                    what: action.label,
                    reason: String(error?.message || '').slice(0, 90),
                }),
                bad: true,
                ms: FAILURE_TOAST_MS,
                action: {
                    label: t('ui.saveFailed.retry'),
                    run: () => guard(action),
                },
            });

            return false;
        }
    }

    return { guard };
}
