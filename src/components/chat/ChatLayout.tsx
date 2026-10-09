import { useEffect, useRef, useState } from "react";
import { ShieldCheck, LogOut } from "lucide-react";
import type { CreateChatResult } from "../../types/api";
import type { Chat, MessageDraft } from "../../types/chat";
import type { PollingState } from "../../types/notifications";
import { ChatSidebar } from "./ChatSidebar";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { NewChatDialog } from "./NewChatDialog";
import { EmptyChatState } from "./EmptyChatState";
import styles from "./Chat.module.css";

interface Props {
  chats: Chat[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (address: string, signal: AbortSignal) => Promise<CreateChatResult>;
  onDisconnect: () => void;
  drafts: Record<string, MessageDraft>;
  onDraftChange: (chatId: string, text: string) => void;
  onSend: (chatId: string) => void;
  onRetry: (clientId: string) => void;
  pollingState: PollingState;
  onResumePolling: () => void;
}

export function ChatLayout({
  chats,
  activeId,
  onSelect,
  onCreate,
  onDisconnect,
  drafts,
  onDraftChange,
  onSend,
  onRetry,
  pollingState,
  onResumePolling,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const newChatButton = useRef<HTMLButtonElement>(null);
  const sidebarTitle = useRef<HTMLHeadingElement>(null);
  const focusFrame = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    },
    [],
  );

  const active = chats.find((chat) => chat.chatId === activeId);
  const draft = active ? drafts[active.chatId] : undefined;
  const draftOperation = active?.messages.find(
    (message) => message.clientId === draft?.clientId,
  );

  function back() {
    onSelect(null);
    if (focusFrame.current !== null) {
      cancelAnimationFrame(focusFrame.current);
    }

    focusFrame.current = requestAnimationFrame(() =>
      sidebarTitle.current?.focus(),
    );
  }

  return (
    <main className={styles.app}>
      <div className={styles.sessionBanner}>
        <span>
          <ShieldCheck size={15} /> GREEN-API подключён
        </span>

        <button
          type="button"
          className={styles.disconnect}
          onClick={onDisconnect}
        >
          Отключиться <LogOut size={14} />
        </button>
      </div>

      <div
        className={styles.pollingBanner}
        data-phase={pollingState.phase}
        role="status"
      >
        {pollingState.message}

        {pollingState.canRetry && (
          <button type="button" onClick={onResumePolling}>
            Возобновить приём
          </button>
        )}
      </div>

      <div className={`${styles.layout} ${active ? styles.hasActive : ""}`}>
        <ChatSidebar
          chats={chats}
          activeId={activeId}
          onSelect={onSelect}
          onNewChat={() => setDialogOpen(true)}
          newChatButton={newChatButton}
          titleRef={sidebarTitle}
        />

        <section className={styles.conversation} aria-label="Переписка">
          {active ? (
            <>
              <ChatHeader
                key={`header-${active.chatId}`}
                contact={active}
                onBack={back}
              />
              <MessageList
                key={`messages-${active.chatId}`}
                messages={active.messages}
                onRetry={onRetry}
              />
              <MessageInput
                key={`input-${active.chatId}`}
                value={draft?.text ?? ""}
                operationStatus={draftOperation?.status}
                onChange={(value) => onDraftChange(active.chatId, value)}
                onSend={() => onSend(active.chatId)}
              />
            </>
          ) : (
            <EmptyChatState onNewChat={() => setDialogOpen(true)} />
          )}
        </section>
      </div>
      <NewChatDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={onCreate}
        fallbackFocus={newChatButton}
      />
    </main>
  );
}
