import type { NotificationEvent, DeliveryStatus } from "../types/notifications";
import { PollingError } from "./pollingError";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(): never {
  throw new PollingError(
    "invalid",
    "Некорректное содержимое известного уведомления. Оно оставлено в очереди.",
  );
}

function validTimestamp(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    Number.isFinite(new Date(value * 1000).getTime())
  );
}

export function parseNotification(body: unknown): NotificationEvent {
  if (!record(body) || typeof body.typeWebhook !== "string") {
    return invalid();
  }

  if (
    body.typeWebhook === "stateInstanceChanged" &&
    body.stateInstance === "notAuthorized"
  ) {
    return { kind: "unauthorized" };
  }

  if (body.typeWebhook === "incomingMessageReceived") {
    if (
      !record(body.messageData) ||
      typeof body.messageData.typeMessage !== "string"
    ) {
      return invalid();
    }

    if (body.messageData.typeMessage !== "textMessage") {
      return { kind: "skip" };
    }

    const sender = body.senderData;
    if (!record(sender) || typeof sender.chatId !== "string") {
      return invalid();
    }

    if (
      /^-\d+$/.test(sender.chatId) ||
      (sender.chatType !== undefined && sender.chatType !== "user")
    ) {
      return { kind: "skip" };
    }

    if (!/^[1-9]\d*$/.test(sender.chatId)) {
      return invalid();
    }

    const textData = body.messageData.textMessageData;
    if (
      !record(textData) ||
      typeof textData.textMessage !== "string" ||
      typeof body.idMessage !== "string" ||
      !body.idMessage ||
      !validTimestamp(body.timestamp)
    ) {
      return invalid();
    }
    const name = [
      sender.senderContactName,
      sender.chatName,
      sender.senderName,
    ].find((value) => typeof value === "string" && value.trim());

    return {
      kind: "incoming",
      chatId: sender.chatId,
      idMessage: body.idMessage,
      timestamp: body.timestamp,
      text: textData.textMessage,
      name: typeof name === "string" ? name : sender.chatId,
    };
  }

  if (body.typeWebhook === "outgoingMessageStatus") {
    if (typeof body.status !== "string") {
      return invalid();
    }

    if (!["delivered", "read", "failed", "noAccount"].includes(body.status)) {
      return { kind: "skip" };
    }

    if (
      typeof body.chatId !== "string" ||
      !/^-?[1-9]\d*$/.test(body.chatId) ||
      typeof body.idMessage !== "string" ||
      !body.idMessage ||
      !validTimestamp(body.timestamp)
    ) {
      return invalid();
    }
    return {
      kind: "status",
      chatId: body.chatId,
      idMessage: body.idMessage,
      timestamp: body.timestamp,
      status: body.status as DeliveryStatus,
    };
  }

  return { kind: "skip" };
}
