import { useRef, useState } from "react";
import { ChatLayout } from "../components/chat/ChatLayout";
import { checkAccount } from "../services/greenApi";
import { parseRecipient, recipientFormatMessage } from "../services/recipient";
import type { Credentials } from "../types/connection";
import type { CreateChatResult } from "../types/api";
import { useOutgoingMessages } from "../hooks/useOutgoingMessages";
import { useChatStore } from "../hooks/useChatStore";
import { useMessagePolling } from "../hooks/useMessagePolling";

export function ChatPage({
  credentials,
  onDisconnect,
}: {
  credentials: Credentials;
  onDisconnect: () => void;
}) {
  const { chats, setChats, processNotification } = useChatStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const knownAddresses = useRef(new Map<string, string>());
  const outgoing = useOutgoingMessages(credentials, setChats);
  const polling = useMessagePolling(credentials, processNotification);

  async function createChat(
    address: string,
    signal: AbortSignal,
  ): Promise<CreateChatResult> {
    const recipient = parseRecipient(address);
    if (!recipient) {
      return { message: recipientFormatMessage };
    }

    const knownId = knownAddresses.current.get(recipient.address);
    if (knownId) {
      if (!signal.aborted) {
        setActiveId(knownId);
      }

      return {};
    }

    const result = await checkAccount(credentials, recipient.request, signal);

    if (signal.aborted) return {};
    if (!result.ok) {
      return { message: result.message };
    }
    if (!result.account.exist) {
      return {
        message:
          "Пользователь не найден или его номер скрыт настройками приватности. Можно попробовать @username.",
      };
    }

    const chatId = result.account.chatId;
    knownAddresses.current.set(recipient.address, chatId);
    setChats((previous) =>
      previous.some((chat) => chat.chatId === chatId)
        ? previous
        : [
            {
              chatId,
              name: recipient.address,
              address: recipient.address,
              color: "blue",
              messages: [],
            },
            ...previous,
          ],
    );

    setActiveId(chatId);
    return {};
  }

  return (
    <ChatLayout
      chats={chats}
      activeId={activeId}
      onSelect={setActiveId}
      onCreate={createChat}
      onDisconnect={onDisconnect}
      drafts={outgoing.drafts}
      onDraftChange={outgoing.changeDraft}
      onSend={outgoing.send}
      onRetry={outgoing.retry}
      pollingState={polling.state}
      onResumePolling={polling.resume}
    />
  );
}
