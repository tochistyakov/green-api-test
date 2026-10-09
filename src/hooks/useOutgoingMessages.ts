import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Chat, Message, MessageDraft } from "../types/chat";
import type { Credentials } from "../types/connection";
import { sendMessage } from "../services/greenApi";
import { validateMessage } from "../services/messageValidation";

export function useOutgoingMessages(
  credentials: Credentials,
  setChats: Dispatch<SetStateAction<Chat[]>>,
) {
  const [drafts, setDrafts] = useState<Record<string, MessageDraft>>({});
  const draftStore = useRef<Record<string, MessageDraft>>({});
  const operations = useRef(
    new Map<string, { chatId: string; message: Message }>(),
  );
  const pending = useRef(new Map<string, AbortController>());

  useEffect(() => {
    const requests = pending.current;
    return () => {
      requests.forEach((controller) => controller.abort());
      requests.clear();
    };
  }, [
    credentials.apiUrl,
    credentials.idInstance,
    credentials.apiTokenInstance,
  ]);

  function writeDraft(chatId: string, draft: MessageDraft) {
    draftStore.current = { ...draftStore.current, [chatId]: draft };
    setDrafts(draftStore.current);
  }

  function changeDraft(chatId: string, text: string) {
    writeDraft(chatId, {
      text,
      revision: (draftStore.current[chatId]?.revision ?? 0) + 1,
    });
  }

  function updateMessage(chatId: string, message: Message) {
    setChats((previous) =>
      previous.map((chat) =>
        chat.chatId === chatId
          ? {
              ...chat,
              messages: chat.messages.map((item) =>
                item.clientId === message.clientId ? message : item,
              ),
            }
          : chat,
      ),
    );
  }

  async function attempt(clientId: string) {
    const operation = operations.current.get(clientId);
    if (
      !operation ||
      pending.current.has(clientId) ||
      operation.message.idMessage
    ) {
      return;
    }

    const controller = new AbortController();
    pending.current.set(clientId, controller);
    const { chatId } = operation;
    operation.message = {
      ...operation.message,
      status: "sending",
      error: undefined,
      outcomeUnknown: undefined,
    };

    updateMessage(chatId, operation.message);

    try {
      const result = await sendMessage(
        credentials,
        { chatId, message: operation.message.text },
        controller.signal,
      );

      if (controller.signal.aborted) return;

      operation.message = result.ok
        ? {
            ...operation.message,
            status: "queued",
            idMessage: result.idMessage,
          }
        : {
            ...operation.message,
            status: "error",
            error: result.message,
            outcomeUnknown: result.outcomeUnknown,
          };

      updateMessage(chatId, operation.message);

      const draft = draftStore.current[chatId];
      if (result.ok && draft?.clientId === clientId) {
        changeDraft(chatId, "");
      }

      if (result.ok) {
        operations.current.delete(clientId);
      }
    } catch {
      if (!controller.signal.aborted) {
        operation.message = {
          ...operation.message,
          status: "error",
          error: "Не удалось получить результат отправки.",
          outcomeUnknown: true,
        };
        updateMessage(chatId, operation.message);
      }
    } finally {
      pending.current.delete(clientId);
    }
  }

  function send(chatId: string) {
    const draft = draftStore.current[chatId];
    if (!draft || draft.clientId || validateMessage(draft.text)) return;
    
    const clientId = crypto.randomUUID();
    const message: Message = {
      clientId,
      direction: "outgoing",
      text: draft.text,
      sentAt: new Date().toISOString(),
      status: "sending",
    };
    writeDraft(chatId, { ...draft, clientId });
    operations.current.set(clientId, { chatId, message });
    setChats((previous) =>
      previous.map((chat) =>
        chat.chatId === chatId
          ? { ...chat, messages: [...chat.messages, message] }
          : chat,
      ),
    );
    void attempt(clientId);
  }

  function retry(clientId: string) {
    if (operations.current.get(clientId)?.message.status !== "error") return;
    void attempt(clientId);
  }

  return { drafts, changeDraft, send, retry };
}
