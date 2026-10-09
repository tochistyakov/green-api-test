import type { Chat } from "../../types/chat";
import styles from "./Chat.module.css";

export function Avatar({ contact }: { contact: Chat }) {
  const initials = contact.name
    .replace(/^@/, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={`${styles.avatar} ${styles[contact.color]}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
