import type {
  NotificationEnvelope,
  PollingDependencies,
} from "../types/notifications";
import { PollingError } from "./pollingError";

export function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const finish = () => {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = window.setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
  });
}

export async function runPolling(
  signal: AbortSignal,
  dependencies: PollingDependencies,
): Promise<void> {
  const wait = dependencies.wait ?? abortableDelay;
  let pending: NotificationEnvelope | null = null;
  let processed = false;
  let unauthorized = false;
  let failures = 0;
  let lastDeleted: number | undefined;

  while (!signal.aborted) {
    const started = performance.now();
    try {
      dependencies.report({
        phase: "receiving",
        message: "Приём сообщений активен",
      });

      if (!pending) {
        pending = await dependencies.receive();
        processed = false;
        if (signal.aborted) return;
      }

      if (pending && pending.receiptId === lastDeleted) {
        throw new PollingError(
          "invalid",
          "API повторно вернул уже удалённое уведомление.",
        );
      }

      if (pending) {
        if (!processed) {
          unauthorized = dependencies.process(pending.body) === "unauthorized";
          processed = true;
        }

        if (signal.aborted) return;

        await dependencies.remove(pending.receiptId);

        if (signal.aborted) return;

        lastDeleted = pending.receiptId;
        pending = null;

        if (unauthorized) {
          throw new PollingError(
            "auth",
            "Авторизация инстанса потеряна. Подключитесь заново.",
          );
        }
      }

      failures = 0; // Обнуляем счётчик неудач после успешной обработки уведомления (включая удаление).

      await wait(Math.max(0, 1000 - (performance.now() - started)), signal);
    } catch (error) {
      if (signal.aborted) return;
      const failure =
        error instanceof PollingError
          ? error
          : new PollingError(
              "invalid",
              "Ошибка обработки уведомления. Оно не подтверждено.",
            );
      failures++;
      const permanent =
        failure.kind === "auth" || failure.kind === "configuration";
      if (permanent || failures >= 6) {
        dependencies.report({
          phase: "stopped",
          message: `${failure.message} Приём остановлен.${permanent ? "" : " Проверьте причину перед возобновлением."}`,
          canRetry: !permanent,
        });

        return;
      }

      const delay = Math.min(30_000, 1000 * 2 ** (failures - 1));
      dependencies.report({
        phase: "backoff",
        message: `${failure.message} Повтор через ${delay / 1000} с (${failures}/6).`,
      });

      await wait(delay, signal);
    }
  }
}
