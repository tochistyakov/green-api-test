import type { Chat, Message } from "../types/chat";
import type { NotificationEvent } from "../types/notifications";
import { parseNotification } from "./notifications";

type StatusEvent = Extract<NotificationEvent, { kind: "status" }>;

const key = (chatId: string, idMessage: string) =>
  JSON.stringify([chatId, idMessage]);

function applyStatus(message: Message, event: StatusEvent): Message {
  if (
    message.status === event.status &&
    message.statusTimestamp === event.timestamp
  )
    return message;

  if (
    message.status === "read" ||
    (message.status === "delivered" && event.status !== "read")
  )
    return message;

  if (
    (message.statusTimestamp ?? -1) > event.timestamp &&
    event.status !== "read"
  )
    return message;

  return {
    ...message,
    status: event.status,
    statusTimestamp: event.timestamp,
    outcomeUnknown: false,
    error:
      event.status === "failed"
        ? "Telegram не смог отправить сообщение. Проверьте получателя."
        : event.status === "noAccount"
          ? "У получателя нет аккаунта Telegram или номер скрыт."
          : undefined,
  };
}

export function createChatStore() {
  let chats: Chat[] = [];
  const listeners = new Set<() => void>();
  const statuses = new Map<string, StatusEvent>();
  const get = () => chats;

  function set(update: Chat[] | ((previous: Chat[]) => Chat[])) {
    const next = typeof update === "function" ? update(chats) : update;

    const reconciled = next.map((chat) => {
      const messages = chat.messages.map((message) => {
        const event = message.idMessage
          ? statuses.get(key(chat.chatId, message.idMessage))
          : undefined;
        return event && message.direction === "outgoing"
          ? applyStatus(message, event)
          : message;
      });

      return messages.every(
        (message, index) => message === chat.messages[index],
      )
        ? chat
        : { ...chat, messages };
    });

    if (
      reconciled.length === chats.length &&
      reconciled.every((chat, index) => chat === chats[index])
    )
      return;
    chats = reconciled;
    listeners.forEach((listener) => listener());
  }

  function process(body: unknown) {
    const event = parseNotification(body);

    if (event.kind === "skip") return;
    if (event.kind === "unauthorized") return "unauthorized" as const;
    if (event.kind === "status") {
      const eventKey = key(event.chatId, event.idMessage);
      const previous = statuses.get(eventKey);
      if (
        !previous ||
        (previous.status !== "read" &&
          (event.status === "read" ||
            (event.timestamp >= previous.timestamp &&
              previous.status !== "delivered")))
      ) {
        statuses.set(eventKey, event);
      }

      if (statuses.size > 1000) statuses.delete(statuses.keys().next().value!);
      set(chats);
      return;
    }

    const existing = chats.find((chat) => chat.chatId === event.chatId);

    if (
      existing?.messages.some(
        (message) => message.idMessage === event.idMessage,
      )
    ) {
      return;
    }

    const message: Message = {
      clientId: `incoming:${key(event.chatId, event.idMessage)}`,
      idMessage: event.idMessage,
      direction: "incoming",
      text: event.text,
      sentAt: new Date(event.timestamp * 1000).toISOString(),
      status: "received",
    };

    set(
      existing
        ? chats.map((chat) =>
            chat.chatId === event.chatId
              ? { ...chat, messages: [...chat.messages, message] }
              : chat,
          )
        : [
            {
              chatId: event.chatId,
              name: event.name,
              address: event.chatId,
              color: "blue",
              messages: [message],
            },
            ...chats,
          ],
    );
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }
  
  return { get, set, process, subscribe };
}
