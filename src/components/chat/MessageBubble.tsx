import {
  Clock3,
  LoaderCircle,
  RotateCcw,
  CheckCheck,
  CircleAlert,
} from "lucide-react";
import type { Message, MessageStatus } from "../../types/chat";
import styles from "./Chat.module.css";

const statusLabels: Record<MessageStatus, string> = {
  sending: "Отправляется",
  queued: "В очереди отправки",
  error: "Ошибка",
  delivered: "Доставлено",
  read: "Прочитано",
  failed: "Не доставлено",
  noAccount: "Нет аккаунта Telegram",
  received: "Получено",
};

export function MessageBubble({
  message,
  onRetry,
}: {
  message: Message;
  onRetry: (clientId: string) => void;
}) {
  const outgoing = message.direction === "outgoing";
  const error =
    message.status === "error" ||
    message.status === "failed" ||
    message.status === "noAccount";

  return (
    <li className={`${styles.messageRow} ${outgoing ? styles.outgoing : ""}`}>
      <article
        className={styles.bubble}
        aria-label={outgoing ? "Исходящее сообщение" : "Входящее сообщение"}
      >
        <p>{message.text}</p>
        <div className={styles.messageMeta}>
          {outgoing && (
            <span
              className={
                error ? styles.messageErrorStatus : styles.messageStatus
              }
              role="status"
            >
              {message.status === "sending" ? (
                <LoaderCircle size={12} className={styles.sendingIcon} />
              ) : message.status === "queued" ? (
                <Clock3 size={12} />
              ) : error ? (
                <CircleAlert size={12} />
              ) : (
                <CheckCheck size={12} />
              )}

              {statusLabels[message.status]}
            </span>
          )}

          <time dateTime={message.sentAt}>
            {new Date(message.sentAt).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>

        {outgoing && error && (
          <div className={styles.messageError}>
            {message.error && <p>{message.error}</p>}
            {message.outcomeUnknown && (
              <p>
                Результат неизвестен. Проверьте Telegram перед повтором:
                возможен дубликат.
              </p>
            )}
            {message.status === "error" && (
              <button
                type="button"
                className={styles.retryButton}
                onClick={() => onRetry(message.clientId)}
              >
                <RotateCcw size={13} /> Повторить отправку
              </button>
            )}
          </div>
        )}
      </article>
    </li>
  );
}
