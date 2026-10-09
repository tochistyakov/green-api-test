import { MessageCircle, Plus } from "lucide-react";
import styles from "./Chat.module.css";

export function EmptyChatState({ onNewChat }: { onNewChat: () => void }) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon}>
        <MessageCircle size={48} strokeWidth={1.4} />
      </span>
      <h2>Откройте новый чат</h2>
      <p>
        Выберите чат слева или найдите получателя
        <br />
        по телефону или Telegram @username.
      </p>
      <button
        type="button"
        className={styles.primaryButton}
        onClick={onNewChat}
      >
        <Plus size={18} /> Новый чат
      </button>
      <small>
        Новые сообщения появятся автоматически. Поддерживаются только личные
        текстовые чаты.
      </small>
    </div>
  );
}
