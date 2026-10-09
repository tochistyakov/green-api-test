import { useEffect, useState } from "react";
import type { Credentials } from "../types/connection";
import type {
  NotificationProcessor,
  PollingState,
} from "../types/notifications";
import { deleteNotification, receiveNotification } from "../services/greenApi";
import { runPolling } from "../services/polling";

export function useMessagePolling(
  credentials: Credentials,
  process: NotificationProcessor,
) {
  const [state, setState] = useState<PollingState>({
    phase: "waiting",
    message: "Подключаем получение сообщений…",
  });
  const [attempt, setAttempt] = useState(0);
  const { apiUrl, idInstance, apiTokenInstance } = credentials;

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const session = { apiUrl, idInstance, apiTokenInstance };
    const report = (next: PollingState) => {
      if (!signal.aborted) setState(next);
    };

    async function start() {
      if (!navigator.locks) {
        report({
          phase: "stopped",
          message:
            "Для безопасного приёма нужен браузер с Web Locks (HTTPS или localhost). Приём не запущен.",
        });
        return;
      }

      report({
        phase: "waiting",
        message:
          "Ожидаем доступ к очереди. Для одного инстанса используйте одну активную вкладку. ",
      });

      try {
        const lockName = `green-api-poll:${new URL(apiUrl.trim()).origin}:${idInstance.trim()}`;
        await navigator.locks.request(lockName, { signal }, async () => {
          if (signal.aborted) return;
          await runPolling(signal, {
            receive: () => receiveNotification(session, signal),
            remove: (receiptId) =>
              deleteNotification(session, receiptId, signal),
            process,
            report,
          });
        });
      } catch {
        report({
          phase: "stopped",
          message:
            "Не удалось получить доступ к очереди. Закройте другие клиенты и подключитесь заново.",
          canRetry: true,
        });
      }
    }
    void start();

    return () => controller.abort();
  }, [apiUrl, idInstance, apiTokenInstance, process, attempt]);

  return { state, resume: () => setAttempt((value) => value + 1) };
}
