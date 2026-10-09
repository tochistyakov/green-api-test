export type MessageStatus =
  | "sending"
  | "queued"
  | "error"
  | "delivered"
  | "read"
  | "failed"
  | "noAccount"
  | "received";

export interface Message {
  clientId: string;
  idMessage?: string;
  direction: "incoming" | "outgoing";
  text: string;
  sentAt: string;
  status: MessageStatus;
  error?: string;
  outcomeUnknown?: boolean;
  statusTimestamp?: number;
}

export interface MessageDraft {
  text: string;
  revision: number;
  clientId?: string;
}

export interface Chat {
  chatId: string;
  name: string;
  address: string;
  color: "blue" | "lavender" | "peach" | "mint";
  messages: Message[];
}
