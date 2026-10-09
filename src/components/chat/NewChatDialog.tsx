import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { LoaderCircle, MessageSquarePlus, X } from "lucide-react";
import type { CreateChatResult } from "../../types/api";
import {
  parseRecipient,
  recipientFormatMessage,
} from "../../services/recipient";
import styles from "./Chat.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (address: string, signal: AbortSignal) => Promise<CreateChatResult>;
  fallbackFocus: RefObject<HTMLButtonElement | null>;
}

export function NewChatDialog({
  open,
  onClose,
  onCreate,
  fallbackFocus,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef<AbortController | null>(null);
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<CreateChatResult>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const element = dialog.current;
    const previous = document.activeElement;
    const fallback = fallbackFocus.current;
    element?.showModal();
    input.current?.focus();

    return () => {
      pending.current?.abort();
      pending.current = null;
      element?.close();
      if (
        previous instanceof HTMLElement &&
        previous.isConnected &&
        previous.getClientRects().length
      ) {
        previous.focus();
      } else if (fallback?.isConnected) {
        fallback.focus();
      }
    };
  }, [open, fallbackFocus]);

  function close() {
    pending.current?.abort();
    pending.current = null;
    setLoading(false);
    setAddress("");
    setResult({});
    onClose();
  }

  async function submit() {
    if (pending.current) return;

    const recipient = parseRecipient(address);
    if (!recipient) {
      setResult({ message: recipientFormatMessage });
      input.current?.focus();
      return;
    }

    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setResult({});

    try {
      const next = await onCreate(recipient.address, controller.signal);

      if (pending.current !== controller || controller.signal.aborted) return;

      pending.current = null;
      setLoading(false);

      if (next.message) {
        setResult(next);
      } else {
        close();
      }
    } catch {
      if (pending.current !== controller || controller.signal.aborted) return;

      pending.current = null;
      setLoading(false);
      setResult({
        message: "Не удалось проверить получателя. Повторите вручную позже.",
      });
    }
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="new-chat-title"
      aria-describedby="new-chat-description"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) close();
      }}
    >
      <div className={styles.dialogBody}>
        <div className={styles.dialogTop}>
          <span className={styles.dialogIcon}>
            <MessageSquarePlus size={24} />
          </span>

          <button
            type="button"
            className={styles.iconButton}
            aria-label="Закрыть диалог"
            onClick={close}
          >
            <X size={22} />
          </button>
        </div>

        <h2 id="new-chat-title">Новый чат</h2>

        <p id="new-chat-description">
          Укажите телефон России или Беларуси либо @username. Проверим
          получателя через GREEN-API и откроем чат.
        </p>

        <form
          aria-busy={loading}
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label htmlFor="new-contact">Телефон или @username</label>

          <input
            ref={input}
            id="new-contact"
            type="text"
            required
            maxLength={64}
            disabled={loading}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="+375 29 123 45 67 или @username"
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              setResult({});
            }}
            aria-invalid={Boolean(result.message)}
            aria-describedby={result.message ? "contact-error" : "contact-help"}
          />

          {result.message && (
            <p id="contact-error" className={styles.fieldError} role="alert">
              {result.message}
            </p>
          )}

          {loading && <p role="status">Проверяем получателя… До 15 секунд.</p>}

          <div className={styles.dialogActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={close}
            >
              Отмена
            </button>
            
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle size={16} /> Проверяем…
                </>
              ) : (
                "Открыть чат"
              )}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
