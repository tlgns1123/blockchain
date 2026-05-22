export type ToastType = "success" | "error" | "info";

type Listener = (message: string, type: ToastType) => void;
let _listener: Listener | null = null;

export function setToastListener(fn: Listener) {
  _listener = fn;
}

export function showToast(message: string, type: ToastType = "info") {
  _listener?.(message, type);
}
