export type ToastType = "success" | "error";

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

const TOAST_DISMISS_DELAY = 4000;

/**
 * Minimal toast queue shared across pages. State lives in `useState` so the
 * layout renders every toast regardless of which page pushed it.
 */
export const useNotify = () => {
  const toasts = useState<ToastMessage[]>("notify:toasts", () => []);

  const dismiss = (id: number): void => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  };

  const push = (message: string, type: ToastType): void => {
    // Skip when an identical toast is still on screen (e.g. retrying a failed
    // request within the dismiss window) so users don't see stacked copies.
    const isDuplicate = toasts.value.some(
      (toast) => toast.type === type && toast.message === message,
    );
    if (isDuplicate) return;

    const id = Date.now() + Math.random();
    toasts.value = [...toasts.value, { id, type, message }];

    if (import.meta.client) {
      window.setTimeout(() => dismiss(id), TOAST_DISMISS_DELAY);
    }
  };

  return {
    toasts,
    dismiss,
    success: (message: string): void => push(message, "success"),
    error: (message: string): void => push(message, "error"),
  };
};
