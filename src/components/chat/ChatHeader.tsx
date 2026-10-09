import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import type { Chat } from "../../types/chat";
import { Avatar } from "./Avatar";
import styles from "./Chat.module.css";

export function ChatHeader({
  contact,
  onBack,
}: {
  contact: Chat;
  onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <header className={styles.chatHeader}>
      <button
        type="button"
        className={`${styles.iconButton} ${styles.back}`}
        onClick={onBack}
        aria-label="Назад к списку чатов"
      >
        <ArrowLeft size={22} />
      </button>
      <Avatar contact={contact} />
      <div className={styles.headerIdentity}>
        <h2 ref={heading} tabIndex={-1}>
          {contact.name}
        </h2>

        <p>Telegram · chatId: {contact.chatId}</p>
      </div>
      <span className={styles.headerTag}>TELEGRAM</span>
    </header>
  );
}
