import { useLayoutEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import type { Message } from "../../types/chat";
import { MessageBubble } from "./MessageBubble";
import styles from "./Chat.module.css";

export function MessageList({
  messages,
  onRetry,
}: {
  messages: Message[];
  onRetry: (clientId: string) => void;
}) {
  const scrollArea = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);

  useLayoutEffect(() => {
    const element = scrollArea.current;
    if (element && nearBottom.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  const groups = new Map<string, Message[]>();
  for (const message of messages) {
    const timestamp = new Date(message.sentAt);
    const date = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, "0")}-${String(timestamp.getDate()).padStart(2, "0")}`;
    const group = groups.get(date) ?? [];

    group.push(message);
    groups.set(date, group);
  }

  return (
    <div
      ref={scrollArea}
      className={styles.messageList}
      role="region"
      aria-label="Сообщения переписки"
      tabIndex={0}
      onScroll={(event) => {
        const element = event.currentTarget;
        nearBottom.current =
          element.scrollHeight - element.scrollTop - element.clientHeight < 100;
      }}
    >
      {messages.length ? (
        <div className={styles.messageContent}>
          {Array.from(groups, ([date, items]) => (
            <section key={date} aria-label={date}>
              <div className={styles.date}>
                <time dateTime={date}>
                  {new Date(`${date}T12:00:00`).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
              </div>

              <ol className={styles.messages}>
                {items.map((message) => (
                  <MessageBubble
                    key={message.clientId}
                    message={message}
                    onRetry={onRetry}
                  />
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <div className={styles.noMessages}>
          <MessageSquare size={30} />
          <h3>Чат открыт</h3>

          <p>
            Напишите первое сообщение.
            <br />
            Новые входящие появятся автоматически. История прошлых переписок не
            загружается.
          </p>
        </div>
      )}
    </div>
  );
}
