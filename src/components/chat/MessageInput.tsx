import { LoaderCircle, Send } from "lucide-react";
import type { MessageStatus } from "../../types/chat";
import {
  MAX_MESSAGE_LENGTH,
  messageLength,
} from "../../services/messageValidation";
import styles from "./Chat.module.css";

interface Props {
  value: string;
  operationStatus?: MessageStatus;
  onChange: (value: string) => void;
  onSend: () => void;
}

export function MessageInput({
  value,
  operationStatus,
  onChange,
  onSend,
}: Props) {
  const length = messageLength(value);
  const tooLong = length > MAX_MESSAGE_LENGTH;
  const disabled = !value.trim() || tooLong || Boolean(operationStatus);

  function submit() {
    if (!disabled) {
      onSend();
    }
  }

  return (
    <footer className={styles.composerArea}>
      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className={styles.srOnly} htmlFor="message-draft">
          Текст сообщения
        </label>

        <textarea
          id="message-draft"
          rows={2}
          placeholder="Написать сообщение…"
          value={value}
          aria-invalid={tooLong}
          aria-describedby="composer-help message-count"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              if (!event.repeat) {
                submit();
              }
            }
          }}
        />

        <button
          type="submit"
          className={styles.sendButton}
          disabled={disabled}
          aria-label="Отправить сообщение"
          title="Отправить сообщение"
        >
          {operationStatus === "sending" ? (
            <LoaderCircle className={styles.sendingIcon} size={22} />
          ) : (
            <Send size={22} />
          )}
        </button>
      </form>

      <div className={styles.composerHelp}>
        <span id="composer-help" role="status">
          {tooLong
            ? "Сократите текст до 4096 символов."
            : operationStatus === "error"
              ? "Ошибка: повторите отправку под сообщением или измените текст."
              : operationStatus === "sending"
                ? "Отправляем… Можно продолжать писать новый текст."
                : "Enter — отправить · Shift + Enter — новая строка"}
        </span>

        <span
          id="message-count"
          className={tooLong ? styles.lengthError : styles.messageCount}
        >
          {length} / {MAX_MESSAGE_LENGTH}
        </span>
      </div>
    </footer>
  );
}
