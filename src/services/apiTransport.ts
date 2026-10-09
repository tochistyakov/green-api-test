import type { Credentials } from "../types/connection";

type ApiMethod =
  | "getStateInstance"
  | "checkAccount"
  | "sendMessage"
  | "receiveNotification"
  | "deleteNotification";

export function createRequestScope(signal: AbortSignal, timeoutMs = 15_000) {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();

  signal.addEventListener("abort", cancel, { once: true });

  if (signal.aborted) {
    cancel();
  }

  const timer = window.setTimeout(() => {
    timedOut = true;
    cancel();
  }, timeoutMs);

  return {
    signal: controller.signal,
    get timedOut() {
      return timedOut;
    },
    dispose() {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
    },
  };
}

export function apiFetch(
  credentials: Credentials,
  method: ApiMethod,
  signal: AbortSignal,
  init: RequestInit = {},
  suffix = "",
) {
  const base = new URL(credentials.apiUrl.trim()).origin;
  const id = encodeURIComponent(credentials.idInstance.trim());
  const token = encodeURIComponent(credentials.apiTokenInstance.trim());

  return fetch(`${base}/waInstance${id}/${method}/${token}${suffix}`, {
    ...init,
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "no-referrer",
    signal,
  });
}
