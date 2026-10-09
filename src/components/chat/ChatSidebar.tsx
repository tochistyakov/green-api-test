import { useState } from "react";
import type { RefObject } from "react";
import { MessageCircle, Search, SquarePen, X } from "lucide-react";
import type { Chat } from "../../types/chat";
import { Avatar } from "./Avatar";
import styles from "./Chat.module.css";

interface Props {
  chats: Chat[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  newChatButton: RefObject<HTMLButtonElement | null>;
  titleRef: RefObject<HTMLHeadingElement | null>;
}

export function ChatSidebar({
  chats,
  activeId,
  onSelect,
  onNewChat,
  newChatButton,
  titleRef,
}: Props) {
  const [query, setQuery] = useState("");
  const filtered = chats.filter((chat) =>
    `${chat.name} ${chat.address}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );

  return (
    <aside className={styles.sidebar} aria-label="Список чатов">
      <header className={styles.sidebarHeader}>
        <div className={styles.brand}>
          <span>
            <MessageCircle size={22} />
          </span>

          <div>
            <h1 ref={titleRef} tabIndex={-1}>
              Сообщения
            </h1>

            <p>Telegram · GREEN-API</p>
          </div>
        </div>

        <button
          ref={newChatButton}
          type="button"
          className={styles.iconButton}
          aria-label="Создать чат"
          title="Создать чат"
          onClick={onNewChat}
        >
          <SquarePen size={21} />
        </button>
      </header>

      <div className={styles.search}>
        <Search size={18} />

        <input
          aria-label="Поиск чатов"
          placeholder="Поиск"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Очистить поиск"
            onClick={() => setQuery("")}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className={styles.listLabel}>
        ВСЕ ЧАТЫ <span>{chats.length}</span>
      </div>

      <nav className={styles.chatList} aria-label="Чаты" tabIndex={0}>
        {filtered.length ? (
          <ul>
            {filtered.map((chat) => {
              const last = chat.messages.at(-1);
              return (
                <li key={chat.chatId}>
                  <button
                    type="button"
                    className={`${styles.chatRow} ${activeId === chat.chatId ? styles.selected : ""}`}
                    aria-current={activeId === chat.chatId ? "true" : undefined}
                    onClick={() => onSelect(chat.chatId)}
                  >
                    <Avatar contact={chat} />

                    <span className={styles.chatSummary}>
                      <span className={styles.chatTop}>
                        <strong>{chat.name}</strong>

                        {last && (
                          <time dateTime={last.sentAt}>
                            {new Date(last.sentAt).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </time>
                        )}
                      </span>

                      <span className={styles.preview}>
                        {last
                          ? `${last.status === "error" ? "Ошибка: " : last.direction === "outgoing" ? "Вы: " : ""}${last.text}`
                          : "Пока нет сообщений"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.noResults} role="status">
            {chats.length
              ? "Ничего не найдено. Попробуйте другое имя."
              : "Пока нет чатов. Нажмите «Новый чат», чтобы добавить получателя."}
          </p>
        )}
      </nav>

      <footer className={styles.sidebarFooter}>
        <span className={styles.statusDot} /> Чаты хранятся в памяти вкладки
      </footer>
    </aside>
  );
}
